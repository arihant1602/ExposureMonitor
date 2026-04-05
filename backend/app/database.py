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
            compromised_data TEXT
        )
    ''')
    
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
    
    conn.commit()
    conn.close()
