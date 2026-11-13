# Tally

A simple way to see where your money goes.

**Live demo:** [Open Tally](PASTE-VERCEL-URL-HERE)

## Why I made Tally

I have a habit of spending money without always noticing where it goes. I made Tally to help me track my expenses, understand my spending, and keep an eye on my budget.

## What you can do

- See your monthly spending, daily average, and remaining budget
- View a chart of daily spending and a breakdown by category
- Add, edit, search, filter, and remove expenses
- Set a monthly budget and optional limits for categories
- Choose PHP, USD, EUR, or GBP for display; amounts are not converted
- Export expenses as CSV or save all your data as a JSON backup
- Load example expenses only when you choose to add them
- Undo a deletion for 5 seconds

## How it works

Browser (React + Vite)
   │
   ▼
Your browser's local storage

Your data stays in the browser on the device where you entered it. There is no account or cloud database, so expenses do not automatically sync between devices. Use **Export all data** in Settings to keep a backup.

## Tech stack

React · Vite · JavaScript · CSS · Lucide icons

## Run locally

Install Node.js, then run:

```sh
npm install
npm run dev
