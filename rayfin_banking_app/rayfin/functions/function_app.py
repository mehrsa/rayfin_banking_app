from __future__ import annotations

import fabric.functions as fn

from multi_agent_banking import run_multi_agent_workflow

udf = fn.UserDataFunctions()


@udf.function()
def chatWithBankingAgents(input: dict) -> dict:
    snapshot = input.get('snapshot') or {}
    analytics = input.get('analytics') or {}
    context = {
        'profile': snapshot.get('profile'),
        'accounts': snapshot.get('accounts', []),
        'categories': snapshot.get('categories', []),
        'transactions': snapshot.get('transactions', []),
        'analytics': analytics,
    }

    return run_multi_agent_workflow(
        prompt=input.get('prompt', ''),
        context=context,
        session_id=input.get('sessionId', ''),
        user_id=input.get('userId', ''),
        editing_widget=input.get('editingWidget'),
        create_widget_hint=bool(input.get('createWidgetHint', False)),
    )
