# import asyncio
# from fastapi import FastAPI, Depends
# from sqlalchemy.ext.asyncio import AsyncSession

# from .core.db import engine, Base, get_db
# from .chain_sync import sync_events_once
# from .models import SyncState

# app = FastAPI(title="Slab Indexer API")


# @app.on_event("startup")
# async def on_startup():
#     # Create tables if not exist
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)


# @app.get("/health")
# async def health():
#     return {"status": "ok"}


# @app.post("/sync-now")
# async def sync_now():
#     """
#     Manual sync trigger (useful for debugging).
#     """
#     await sync_events_once()
#     return {"status": "synced"}


# @app.get("/sync-state")
# async def get_sync_state(db: AsyncSession = Depends(get_db)):
#     from sqlalchemy import select
#     result = await db.execute(select(SyncState).where(SyncState.id == 1))
#     state = result.scalar_one_or_none()
#     if not state:
#         return {"last_block": None}
#     return {"last_block": state.last_block, "updated_at": state.updated_at}




import asyncio
from fastapi import FastAPI

from app.core.db import Base, engine
from app.api.routes_sync import router as sync_router
from app.api.routes_query import router as query_router
from app.api.routes_team import router as team_router
from app.api.routes_slab_achievers import router as slab_achievers_router
from app.services.sync_service import sync_users, sync_portfolios, sync_slab_achievers
from app.api.slab_income_routes import router as slab_income_router
from app.api.slab_merkle_routes import router as slab_merkle_router
from app.api.slab_income_claim_routes import router as slab_income_claim_routes


app = FastAPI(title="Ocean DeFi Indexer")

app.include_router(sync_router)
app.include_router(query_router)
app.include_router(slab_income_router, prefix="/api", tags=["slab-income"])
app.include_router(team_router, prefix="/api", tags=["team"])
app.include_router(slab_achievers_router)
app.include_router(slab_merkle_router)
app.include_router(slab_income_claim_routes)


@app.on_event("startup")
async def on_startup():
    # create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # launch background sync task
    asyncio.create_task(sync_loop())


async def sync_loop():
    """
    Simple background sync loop:
    - runs every 30 seconds
    - pulls new on-chain events
    """
    from app.core.db import AsyncSessionLocal

    while True:
        try:
            async with AsyncSessionLocal() as db:
                await sync_users(db)
                await sync_portfolios(db)
                await sync_slab_achievers(db)
        except Exception as e:
            # log it properly in real app
            print("sync_loop error:", e)

        await asyncio.sleep(30)  # adjust interval as per your requirement
