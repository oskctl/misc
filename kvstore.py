#!/usr/bin/env python3
"""Simple key-value store backed by SQLite. CLI interface for get/set/del/list."""

import sqlite3
import sys
import os

DB_PATH = os.environ.get("KVSTORE_DB", os.path.expanduser("~/.kvstore.db"))

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS kv (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    return conn

def kv_set(key, value):
    conn = get_conn()
    conn.execute(
        "INSERT INTO kv (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        (key, value)
    )
    conn.commit()
    conn.close()
    print(f"  Set: {key} = {value}")

def kv_get(key):
    conn = get_conn()
    row = conn.execute("SELECT value FROM kv WHERE key = ?", (key,)).fetchone()
    conn.close()
    if row:
        print(row[0])
    else:
        print(f"  Key not found: {key}")
        sys.exit(1)

def kv_del(key):
    conn = get_conn()
    cur = conn.execute("DELETE FROM kv WHERE key = ?", (key,))
    conn.commit()
    conn.close()
    if cur.rowcount:
        print(f"  Deleted: {key}")
    else:
        print(f"  Key not found: {key}")

def kv_list():
    conn = get_conn()
    rows = conn.execute("SELECT key, value, updated_at FROM kv ORDER BY key").fetchall()
    conn.close()
    if not rows:
        print("  (empty)")
        return
    max_key = max(len(r[0]) for r in rows)
    for key, value, ts in rows:
        print(f"  {key:<{max_key}}  {value}  ({ts})")

def kv_search(pattern):
    """Search keys and values by LIKE pattern."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT key, value FROM kv WHERE key LIKE ? OR value LIKE ? ORDER BY key",
        (f"%{pattern}%", f"%{pattern}%")
    ).fetchall()
    conn.close()
    if not rows:
        print(f"  No matches for: {pattern}")
        return
    for key, value in rows:
        print(f"  {key} = {value}")

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: kvstore.py <command> [args]")
        print("  set <key> <value>   Store a key-value pair")
        print("  get <key>           Retrieve a value")
        print("  del <key>           Delete a key")
        print("  list                List all pairs")
        print("  search <pattern>    Search keys and values")
        return

    cmd = sys.argv[1]
    if cmd == "set" and len(sys.argv) == 4:
        kv_set(sys.argv[2], sys.argv[3])
    elif cmd == "get" and len(sys.argv) == 3:
        kv_get(sys.argv[2])
    elif cmd == "del" and len(sys.argv) == 3:
        kv_del(sys.argv[2])
    elif cmd == "list":
        kv_list()
    elif cmd == "search" and len(sys.argv) == 3:
        kv_search(sys.argv[2])
    else:
        print(f"Unknown command or wrong args: {' '.join(sys.argv[1:])}")
        sys.exit(1)

if __name__ == "__main__":
    main()
