// storage.js
// Handles saving and loading all data in the browser's localStorage.
// localStorage stores text, so we convert objects to JSON strings and back.

// The keys used to store data in localStorage
const DATA_KEY     = 'finance-tracker-records';   // stores the list of transactions
const SETTINGS_KEY = 'finance-tracker-settings';  // stores app settings (currency, budget cap, etc.)

// ---- One-time migration ------------------------------------------------
// Older versions used ":" in the keys. This block moves any saved data to
// the new keys the first time the app loads, then removes the old keys.
(function migrate() {
    const OLD_DATA     = 'finance-tracker:data';
    const OLD_SETTINGS = 'finance-tracker:settings';
    try {
        const oldData = localStorage.getItem(OLD_DATA);
        if (oldData) {
            localStorage.setItem(DATA_KEY, oldData);
            localStorage.removeItem(OLD_DATA);
        }
        const oldSettings = localStorage.getItem(OLD_SETTINGS);
        if (oldSettings) {
            localStorage.setItem(SETTINGS_KEY, oldSettings);
            localStorage.removeItem(OLD_SETTINGS);
        }
    } catch (error) {
        // localStorage may be blocked in some browsers (e.g., private mode)
    }
}());

// ---- Records ---------------------------------------------------------------

// Load all saved transactions from localStorage.
// Returns an empty array [] if nothing has been saved yet.
export function loadRecords() {
    try {
        const savedText = localStorage.getItem(DATA_KEY);
        if (!savedText) return [];                         // nothing saved yet
        const parsed = JSON.parse(savedText);
        return Array.isArray(parsed) ? parsed : [];        // safety check: must be an array
    } catch (error) {
        return [];  // if the saved JSON is broken, start fresh
    }
}

// Save the full list of transactions to localStorage.
export function saveRecords(records) {
    try {
        localStorage.setItem(DATA_KEY, JSON.stringify(records));
    } catch (error) {
        console.error('Could not save records to localStorage');
    }
}

// Delete all saved transactions from localStorage.
export function clearRecords() {
    localStorage.removeItem(DATA_KEY);
}

// ---- Settings --------------------------------------------------------------

// Load saved settings from localStorage.
// If no settings exist yet, returns the default settings object.
export function loadSettings() {
    try {
        const savedText = localStorage.getItem(SETTINGS_KEY);
        if (!savedText) return getDefaultSettings();
        // Merge saved settings on top of defaults so any new settings have a value
        return Object.assign({}, getDefaultSettings(), JSON.parse(savedText));
    } catch (error) {
        return getDefaultSettings();
    }
}

// Save the current settings object to localStorage.
export function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Could not save settings to localStorage');
    }
}

// The default settings used when a new user opens the app for the first time.
export function getDefaultSettings() {
    return {
        baseCurrency:    'USD',
        displayCurrency: 'USD',
        exchangeRates:   { RWF: 1300, UGX: 3700 },
        categories:      ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'],
        budgetCap:       null,
        lastUpdated:     new Date().toISOString()
    };
}

// ---- ID Generator ----------------------------------------------------------

// Create a unique ID for a new transaction.
// Format: txn_<timestamp>_<5 random characters>
// Example: txn_1748160000000_A3F9B
export function generateId() {
    const timestamp  = Date.now();                                           // ms since Jan 1 1970
    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase(); // 5 random chars
    return 'txn_' + timestamp + '_' + randomPart;
}

// ---- JSON Import / Export --------------------------------------------------

// Convert the records array to a formatted JSON string ready for download.
export function exportJSON(records) {
    return JSON.stringify(records, null, 2); // 2-space indent makes it human-readable
}

// Parse a JSON file the user selected for import.
// Returns an object: { success: true/false, records: [...], error: 'message' }
export function importJSON(text) {
    try {
        const data = JSON.parse(text);

        // The file must contain an array (not a single object)
        if (!Array.isArray(data)) {
            return { success: false, records: [], error: 'File must contain an array of records' };
        }

        // Keep only records that have the required fields in the right format
        const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
        const validRecords = data.filter(function(record) {
            return typeof record.id          === 'string' && record.id.trim() &&
                   typeof record.description === 'string' && record.description.trim() &&
                   typeof record.amount      === 'number' && isFinite(record.amount) && record.amount >= 0 &&
                   typeof record.category    === 'string' && record.category.trim() &&
                   typeof record.date        === 'string' && DATE_RE.test(record.date);
        });

        if (validRecords.length === 0) {
            return { success: false, records: [], error: 'No valid records found in file' };
        }

        return { success: true, records: validRecords, error: '' };
    } catch (error) {
        return { success: false, records: [], error: error.message };
    }
}

// ---- CSV Export (RFC 4180 format) ------------------------------------------

// Convert records to a CSV string ready for download.
export function exportCSV(records) {
    const headers = ['id', 'description', 'amount', 'category', 'date', 'createdAt', 'updatedAt'];

    // Wrap a cell in quotes if it contains commas, quotes, or line breaks
    function formatCell(value) {
        const text = (value == null) ? '' : String(value);
        if (/[,"\r\n]/.test(text)) {
            return '"' + text.replace(/"/g, '""') + '"'; // double any existing quotes
        }
        return text;
    }

    // Turn each record into one CSV line
    const dataRows = records.map(function(record) {
        return headers.map(function(field) {
            return formatCell(record[field]);
        }).join(',');
    });

    // Add the header row at the top, join all rows with CRLF (required by RFC 4180)
    return [headers.join(',')].concat(dataRows).join('\r\n');
}
