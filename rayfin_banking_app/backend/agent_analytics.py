from __future__ import annotations

from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import settings
from multi_agent_banking import run_multi_agent_workflow
from storage import (
    append_chat_messages,
    delete_widget,
    get_chat_history,
    get_widget,
    initialize_storage,
    list_chat_sessions,
    list_widgets,
    save_widget,
)
from agent_tools import refresh_widget

initialize_storage()

app = Flask(__name__)
CORS(app, origins=list(settings.allowed_origins))


def _user_id_from_request(data: dict[str, Any]) -> str:
    return (
        str(data.get('user_id') or '').strip()
        or str(request.headers.get('X-User-Id') or '').strip()
        or 'local-user'
    )


def _session_id_from_request(data: dict[str, Any]) -> str:
    return str(data.get('session_id') or '').strip() or 'default-session'


@app.get('/api/health')
def health() -> Any:
    return jsonify(
        {
            'status': 'ok',
            'llmConfigured': settings.llm_configured,
            'port': settings.agent_analytics_port,
        }
    )


@app.get('/api/chat/sessions')
def chat_sessions() -> Any:
    user_id = request.args.get('user_id', '').strip() or request.headers.get('X-User-Id', 'local-user')
    return jsonify(list_chat_sessions(user_id))


@app.get('/api/chat/history/<session_id>')
def chat_history(session_id: str) -> Any:
    user_id = request.args.get('user_id', '').strip() or request.headers.get('X-User-Id', 'local-user')
    history = get_chat_history(session_id, user_id)
    return jsonify(history)


@app.post('/api/chatbot')
def chatbot() -> Any:
    if not settings.llm_configured:
        return (
            jsonify(
                {
                    'error': 'Azure OpenAI is not configured. Set backend/.env from backend/.env.sample.',
                }
            ),
            503,
        )

    data = request.get_json(force=True) or {}
    messages = data.get('messages') or []
    if not messages:
        return jsonify({'error': 'messages is required'}), 400

    prompt = str(messages[-1].get('content') or '').strip()
    if not prompt:
        return jsonify({'error': 'last message content is required'}), 400

    user_id = _user_id_from_request(data)
    session_id = _session_id_from_request(data)
    context = data.get('context') or {}
    editing_widget = data.get('edit_widget')

    result = run_multi_agent_workflow(
        prompt=prompt,
        context=context,
        session_id=session_id,
        user_id=user_id,
        editing_widget=editing_widget,
    )

    widget = result.get('widget')
    if widget:
        save_widget(user_id, widget)

    append_chat_messages(
        session_id,
        user_id,
        [
            {'role': 'user', 'content': prompt},
            {'role': 'assistant', 'content': result['response']},
        ],
    )

    return jsonify(result)


@app.get('/api/ai-widgets')
def ai_widgets() -> Any:
    user_id = request.headers.get('X-User-Id', 'local-user')
    return jsonify(list_widgets(user_id))


@app.post('/api/ai-widgets/<widget_id>/refresh')
def refresh_ai_widget(widget_id: str) -> Any:
    data = request.get_json(silent=True) or {}
    user_id = _user_id_from_request(data)
    context = data.get('context') or {}
    widget = get_widget(user_id, widget_id)
    if not widget:
        return jsonify({'error': 'Widget not found'}), 404

    refreshed = refresh_widget(widget, context.get('analytics') or {})
    save_widget(user_id, refreshed)
    return jsonify({'widget': refreshed})


@app.delete('/api/ai-widgets/<widget_id>')
def remove_ai_widget(widget_id: str) -> Any:
    user_id = request.headers.get('X-User-Id', 'local-user')
    success = delete_widget(user_id, widget_id)
    return jsonify({'deleted': success}), (200 if success else 404)
