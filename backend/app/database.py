import sqlite3
import os

DB_NAME = "exposure_db.sqlite"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS breaches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            date TEXT,
            severity INTEGER,
            domains TEXT,
            compromised_data TEXT,
            source_url TEXT,
            imported_at TEXT
        )
    ''')

    # Lightweight migration path for existing DB files created before metadata fields were added.
    _ensure_column(cursor, "breaches", "source_url", "TEXT")
    _ensure_column(cursor, "breaches", "imported_at", "TEXT")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_breaches (
            user_id INTEGER,
            breach_id INTEGER,
            PRIMARY KEY (user_id, breach_id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (breach_id) REFERENCES breaches (id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leaked_passwords (
            hash_prefix TEXT NOT NULL,
            hash_suffix TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            PRIMARY KEY (hash_prefix, hash_suffix)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metadata_import_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_file TEXT NOT NULL,
            imported_count INTEGER NOT NULL DEFAULT 0,
            updated_count INTEGER NOT NULL DEFAULT 0,
            skipped_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE UNIQUE INDEX IF NOT EXISTS idx_breaches_name_date
        ON breaches(name, date)
    ''')

    conn.commit()
    conn.close()


def _ensure_column(cursor: sqlite3.Cursor, table: str, column: str, column_type: str):
    cursor.execute(f"PRAGMA table_info({table})")
    columns = {row[1] for row in cursor.fetchall()}
    if column not in columns:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}")
