from sqlalchemy import Column, Integer, BigInteger, Boolean, String, DateTime
from sqlalchemy.sql import func
from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_address = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(BigInteger, nullable=True)
    referrer_address = Column(String, index=True, nullable=True)
    placement_parent = Column(String, nullable=True)
    placement_leg = Column(Integer, nullable=True)
    tier = Column(Integer, nullable=True)
    total_directs = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True))
    is_temp_deactive = Column(Boolean, default=False)
    last_event_block = Column(BigInteger, default=0)
    created_row_at = Column(DateTime(timezone=True), server_default=func.now())
