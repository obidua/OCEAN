from sqlalchemy import Column, Integer, BigInteger, String, DateTime,DECIMAL,UniqueConstraint
from sqlalchemy.sql import func
from app.core.db import Base


class SlabAchiever(Base):
    __tablename__ = "slab_achievers"

    id = Column(Integer, primary_key=True, index=True)
    user_address = Column(String, index=True)
    slab_index = Column(Integer)
    qualified_target = Column(BigInteger)
    leg1 = Column(BigInteger)
    leg2 = Column(BigInteger)
    leg_rest = Column(BigInteger)
    achieved_at = Column(DateTime(timezone=True), server_default=func.now())
    block_number = Column(BigInteger, index=True)




# # from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, UniqueConstraint
# from sqlalchemy.sql import func
# from .core.db import Base


class SlabAchievement(Base):
    """
    Model for tracking SLAB achievement levels for users on a daily basis.
    Records when users achieve specific SLAB percentage levels.
    """
    __tablename__ = "slab_achievements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_address = Column(String, nullable=False, index=True)
    day_id = Column(Integer, nullable=False, index=True)
    slab_level = Column(Integer, nullable=False)
    slab_percentage = Column(DECIMAL(5, 2), nullable=False)
    achieved_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_address", "day_id", name="uq_slab_achievement_user_day"),
    )
