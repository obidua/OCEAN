# import asyncio
# from datetime import datetime, timezone

# from web3 import Web3
# from web3.middleware import ExtraDataToPOAMiddleware
# # from eth_abi import decode_abi

# from sqlalchemy import select, update
# from sqlalchemy.ext.asyncio import AsyncSession

# from .core.config import settings
# from .core.db import AsyncSessionLocal, engine, Base
# from .models import SyncState, User, Portfolio, Booster

# import json
# from pathlib import Path


# def get_web3() -> Web3:
#     w3 = Web3(Web3.HTTPProvider(settings.RPC_URL))
#     # If POA
#     w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
#     return w3


# def load_abi(name: str) -> list:
#     abi_path = Path(__file__).resolve().parent.parent / "abis" / f"{name}.json"
#     with abi_path.open() as f:
#         return json.load(f)


# w3 = get_web3()
# user_registry_contract = w3.eth.contract(
#     address=Web3.to_checksum_address(settings.USER_REGISTRY_ADDRESS),
#     abi=load_abi("UserRegistry"),
# )
# portfolio_manager_contract = w3.eth.contract(
#     address=Web3.to_checksum_address(settings.PORTFOLIO_MANAGER_ADDRESS),
#     abi=load_abi("PortfolioManager"),
# )


# async def get_or_init_sync_state(session: AsyncSession) -> SyncState:
#     result = await session.execute(select(SyncState).where(SyncState.id == 1))
#     state = result.scalar_one_or_none()
#     if not state:
#         state = SyncState(id=1, last_block=settings.START_BLOCK)
#         session.add(state)
#         await session.commit()
#         await session.refresh(state)
#     return state


# def _to_bytes20(addr: str) -> bytes:
#     return bytes.fromhex(addr[2:])

# def _to_hex(addr: str) -> str:
#     return Web3.to_checksum_address(addr)

# def _to_bytes32(tx_hash: bytes) -> bytes:
#     # w3 returns HexBytes
#     return bytes(tx_hash)


# def _ts_from_block(block) -> datetime:
#     return datetime.fromtimestamp(block["timestamp"], tz=timezone.utc)


# # async def _handle_user_registered(session: AsyncSession, event):
# #     # adjust names based on your event
# #     args = event["args"]
# #     user_addr = args["user"]
# #     uid = int(args.get("userId", 0))
# #     sponsor = args.get("sponsor", None)

# #     block = w3.eth.get_block(event["blockNumber"])
# #     joined_at = _ts_from_block(block)

# #     tx_hash = _to_bytes32(event["transactionHash"])
# #     log_idx = event["logIndex"]

# #     # upsert by wallet_address
# #     stmt = select(User).where(User.wallet_address == _to_bytes20(user_addr))
# #     result = await session.execute(stmt)
# #     user = result.scalar_one_or_none()
# #     if not user:
# #         user = User(
# #             wallet_address=_to_bytes20(user_addr),
# #             user_id_onchain=uid,
# #             sponsor_address=_to_bytes20(sponsor) if sponsor else None,
# #             joined_at=joined_at,
# #             created_tx_hash=tx_hash,
# #             created_log_idx=log_idx,
# #         )
# #         session.add(user)
# #     else:
# #         # minimal updates (sponsor or uid might change)
# #         user.user_id_onchain = uid or user.user_id_onchain
# #         if sponsor:
# #             user.sponsor_address = _to_bytes20(sponsor)


# async def _handle_user_registered(session: AsyncSession, event):
#     args = event["args"]

#     user_addr = args["user"]
#     referrer = args["referrer"]
#     uid = int(args["id"])

#     block = w3.eth.get_block(event["blockNumber"])
#     joined_at = _ts_from_block(block)

#     tx_hash = _to_bytes32(event["transactionHash"])
#     log_idx = event["logIndex"]

#     stmt = select(User).where(User.wallet_address == _to_bytes20(user_addr))
#     result = await session.execute(stmt)
#     user = result.scalar_one_or_none()

#     if not user:
#         user = User(
#             wallet_address=_to_bytes20(user_addr),
#             user_id_onchain=uid,
#             sponsor_address=_to_bytes20(referrer),
#             joined_at=joined_at,
#             created_tx_hash=tx_hash,
#             created_log_idx=log_idx,
#         )
#         session.add(user)


# # async def _handle_portfolio_created(session: AsyncSession, event):
# #     args = event["args"]
# #     pid = int(args["portfolioId"])
# #     owner = args["owner"]
# #     amount_usd6 = int(args["amountUsd6"])

# #     block = w3.eth.get_block(event["blockNumber"])
# #     started_at = _ts_from_block(block)

# #     tx_hash = _to_bytes32(event["transactionHash"])
# #     log_idx = event["logIndex"]

