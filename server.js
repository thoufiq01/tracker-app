const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const GOALS_FILE = path.join(DATA_DIR, 'goals.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, JSON.stringify({}));
if (!fs.existsSync(GOALS_FILE)) {
  const defaultGoals = {
    gym:     { label: 'Gym',              unit: 'min',     goal: 60,   color: '#1D9E75', walking: { goal: 30 } },
    dsa:     { label: 'DSA',              unit: 'problems',goal: 4,    color: '#378ADD' },
    webdev:  { label: 'Web Dev',          unit: 'modules', goal: 4,    color: '#8B5CF6' },
    content: { label: 'Content Creation', unit: 'reels',   goal: 1,    color: '#D4537E' },
    food:    { label: 'Food',             unit: 'kcal',    goal: 2000, color: '#EF9F27',
               macros: { protein: 150, carbs: 250, fats: 70 } }
  };
  fs.writeFileSync(GOALS_FILE, JSON.stringify(defaultGoals, null, 2));
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch(e) { return {}; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.get('/api/logs', (req, res) => res.json(readJSON(LOGS_FILE)));
app.get('/api/goals', (req, res) => res.json(readJSON(GOALS_FILE)));

app.post('/api/goals', (req, res) => {
  const goals = readJSON(GOALS_FILE);
  const updates = req.body;
  Object.keys(updates).forEach(k => {
    if (goals[k]) goals[k] = { ...goals[k], ...updates[k] };
  });
  writeJSON(GOALS_FILE, goals);
  res.json({ ok: true, goals });
});

app.post('/api/log', (req, res) => {
  const { date, habit, value, meta } = req.body;
  if (!date || !habit || value === undefined) return res.status(400).json({ error: 'Missing fields' });
  const logs = readJSON(LOGS_FILE);
  if (!logs[date]) logs[date] = {};
  if (!logs[date][habit]) logs[date][habit] = { total: 0, entries: [] };
  const entry = { value: parseFloat(value), ts: Date.now() };
  if (meta) entry.meta = meta;
  logs[date][habit].total = Math.round((logs[date][habit].total + parseFloat(value)) * 100) / 100;
  logs[date][habit].entries.push(entry);
  writeJSON(LOGS_FILE, logs);
  res.json({ ok: true, day: logs[date] });
});

app.delete('/api/log', (req, res) => {
  const { date, habit, entryIndex } = req.body;
  const logs = readJSON(LOGS_FILE);
  if (logs[date] && logs[date][habit] && logs[date][habit].entries[entryIndex] !== undefined) {
    logs[date][habit].entries.splice(entryIndex, 1);
    logs[date][habit].total = Math.round(
      logs[date][habit].entries.reduce((s, e) => s + e.value, 0) * 100
    ) / 100;
    writeJSON(LOGS_FILE, logs);
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'Entry not found' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Tracker running at http://localhost:${PORT}\n`);
});
