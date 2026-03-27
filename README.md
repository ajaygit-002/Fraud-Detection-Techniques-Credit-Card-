# Fraud Detection Techniques - Credit Card

## Overview
This repository includes a minimal, rule-based fraud detection application for credit card transactions. It reads a CSV file, evaluates each transaction against configurable rules, and outputs a new CSV with suspicious flags and reasons.

## Requirements
- Python 3.9+ (no external dependencies)

## Quick Start
```bash
python3 app.py \
  --input data/sample_transactions.csv \
  --output /tmp/flagged_transactions.csv \
  --rules rules.json
```

## Input Format
The input CSV **must** include the following columns:
- `transaction_id`
- `card_id`
- `timestamp` (ISO-8601, e.g., `2024-01-01T10:00:00`)
- `amount`
- `country` (2-letter code)
- `merchant_category`
- `card_present` (`true`/`false`)

## Output
The output CSV keeps the original columns and adds:
- `is_suspicious` (`true`/`false`)
- `reasons` (semicolon-delimited reasons for flagging)

## Rule Configuration
Edit `rules.json` to adjust thresholds. Current rules include:
- `amount_threshold`
- `high_risk_countries`
- `velocity_window_minutes`
- `velocity_threshold`
- `small_amount_threshold`
- `small_amount_count_threshold`
- `card_not_present_amount_threshold`

## Project Files
- `app.py` — CLI application
- `rules.json` — default rules
- `data/sample_transactions.csv` — sample data
- `process.md` — documented step-by-step process
