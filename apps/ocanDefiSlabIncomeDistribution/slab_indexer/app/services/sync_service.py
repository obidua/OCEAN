import datetime
from typing import List

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from web3._utils.events import get_event_data

from app.core.web3_client import w3
from app.contracts import user_registry, portfolio_manager, capping_income_manager, slab_manager, roi_distributor
from app.models.user import User
from app.models.portfolio import Portfolio
from app.models.slab_achiever import SlabAchiever
from app.models.sync_state import SyncState
from app.core.config import settings




def _get_event_abi(contract, event_name: str):
    for e in contract.abi:
        if e.get("type") == "event" and e.get("name") == event_name:
            return e
    raise ValueError(f"Event {event_name} not found")


# async def _get_or_create_sync_state(db: AsyncSession) -> SyncState:
    
    
#     try:
#         result = await db.execute(select(SyncState).limit(1))
        
#         print("last block is",result.last_user_block)
        
#         # print("state is"result)
#         state = result.scalar_one_or_none()
#         if not state:
#             # state = SyncState()
#             state = SyncState(id=1, last_user_block=settings.START_BLOCK,last_portfolio_block=settings.START_BLOCK,last_slab_block=settings.START_BLOCK)

#             db.add(state)
#             await db.commit()
#             await db.refresh(state)
#         return state
    
#     except Exception as e:
#         print(str(e))

def normalize_block(b):
    if b is None:
        return 0
    if isinstance(b, int):
        return b
    if isinstance(b, str):
        b = b.strip()
        if b.startswith("0x"):
            return int(b, 16)
        return int(b)
    return int(b)



async def _get_or_create_sync_state(db: AsyncSession) -> SyncState:
    try:
        result = await db.execute(select(SyncState).limit(1))
        state = result.scalar_one_or_none()
        
        # print("state is", state,state.last_user_block,type(state.last_user_block))
            # ")

        if state:
            # Normalize all block fields (they might be strings)
            state.last_user_block = normalize_block(state.last_user_block)
            state.last_portfolio_block = normalize_block(state.last_portfolio_block)
            state.last_slab_block = normalize_block(state.last_slab_block)
            return state
        
        # No row exists → create fresh one
        start_block = normalize_block(settings.START_BLOCK)
        
        state = SyncState(
            id=1,
            last_user_block=start_block,
            last_portfolio_block=start_block,
            last_slab_block=start_block
        )

        db.add(state)
        await db.commit()
        await db.refresh(state)
        return state

    except Exception as e:
        print("SyncState error:", e)
        raise e

async def sync_users(db: AsyncSession, max_chunk: int = 5_000):
    state = await _get_or_create_sync_state(db)
    from_block = state.last_user_block or 0
    latest = w3.eth.block_number
    if from_block >= latest:
        return

    to_block = min(from_block + max_chunk, latest)

    event_name = "Registered"  # adjust if named differently
    event_abi = _get_event_abi(user_registry, event_name)
    event_topic = "0x" + w3.keccak(text=f"{event_name}(address,uint256,address)").hex()

    logs = w3.eth.get_logs({
        "from_block": from_block + 1,
        "to_block": to_block,
        "address": user_registry.address,
        "topics": [event_topic]
    })
    
    # print("soemthing went wrong")
    
    print("logs are",logs)

    for log in logs:
        
        print("logs",log)
        data = get_event_data(w3.codec, event_abi, log)
        args = data["args"]
        user_addr = args["user"]
        user_id = int(args["userId"])
        ref = args.get("referrer", None)

        # Fetch full user data from contract (adjust to your actual getUser signature)
        # Example: function getUser(address) returns ( ... )
        # This is pseudo, adapt indexes to your struct!
        u = user_registry.functions.getUser(user_addr).call()

        # YOU must map these properly to your struct fields
        # Example mapping:
        # u[0] = id, u[1] = referrer, u[2] = placementParent, u[3] = placementLeg, ...
        placement_parent = u[2]
        placement_leg = u[3]
        tier = u[4]
        created_at_ts = u[5]
        is_temp_deactive = u[6]
        total_directs = u[7] if len(u) > 7 else 0

        created_at = datetime.datetime.utcfromtimestamp(created_at_ts)

        existing = await db.execute(
            select(User).where(User.user_address == user_addr.lower())
        )
        existing_user = existing.scalar_one_or_none()

        if existing_user:
            existing_user.user_id = user_id
            existing_user.referrer_address = ref.lower() if ref else None
            existing_user.placement_parent = placement_parent.lower() if placement_parent else None
            existing_user.placement_leg = placement_leg
            existing_user.tier = tier
            existing_user.created_at = created_at
            existing_user.is_temp_deactive = bool(is_temp_deactive)
            existing_user.total_directs = total_directs
            existing_user.last_event_block = log["blockNumber"]
        else:
            db.add(
                User(
                    user_address=user_addr.lower(),
                    user_id=user_id,
                    referrer_address=ref.lower() if ref else None,
                    placement_parent=placement_parent.lower() if placement_parent else None,
                    placement_leg=placement_leg,
                    tier=tier,
                    created_at=created_at,
                    is_temp_deactive=bool(is_temp_deactive),
                    total_directs=total_directs,
                    last_event_block=log["blockNumber"],
                )
            )

    state.last_user_block = to_block
    db.add(state)
    await db.commit()


