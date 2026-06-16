from __future__ import annotations

from agent_analytics import app
from config import settings


if __name__ == '__main__':
    print(
        f'Agent analytics service starting on http://{settings.agent_analytics_host}:{settings.agent_analytics_port}'
    )
    print('Configure Azure OpenAI in backend/.env before using the chat workflow.')
    app.run(
        debug=False,
        host=settings.agent_analytics_host,
        port=settings.agent_analytics_port,
        use_reloader=False,
        threaded=True,
    )
