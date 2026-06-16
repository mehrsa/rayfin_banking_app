export class AzureLlmClient {
  private readonly endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim() ?? '';
  private readonly apiKey = process.env.AZURE_OPENAI_API_KEY?.trim() ?? '';
  private readonly deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ?? '';
  private readonly apiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || '2024-10-21';

  private get configured(): boolean {
    return Boolean(this.endpoint && this.apiKey && this.deployment);
  }

  async generateJson<T extends object>(
    systemPrompt: string,
    userPayload: Record<string, unknown>,
    fallback: T,
    temperature = 0.1
  ): Promise<T> {
    if (!this.configured) {
      console.warn('Azure OpenAI is not configured for the app functions; using fallback response.');
      return fallback;
    }

    const url = new URL(
      `/openai/deployments/${encodeURIComponent(this.deployment)}/chat/completions`,
      this.endpoint.endsWith('/') ? this.endpoint : `${this.endpoint}/`
    );
    url.searchParams.set('api-version', this.apiVersion);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.deployment,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userPayload) },
        ],
      }),
    }).catch((error: unknown) => {
      console.warn('Azure OpenAI request failed; using fallback response.', error);
      return undefined;
    });

    if (!response) {
      return fallback;
    }

    if (!response.ok) {
      console.warn(`Azure OpenAI returned ${response.status}; using fallback response.`);
      return fallback;
    }

    const body = (await response.json().catch((error: unknown) => {
      console.warn('Azure OpenAI response was not valid JSON; using fallback response.', error);
      return undefined;
    })) as
      | {
          choices?: Array<{
            message?: {
              content?: string | null;
            };
          }>;
        }
      | undefined;

    const content = body?.choices?.[0]?.message?.content ?? '{}';

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      console.warn('Azure OpenAI returned a non-JSON content payload; using fallback response.', error);
      return fallback;
    }
  }
}

export const llmClient = new AzureLlmClient();
