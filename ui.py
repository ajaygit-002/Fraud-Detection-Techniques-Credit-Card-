#!/usr/bin/env python3
import argparse
import html
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from socketserver import TCPServer
from typing import Dict, List, Optional, Tuple, Type
from urllib.parse import parse_qs

from app import analyze_transactions, load_rules, parse_bool, parse_timestamp

FIELD_ORDER = [
    "transaction_id",
    "card_id",
    "timestamp",
    "amount",
    "country",
    "merchant_category",
    "card_present",
]

HISTORY_FIELDS = [
    "transaction_id",
    "card_id",
    "timestamp",
    "amount",
    "country",
    "risk_score",
    "is_suspicious",
]

MAX_BODY_BYTES = 10_000
MAX_HISTORY = 10


def default_form_values() -> Dict[str, str]:
    return {
        "transaction_id": "",
        "card_id": "",
        "timestamp": "",
        "amount": "",
        "country": "",
        "merchant_category": "",
        "card_present": "true",
    }


def render_page(
    values: Dict[str, str],
    *,
    rules_path: str,
    result: Optional[Dict[str, str]] = None,
    error: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    def esc(value: Optional[str]) -> str:
        return html.escape(value or "")

    error_html = f"<p class='error'>{esc(error)}</p>" if error else ""
    result_html = ""
    if result:
        reasons = result.get("reasons") or "None"
        suspicious = result.get("is_suspicious") == "true"
        risk_score = result.get("risk_score", "low")
        alert_text = (
            "Alert: suspicious activity detected." if suspicious else "No alert triggered."
        )
        alert_class = "alert high" if suspicious else "alert ok"
        rows = "".join(
            f"<tr><th>{esc(name)}</th><td>{esc(result.get(name, ''))}</td></tr>"
            for name in FIELD_ORDER + ["is_suspicious", "risk_score", "reasons"]
        )
        result_html = f"""
        <section class="result">
          <h2>Result</h2>
          <p><strong>Risk score:</strong> {esc(risk_score)}</p>
          <p class="{alert_class}">{esc(alert_text)}</p>
          <p><strong>Suspicious:</strong> {esc(result.get("is_suspicious"))}</p>
          <p><strong>Reasons:</strong> {esc(reasons)}</p>
          <table>{rows}</table>
        </section>
        """

    history_html = ""
    history = history or []
    if history:
        flagged = sum(1 for item in history if item.get("is_suspicious") == "true")
        history_rows = "".join(
            "<tr>"
            + "".join(
                f"<td>{esc(entry.get(field, ''))}</td>" for field in HISTORY_FIELDS
            )
            + "</tr>"
            for entry in history
        )
        header_cells = "".join(f"<th>{esc(field)}</th>" for field in HISTORY_FIELDS)
        history_html = f"""
        <section class="history">
          <h2>Recent Activity</h2>
          <p class="note">Last {len(history)} analyses — flagged: {flagged}.</p>
          <table>
            <thead><tr>{header_cells}</tr></thead>
            <tbody>{history_rows}</tbody>
          </table>
        </section>
        """

    card_present = values.get("card_present", "true")
    selected_true = "selected" if card_present == "true" else ""
    selected_false = "selected" if card_present == "false" else ""

    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Fraud Detection UI</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 2rem; background: #f7f7f8; }}
      h1 {{ margin-bottom: 0.5rem; }}
      form {{ background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }}
      label {{ display: block; margin-top: 0.75rem; font-weight: 600; }}
      input, select {{ width: 100%; padding: 0.5rem; margin-top: 0.25rem; border-radius: 4px; border: 1px solid #ccc; }}
      button {{ margin-top: 1rem; padding: 0.6rem 1rem; background: #1d4ed8; color: #fff; border: none; border-radius: 4px; cursor: pointer; }}
      button:hover {{ background: #1e40af; }}
      .error {{ color: #b91c1c; font-weight: 600; }}
      .result {{ margin-top: 1.5rem; background: #fff; padding: 1rem; border-radius: 8px; }}
      .history {{ margin-top: 1.5rem; background: #fff; padding: 1rem; border-radius: 8px; }}
      table {{ width: 100%; border-collapse: collapse; margin-top: 0.5rem; }}
      th, td {{ text-align: left; padding: 0.4rem; border-bottom: 1px solid #e5e7eb; }}
      th {{ width: 35%; color: #374151; }}
      .note {{ color: #6b7280; font-size: 0.9rem; }}
      .alert {{ font-weight: 600; padding: 0.4rem 0.6rem; border-radius: 6px; display: inline-block; }}
      .alert.high {{ background: #fee2e2; color: #991b1b; }}
      .alert.ok {{ background: #dcfce7; color: #166534; }}
    </style>
  </head>
  <body>
    <h1>Fraud Detection UI</h1>
    <p class="note">Rules file: {esc(rules_path)}</p>
    {error_html}
    <form method="post" action="/analyze">
      <label for="transaction_id">Transaction ID</label>
      <input id="transaction_id" name="transaction_id" value="{esc(values.get("transaction_id"))}" required>

      <label for="card_id">Card ID</label>
      <input id="card_id" name="card_id" value="{esc(values.get("card_id"))}" required>

      <label for="timestamp">Timestamp (ISO-8601)</label>
      <input id="timestamp" name="timestamp" value="{esc(values.get("timestamp"))}" placeholder="2024-01-01T10:00:00Z" required>

      <label for="amount">Amount</label>
      <input id="amount" name="amount" type="number" step="0.01" value="{esc(values.get("amount"))}" required>

      <label for="country">Country (2-letter code)</label>
      <input id="country" name="country" value="{esc(values.get("country"))}" required>

      <label for="merchant_category">Merchant Category</label>
      <input id="merchant_category" name="merchant_category" value="{esc(values.get("merchant_category"))}" required>

      <label for="card_present">Card Present</label>
      <select id="card_present" name="card_present" required>
        <option value="true" {selected_true}>true</option>
        <option value="false" {selected_false}>false</option>
      </select>

      <button type="submit">Analyze Transaction</button>
    </form>
    {result_html}
    {history_html}
  </body>
</html>
"""


def validate_form(form: Dict[str, List[str]]) -> Tuple[Dict[str, str], Optional[str]]:
    values = {}
    duplicates = []
    for field in FIELD_ORDER:
        entries = form.get(field)
        if entries and len(entries) > 1:
            duplicates.append(field)
        values[field] = entries[0].strip() if entries else ""
    if duplicates:
        return values, f"Duplicate fields provided: {', '.join(duplicates)}"
    missing = [field for field in FIELD_ORDER if not values[field]]
    if missing:
        return values, f"Missing required fields: {', '.join(missing)}"
    try:
        parse_timestamp(values["timestamp"])
    except ValueError as exc:
        return values, f"Invalid timestamp: {exc}"
    try:
        float(values["amount"])
    except ValueError:
        return values, "Amount must be a valid number"
    try:
        parse_bool(values["card_present"])
    except ValueError as exc:
        return values, f"Invalid card_present value: {exc}"
    return values, None


def make_handler(rules: Dict[str, object], rules_path: str) -> Type[BaseHTTPRequestHandler]:
    recent_history: List[Dict[str, str]] = []

    def record_history(entry: Dict[str, str]) -> None:
        snapshot = {field: entry.get(field, "") for field in HISTORY_FIELDS}
        recent_history.append(snapshot)
        if len(recent_history) > MAX_HISTORY:
            del recent_history[0]

    class FraudUIHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path not in {"/", "/index.html"}:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            self._send_html(
                render_page(
                    default_form_values(),
                    rules_path=rules_path,
                    history=recent_history,
                )
            )

        def do_POST(self) -> None:
            if self.path != "/analyze":
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            length_header = self.headers.get("Content-Length")
            if length_header is None:
                self.send_error(HTTPStatus.LENGTH_REQUIRED)
                return
            try:
                length = int(length_header)
            except ValueError:
                self.send_error(HTTPStatus.BAD_REQUEST, "Invalid Content-Length")
                return
            if length > MAX_BODY_BYTES:
                self.send_error(HTTPStatus.CONTENT_TOO_LARGE)
                return
            try:
                body = self.rfile.read(length).decode("utf-8")
            except UnicodeDecodeError:
                self.send_error(
                    HTTPStatus.BAD_REQUEST, "Invalid UTF-8 encoding in request body"
                )
                return
            form = parse_qs(body, keep_blank_values=True)
            values, error = validate_form(form)
            result = None
            if not error:
                row = values.copy()
                try:
                    analyzed = analyze_transactions([row], rules)
                    result = analyzed[0]
                    record_history(result)
                except (ValueError, KeyError) as exc:
                    self.log_error("Analysis error: %s", exc)
                    error = f"Unable to analyze transaction: {exc}"
            self._send_html(
                render_page(
                    values,
                    rules_path=rules_path,
                    result=result,
                    error=error,
                    history=recent_history,
                )
            )

        def _send_html(self, content: str) -> None:
            encoded = content.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

    return FraudUIHandler


class ReusableTCPServer(TCPServer):
    allow_reuse_address = True


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Local web UI for the fraud detection rules."
    )
    default_rules = os.path.join(os.path.dirname(__file__), "rules.json")
    parser.add_argument(
        "--host", default="127.0.0.1", help="Host interface to bind the UI server."
    )
    parser.add_argument(
        "--port", type=int, default=8000, help="Port to run the UI server on."
    )
    parser.add_argument(
        "--rules",
        default=default_rules,
        help="Path to the JSON rules configuration.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        rules = load_rules(args.rules)
    except (ValueError, FileNotFoundError, OSError) as exc:
        print(f"Failed to load rules: {exc}")
        return 1

    handler = make_handler(rules, args.rules)
    with ReusableTCPServer((args.host, args.port), handler) as httpd:
        print(f"UI running at http://{args.host}:{args.port}/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
