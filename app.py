#!/usr/bin/env python3
import argparse
import csv
import json
import os
import sys
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Deque, Dict, Iterable, List

DEFAULT_RULES: Dict[str, object] = {
    "amount_threshold": 5000.0,
    "high_risk_countries": ["NG", "RU", "BR"],
    "velocity_window_minutes": 10,
    "velocity_threshold": 3,
    "small_amount_threshold": 5.0,
    "small_amount_count_threshold": 3,
    "card_not_present_amount_threshold": 1000.0,
}

REQUIRED_FIELDS = {
    "transaction_id",
    "card_id",
    "timestamp",
    "amount",
    "country",
    "merchant_category",
    "card_present",
}

RISK_WEIGHTS = {
    "amount_above_threshold": 2,
    "high_risk_country": 2,
    "card_not_present_high_amount": 2,
    "high_velocity_transactions": 1,
    "small_amount_burst": 1,
}


def parse_bool(value: str) -> bool:
    normalized = (value or "").strip().lower()
    if normalized in {"true", "1", "yes", "y"}:
        return True
    if normalized in {"false", "0", "no", "n", ""}:
        return False
    raise ValueError(f"Invalid boolean value: {value}")


def parse_timestamp(value: str) -> datetime:
    cleaned = value.strip()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1]
    return datetime.fromisoformat(cleaned)


def normalize_rules(rules: Dict[str, object]) -> Dict[str, object]:
    missing_keys = [key for key in DEFAULT_RULES if key not in rules]
    if missing_keys:
        missing_list = ", ".join(missing_keys)
        raise ValueError(f"Rules missing required keys: {missing_list}")
    normalized = rules.copy()
    normalized["amount_threshold"] = float(rules["amount_threshold"])
    normalized["velocity_window_minutes"] = int(rules["velocity_window_minutes"])
    normalized["velocity_threshold"] = int(rules["velocity_threshold"])
    normalized["small_amount_threshold"] = float(rules["small_amount_threshold"])
    normalized["small_amount_count_threshold"] = int(rules["small_amount_count_threshold"])
    normalized["card_not_present_amount_threshold"] = float(
        rules["card_not_present_amount_threshold"]
    )

    high_risk_countries = rules["high_risk_countries"]
    if not isinstance(high_risk_countries, list):
        raise ValueError("high_risk_countries must be a list of country codes")
    normalized["high_risk_countries"] = [str(code).upper() for code in high_risk_countries]
    return normalized


def load_rules(path: str) -> Dict[str, object]:
    rules = DEFAULT_RULES.copy()
    if path:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Rules file not found: {path}")
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError("Rules file must contain a JSON object")
        for key, value in data.items():
            if key not in rules:
                raise ValueError(f"Unknown rule key provided: {key}")
            rules[key] = value
    return normalize_rules(rules)


def trim_old_entries(entries: Deque[datetime], now: datetime, window: timedelta) -> None:
    while entries and (now - entries[0]) > window:
        entries.popleft()


def calculate_risk_score(reasons: List[str]) -> str:
    score = sum(RISK_WEIGHTS.get(reason, 0) for reason in reasons)
    if score == 0:
        return "low"
    if score <= 2:
        return "medium"
    return "high"


def analyze_transactions(
    rows: Iterable[Dict[str, str]], rules: Dict[str, object]
) -> List[Dict[str, str]]:
    flagged_rows: List[Dict[str, str]] = []
    velocity_window = timedelta(minutes=rules["velocity_window_minutes"])
    velocity_threshold = rules["velocity_threshold"]
    small_amount_threshold = rules["small_amount_threshold"]
    small_amount_count_threshold = rules["small_amount_count_threshold"]
    amount_threshold = rules["amount_threshold"]
    card_not_present_threshold = rules["card_not_present_amount_threshold"]
    high_risk_countries = set(rules["high_risk_countries"])

    card_velocity: Dict[str, Deque[datetime]] = defaultdict(deque)
    card_small_amounts: Dict[str, Deque[datetime]] = defaultdict(deque)

    for row in rows:
        amount = float(row["amount"])
        timestamp = parse_timestamp(row["timestamp"])
        card_id = row["card_id"]
        country = row["country"].strip().upper()
        card_present = parse_bool(row["card_present"])

        reasons: List[str] = []
        if amount >= amount_threshold:
            reasons.append("amount_above_threshold")
        if country in high_risk_countries:
            reasons.append("high_risk_country")
        if not card_present and amount >= card_not_present_threshold:
            reasons.append("card_not_present_high_amount")

        velocity_entries = card_velocity[card_id]
        trim_old_entries(velocity_entries, timestamp, velocity_window)
        velocity_entries.append(timestamp)
        if len(velocity_entries) >= velocity_threshold:
            reasons.append("high_velocity_transactions")

        small_entries = card_small_amounts[card_id]
        trim_old_entries(small_entries, timestamp, velocity_window)
        if amount <= small_amount_threshold:
            small_entries.append(timestamp)
            if len(small_entries) >= small_amount_count_threshold:
                reasons.append("small_amount_burst")

        row["is_suspicious"] = "true" if reasons else "false"
        row["risk_score"] = calculate_risk_score(reasons)
        row["reasons"] = ";".join(reasons)
        flagged_rows.append(row)

    return flagged_rows


def read_transactions(path: str) -> List[Dict[str, str]]:
    with open(path, "r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("Input file must include headers")
        missing = REQUIRED_FIELDS - set(reader.fieldnames)
        if missing:
            missing_list = ", ".join(sorted(missing))
            raise ValueError(f"Input file missing required columns: {missing_list}")
        return list(reader)


def write_output(path: str, rows: List[Dict[str, str]]) -> None:
    if not rows:
        raise ValueError("No transactions to process or write")
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    fieldnames = list(rows[0].keys())
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Rule-based fraud detection for credit card transactions."
    )
    parser.add_argument(
        "--input",
        "-i",
        required=True,
        help="Path to the input CSV file containing transactions.",
    )
    parser.add_argument(
        "--output",
        "-o",
        default=os.path.join("output", "flagged_transactions.csv"),
        help="Path to the output CSV file for flagged transactions.",
    )
    parser.add_argument(
        "--rules",
        "-r",
        default="rules.json",
        help="Path to the JSON rules configuration.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        rules = load_rules(args.rules)
        transactions = read_transactions(args.input)
        analyzed = analyze_transactions(transactions, rules)
        write_output(args.output, analyzed)
    except (ValueError, FileNotFoundError, json.JSONDecodeError, OSError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    suspicious_count = sum(1 for row in analyzed if row["is_suspicious"] == "true")
    print(f"Processed {len(analyzed)} transactions.")
    print(f"Flagged {suspicious_count} suspicious transactions.")
    print(f"Output written to: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
