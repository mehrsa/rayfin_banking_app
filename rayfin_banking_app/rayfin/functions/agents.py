from __future__ import annotations

from typing import Any

from agent_tools import build_widget_from_intent, clamp_currency, heuristic_route, summarize_context
from llm import llm_client


def _find_accounts(prompt: str, context: dict[str, Any]) -> list[dict[str, Any]]:
    lowered = prompt.lower()
    return [
        account
        for account in context.get('analytics', {}).get('accountSummaries', [])
        if account['name'].lower() in lowered
    ]


def _find_category(prompt: str, context: dict[str, Any]) -> dict[str, Any] | None:
    lowered = prompt.lower()
    for category in context.get('categories', []):
        if category['name'].lower() in lowered:
            return category
    return None


def _infer_account_type(prompt: str) -> str:
    lowered = prompt.lower()
    if 'savings' in lowered:
        return 'savings'
    if 'investment' in lowered or 'brokerage' in lowered:
        return 'investment'
    return 'checking'


def _parse_account_action(prompt: str, context: dict[str, Any]) -> dict[str, Any] | None:
    lowered = prompt.lower()
    amount_match = __import__('re').search(r'\$?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)', prompt)
    amount = clamp_currency(amount_match.group(1) if amount_match else None)
    matched_accounts = _find_accounts(prompt, context)
    matched_category = _find_category(prompt, context)

    if __import__('re').search(r'(create|open).*(account)', lowered):
        account_type = _infer_account_type(prompt)
        institution_match = __import__('re').search(r'(?:at|with)\s+([A-Za-z0-9 .&\'-]{3,60})', prompt, __import__('re').IGNORECASE)
        return {
            'type': 'create_account',
            'payload': {
                'name': f'{account_type.capitalize()} Account',
                'accountType': account_type,
                'institution': institution_match.group(1).strip() if institution_match else 'Rayfin Credit Union',
                'openingBalance': amount,
            },
        }

    if ('transfer' in lowered or 'move money' in lowered) and len(matched_accounts) >= 2 and amount > 0:
        from_account = matched_accounts[0]
        to_account = matched_accounts[1]
        return {
            'type': 'create_transaction',
            'payload': {
                'transactionType': 'transfer',
                'amount': amount,
                'description': f"Transfer from {from_account['name']} to {to_account['name']}",
                'fromAccountId': from_account['id'],
                'toAccountId': to_account['id'],
                'counterpartyName': to_account['name'],
            },
        }

    if 'deposit' in lowered and len(matched_accounts) >= 1 and amount > 0:
        destination = matched_accounts[0]
        return {
            'type': 'create_transaction',
            'payload': {
                'transactionType': 'deposit',
                'amount': amount,
                'description': f"Deposit into {destination['name']}",
                'toAccountId': destination['id'],
            },
        }

    if any(token in lowered for token in ('withdraw', 'payment', 'pay', 'spent', 'purchase')) and len(matched_accounts) >= 1 and amount > 0:
        source = matched_accounts[0]
        merchant_match = __import__('re').search(r'(?:at|for)\s+([A-Za-z0-9 .&\'-]{2,60})', prompt, __import__('re').IGNORECASE)
        return {
            'type': 'create_transaction',
            'payload': {
                'transactionType': 'withdrawal' if 'withdraw' in lowered else 'payment',
                'amount': amount,
                'description': prompt.strip(),
                'fromAccountId': source['id'],
                'categoryId': matched_category['id'] if matched_category else None,
                'merchantName': merchant_match.group(1).strip() if merchant_match else None,
            },
        }

    return None


def route_request(
    prompt: str,
    context: dict[str, Any],
    editing_widget: dict[str, Any] | None,
    create_widget_hint: bool,
) -> dict[str, Any]:
    fallback = {
        'route': heuristic_route(prompt, editing_widget, create_widget_hint),
        'reason': 'Keyword-based fallback route.',
    }
    system_prompt = '''
You are the coordinator in a banking multi-agent system.
Return JSON with:
- route: one of "fabric_agent", "account_agent", "support_agent", "visualization_agent"
- reason: one sentence

Route rules:
- READ-ONLY questions about balances, spending, transactions, budgets, merchants, or trends -> fabric_agent
- WRITE operations like creating accounts or moving money -> account_agent
- Requests about capabilities or guidance -> support_agent
- Requests to create, edit, refresh, or explain AI Module charts/widgets/simulators -> visualization_agent
'''
    payload = {
        'prompt': prompt,
        'editing_widget': editing_widget,
        'create_widget_hint': create_widget_hint,
        'context_summary': summarize_context(context),
    }
    return llm_client.generate_json(system_prompt, payload, fallback)


