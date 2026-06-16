from __future__ import annotations

import json
from typing import Any

from openai import AzureOpenAI

from config import settings


class AzureLLMClient:
    def __init__(self) -> None:
        self._client = (
            AzureOpenAI(
                api_key=settings.azure_openai_api_key,
                api_version=settings.azure_openai_api_version,
                azure_endpoint=settings.azure_openai_endpoint,
            )
            if settings.llm_configured
            else None
        )

    def generate_json(
        self,
        system_prompt: str,
        user_payload: dict[str, Any],
        fallback: dict[str, Any],
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        if not self._client:
            return fallback

        response = self._client.chat.completions.create(
            model=settings.azure_openai_deployment,
            temperature=temperature,
            response_format={'type': 'json_object'},
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': json.dumps(user_payload, ensure_ascii=True)},
            ],
        )
        content = response.choices[0].message.content or '{}'
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return fallback


llm_client = AzureLLMClient()
