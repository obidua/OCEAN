"""
Quick script to reset the sync_state table
Run this to clear any corrupted block number data
"""
import asyncio
from app.core.db import get_db
from app.models.sync_state import SyncState


async def reset_sync_state():
    from sqlalchemy import text
    async for db in get_db():
        # Delete all sync state records
        result = await db.execute(text("DELETE FROM sync_state"))
        await db.commit()
        print(f"Deleted sync_state records")
        print("Database reset complete. Restart your server.")
        break


if __name__ == "__main__":
    asyncio.run(reset_sync_state())