def run_fabric_agent(prompt: str, context: dict[str, Any]) -> dict[str, Any]:
    analytics = context.get('analytics', {})
    fallback = {
        'reply': (
            f"This month you brought in ${round(analytics.get('monthlyIncome', 0)):,}, "
            f"spent ${round(analytics.get('monthlyExpenses', 0)):,}, and are tracking "
            f"a {analytics.get('savingsRate', 0):.1f}% savings rate."
        ),
        'open_section': 'analytics',
    }
    system_prompt = '''
You are the Fabric data specialist in a banking multi-agent system.
Use only the provided banking context. Do not invent records.
Return JSON with:
- reply: concise Markdown-ready answer for the user
- open_section: one of overview, activity, analytics
'''
    payload = {'prompt': prompt, 'context_summary': summarize_context(context)}
    return llm_client.generate_json(system_prompt, payload, fallback)


def run_account_agent(prompt: str, context: dict[str, Any]) -> dict[str, Any]:
    fallback_action = _parse_account_action(prompt, context)
    fallback = (
        {
            'reply': (
                'I prepared a new account for the Move Money workspace.'
                if fallback_action and fallback_action['type'] == 'create_account'
                else 'I prepared the money movement for the Move Money workspace.'
            ),
            'open_section': 'move-money',
            'action': fallback_action,
        }
        if fallback_action
        else {
            'reply': 'I can help open an account or prepare a money movement once you specify the account names and amount.',
            'open_section': 'move-money',
            'action': None,
        }
    )
    system_prompt = '''
You are the account-management specialist in a banking multi-agent system.
Use the provided accounts and categories to prepare frontend actions.
Return JSON with:
- reply: concise user-facing answer
- open_section: always "move-money" unless you are only answering a balance question
- action: null OR an object with:
  - type: "create_account" or "create_transaction"
  - payload: the exact payload for the frontend

For transfers or payments, use create_transaction payload keys:
transactionType, amount, description, categoryId, fromAccountId, toAccountId, merchantName, counterpartyName

For account creation, use create_account payload keys:
name, accountType, institution, openingBalance
'''
    payload = {'prompt': prompt, 'context_summary': summarize_context(context)}
    return llm_client.generate_json(system_prompt, payload, fallback)


def run_support_agent(prompt: str, context: dict[str, Any]) -> dict[str, Any]:
    fallback = {
        'reply': (
            'This app uses a Python UDF coordinator for the LLM-backed workflow, while chat history and AI widgets remain stored directly in Rayfin data.'
        ),
        'open_section': 'ai-module',
    }
    system_prompt = '''
You are the support specialist in a banking multi-agent system.
Return JSON with:
- reply: concise helpful answer
- open_section: one of overview, analytics, ai-module
'''
    payload = {'prompt': prompt, 'context_summary': summarize_context(context)}
    return llm_client.generate_json(system_prompt, payload, fallback)


def run_visualization_agent(
    prompt: str,
    context: dict[str, Any],
    editing_widget: dict[str, Any] | None,
) -> dict[str, Any]:
    analytics = context.get('analytics', {})
    fallback_intent = {
        'title': 'Budget health tracker',
        'description': 'Dynamic view of spend against current monthly budgets.',
        'widget_type': 'chart',
        'data_mode': 'dynamic',
        'chart_type': 'bar',
        'query_key': 'budget_health',
        'x_axis': 'name',
        'y_axis': 'spent',
    }
    fallback = {
        'reply': 'Created a new AI Module visualization from the latest banking context.',
        'open_section': 'ai-module',
        'widget_intent': fallback_intent,
    }
    system_prompt = '''
You are the visualization specialist in a banking multi-agent system.
Return JSON with:
- reply: concise answer
- open_section: always "ai-module"
- widget_intent: object with fields:
  title, description, widget_type ("chart" or "simulation"), data_mode ("dynamic" or "static"),
  chart_type ("bar", "line", "pie", "area"), query_key ("monthly_cash_flow", "budget_health", "merchant_spend", "account_balances"),
  x_axis, y_axis, simulation_type ("budget_planner", "savings_projector", "emergency_fund"), defaults

Rules:
- Editing an existing widget should preserve its purpose unless the user clearly changes it.
- Use dynamic charts for current banking data.
- Use simulations for what-if, planner, projector, emergency fund, or savings calculator requests.
'''
    payload = {
        'prompt': prompt,
        'editing_widget': editing_widget,
        'context_summary': summarize_context(context),
    }
    result = llm_client.generate_json(system_prompt, payload, fallback)
    intent = result.get('widget_intent') or fallback_intent
    result['widget'] = build_widget_from_intent(intent, analytics, existing_widget=editing_widget)
    return result
