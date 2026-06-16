from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    azure_openai_endpoint: str = os.getenv('AZURE_OPENAI_ENDPOINT', '').strip()
    azure_openai_api_key: str = os.getenv('AZURE_OPENAI_API_KEY', '').strip()
    azure_openai_deployment: str = os.getenv('AZURE_OPENAI_DEPLOYMENT', '').strip()
    azure_openai_api_version: str = os.getenv(
        'AZURE_OPENAI_API_VERSION', '2024-10-21'
    ).strip()

    @property
    def llm_configured(self) -> bool:
        return bool(
            self.azure_openai_endpoint
            and self.azure_openai_api_key
            and self.azure_openai_deployment
        )


settings = Settings()
