# Habit Tracker

Local habit tracker with file-based storage. Data saves to `data/` folder — never lost on refresh or restart.

## Setup

1. Make sure Node.js is installed (https://nodejs.org)
2. Open this folder in VS Code terminal
3. Run:

```
npm install
npm start
```

4. Open http://localhost:3000 in your browser

## Your data

All data is saved in the `data/` folder:
- `data/logs.json` — all your daily entries
- `data/goals.json` — your goals (editable from the app too)

You can back these up or copy them anywhere.

## Features

- **Gym** — log minutes (press Enter to submit)
- **Study** — log hours
- **Content Creation** — log reels
- **Food** — log kcal + fats / carbs / fiber per meal
- **Edit Goals** — click the Goals button, change any value, save. Changes instantly
- **Analytics** — weekly bar charts with goal line for each habit
- **History** — all entries with delete button
- **Streaks** — consecutive day streaks per habit
- **Week view** — 7-day dot heatmap

## Keyboard

Press **Enter** in any input field to log — no need to click the button.
