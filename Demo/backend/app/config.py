from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",   # ✅ ignore unknown env vars
    )

    PORT: int = 4000
    MONGO_URI: str = ""
    JWT_SECRET: str = ""
    DEVICE_ENROLLMENT_CODE: str | None = None
    ENROLLMENT_CODE: str | None = None

settings = Settings()