async def sync_portfolios(db: AsyncSession, max_portfolios_per_batch: int = 100):
    """
    Sync portfolios by iterating through portfolio IDs starting from 1.
    For each portfolio, also sync the portfolio owner in the users table.
    """
    state = await _get_or_create_sync_state(db)

    # Use last_portfolio_block to track the last synced portfolio ID
    last_synced_pid = state.last_portfolio_block or 0

    # If last_synced_pid looks like a block number (> 10000), reset it to 0
    # This handles migration from block-based tracking to portfolio ID tracking
    if last_synced_pid > 10000:
        print(f"Detected old block number {last_synced_pid}, resetting to start from portfolio ID 1")
        last_synced_pid = 0

    start_pid = last_synced_pid + 1

    print(f"Starting portfolio sync from pid={start_pid}")

    portfolios_processed = 0
    current_pid = start_pid

    while portfolios_processed < max_portfolios_per_batch:
        try:
            print(f"Fetching portfolio {current_pid}...")

            # Fetch portfolio data
            p = portfolio_manager.functions.getPortfolio(current_pid).call()

            # Check if portfolio exists (createdAt should be > 0 for valid portfolios)
            created_at_ts = p[3]  # uint64 createdAt
            if created_at_ts == 0:
                print(f"Portfolio {current_pid} doesn't exist (createdAt=0). Stopping.")
                break

            # Fetch additional portfolio data
            principal_usd = portfolio_manager.functions.getUSDPrincipal(current_pid).call()
            remaining_cap = capping_income_manager.functions.remainingToCapUSD(current_pid).call()
            freeze_count = portfolio_manager.functions.getFreezeIntervalsCount(current_pid).call()

            # TEMPORARY: ROIDistributor ABI is incomplete (proxy only, no implementation)
            paid_usd = 0  # Placeholder - TODO: Get the full implementation ABI

            # Map Portfolio struct from PortfolioManager to Python
            # Struct fields: [principal, principalUsd, credited, createdAt, lastAccrual,
            #                 frozenUntil, booster, tier, capPct, owner, activatedBy,
            #                 boosterActivationDate, isCapped, isClosed, cappedAt, closedAt,
            #                 totalReceivedBoosterROI, isActivatedFromSafeWallet]
            owner = p[9]                      # address owner
            tier = p[7]                       # uint8 tier
            cap_pct = p[8]                    # uint8 capPct
            is_closed = p[13]                 # bool isClosed
            is_capped = p[12]                 # bool isCapped
            booster = p[6]                    # bool booster
            closed_at_ts = p[15]              # uint256 closedAt
            capped_at_ts = p[14]              # uint256 cappedAt
            booster_activation_ts = p[11]     # uint64 boosterActivationDate

            created_at = datetime.datetime.utcfromtimestamp(created_at_ts)
            closed_at = (
                datetime.datetime.utcfromtimestamp(closed_at_ts)
                if closed_at_ts > 0
                else None
            )
            capped_at = (
                datetime.datetime.utcfromtimestamp(capped_at_ts)
                if capped_at_ts > 0
                else None
            )
            booster_activation = (
                datetime.datetime.utcfromtimestamp(booster_activation_ts)
                if booster_activation_ts > 0
                else None
            )

            # Upsert portfolio
            existing = await db.execute(
                select(Portfolio).where(Portfolio.pid == current_pid)
            )
            portfolio_row = existing.scalar_one_or_none()

            if portfolio_row:
                portfolio_row.owner_address = owner.lower()
                portfolio_row.tier = tier
                portfolio_row.principal_usd = principal_usd
                portfolio_row.cap_percent = cap_pct
                portfolio_row.is_closed = is_closed
                portfolio_row.closed_at = closed_at
                portfolio_row.is_capped = is_capped
                portfolio_row.capped_at = capped_at
                portfolio_row.booster = booster
                portfolio_row.booster_activation = booster_activation
                portfolio_row.remaining_cap_usd = remaining_cap
                portfolio_row.usd_paid_so_far = paid_usd
                portfolio_row.total_freeze_intervals = freeze_count
            else:
                db.add(
                    Portfolio(
                        pid=current_pid,
                        owner_address=owner.lower(),
                        tier=tier,
                        principal_usd=principal_usd,
                        cap_percent=cap_pct,
                        is_closed=is_closed,
                        closed_at=closed_at,
                        is_capped=is_capped,
                        capped_at=capped_at,
                        booster=booster,
                        booster_activation=booster_activation,
                        remaining_cap_usd=remaining_cap,
                        usd_paid_so_far=paid_usd,
                        total_freeze_intervals=freeze_count,
                        last_event_block=0,  # Not tracking blocks in this mode
                    )
                )

            # Fetch and sync the portfolio owner's user data
            print(f"Fetching user data for owner {owner}...")
            try:
                u = user_registry.functions.getUser(owner).call()

                # Map User struct fields from getUser()
                # Struct: [bool registered, uint32 id, address referrer, uint32 directsCount,
                #          uint64 createdAt, bool isTempDeactive]
                registered = u[0]           # bool registered
                user_id = int(u[1])         # uint32 id
                referrer = u[2]             # address referrer
                total_directs = int(u[3])   # uint32 directsCount
                user_created_at_ts = u[4]   # uint64 createdAt
                is_temp_deactive = u[5]     # bool isTempDeactive

                # Note: getUser doesn't provide placement_parent, placement_leg, or tier
                # These would need to come from events or other contract functions
                # Setting them to None for now

                user_created_at = datetime.datetime.utcfromtimestamp(user_created_at_ts)

                # Only sync if user is registered
                if not registered:
                    print(f"User {owner} is not registered, skipping...")
                else:
                    # Upsert user
                    existing_user = await db.execute(
                        select(User).where(User.user_address == owner.lower())
                    )
                    user_row = existing_user.scalar_one_or_none()

                    if user_row:
                        user_row.user_id = user_id
                        user_row.referrer_address = referrer.lower() if referrer and referrer != '0x0000000000000000000000000000000000000000' else None
                        # Keep existing values for placement_parent, placement_leg, tier if they exist
                        # Only update if they were null before
                        user_row.created_at = user_created_at
                        user_row.is_temp_deactive = bool(is_temp_deactive)
                        user_row.total_directs = total_directs
                    else:
                        db.add(
                            User(
                                user_address=owner.lower(),
                                user_id=user_id,
                                referrer_address=referrer.lower() if referrer and referrer != '0x0000000000000000000000000000000000000000' else None,
                                placement_parent=None,  # Not available in getUser
                                placement_leg=None,     # Not available in getUser
                                tier=tier,              # Use portfolio tier as fallback
                                created_at=user_created_at,
                                is_temp_deactive=bool(is_temp_deactive),
                                total_directs=total_directs,
                                last_event_block=0,
                            )
                        )
                    print(f"Synced user {owner} (user_id={user_id}, directs={total_directs})")
            except Exception as user_error:
                print(f"Warning: Could not fetch user data for {owner}: {user_error}")
                # Continue even if user fetch fails

            # Update state with current pid
            state.last_portfolio_block = current_pid

            portfolios_processed += 1
            current_pid += 1

            print(f"Successfully synced portfolio {current_pid - 1}")

        except Exception as e:
            # Check if it's a revert or array out of bounds (portfolio doesn't exist)
            error_msg = str(e).lower()
            if any(x in error_msg for x in ["revert", "execution reverted", "invalid opcode", "panic error 0x32", "array index", "out of bounds"]):
                print(f"Portfolio {current_pid} doesn't exist (reached end of portfolios). Stopping.")
                break
            else:
                print(f"ERROR fetching portfolio {current_pid}: {e}")
                raise

    # Commit all changes
    db.add(state)
    await db.commit()

    print(f"Portfolio sync complete. Processed {portfolios_processed} portfolios. Last pid: {state.last_portfolio_block}")


async def sync_slab_achievers(db: AsyncSession, max_chunk: int = 5_000):
    state = await _get_or_create_sync_state(db)
    from_block = state.last_slab_block or 0
    latest = w3.eth.block_number
    if from_block >= latest:
        return
    to_block = min(from_block + max_chunk, latest)
    
    print("block range", from_block, to_block)

    event_name = "SlabAchieved"  # adjust to your actual event name/signature
    event = slab_manager.events[event_name]()
    
    print("block range", from_block, to_block)
    logs = event.get_logs(from_block=from_block + 1, to_block=to_block)
    print("logs for slab achievers",logs)  
    for log in logs:
        args = log["args"]
        user = args["user"]
        slabIndex = int(args["slabIndex"])
        qT = int(args["qualifiedTarget"])
        L1 = int(args["leg1"])
        L2 = int(args["leg2"])
        Lrest = int(args["legRest"])

        db.add(
            SlabAchiever(
                user_address=user.lower(),
                slab_index=slabIndex,
                qualified_target=qT,
                leg1=L1,
                leg2=L2,
                leg_rest=Lrest,
                block_number=log["blockNumber"],
            )
        )

    state.last_slab_block = to_block
    db.add(state)
    await db.commit()
