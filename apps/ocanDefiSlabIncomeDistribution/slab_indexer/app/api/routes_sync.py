from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.db import get_db
from app.services.sync_service import sync_users, sync_portfolios, sync_slab_achievers

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/users")
async def sync_users_route(db: AsyncSession = Depends(get_db)):
    await sync_users(db)
    return {"status": "ok"}


@router.post("/portfolios")
async def sync_portfolios_route(db: AsyncSession = Depends(get_db)):
    await sync_portfolios(db)
    return {"status": "ok"}


@router.post("/slabs")
async def sync_slabs_route(db: AsyncSession = Depends(get_db)):
    await sync_slab_achievers(db)
    return {"status": "ok"}


@router.post("/all")
async def sync_all_route(db: AsyncSession = Depends(get_db)):
    await sync_users(db)
    await sync_portfolios(db)
    await sync_slab_achievers(db)
    return {"status": "ok"}


@router.post("/apply-team-procedures")
async def apply_team_procedures_route(db: AsyncSession = Depends(get_db)):
    """
    Apply/update team database procedures.
    Run this once after setup or when procedures are updated.
    """
    try:
        # Read the SQL file
        with open("migrations/team_procedures.sql", "r") as f:
            sql_content = f.read()

        # Execute using raw connection to handle multiple statements
        connection = await db.connection()
        await connection.exec_driver_sql(sql_content)
        await db.commit()

        return {
            "status": "success",
            "message": "Team procedures applied successfully",
            "functions_created": [
                "get_team_tree",
                "get_team_count",
                "get_team_max_depth",
                "get_legs_breakdown",
                "get_team_summary",
                "get_leg_team",
                "get_directs",
                "get_legs_portfolio_volume",
                "get_team_total_portfolio_volume",
                "calculate_user_roi_for_day",
                "calculate_team_roi_for_day",
                "calculate_legs_roi_for_day",
                "get_leg_roi_details_for_day"
            ]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