# #     stmt = select(Portfolio).where(Portfolio.portfolio_id == pid)
# #     result = await session.execute(stmt)
# #     p = result.scalar_one_or_none()
# #     if not p:
# #         p = Portfolio(
# #             portfolio_id=pid,
# #             owner_address=_to_bytes20(owner),
# #             amount_usd6=amount_usd6,
# #             started_at=started_at,
# #             is_active=True,
# #             created_tx_hash=tx_hash,
# #             created_log_idx=log_idx,
# #         )
# #         session.add(p)
# #     else:
# #         # could be upgrade/topup logic
# #         p.amount_usd6 = amount_usd6
# #         p.is_active = True


# # async def _handle_portfolio_created(session: AsyncSession, event):
# #     args = event["args"]

# #     owner = args["user"]
# #     pid = int(args["pid"])
# #     principal = int(args["principal"])
# #     tier = int(args["tier"])

# #     block = w3.eth.get_block(event["blockNumber"])
# #     started_at = _ts_from_block(block)

# #     tx_hash = _to_bytes32(event["transactionHash"])
# #     log_idx = event["logIndex"]

# #     stmt = select(Portfolio).where(Portfolio.portfolio_id == pid)
# #     result = await session.execute(stmt)
# #     p = result.scalar_one_or_none()

# #     if not p:
# #         p = Portfolio(
# #             portfolio_id=pid,
# #             owner_address=_to_hex(owner),
# #             amount_usd6=principal,      # principal is already USD micro? If RAMA convert later
# #             started_at=started_at,
# #             is_active=True,
# #             created_tx_hash=tx_hash,
# #             created_log_idx=log_idx,
# #         )
# #         session.add(p)


# # async def _handle_portfolio_created(session: AsyncSession, event):
# #     args = event["args"]

# #     owner = args["user"]
# #     pid = int(args["pid"])
# #     principal = int(args["principal"])
# #     tier = int(args["tier"])

# #     block = w3.eth.get_block(event["blockNumber"])
# #     created_at = _ts_from_block(block)

# #     tx_hash = _to_bytes32(event["transactionHash"])
# #     log_idx = event["logIndex"]

# #     stmt = select(Portfolio).where(Portfolio.portfolio_id == pid)
# #     result = await session.execute(stmt)
# #     p = result.scalar_one_or_none()

# #     if not p:
# #         p = Portfolio(
# #             portfolio_id=pid,
# #             owner_address=_to_bytes20(owner),
# #             created_by=None,
# #             principal_usd6=principal,
# #             principal_rama=0,
# #             tier=tier,
# #             created_at=created_at,
# #             is_active=True,
# #             created_tx_hash=tx_hash,
# #             created_log_idx=log_idx,
# #         )
# #         session.add(p)
# #     else:
# #         p.principal_usd6 = principal
# #         p.tier = tier

# async def _handle_portfolio_created(session: AsyncSession, event):
#     a = event["args"]

#     owner = _to_hex(a["user"])
#     pid = int(a["pid"])

#     principal_usd6 = int(a["principal"])   # already micro-USD from contract
#     tier = int(a["tier"])

#     block = w3.eth.get_block(event["blockNumber"])
#     created_at = _ts_from_block(block)

#     tx_hash = event["transactionHash"].hex()
#     log_idx = event["logIndex"]

#     stmt = select(Portfolio).where(Portfolio.portfolio_id == pid)
#     result = await session.execute(stmt)
#     p = result.scalar_one_or_none()

#     if not p:
#         session.add(Portfolio(
#             portfolio_id=pid,
#             owner_address=owner,
#             created_by=None,
#             principal_usd6=principal_usd6,
#             principal_rama=0,
#             tier=tier,
#             created_at=created_at,
#             created_tx_hash=tx_hash,
#             created_log_idx=log_idx,
#         ))


# # async def _handle_portfolio_created_from_safe(session: AsyncSession, event):
# #     args = event["args"]

# #     owner = args["user"]
# #     pid = int(args["pid"])
# #     rama_amt = int(args["ramaAmount"])
# #     usd_micro = int(args["usdMicro"])

# #     block = w3.eth.get_block(event["blockNumber"])
# #     created_at = _ts_from_block(block)

# #     tx_hash = _to_bytes32(event["transactionHash"])
# #     log_idx = event["logIndex"]

# #     stmt = select(Portfolio).where(Portfolio.portfolio_id == pid)
# #     result = await session.execute(stmt)
# #     p = result.scalar_one_or_none()

# #     if not p:
# #         p = Portfolio(
# #             portfolio_id=pid,
# #             owner_address=_to_bytes20(owner),
# #             created_by=None,
# #             principal_usd6=usd_micro,
# #             principal_rama=rama_amt,
# #             tier=None,
# #             created_at=created_at,
# #             is_active=True,
# #             created_tx_hash=tx_hash,
# #             created_log_idx=log_idx,
# #         )
# #         session.add(p)
# #     else:
# #         p.principal_usd6 = usd_micro
# #         p.principal_rama = rama_amt

