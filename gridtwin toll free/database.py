"""GRIDTWIN Toll-Free IVR Service - SQLite Database Module

Stores persistent call records, caller phone numbers, selected languages,
queried tower statuses, physical voltage/current telemetry at the moment of call,
spoken audio responses, and authorized registered phone numbers (whitelist & blocklist).
"""

import os
import re
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "call_logs.db")


def get_connection():
    """Get SQLite database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def normalize_phone_number(phone: str) -> str:
    """Normalize phone number to digits with optional leading '+'."""
    if not phone:
        return ""
    phone = str(phone).strip()
    has_plus = phone.startswith("+")
    digits = re.sub(r"[^\d]", "", phone)
    return f"+{digits}" if has_plus else digits


def init_db():
    """Initialize database tables for call usage tracking and caller access control."""
    conn = get_connection()
    try:
        with conn:
            # 1. Call Logs Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS call_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    call_sid TEXT,
                    caller_number TEXT NOT NULL,
                    caller_name TEXT,
                    call_type TEXT NOT NULL,
                    language TEXT,
                    tower_id TEXT,
                    tower_status TEXT,
                    voltage_v REAL DEFAULT 0.0,
                    current_ma REAL DEFAULT 0.0,
                    spoken_response TEXT,
                    duration_seconds INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'COMPLETED'
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_call_logs_timestamp 
                ON call_logs(timestamp DESC);
            """)

            # 2. Registered Authorized Phone Numbers Table (Whitelist & Blocklist)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS registered_numbers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone_number TEXT UNIQUE NOT NULL,
                    display_name TEXT NOT NULL,
                    role TEXT DEFAULT 'OPERATOR',
                    status TEXT DEFAULT 'ACTIVE',
                    registered_at TEXT NOT NULL,
                    updated_at TEXT,
                    notes TEXT
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_reg_phone 
                ON registered_numbers(phone_number);
            """)

            # 3. Seed Default Registered Numbers if table is empty
            cursor = conn.execute("SELECT COUNT(*) as cnt FROM registered_numbers")
            count = cursor.fetchone()["cnt"]
            if count == 0:
                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                default_numbers = [
                    ("+15738595176", "Official GridTwin Hotline", "SYSTEM_GATEWAY", "ACTIVE", now_str, "Twilio Toll-Free Direct Inbound"),
                    ("+919876543210", "Madhu (Chief Grid Controller)", "GRID_ADMIN", "ACTIVE", now_str, "Authorized Primary Dispatcher"),
                    ("+919444012345", "Substation Operations Desk", "OPERATOR", "ACTIVE", now_str, "Substation 33/11kV Main Feed Control"),
                    ("+18005550199", "Field Line Inspector (T1-T5)", "FIELD_TECH", "ACTIVE", now_str, "Corridor Maintenance Personnel")
                ]
                conn.executemany("""
                    INSERT INTO registered_numbers (
                        phone_number, display_name, role, status, registered_at, notes
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, default_numbers)
    finally:
        conn.close()


def check_caller_authorization(raw_phone: str) -> Dict[str, Any]:
    """
    Verify whether an incoming phone number is authorized to access the Toll-Free IVR.
    
    Returns:
      - authorized: True/False
      - status: 'ACTIVE', 'BLOCKED', or 'UNREGISTERED'
      - caller_info: Dict or None
      - message: Explanatory status text
    """
    init_db()
    norm = normalize_phone_number(raw_phone)
    if not norm:
        return {
            "authorized": False,
            "status": "UNREGISTERED",
            "caller_info": None,
            "message": "Empty or invalid phone number format."
        }

    # Extract last 10 digits for flexible national/international match
    digits_only = re.sub(r"[^\d]", "", norm)
    last_10 = digits_only[-10:] if len(digits_only) >= 10 else digits_only

    conn = get_connection()
    try:
        # Match exact normalized phone or suffix match
        cursor = conn.execute("""
            SELECT id, phone_number, display_name, role, status, registered_at, notes
            FROM registered_numbers
            WHERE phone_number = ? 
               OR phone_number LIKE ?
               OR phone_number = ?
            LIMIT 1
        """, (norm, f"%{last_10}", f"+{digits_only}"))
        
        row = cursor.fetchone()
        if not row:
            return {
                "authorized": False,
                "status": "UNREGISTERED",
                "caller_info": None,
                "message": f"Caller {raw_phone} is not a registered authorized number."
            }

        caller = dict(row)
        if caller["status"] == "BLOCKED":
            return {
                "authorized": False,
                "status": "BLOCKED",
                "caller_info": caller,
                "message": f"Caller {caller['display_name']} ({caller['phone_number']}) is currently BLOCKED by administration."
            }

        return {
            "authorized": True,
            "status": "ACTIVE",
            "caller_info": caller,
            "message": f"Authorized caller: {caller['display_name']}."
        }
    finally:
        conn.close()


