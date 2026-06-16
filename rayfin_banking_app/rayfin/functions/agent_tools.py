from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Any


def make_trace(
    agent: str,
    title: str,
    detail: str,
    status: str = 'completed',
) -> dict[str, str]:
    return {
        'agent': agent,
        'title': title,
        'detail': detail,
        'status': status,
    }


def heuristic_route(
    prompt: str,
    editing_widget: dict[str, Any] | None,
    create_widget_hint: bool,
) -> str:
    lowered = prompt.lower()
    if editing_widget or create_widget_hint:
        return 'visualization_agent'
    if any(
        token in lowered
        for token in (
            'chart',
            'graph',
            'widget',
            'visual',
            'simulator',
            'planner',
            'calculator',
            'projection',
            'what-if',
            'ai module',
        )
    ):
        return 'visualization_agent'
    if any(token in lowered for token in ('help', 'support', 'how do', 'what can you do')):
        return 'support_agent'
    if any(
        token in lowered
        for token in ('create account', 'open account', 'transfer', 'move money', 'deposit', 'withdraw', 'payment')
    ):
        return 'account_agent'
    return 'fabric_agent'


def _query_data(query_key: str, analytics: dict[str, Any]) -> list[dict[str, Any]]:
    if query_key == 'monthly_cash_flow':
        return [
            {
                'month': point['monthLabel'],
                'income': point['income'],
                'expenses': point['expenses'],
                'net': point['net'],
            }
            for point in analytics.get('monthlyCashFlow', [])
        ]
    if query_key == 'merchant_spend':
        return [
            {
                'name': merchant['merchantName'],
                'value': merchant['amount'],
                'transactions': merchant['transactionCount'],
            }
            for merchant in analytics.get('topMerchants', [])
        ]
    if query_key == 'account_balances':
        return [
            {
                'name': account['name'],
                'balance': account['currentBalance'],
                'change': account['netChange'],
            }
            for account in analytics.get('accountSummaries', [])
        ]
    return [
        {
            'name': item['name'],
            'spent': item['spent'],
            'budget': item['budget'],
            'remaining': item['remaining'],
            'exceeded': item['exceededAmount'],
        }
        for item in analytics.get('categorySpend', [])
    ]


def hydrate_widget(widget: dict[str, Any], analytics: dict[str, Any]) -> dict[str, Any]:
    if widget.get('data_mode') != 'dynamic' or not widget.get('query_key'):
        return widget

    config = dict(widget.get('config', {}))
    custom_props = dict(config.get('customProps', {}))
    custom_props['data'] = _query_data(widget['query_key'], analytics)
    config['customProps'] = custom_props

    hydrated = dict(widget)
    hydrated['config'] = config
    return hydrated


def refresh_widget(widget: dict[str, Any], analytics: dict[str, Any]) -> dict[str, Any]:
    refreshed = hydrate_widget(widget, analytics)
    refreshed['last_refreshed'] = datetime.now(timezone.utc).isoformat()
    return refreshed


def _default_widget_colors(query_key: str) -> list[str]:
    if query_key == 'monthly_cash_flow':
        return ['#10b981', '#ef4444', '#2563eb']
    if query_key == 'merchant_spend':
        return ['#8b5cf6', '#2563eb', '#f97316', '#10b981', '#f43f5e']
    if query_key == 'account_balances':
        return ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b']
    return ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']


def build_widget_from_intent(
    intent: dict[str, Any],
    analytics: dict[str, Any],
    existing_widget: dict[str, Any] | None = None,
) -> dict[str, Any]:
    widget_type = intent.get('widget_type', 'chart')
    widget_id = (existing_widget or {}).get('id', str(uuid.uuid4()))
    data_mode = intent.get('data_mode', 'dynamic')
    chart_type = intent.get('chart_type', 'bar')
    query_key = intent.get('query_key', 'budget_health')

    widget = {
        'id': widget_id,
        'title': intent.get('title', 'AI widget'),
        'description': intent.get('description', ''),
        'widget_type': widget_type,
        'data_mode': data_mode,
        'query_key': query_key if widget_type == 'chart' and data_mode == 'dynamic' else None,
        'last_refreshed': datetime.now(timezone.utc).isoformat(),
        'config': {
            'chartType': 'simulation' if widget_type == 'simulation' else chart_type,
            'xAxis': intent.get('x_axis', 'name'),
            'yAxis': intent.get('y_axis', 'value'),
            'colors': intent.get('colors') or _default_widget_colors(query_key),
            'customProps': {},
        },
    }

    if widget_type == 'simulation':
        widget['simulation_config'] = {
            'simulation_type': intent.get('simulation_type', 'budget_planner'),
            'defaults': intent.get('defaults', {}),
        }
        return widget

    return hydrate_widget(widget, analytics)


def summarize_context(context: dict[str, Any]) -> dict[str, Any]:
    analytics = context.get('analytics', {})
    return {
        'profile': context.get('profile'),
        'accounts': [
            {
                'id': account['id'],
                'name': account['name'],
                'balance': account['currentBalance'],
                'type': account['accountType'],
            }
            for account in analytics.get('accountSummaries', [])
        ],
        'budget_health': analytics.get('budgetHealth', {}),
        'category_spend': analytics.get('categorySpend', [])[:8],
        'top_merchants': analytics.get('topMerchants', [])[:5],
        'recent_transactions': analytics.get('recentTransactions', [])[:8],
        'monthly_cash_flow': analytics.get('monthlyCashFlow', []),
    }


def clamp_currency(value: Any) -> float:
    try:
        numeric = float(str(value).replace('$', '').replace(',', '').strip())
    except ValueError:
        return 0.0
    return math.floor(numeric * 100) / 100
