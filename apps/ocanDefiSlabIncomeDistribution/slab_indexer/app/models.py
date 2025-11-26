# from sqlalchemy import (
#     Column, BigInteger, Integer, Boolean, DateTime, SmallInteger,
#     UniqueConstraint, LargeBinary
# )
# from sqlalchemy.sql import func
# from .core.db import Base


# class SyncState(Base):
#     __tablename__ = "sync_state"

#     id = Column(SmallInteger, primary_key=True, default=1)
#     last_block = Column(BigInteger, nullable=False)
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# class User(Base):
#     __tablename__ = "users"
#     id = Column(BigInteger, primary_key=True, autoincrement=True)
#     wallet_address = Column(LargeBinary(20), unique=True, nullable=False)
#     user_id_onchain = Column(BigInteger)
#     sponsor_address = Column(LargeBinary(20))
#     joined_at = Column(DateTime(timezone=True), nullable=False)
#     created_tx_hash = Column(LargeBinary(32), nullable=False)
#     created_log_idx = Column(Integer, nullable=False)
#     __table_args__ = (
#         UniqueConstraint("created_tx_hash", "created_log_idx", name="uq_user_event"),
#     )


# # class Portfolio(Base):
# #     __tablename__ = "portfolios"
# #     id = Column(BigInteger, primary_key=True, autoincrement=True)
# #     portfolio_id = Column(BigInteger, unique=True, nullable=False)
# #     owner_address = Column(LargeBinary(20), nullable=False)
# #     amount_usd6 = Column(BigInteger, nullable=False)
# #     started_at = Column(DateTime(timezone=True), nullable=False)
# #     is_active = Column(Boolean, nullable=False, default=True)
# #     created_tx_hash = Column(LargeBinary(32), nullable=False)
# #     created_log_idx = Column(Integer, nullable=False)
# #     __table_args__ = (
# #         UniqueConstraint("created_tx_hash", "created_log_idx", name="uq_portfolio_event"),
# #     )


# class Portfolio(Base):
#     __tablename__ = "portfolios"

#     id = Column(BigInteger, primary_key=True, autoincrement=True)
    
#     portfolio_id = Column(BigInteger, unique=True, nullable=False)

#     owner_address = Column(LargeBinary(20), nullable=False)     # user / beneficiary
#     created_by = Column(LargeBinary(20))                        # caller (for others)

#     principal_usd6 = Column(BigInteger, nullable=False, default=0)
#     principal_rama = Column(BigInteger, nullable=False, default=0)

#     tier = Column(SmallInteger)                                 # only PortfolioCreated

#     created_at = Column(DateTime(timezone=True), nullable=False)
#     is_active = Column(Boolean, nullable=False, default=True)

#     created_tx_hash = Column(LargeBinary(32), nullable=False)
#     created_log_idx = Column(Integer, nullable=False)

#     __table_args__ = (
#         UniqueConstraint("created_tx_hash", "created_log_idx", name="uq_portfolio_event"),
#     )



# class Booster(Base):
#     __tablename__ = "boosters"
#     id = Column(BigInteger, primary_key=True, autoincrement=True)
#     owner_address = Column(LargeBinary(20), nullable=False)
#     portfolio_id = Column(BigInteger, nullable=False)
#     booster_type = Column(SmallInteger, nullable=False)
#     activated_at = Column(DateTime(timezone=True), nullable=False)
#     expires_at = Column(DateTime(timezone=True))
#     created_tx_hash = Column(LargeBinary(32), nullable=False)
#     created_log_idx = Column(Integer, nullable=False)
#     __table_args__ = (
#         UniqueConstraint("created_tx_hash", "created_log_idx", name="uq_booster_event"),
#     )


# class DailyTeamVolume(Base):
#     __tablename__ = "daily_team_volume"
#     id = Column(BigInteger, primary_key=True, autoincrement=True)
#     user_address = Column(LargeBinary(20), nullable=False)
#     day_id = Column(Integer, nullable=False)
#     leg_id = Column(SmallInteger, nullable=False)
#     volume_usd6 = Column(BigInteger, nullable=False, default=0)
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
#     __table_args__ = (
#         UniqueConstraint("user_address", "day_id", "leg_id", name="uq_dtv_user_day_leg"),
#     )


from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from .core.db import Base


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
