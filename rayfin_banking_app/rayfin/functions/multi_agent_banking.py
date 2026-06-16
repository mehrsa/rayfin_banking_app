from __future__ import annotations

from typing import Any

from agent_tools import make_trace
from agents import (
    route_request,
    run_account_agent,
    run_fabric_agent,
    run_support_agent,
    run_visualization_agent,
)


def run_multi_agent_workflow(
    prompt: str,
    context: dict[str, Any],
    session_id: str,
    user_id: str,
    editing_widget: dict[str, Any] | None = None,
    create_widget_hint: bool = False,
) -> dict[str, Any]:
    routing = route_request(prompt, context, editing_widget, create_widget_hint)
    route = routing.get('route', 'fabric_agent')
    trace = [
        make_trace(
            'coordinator',
            'Coordinator routed the request',
            routing.get('reason', f'Routed to {route}.'),
        )
    ]

    if route == 'visualization_agent':
        result = run_visualization_agent(prompt, context, editing_widget)
        trace.append(
            make_trace(
                'visualization_agent',
                'Visualization specialist completed the request',
                'Prepared an AI Module widget or simulator from the latest banking context.',
            )
        )
        return {
            'response': result['reply'],
            'session_id': session_id,
            'trace': trace,
            'widget': result.get('widget'),
            'widget_created': editing_widget is None,
            'widget_updated': editing_widget is not None,
            'widget_mode': result.get('widget', {}).get('data_mode'),
            'widget_type': result.get('widget', {}).get('widget_type'),
            'simulation_type': (
                result.get('widget', {})
                .get('simulation_config', {})
                .get('simulation_type')
            ),
            'open_section': result.get('open_section', 'ai-module'),
            'actions': [],
        }

    if route == 'support_agent':
        result = run_support_agent(prompt, context)
        trace.append(
            make_trace(
                'support_agent',
                'Support specialist answered the request',
                'Explained the app behavior and agent capabilities.',
            )
        )
        return {
            'response': result['reply'],
            'session_id': session_id,
            'trace': trace,
            'open_section': result.get('open_section', 'ai-module'),
            'actions': [],
        }

    if route == 'account_agent':
        result = run_account_agent(prompt, context)
        trace.append(
            make_trace(
                'account_agent',
                'Account specialist handled the request',
                'Prepared a banking action or direct answer.',
            )
        )
        return {
            'response': result['reply'],
            'session_id': session_id,
            'trace': trace,
            'open_section': result.get('open_section', 'move-money'),
            'actions': [result['action']] if result.get('action') else [],
        }

    result = run_fabric_agent(prompt, context)
    trace.append(
        make_trace(
            'fabric_agent',
            'Data specialist answered from the banking context',
            'Resolved a read-only analytics question.',
        )
    )
    return {
        'response': result['reply'],
        'session_id': session_id,
        'trace': trace,
        'open_section': result.get('open_section', 'analytics'),
        'actions': [],
    }
