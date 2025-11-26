from pydantic_settings import BaseSettings
from pydantic import  AnyUrl



class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/ocean_indexer"
    RPC_URL: AnyUrl
    USER_REGISTRY_ADDRESS: str
    PORTFOLIO_MANAGER_ADDRESS: str
    CAPPING_INCOME_MANAGER_ADDRESS: str
    SLAB_MANAGER_ADDRESS: str
    ROI_DISTRIBUTOR_ADDRESS: str
    SIGNER_PRIVATE_KEY: str
    SlabIncomeDistributorWithProof_CONTRACT_ADDRESS:str
    ADMIN_PRIVATE_KEY:str

    CHAIN_ID: int | None = None
    SCAN_BLOCK_BATCH_SIZE: int | None = None
    START_BLOCK: int | None = None

    class Config:
        env_file = ".env"


settings = Settings()