# Student Finance Tracker

Welcome to the Student Finance Tracker! This project was built to help university students take control of their daily spending — tracking expenses, setting budget limits, and understanding where their money goes, all from the browser with no account or installation required.

A responsive budgeting application built for university students using only vanilla HTML, CSS, and JavaScript with ES Modules. No frameworks, no build tools, no external dependencies — just clean, readable code that runs in any modern browser.

**Live Demo:** [https://Ajang-Akoi-Arok.github.io/student-finance-tracker](https://Ajang-Akoi-Arok.github.io/student-finance-tracker)

---

## What This App Does

Student Finance Tracker helps you keep a clear record of your daily campus expenses. You can add transactions, assign them to categories like Food, Transport, or Books, and the dashboard automatically calculates how much you have spent in total and how you are tracking against a budget cap you set. The seven-day bar chart gives you a quick visual overview of your spending over the past week. If you go over your budget limit, the app immediately alerts you with a visible banner and an accessible screen-reader announcement.

Beyond basic tracking, the app includes a live search bar that supports both plain text and full regular expression patterns. You can type something like `coffee|tea` to find all beverage purchases, or use a more advanced pattern like `\.99$` to find amounts ending in ninety-nine cents. Every match is highlighted in yellow directly inside the results. All your data is saved automatically in the browser using localStorage, so it survives page refreshes and browser restarts without needing any server or account.

---

## Features

| Feature | What it does |
|---------|--------------|
| Dashboard | Shows total spending, transaction count, your highest-spending category, a 7-day bar chart, and a budget cap indicator |
| Regex Search | Filters records live as you type, highlights every match in yellow, shows a result count, and handles invalid patterns gracefully |
| Validation | Checks all five input fields against regex rules before saving; shows a specific error message directly under the field that failed |
| Auto-save | Every change is saved to the browser's localStorage immediately — no Save button needed |
| Import and Export | Download your records as a JSON file, or upload a JSON file to restore them; duplicate IDs are detected and skipped on import |
| Multi-currency | Supports USD, Rwandan Franc (RWF), and Ugandan Shilling (UGX); you can set your own exchange rates in Settings |
| Accessibility | Follows WCAG AA guidelines; all content is reachable by keyboard alone; screen readers receive live announcements for budget alerts and form feedback |
| Responsive layout | Works on phones from 360 pixels wide up to large desktop monitors |
| Test Suite | `tests.html` is a standalone supplementary page (not part of the main app) that runs all five regex validators automatically and reports pass or fail for each case |

---

## Getting Started

### What You Need

Any modern browser will work: Chrome 90 or newer, Firefox 88 or newer, Safari 14 or newer, or Edge 90 or newer. Because the app uses JavaScript ES Modules, you need to serve it through a local HTTP server — opening the `index.html` file directly with `file://` will not work due to browser security restrictions.

### Running It Locally

Clone the repository and start a simple local server:

```bash
git clone https://github.com/Ajang-Akoi-Arok/student-finance-tracker.git
cd student-finance-tracker
python3 -m http.server 8080
```

Then open your browser and go to the address your server shows (usually `http://localhost:8080`).

When you open the app for the first time with no saved data, it automatically loads fifteen sample transactions from `seed.json` so the dashboard and chart are populated and ready to explore. You can clear this sample data at any time from the Settings page.

To run the supplementary regex test suite, open `tests.html` as a separate page through the same local server or through the deployed GitHub Pages URL. It is an independent file and does not interact with the main app.

### Deploying to GitHub Pages

```bash
git push origin main
# Then go to: Settings > Pages > Branch: main / root > Save
```

---

## Regex Validation Rules

Every transaction must pass five validation rules before it is saved. These rules are written as regular expressions and run both in real time as you type and again when you submit the form.

### Rule 1 — Description must not start or end with a space

**Pattern:** `/^\S(?:.*\S)?$/`

The `\S` at the start means the very first character must not be a whitespace character. The `\S` at the end means the last character must also not be whitespace. The middle part `(?:.*\S)?` is optional so that single-character descriptions like `"X"` also pass. This rule rejects inputs like `" Lunch"` (leading space) or `"Lunch "` (trailing space).

| Accepts | Rejects |
|---------|---------|
| `"Lunch at cafeteria"` | `" Lunch at cafeteria"` |
| `"X"` | `"trailing space "` |

### Rule 2 — Amount must be a non-negative number with at most two decimal places

**Pattern:** `/^(0|[1-9]\d*)(\.\d{1,2})?$/`

The first group `(0|[1-9]\d*)` allows either the single digit zero or any number that starts with a non-zero digit (preventing formats like `007`). The second group `(\.\d{1,2})?` is optional and allows one or two decimal digits after a period. Negative numbers, letters, and more than two decimal places are all rejected.

| Accepts | Rejects |
|---------|---------|
| `"12.50"`, `"0"`, `"999"` | `"-5"`, `"12.999"`, `"abc"` |

### Rule 3 — Date must be in YYYY-MM-DD format with valid month and day ranges

**Pattern:** `/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/`

The four digits at the start match the year. The month section `(0[1-9]|1[0-2])` only allows 01 through 12. The day section `(0[1-9]|[12]\d|3[01])` allows 01 through 31. This means the format is strictly enforced — you cannot enter a date like `29-09-2025` or a month of `13`.

| Accepts | Rejects |
|---------|---------|
| `"2025-09-29"`, `"2025-01-01"` | `"29-09-2025"`, `"2025-13-01"` |

### Rule 4 — Category must contain only letters, spaces, and hyphens

**Pattern:** `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/`

The category starts with one or more letters. Each additional word must be separated by a single space or a single hyphen and then followed by more letters. This means digits, ampersands, and symbols are not allowed.

| Accepts | Rejects |
|---------|---------|
| `"Food"`, `"Coffee Shop"`, `"On-Campus"` | `"123Food"`, `"Food & Drink"` |

### Rule 5 — Description must not contain duplicate consecutive words (Advanced)

**Pattern:** `/\b(\w+)\s+\1\b/i`

This rule uses a back-reference, which is an advanced regex feature. The `(\w+)` captures a word in group 1, then `\s+` matches one or more spaces, then `\1` requires that exact same word to appear again immediately after. The `i` flag makes the match case-insensitive, so `"Coffee COFFEE"` would also be caught. This prevents accidental typos like `"bought bought lunch"`.

| Detects (rejects) | Does not detect (accepts) |
|-------------------|--------------------------|
| `"test test"`, `"Coffee COFFEE"` | `"test testing"`, `"no duplicates"` |

### Search Pattern Examples

The search bar accepts the same regex syntax used in the validator rules. Here are some patterns worth demonstrating in your video:

```
coffee|tea          →  Find any record mentioning coffee or tea
\.\d{2}\b           →  Find amounts that have cents, like 12.50 or 8.99
\.99$               →  Find only amounts that end in .99
\b(\w+)\s+\1\b      →  Find descriptions with accidentally repeated words
2025-09             →  Show only September 2025 transactions
-29$                →  Show transactions from the 29th of any month
^[A-Z]              →  Find descriptions that start with a capital letter
```

---

## Keyboard Navigation

The entire application is operable by keyboard alone. No mouse is required to add, edit, delete, search, or navigate between sections.

| Key | What it does |
|-----|--------------|
| `Tab` | Move focus forward through interactive elements |
| `Shift + Tab` | Move focus backward |
| `Enter` or `Space` | Activate a button or submit a form |
| `Escape` | Close any open modal or cancel an edit |
| `Ctrl + S` or `Cmd + S` | Trigger a save confirmation toast |
| `Alt + K` | Open the keyboard shortcuts reference panel |
| `Alt + N` | Open the Add Transaction form directly |

### Logical Tab Order

When you navigate by keyboard, focus moves in this sequence:

1. The skip-to-content link at the very top of the page
2. The navigation links: About, Dashboard, Records, Settings
3. The content of whichever section is currently active
4. The quick-action buttons such as Add, Import, and Export
5. The search input, followed by the case-insensitive checkbox and sort controls
6. The individual record rows or cards
7. The footer links

---

## Accessibility

The app is built to meet WCAG AA accessibility standards. This means it is designed to work for people who use screen readers, people who cannot use a mouse, and people who have visual impairments.

### Page Structure

Every section uses proper HTML landmarks. The header uses `<header role="banner">`, the navigation uses `<nav aria-label="Main navigation">`, the page content is wrapped in `<main>`, and the footer uses `<footer role="contentinfo">`. There is exactly one `<h1>` on the page (in the header), each section has an `<h2>` heading, and subsections use `<h3>` and `<h4>` so the heading hierarchy is logical and navigable.

### Live Announcements for Screen Readers

Certain areas of the page are marked as live regions, which means a screen reader will automatically read them aloud when their content changes, without the user needing to navigate to them.

| Element | Urgency | When it fires |
|---------|---------|---------------|
| `#status-region` | Polite | Budget remaining amount, form save confirmation |
| `#alert-region` | Assertive | Budget cap exceeded warning |
| `#budget-banner` | Polite | Budget status banner update |
| `#search-status` | Polite | Search result count, invalid regex message |
| `.error-message` | Polite | Inline validation error under a form field |
| `#toast-container` | Polite | Toast notification messages |

Polite means the screen reader waits until it finishes speaking before announcing the update. Assertive means it interrupts immediately — this is used only for the budget exceeded warning because that is urgent.

### Visual Indicators

- A skip link appears at the top left corner of the page when you press Tab for the first time, allowing keyboard users to jump past the navigation directly into the main content.
- All focusable elements have a visible blue outline when they receive keyboard focus.
- Form fields that fail validation get a red border and a red error message directly below them.
- Search matches are highlighted in yellow using the `<mark>` element, which remains readable in dark mode.
- Text contrast ratios exceed the WCAG AA minimum: body text achieves 13.7:1 and links achieve 4.8:1.

### Modal Dialogs

All modals use the native HTML `<dialog>` element with `.showModal()`. This automatically traps focus inside the dialog while it is open, so Tab will cycle only through the dialog's elements. Pressing Escape closes any open dialog and returns focus to the element that opened it.

---

## Code Structure

```
student-finance-tracker/
├── index.html              # The single HTML file that contains every page section
├── tests.html              # Automated test suite for the five regex validators
├── seed.json               # Fifteen sample transactions loaded on first visit
├── README.md
├── styles/
│   ├── main.css            # All visual styles: layout, colors, animations, dark mode
│   └── a11y.css            # Focus rings, skip link, reduced-motion overrides
└── scripts/
    ├── main.js             # Entry point: starts the app and wires all event listeners
    ├── state.js            # Central data store with pub/sub change notifications
    ├── storage.js          # Reads and writes to localStorage; handles import/export
    ├── validators.js       # The five regex rules and field/record validation logic
    ├── search.js           # Regex compiler, search filter, and match highlighter
    ├── utils.js            # Date formatting, currency conversion, sorting, debounce
    └── ui.js               # Builds and updates every visual element on the page
```

### What Each File Is Responsible For

**`main.js`** is where the app starts. When the page finishes loading, this file sets up every click listener, form submission handler, keyboard shortcut, and modal behavior. It never manipulates data directly — it always calls methods on the state object, which then saves to localStorage and notifies the UI to update.

**`state.js`** holds all the application data in one central place: the list of records, the settings, and the current UI state (which section is open, what you are searching for, which record is being edited). Any file that needs to react to data changes can call `state.subscribe(fn)` and their function will be called automatically every time something changes. This is what keeps the dashboard, the records list, and the chart all synchronized.

**`storage.js`** handles reading from and writing to localStorage. It also generates unique transaction IDs in the format `txn_1727600000000_A3F9B`, and it contains the logic for exporting records to a JSON or CSV file and importing records back from a JSON file.

**`validators.js`** contains all five regex patterns. It exposes two functions: `validateField` checks a single value, and `validateRecord` checks all fields at once and returns an object listing every error found. The patterns themselves are never changed between files — every part of the app uses these same functions.

**`search.js`** compiles the user's search input into a RegExp object safely using a try/catch block so an invalid pattern never crashes the app. It also contains `highlightMatches`, which wraps matching text in `<mark>` tags while escaping all other characters to prevent any HTML injection.

**`utils.js`** is a collection of small, focused helper functions. It handles formatting dates as `YYYY-MM-DD` strings, converting amounts between USD, RWF, and UGX using stored exchange rates, sorting records by any field, calculating totals and per-category sums, and wrapping functions in a debounce delay.

**`ui.js`** takes data from state and draws it onto the page. It never changes any data — its only job is rendering. It builds the transaction cards, updates the four stat cards on the dashboard, draws the bar chart, shows and hides sections, and displays toast notifications.

---

## Testing

`tests.html` is a supplementary automated test suite that lives alongside the main app but is not part of the app itself. You open it separately to verify that all five regex validation rules are working correctly. It has no connection to the main `index.html` and does not affect any stored data.

### Automated Test Suite

Open `tests.html` through your local server or the live GitHub Pages URL. The suite runs every validation rule against a set of known-good and known-bad inputs and displays a pass or fail result for each one. A summary at the bottom shows how many total tests passed and failed. Every test must show green before the project is submitted.

To run it locally:

```bash
python3 -m http.server 8080
```

Then navigate to `tests.html` using your server's address.

### Manual Testing Checklist

#### Adding and Editing Records
- Add a valid transaction and confirm the record appears in the list, the stats update, and the data is still there after a page refresh
- Submit the form with each field intentionally blank or invalid and confirm the correct error message appears under each field
- Edit an existing transaction, change one field, and confirm the `updatedAt` timestamp changes
- Click Delete on a record, confirm the dialog appears, cancel it, and verify the record is untouched

#### Regex Search
- Search for `coffee|tea` and verify matching records are highlighted in yellow with a result count
- Search for `\b(\w+)\s+\1\b` and verify records with repeated words are found
- Search for `\.99$` and verify only amounts ending in .99 remain
- Search for `[unclosed` (intentionally invalid) and verify the app shows an error message without crashing

#### Sorting
- Sort by Date descending and verify the newest record is first
- Sort by Description and verify alphabetical order
- Toggle sort direction and verify the order reverses

#### Dashboard and Budget
- Set a budget cap lower than your current total spending and verify the banner turns red and a screen reader alert fires
- Set the cap higher than the total and verify the banner turns green

#### Import and Export
- Export your records as JSON, then clear all data, then re-import the file and verify everything is restored
- Import the same file a second time and verify the app reports the duplicate IDs as skipped

#### Settings
- Switch the display currency from USD to UGX and verify all amounts update immediately
- Add a new category and verify it appears in the form dropdown right away
- Remove a category and verify it disappears from the dropdown

#### Keyboard and Accessibility
- Tab to the skip link at the top and press Enter to confirm it jumps to the main content
- Navigate to all five sections using only Tab and Enter
- Open the Add Transaction form, Tab through every field, submit with Enter, then close with Escape
- Open the delete confirmation, Tab to Cancel, press Escape, and verify the record is still there
- Press `Alt + N` to open the form and `Alt + K` to open the keyboard map

#### Responsive Layout
- At 360 pixels wide: stats stack in a single column, records show as cards
- At 768 pixels wide: records show in a table, stats show in two columns
- At 1024 pixels wide: stats show in four columns across the full dashboard

---

## Data Format

Each transaction is stored as a JSON object with these fields:

```json
{
  "id": "txn_1748160000000_A3F9B",
  "description": "Lunch at cafeteria",
  "amount": 12.50,
  "category": "Food",
  "date": "2025-09-25",
  "createdAt": "2025-09-25T12:30:00Z",
  "updatedAt": "2025-09-25T12:30:00Z"
}
```

The `id` field is generated automatically and never changes after creation. When importing a JSON file, the app checks that each record has an `id`, `description`, a numeric `amount`, a `category`, and a `date` in the correct format. Records missing any of these fields are skipped. Records whose `id` already exists in the app are also skipped to prevent duplicates.

---

## Demo Video

**[Watch walkthrough on YouTube](https://youtu.be/5CUSiD6XTXI)**

The video covers the following:

- Keyboard-only navigation through all five sections: Home, Dashboard, Records, Settings, and About
- Using the regex search with the patterns `coffee|tea`, `\b(\w+)\s+\1\b` for duplicate words, and `\.99$` for amounts ending in ninety-nine cents, plus an invalid pattern to show the error handling
- A full import and export round trip: exporting records to a file, clearing all data, re-importing the file, and verifying that importing the same file twice correctly skips the duplicate IDs
- The responsive layout adapting from a phone at 360 pixels to a full desktop view

---

## thanks
