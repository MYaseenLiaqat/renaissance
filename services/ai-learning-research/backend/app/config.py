from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    renaissance_service_token: str = ""
    database_url: str = "sqlite:///./research.db"
    study_protocol_version: str = "v0.4"
    learning_module_version: str = "v0.6.0"
    system_prompt_version: str = "0.6.0"
    llm_provider: str = "gemini"
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = "gemini-3.5-flash-lite"
    llm_timeout_seconds: int = 45
    ai_interaction_cap: int = 8
    # Pilot parameter: maximum Supported-session duration in minutes.
    supported_phase_minutes: int = 20

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
