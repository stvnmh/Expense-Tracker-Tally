# Expense Tracker

Track spending, set a monthly budget, and see how you are pacing. It comes in two forms: a web app and a command-line tool.

**Live demo:** https://stvnmh.github.io/Expense-Tracker/

## Web app

Open `index.html` in a browser or visit the live demo. Click **Load sample data** to see it filled in.

- Monthly budget with an overall total and an optional limit per category
- Budget ring that turns amber at 80% and red when you go over
- Daily allowance and projected month-end spending
- Category bars and a daily spending chart
- Add and delete expenses, browse month by month
- Currency choice (USD, PHP, EUR, GBP) and CSV export
- Data stays in your browser's local storage. Nothing is sent anywhere.

## Command line

Requires Python 3.8 or newer. Charts also need `matplotlib`.

```bash
python tracker.py add 12.50 Food "Lunch"
python tracker.py list
python tracker.py budget set 1900
python tracker.py budget set 420 --category Food
python tracker.py report
python tracker.py chart          # saves report.png (pip install matplotlib)
python tracker.py export expenses.csv
python tracker.py sample         # fills in demo data
```

Use `--month YYYY-MM` with `list`, `report`, `chart` and `sample` to look at a different month.

Categories: Housing, Food, Transport, Utilities, Health, Leisure, Other.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Web app (single file, no build step) |
| `tracker.py` | Command-line tracker |
| `expenses.json` | Created by `tracker.py` to store your data |
