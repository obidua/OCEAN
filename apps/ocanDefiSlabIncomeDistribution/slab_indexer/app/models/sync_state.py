from sqlalchemy import Column, Integer, BigInteger
from app.core.db import Base


class SyncState(Base):
    __tablename__ = "sync_state"

    id = Column(Integer, primary_key=True, index=True)
    last_user_block = Column(BigInteger, default=0)
    last_portfolio_block = Column(BigInteger, default=0)
    last_slab_block = Column(BigInteger, default=0)