def get_registered_numbers() -> List[Dict[str, Any]]:
    """Retrieve all registered numbers and their authorization status."""
    init_db()
    conn = get_connection()
    try:
        cursor = conn.execute("""
            SELECT id, phone_number, display_name, role, status, registered_at, updated_at, notes
            FROM registered_numbers
            ORDER BY id ASC
        """)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def add_registered_number(
    phone_number: str,
    display_name: str,
    role: str = "OPERATOR",
    status: str = "ACTIVE",
    notes: str = ""
) -> Dict[str, Any]:
    """Register or update an authorized phone number."""
    init_db()
    norm = normalize_phone_number(phone_number)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_connection()
    try:
        with conn:
            conn.execute("""
                INSERT INTO registered_numbers (
                    phone_number, display_name, role, status, registered_at, updated_at, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(phone_number) DO UPDATE SET
                    display_name = excluded.display_name,
                    role = excluded.role,
                    status = excluded.status,
                    updated_at = excluded.registered_at,
                    notes = excluded.notes;
            """, (norm, display_name.strip(), role.strip().upper(), status.strip().upper(), now_str, now_str, notes.strip()))
        return {"success": True, "phone_number": norm, "display_name": display_name, "status": status}
    finally:
        conn.close()


def set_number_status(phone_number: str, status: str) -> bool:
    """Set the status of a registered number to 'ACTIVE' or 'BLOCKED'."""
    init_db()
    norm = normalize_phone_number(phone_number)
    digits_only = re.sub(r"[^\d]", "", norm)
    last_10 = digits_only[-10:] if len(digits_only) >= 10 else digits_only
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute("""
                UPDATE registered_numbers
                SET status = ?, updated_at = ?
                WHERE phone_number = ? OR phone_number LIKE ?
            """, (status.strip().upper(), now_str, norm, f"%{last_10}"))
            return cursor.rowcount > 0
    finally:
        conn.close()


def delete_registered_number(phone_number: str) -> bool:
    """Remove a phone number from the registered authorized access list."""
    init_db()
    norm = normalize_phone_number(phone_number)
    digits_only = re.sub(r"[^\d]", "", norm)
    last_10 = digits_only[-10:] if len(digits_only) >= 10 else digits_only

    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute("""
                DELETE FROM registered_numbers
                WHERE phone_number = ? OR phone_number LIKE ?
            """, (norm, f"%{last_10}"))
            return cursor.rowcount > 0
    finally:
        conn.close()


def log_call(
    caller_number: str,
    caller_name: Optional[str] = None,
    call_type: str = "TWILIO_INBOUND",
    language: Optional[str] = "en",
    tower_id: Optional[str] = None,
    tower_status: Optional[str] = None,
    voltage_v: float = 0.0,
    current_ma: float = 0.0,
    spoken_response: Optional[str] = None,
    duration_seconds: int = 0,
    call_sid: Optional[str] = None,
    status: str = "COMPLETED"
) -> int:
    """Insert a new call usage and response log into SQLite database."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute("""
                INSERT INTO call_logs (
                    timestamp, call_sid, caller_number, caller_name, call_type, language,
                    tower_id, tower_status, voltage_v, current_ma,
                    spoken_response, duration_seconds, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now_str, call_sid, caller_number, caller_name, call_type, language,
                tower_id, tower_status, voltage_v, current_ma,
                spoken_response, duration_seconds, status
            ))
            return cursor.lastrowid
    finally:
        conn.close()


def get_call_logs(limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieve recent call records in reverse chronological order."""
    init_db()
    conn = get_connection()
    try:
        cursor = conn.execute("""
            SELECT id, timestamp, call_sid, caller_number, caller_name, call_type, language,
                   tower_id, tower_status, voltage_v, current_ma,
                   spoken_response, duration_seconds, status
            FROM call_logs
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def clear_call_logs() -> bool:
    """Clear all call logs."""
    conn = get_connection()
    try:
        with conn:
            conn.execute("DELETE FROM call_logs")
            conn.execute("VACUUM")
        return True
    finally:
        conn.close()


# Initialize on import
init_db()


