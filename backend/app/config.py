import os


class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
    STREAM_INTERVAL = float(os.getenv("STREAM_INTERVAL", "1.5"))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    JSON_SORT_KEYS = False

