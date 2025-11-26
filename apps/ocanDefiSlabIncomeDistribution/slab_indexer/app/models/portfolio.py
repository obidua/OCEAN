from sqlalchemy import Column, Integer, BigInteger, Boolean, String, DateTime
from sqlalchemy.sql import func
from app.core.db import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    pid = Column(BigInteger, primary_key=True, index=True)
    owner_address = Column(String, index=True, nullable=False)
    referrer_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True))
    tier = Column(Integer)
    principal_usd = Column(BigInteger)          # micro USD (1e6)
    cap_percent = Column(Integer)               # 200/250
    is_closed = Column(Boolean, default=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    is_capped = Column(Boolean, default=False)
    capped_at = Column(DateTime(timezone=True), nullable=True)
    booster = Column(Boolean, default=False)
    booster_activation = Column(DateTime(timezone=True), nullable=True)
    remaining_cap_usd = Column(BigInteger, default=0)  # micro USD
    usd_paid_so_far = Column(BigInteger, default=0)    # micro USD from ROIDistributor.paidUsdByPid
    total_freeze_intervals = Column(Integer, default=0)
    last_event_block = Column(BigInteger, default=0)
    created_row_at = Column(DateTime(timezone=True), server_default=func.now())
