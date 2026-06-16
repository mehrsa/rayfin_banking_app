from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
STATE_DIR = BASE_DIR / 'state'
STATE_DIR.mkdir(exist_ok=True)
DB_PATH = STATE_DIR / 'agentic_app.db'


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_storage() -> None:
    with _connect() as connection:
        connection.executescript(
            '''
            CREATE TABLE IF NOT EXISTS widgets (
                widget_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            '''
        )


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_widgets(user_id: str) -> list[dict[str, Any]]:
    with _connect() as connection:
        rows = connection.execute(
            'SELECT payload FROM widgets WHERE user_id = ? ORDER BY updated_at DESC',
            (user_id,),
        ).fetchall()
    return [json.loads(row['payload']) for row in rows]


def get_widget(user_id: str, widget_id: str) -> dict[str, Any] | None:
    with _connect() as connection:
        row = connection.execute(
            'SELECT payload FROM widgets WHERE user_id = ? AND widget_id = ?',
            (user_id, widget_id),
        ).fetchone()
    return json.loads(row['payload']) if row else None


def save_widget(user_id: str, widget: dict[str, Any]) -> None:
    now = _utc_now()
    payload = json.dumps(widget)
    with _connect() as connection:
        connection.execute(
            '''
            INSERT INTO widgets (widget_id, user_id, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(widget_id) DO UPDATE SET
                user_id = excluded.user_id,
                payload = excluded.payload,
                updated_at = excluded.updated_at
            ''',
            (widget['id'], user_id, payload, now, now),
        )


def delete_widget(user_id: str, widget_id: str) -> bool:
    with _connect() as connection:
        result = connection.execute(
            'DELETE FROM widgets WHERE user_id = ? AND widget_id = ?',
            (user_id, widget_id),
        )
    return result.rowcount > 0


def append_chat_messages(
    session_id: str,
    user_id: str,
    messages: list[dict[str, str]],
) -> None:
    now = _utc_now()
    with _connect() as connection:
        connection.executemany(
            '''
            INSERT INTO chat_messages (session_id, user_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
            ''',
            [
                (session_id, user_id, message['role'], message['content'], now)
                for message in messages
            ],
        )


def get_chat_history(session_id: str, user_id: str) -> list[dict[str, str]]:
    with _connect() as connection:
        rows = connection.execute(
            '''
            SELECT role, content, created_at
            FROM chat_messages
            WHERE session_id = ? AND user_id = ?
            ORDER BY id ASC
            ''',
            (session_id, user_id),
        ).fetchall()
    return [dict(row) for row in rows]


def list_chat_sessions(user_id: str) -> list[dict[str, str]]:
    with _connect() as connection:
        rows = connection.execute(
            '''
            SELECT session_id, MIN(created_at) AS created_at, MAX(created_at) AS updated_at
            FROM chat_messages
            WHERE user_id = ?
            GROUP BY session_id
            ORDER BY updated_at DESC
            ''',
            (user_id,),
        ).fetchall()
    return [
        {
            'session_id': row['session_id'],
            'created_at': row['created_at'],
            'updated_at': row['updated_at'],
        }
        for row in rows
    ]
