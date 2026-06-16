from __future__ import annotations

from typing import Any

from agent_tools import build_widget_from_intent, heuristic_route, summarize_context
from llm import llm_client


def route_request(prompt: str, context: dict[str, Any], editing_widget: dict[str, Any] | None) -> dict[str, Any]:
    fallback = {
        'route': heuristic_route(prompt, editing_widget),
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
    fallback = {
        'reply': 'I can help open an account or prepare a money movement once you specify the account names and amount.',
        'open_section': 'move-money',
        'action': None,
    }
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
            'This app now mirrors the sample’s architecture with a Python coordinator, '
            'specialist agents, widget generation, and a separate LLM-backed analytics service.'
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