# async def _handle_portfolio_created_from_safe(session: AsyncSession, event):
#     a = event["args"]

#     owner = _to_hex(a["user"])
#     pid = int(a["pid"])

#     rama_amt = int(a["ramaAmount"])
#     usd_micro = int(a["usdMicro"])

#     block = w3.eth.get_block(event["blockNumber"])
#     created_at = _ts_from_block(block)

#     tx_hash = event["transactionHash"].hex()
#     log_idx = event["logIndex"]

#     stmt = select(Portfolio).where(Portfolio.portfolio_id == pid)
#     result = await session.execute(stmt)
#     p = result.scalar_one_or_none()

#     if not p:
#         session.add(Portfolio(
#             portfolio_id=pid,
#             owner_address=owner,
#             created_by=None,
#             principal_usd6=usd_micro,
#             principal_rama=rama_amt,
#             tier=None,
#             created_at=created_at,
#             created_tx_hash=tx_hash,
#             created_log_idx=log_idx,
#         ))


# # async def _handle_portfolio_created_for_others(session: AsyncSession, event):
# #     args = event["args"]

# #     caller = args["caller"]
# #     beneficiary = args["beneficiary"]
# #     pid = int(args["pid"])
# #     rama_amt = int(args["ramaAmount"])
# #     usd_micro = int(args["usdMicro"])

# #     block = w3.eth.get_block(event["blockNumber"])
# #     created_at = _ts_from_block(block)

# #     tx_hash = _to_bytes32(event["transactionHash"])
# #     log_idx = event["logIndex"]

# #     stmt = select(Portfolio).where(Portfolio.portfolio_id == pid)
# #     result = await session.execute(stmt)
# #     p = result.scalar_one_or_none()

# #     if not p:
# #         p = Portfolio(
# #             portfolio_id=pid,
# #             owner_address=_to_bytes20(beneficiary),
# #             created_by=_to_bytes20(caller),
# #             principal_usd6=usd_micro,
# #             principal_rama=rama_amt,
# #             tier=None,
# #             created_at=created_at,
# #             is_active=True,
# #             created_tx_hash=tx_hash,
# #             created_log_idx=log_idx,
# #         )
# #         session.add(p)
# #     else:
# #         p.principal_usd6 = usd_micro
# #         p.principal_rama = rama_amt
# #         p.created_by = _to_bytes20(caller)

# async def _handle_portfolio_created_for_others(session: AsyncSession, event):
#     a = event["args"]

#     caller = _to_hex(a["caller"])
#     beneficiary = _to_hex(a["beneficiary"])
#     pid = int(a["pid"])

#     rama_amt = int(a["ramaAmount"])
#     usd_micro = int(a["usdMicro"])

#     block = w3.eth.get_block(event["blockNumber"])
#     created_at = _ts_from_block(block)

#     tx_hash = event["transactionHash"].hex()
#     log_idx = event["logIndex"]

#     stmt = select(Portfolio).where(Portfolio.portfolio_id == pid)
#     result = await session.execute(stmt)
#     p = result.scalar_one_or_none()

#     if not p:
#         session.add(Portfolio(
#             portfolio_id=pid,
#             owner_address=beneficiary,
#             created_by=caller,
#             principal_usd6=usd_micro,
#             principal_rama=rama_amt,
#             tier=None,
#             created_at=created_at,
#             created_tx_hash=tx_hash,
#             created_log_idx=log_idx,
#         ))


# # async def _handle_booster_activated(session: AsyncSession, event):
# #     args = event["args"]
# #     owner = args["user"]
# #     pid = int(args["portfolioId"])
# #     booster_type = int(args["boosterType"])

# #     block = w3.eth.get_block(event["blockNumber"])
# #     activated_at = _ts_from_block(block)

# #     tx_hash = _to_bytes32(event["transactionHash"])
# #     log_idx = event["logIndex"]

# #     b = Booster(
# #         owner_address=_to_bytes20(owner),
# #         portfolio_id=pid,
# #         booster_type=booster_type,
# #         activated_at=activated_at,
# #         created_tx_hash=tx_hash,
# #         created_log_idx=log_idx,
# #     )
# #     session.add(b)
# #     # no upsert here; each activation is separate event

# async def _handle_booster_activated(session: AsyncSession, event):
#     args = event["args"]

#     owner = args["activated_for"]
#     portfolio_amount = int(args["portfolioAmount"])
#     booster_pct = int(args["boosterPercentage"])
#     activated_at_unix = int(args["activatedAt"])

#     activated_at = datetime.fromtimestamp(activated_at_unix, tz=timezone.utc)

