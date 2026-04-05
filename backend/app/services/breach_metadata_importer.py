import csv
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

from app.database import get_db_connection, init_db


@dataclass
class ImportResult:
    source_file: str
    imported_count: int
    updated_count: int
    skipped_count: int
    errors: List[str]


def import_breach_metadata(file_path: str, dry_run: bool = False) -> ImportResult:
    init_db()
    rows = _load_rows(file_path)

    imported = 0
    updated = 0
    skipped = 0
    errors: List[str] = []

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat(timespec="seconds") + "Z"

        for idx, raw in enumerate(rows):
            try:
                normalized = _normalize_row(raw)
                if not normalized:
                    skipped += 1
                    continue
            except ValueError as exc:
                skipped += 1
                errors.append(f"row {idx + 1}: {exc}")
                continue

            cursor.execute(
                "SELECT id FROM breaches WHERE name = ? AND date = ?",
                (normalized["name"], normalized["date"]),
            )
            existing = cursor.fetchone()

            if existing:
                if dry_run:
                    updated += 1
                    continue

                cursor.execute(
                    """
                    UPDATE breaches
                    SET severity = ?, domains = ?, compromised_data = ?, source_url = ?, imported_at = ?
                    WHERE id = ?
                    """,
                    (
                        normalized["severity"],
                        json.dumps(normalized["domains"]),
                        json.dumps(normalized["compromised_data"]),
                        normalized["source_url"],
                        now,
                        existing["id"],
                    ),
                )
                updated += 1
                continue

            if dry_run:
                imported += 1
                continue

            cursor.execute(
                """
                INSERT INTO breaches (name, date, severity, domains, compromised_data, source_url, imported_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    normalized["name"],
                    normalized["date"],
                    normalized["severity"],
                    json.dumps(normalized["domains"]),
                    json.dumps(normalized["compromised_data"]),
                    normalized["source_url"],
                    now,
                ),
            )
            imported += 1

        if not dry_run:
            cursor.execute(
                """
                INSERT INTO metadata_import_runs (source_file, imported_count, updated_count, skipped_count, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (str(file_path), imported, updated, skipped, now),
            )
            conn.commit()

    finally:
        conn.close()

    return ImportResult(
        source_file=str(file_path),
        imported_count=imported,
        updated_count=updated,
        skipped_count=skipped,
        errors=errors,
    )


def _load_rows(file_path: str) -> List[Dict[str, Any]]:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"file not found: {file_path}")

    suffix = path.suffix.lower()
    if suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "breaches" in data and isinstance(data["breaches"], list):
            return data["breaches"]
        if isinstance(data, list):
            return data
        raise ValueError("json file must be a list or contain a top-level 'breaches' list")

    if suffix == ".csv":
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            return [dict(row) for row in reader]

    raise ValueError("unsupported file format; use .json or .csv")


def _normalize_row(raw: Dict[str, Any]) -> Dict[str, Any]:
    name = _as_str(raw.get("name")).strip()
    if not name:
        raise ValueError("missing required field 'name'")

    date = _normalize_date(_as_str(raw.get("date")).strip())
    severity = _normalize_severity(raw.get("severity"))

    domains = _normalize_str_list(raw.get("domains"))
    compromised_data = _normalize_str_list(raw.get("compromised_data"))

    # Non-PII metadata only: explicitly reject email-like fields if present.
    for disallowed in ("email", "emails", "records", "passwords", "samples"):
        if disallowed in raw and raw.get(disallowed):
            raise ValueError(f"disallowed field detected: '{disallowed}'")

    source_url = _as_str(raw.get("source_url")).strip() or None

    return {
        "name": name,
        "date": date,
        "severity": severity,
        "domains": domains,
        "compromised_data": compromised_data,
        "source_url": source_url,
    }


def _normalize_date(value: str) -> str:
    if not value:
        return ""
    try:
        return datetime.strptime(value, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        raise ValueError("date must be in YYYY-MM-DD format")


def _normalize_severity(value: Any) -> int:
    if value in (None, ""):
        return 0
    try:
        severity = int(value)
    except (TypeError, ValueError):
        raise ValueError("severity must be an integer between 0 and 10")
    if severity < 0 or severity > 10:
        raise ValueError("severity must be between 0 and 10")
    return severity


def _normalize_str_list(value: Any) -> List[str]:
    if value is None:
        return []

    if isinstance(value, list):
        items = [str(v).strip() for v in value if str(v).strip()]
        return list(dict.fromkeys(items))

    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []
        if stripped.startswith("[") and stripped.endswith("]"):
            try:
                parsed = json.loads(stripped)
                if isinstance(parsed, list):
                    return _normalize_str_list(parsed)
            except json.JSONDecodeError:
                pass
        items = [chunk.strip() for chunk in stripped.split(",") if chunk.strip()]
        return list(dict.fromkeys(items))

    return []


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value)
