# Process

## TODO
- [x] Review the existing README and confirm current repository state.
- [x] Define the fraud detection workflow, inputs, outputs, and rule configuration.
- [x] Implement a minimal rule-based CLI application.
- [x] Provide sample data and default rules.
- [x] Update documentation with setup and usage instructions.
- [x] Manually verify the CLI on sample data.

## Step-by-step Log
1. Reviewed the README and confirmed no existing application, tests, or configs.
2. Outlined required inputs (CSV), outputs (flagged CSV), and rule thresholds.
3. Implemented the CLI in `app.py` with rule loading, transaction analysis, and CSV output.
4. Added `rules.json` and `data/sample_transactions.csv` as ready-to-run examples.
5. Updated README with setup, usage, and output details.
6. Ran the CLI against the sample data to verify output creation.
