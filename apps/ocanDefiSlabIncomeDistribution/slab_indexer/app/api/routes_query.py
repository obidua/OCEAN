from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.db import get_db
from app.models.user import User
from app.models.portfolio import Portfolio
from app.models.slab_achiever import SlabAchiever

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    result = await db.execute(
        select(User).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return users


@router.get("/users/{address}/portfolios")
async def user_portfolios(
    address: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Portfolio).where(Portfolio.owner_address == address.lower())
    )
    rows = result.scalars().all()
    return rows


@router.get("/slab-achievers")
async def list_slab_achievers(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    result = await db.execute(
        select(SlabAchiever).order_by(SlabAchiever.id.desc()).offset(skip).limit(limit)
    )
    rows = result.scalars().all()
    return rows
