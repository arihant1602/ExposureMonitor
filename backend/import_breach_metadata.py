#!/usr/bin/env python3
import argparse
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.breach_metadata_importer import import_breach_metadata


def main():
    parser = argparse.ArgumentParser(
        description="Import non-PII breach metadata into the local SQLite database."
    )
    parser.add_argument(
        "file",
        help="Path to JSON or CSV file containing breach metadata rows.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and count changes without writing to the database.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print output as JSON.",
    )
    args = parser.parse_args()

    result = import_breach_metadata(args.file, dry_run=args.dry_run)
    payload = {
        "source_file": result.source_file,
        "imported_count": result.imported_count,
        "updated_count": result.updated_count,
        "skipped_count": result.skipped_count,
        "error_count": len(result.errors),
        "errors": result.errors,
        "dry_run": args.dry_run,
    }

    if args.json:
        print(json.dumps(payload, indent=2))
        return

    print(f"Source: {payload['source_file']}")
    print(f"Imported: {payload['imported_count']}")
    print(f"Updated: {payload['updated_count']}")
    print(f"Skipped: {payload['skipped_count']}")
    if payload["errors"]:
        print("Errors:")
        for err in payload["errors"][:20]:
            print(f"- {err}")
        if len(payload["errors"]) > 20:
            print(f"- ... {len(payload['errors']) - 20} more")


if __name__ == "__main__":
    main()
