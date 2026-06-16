from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env', override=False)


@dataclass(frozen=True)
class Settings:
    azure_openai_endpoint: str = os.getenv('AZURE_OPENAI_ENDPOINT', '').strip()
    azure_openai_api_key: str = os.getenv('AZURE_OPENAI_API_KEY', '').strip()
    azure_openai_deployment: str = os.getenv('AZURE_OPENAI_DEPLOYMENT', '').strip()
    azure_openai_api_version: str = os.getenv(
        'AZURE_OPENAI_API_VERSION', '2024-10-21'
    ).strip()
    agent_analytics_host: str = os.getenv('AGENT_ANALYTICS_HOST', '127.0.0.1').strip()
    agent_analytics_port: int = int(
        os.getenv('PORT') or os.getenv('AGENT_ANALYTICS_PORT', '5002')
    )
    allowed_origins: list[str] = tuple(
        origin.strip()
        for origin in os.getenv(
            'ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'
        ).split(',')
        if origin.strip()
    )

    @property
    def llm_configured(self) -> bool:
        return bool(
            self.azure_openai_endpoint
            and self.azure_openai_api_key
            and self.azure_openai_deployment
        )


settings = Settings()