#     tx_hash = _to_bytes32(event["transactionHash"])
#     log_idx = event["logIndex"]

#     booster = Booster(
#         owner_address=_to_bytes20(owner),
#         portfolio_id=None,                  # not provided in event
#         booster_type=booster_pct,          # use percentage as type
#         activated_at=activated_at,
#         expires_at=None,
#         created_tx_hash=tx_hash,
#         created_log_idx=log_idx,
#     )
#     session.add(booster)


# # async def sync_events_once():
# #     async with AsyncSessionLocal() as session:
# #         # state = await get_or_init_sync_state(session)
# #         # from_block = state.last_block + 1
        
# #         async with session.begin():
# #             state = await get_or_init_sync_state(session)
# #             from_block = state.last_block + 1
# #         latest_block = w3.eth.block_number

# #         if from_block > latest_block:
# #             print("No new blocks")
# #             return  # nothing to do

# #         to_block = min(latest_block, from_block + settings.SCAN_BLOCK_BATCH_SIZE)

# #         # NOTE: use .events.<Name>().get_logs to fetch event ranges
# #         user_registered_events = user_registry_contract.events.Registered().get_logs(
# #             from_block=from_block,
# #             to_block=to_block,
# #         )
# #         portfolio_created_events = portfolio_manager_contract.events.PortfolioCreated().get_logs(
# #             from_block=from_block,
# #             to_block=to_block,
# #         )
# #         booster_activated_events = portfolio_manager_contract.events.BoosterActivated().get_logs(
# #             from_block=from_block,
# #             to_block=to_block,
# #         )

# #         # Process inside single transaction for atomicity
# #         async with session.begin():
# #             for ev in user_registered_events:
# #                 await _handle_user_registered(session, ev)

# #             for ev in portfolio_created_events:
# #                 await _handle_portfolio_created(session, ev)

# #             for ev in booster_activated_events:
# #                 await _handle_booster_activated(session, ev)

# #             # update sync state
# #             await session.execute(
# #                 update(SyncState)
# #                 .where(SyncState.id == 1)
# #                 .values(last_block=to_block)
# #             )

# #         # commit done by context manager
# #         print(f"Synced blocks {from_block} -> {to_block}")




# async def sync_events_once():
#     async with AsyncSessionLocal() as session:

#         # ===== First transaction: load last block =====
#         async with session.begin():
#             state = await get_or_init_sync_state(session)
#             from_block = state.last_block + 1

#         latest_block = w3.eth.block_number
#         if from_block > latest_block:
#             print("No new blocks to sync")
#             return

#         to_block = min(latest_block, from_block + settings.SCAN_BLOCK_BATCH_SIZE)

#         # ===== Fetch blockchain logs (outside DB tx) =====

#         # 1) User registered
#         user_registered_events = user_registry_contract.events.Registered().get_logs(
#             from_block=from_block,
#             to_block=to_block,
#         )

#         # 2) Portfolio created
#         portfolio_created_events = portfolio_manager_contract.events.PortfolioCreated().get_logs(
#             from_block=from_block,
#             to_block=to_block,
#         )

#         # 3) Booster activated (use ONLY full version)
#         booster_activated_events = portfolio_manager_contract.events.BoosterActivated().get_logs(
#             from_block=from_block,
#             to_block=to_block,
#         )
        
        
#         portfolio_created_from_safe_events = portfolio_manager_contract.events.PortfolioCreatedFromSafe().get_logs(
#             from_block=from_block,
#             to_block=to_block,
#         )

#         portfolio_created_for_others_events = portfolio_manager_contract.events.PortfolioCreatedForOthersFromSafe().get_logs(
#             from_block=from_block,
#             to_block=to_block,
# )

#         # ===== Second DB transaction: write everything =====
#         async with session.begin():

#             # ---- Users ----
#             for ev in user_registered_events:
#                 await _handle_user_registered(session, ev)

#             # ---- Portfolios ----
#             for ev in portfolio_created_events:
#                 await _handle_portfolio_created(session, ev)
                
#             for ev in portfolio_created_from_safe_events:
#                 await _handle_portfolio_created_from_safe(session, ev)

#             for ev in portfolio_created_for_others_events:
#                 await _handle_portfolio_created_for_others(session, ev)

#             # ---- Boosters ----
#             for ev in booster_activated_events:
#                 await _handle_booster_activated(session, ev)

#             # ---- Update last scanned block ----
#             await session.execute(
#                 update(SyncState)
#                 .where(SyncState.id == 1)
#                 .values(last_block=to_block)
#             )

#         print(f"Synced blocks {from_block} → {to_block}")


# async def full_sync_loop():
#     """
#     For cron you usually call sync_events_once() once.
#     This loop is useful if you ever want a long-running daemon.
#     """
#     while True:
#         await sync_events_once()
#         await asyncio.sleep(60)
