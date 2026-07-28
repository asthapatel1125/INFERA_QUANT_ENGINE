import os


class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
    STREAM_INTERVAL = float(os.getenv("STREAM_INTERVAL", "1.5"))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    MARKET_SYMBOL = os.getenv("MARKET_SYMBOL", "QQQ").upper()
    DATA_PROVIDER = os.getenv("DATA_PROVIDER", "auto").lower()
    TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY", "")
    TWELVEDATA_PRICE_TTL = float(os.getenv("TWELVEDATA_PRICE_TTL", "60"))
    THETADATA_API_KEY = os.getenv("THETADATA_API_KEY", "")
    THETADATA_MAX_DTE = int(os.getenv("THETADATA_MAX_DTE", "90"))
    THETADATA_STRIKE_RANGE = int(os.getenv("THETADATA_STRIKE_RANGE", "30"))
    THETADATA_CHAIN_TTL = float(os.getenv("THETADATA_CHAIN_TTL", "15"))
    THETADATA_OI_TTL = float(os.getenv("THETADATA_OI_TTL", "900"))
    JSON_SORT_KEYS = False
