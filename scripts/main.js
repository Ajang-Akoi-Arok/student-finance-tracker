// main.js
// App entry point: sets up all event listeners and starts the app.
// This file ties all the modules together. It never manipulates data directly —
// it always calls state methods (which then save to localStorage and notify the UI).

import state from './state.js';
import { validateField, validateRecord } from './validators.js';
import { importJSON, exportJSON, exportCSV } from './storage.js';
import { convertAndFormat, debounce, formatDate } from './utils.js';
import {
    showSection, renderRecords, updateStats, updateSearchStatus,
    populateCategories, populateFormCategories, showToast
} from './ui.js';

// ============================================================
// INIT — called once when the page finishes loading
// ============================================================

function init() {
    initTheme();
    setupNav();
    setupDashboard();
    setupRecords();
    setupModals();
    setupSettings();
    setupKeyboardShortcuts();
    setupInlineForm();
    setupAboutCards();
    loadSettingsUI();
    state.subscribe(onStateChange);  // listen for any data changes
    renderAll();
    showSection('about');            // start on the About (landing) page
    loadSeedIfEmpty();               // load sample data if the user has none yet
}

// Re-render the whole UI whenever records or settings change.
function onStateChange(change) {
    // Decide if the change is one that requires a full re-render
    const isRecordChange = change.type.startsWith('record') ||
                           change.type === 'records:bulk-update' ||
                           change.type === 'records:cleared';

    if (isRecordChange || change.type === 'settings:updated') {
        if (change.type === 'settings:updated') {
            loadSettingsUI(); // refresh the settings form fields too
        }
        renderAll();
    }
}

// Refresh every rendered part of the page.
function renderAll() {
    renderRecords({ onEdit: openEditForm, onDelete: requestDelete });
    updateStats();
    populateCategories({ onRemove: removeCategory });
    populateFormCategories();
}

// ============================================================
// NAVIGATION
// ============================================================

function setupNav() {
    const nav       = document.getElementById('app-nav');
    const navToggle = document.getElementById('nav-toggle');

    // Hamburger button — toggle the mobile menu open/closed
    navToggle.addEventListener('click', function() {
        const isNowOpen = nav.classList.toggle('active');
        navToggle.setAttribute('aria-expanded', String(isNowOpen));
    });

    // Nav links — navigate to the chosen section and close the mobile menu
    document.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showSection(link.dataset.section);
            nav.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    // CTA buttons on the About page (e.g., "Open Dashboard →")
    document.querySelectorAll('[data-goto]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            showSection(btn.dataset.goto);
        });
    });
}

// ============================================================
// DASHBOARD BUTTONS
// ============================================================

function setupDashboard() {
    document.getElementById('btn-add-record').addEventListener('click', openAddForm);
    document.getElementById('btn-import').addEventListener('click', importData);
    document.getElementById('btn-export').addEventListener('click', exportData);
    document.getElementById('btn-export-csv').addEventListener('click', exportDataCSV);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

// ============================================================
// RECORDS — search and sort controls
// ============================================================

function setupRecords() {
    // Search input — debounced so we don't search on every single keystroke
    document.getElementById('search-input')
        .addEventListener('input', debounce(handleSearch, 300));

    // Case-insensitive checkbox — re-run the search immediately when toggled
    document.getElementById('search-case-insensitive')
        .addEventListener('change', handleSearch);

    // Sort field dropdown
    document.getElementById('sort-field').addEventListener('change', function() {
        state.setSortField(document.getElementById('sort-field').value);
        renderRecords({ onEdit: openEditForm, onDelete: requestDelete });
    });

    // Sort direction button (↓ Desc / ↑ Asc)
    document.getElementById('sort-direction').addEventListener('click', function() {
        const newDesc = !state.sortDesc;
        state.setSortDesc(newDesc);

        const btn = document.getElementById('sort-direction');
        btn.textContent = newDesc ? '↓ Desc' : '↑ Asc';
        btn.setAttribute('aria-label',
            'Toggle sort direction (currently ' + (newDesc ? 'descending' : 'ascending') + ')');

        renderRecords({ onEdit: openEditForm, onDelete: requestDelete });
    });

    // "Add your first one!" button in the empty-state message
    document.getElementById('empty-add-btn').addEventListener('click', function(e) {
        e.preventDefault();
        openAddForm();
    });
}

// Read the search bar and checkbox, then re-render filtered records.
function handleSearch() {
    const pattern = document.getElementById('search-input').value;
    const ci      = document.getElementById('search-case-insensitive').checked;

    state.setSearchPattern(pattern);
    state.setSearchCaseInsensitive(ci);

    const count = renderRecords({ onEdit: openEditForm, onDelete: requestDelete });
    updateSearchStatus(pattern, count, ci);
}

// ============================================================
// MODALS — generic helpers and individual setup
// ============================================================

function openModal(modalId)  { document.getElementById(modalId).showModal(); }
function closeModal(modalId) { document.getElementById(modalId).close(); }

function setupModals() {

    // --- Transaction form modal ---
    document.getElementById('transaction-form')
        .addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-close-modal')
        .addEventListener('click', closeFormModal);
    document.getElementById('btn-cancel-form')
        .addEventListener('click', closeFormModal);
    document.getElementById('form-modal')
        .addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeFormModal();
        });

    // --- Delete confirmation modal ---
    document.getElementById('btn-confirm-delete')
        .addEventListener('click', confirmDelete);
    document.getElementById('btn-cancel-delete')
        .addEventListener('click', function() {
            closeModal('delete-modal');
            state.setDeleteConfirmingId(null);
        });
    document.getElementById('delete-modal')
        .addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal('delete-modal');
                state.setDeleteConfirmingId(null);
            }
        });

    // --- Clear-all confirmation modal ---
    document.getElementById('btn-confirm-clear')
        .addEventListener('click', confirmClearAll);
    document.getElementById('btn-cancel-clear')
        .addEventListener('click', function() { closeModal('clear-modal'); });
    document.getElementById('clear-modal')
        .addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal('clear-modal');
        });

    // --- Keyboard map modal ---
    document.getElementById('btn-close-keyboard')
        .addEventListener('click', function() { closeModal('keyboard-modal'); });
    document.getElementById('keyboard-modal')
        .addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal('keyboard-modal');
        });
    document.getElementById('footer-keyboard-link')
        .addEventListener('click', function(e) { e.preventDefault(); openKeyboardMap(); });

    // --- Live validation on the modal form fields ---
    const formFields = ['description', 'amount', 'date', 'category'];
    formFields.forEach(function(field) {
        const input = document.getElementById('form-' + field);
        if (!input) return;

        // Validate while typing (debounced to avoid flashing errors)
        input.addEventListener('input', debounce(function() {
            if (input.value.trim()) {
                validateFormField(field);
            } else {
                clearFieldError(field);
            }
        }, 250));

        // Validate when the user leaves the field
        input.addEventListener('blur',   function() { validateFormField(field, true); });
        input.addEventListener('change', function() { validateFormField(field, true); });
    });
}

// ============================================================
// SHARED FORM HELPERS — used by both the modal and inline forms
// ============================================================

// Mark each failing field with a red border and error message.
// inputPrefix: the start of the input element's ID ('form-' or 'inline-')
// errorPrefix: the start of the error span's ID ('error-' or 'inline-error-')
// Returns the first invalid input so the caller can focus it.
function showFormErrors(errors, inputPrefix, errorPrefix) {
    var firstErrorInput = null;
    var fields = Object.keys(errors);

    for (var i = 0; i < fields.length; i++) {
        var field   = fields[i];
        var errorEl = document.getElementById(errorPrefix + field);
        var inputEl = document.getElementById(inputPrefix + field);

        if (errorEl) errorEl.textContent = errors[field];
        if (inputEl) {
            inputEl.parentElement.classList.add('error');
            if (!firstErrorInput) firstErrorInput = inputEl;
        }
    }
    return firstErrorInput;
}

// ============================================================
// TRANSACTION FORM — open, close, submit
// ============================================================

function openAddForm() {
    document.getElementById('form-record-id').value         = '';
    document.getElementById('form-modal-title').textContent = 'Add Transaction';
    document.getElementById('transaction-form').reset();
    document.getElementById('form-date').value              = formatDate(new Date());
    document.getElementById('form-record-meta').hidden      = true;
    clearAllErrors();
    state.setEditingRecordId(null);
    openModal('form-modal');
    document.getElementById('form-description').focus();
}

function openEditForm(id) {
    const record = state.records.find(function(r) { return r.id === id; });
    if (!record) return;

    // Fill in the form with the record's current values
    document.getElementById('form-record-id').value         = record.id;
    document.getElementById('form-modal-title').textContent = 'Edit Transaction';
    document.getElementById('form-description').value       = record.description;
    document.getElementById('form-amount').value            = record.amount;
    document.getElementById('form-category').value          = record.category;
    document.getElementById('form-date').value              = record.date;

    // Show the record metadata (ID, created, updated)
    document.getElementById('meta-id').textContent      = record.id;
    document.getElementById('meta-created').textContent = record.createdAt
        ? new Date(record.createdAt).toLocaleString() : 'N/A';
    document.getElementById('meta-updated').textContent = record.updatedAt
        ? new Date(record.updatedAt).toLocaleString() : 'N/A';
    document.getElementById('form-record-meta').hidden = false;

    clearAllErrors();
    state.setEditingRecordId(id);
    openModal('form-modal');
    document.getElementById('form-description').focus();
}

function closeFormModal() {
    closeModal('form-modal');
    document.getElementById('form-record-meta').hidden = true;
    clearAllErrors();
    state.setEditingRecordId(null);
}

function handleFormSubmit(e) {
    e.preventDefault(); // stop the browser from reloading the page

    const id        = document.getElementById('form-record-id').value;
    const rawAmount = document.getElementById('form-amount').value;

    const data = {
        description: document.getElementById('form-description').value.trim(),
        amount:      rawAmount,
        category:    document.getElementById('form-category').value,
        date:        document.getElementById('form-date').value
    };

    // Run all 5 validation rules
    const validation = validateRecord(data);
    if (!validation.isValid) {
        const firstErrorInput = showFormErrors(validation.errors, 'form-', 'error-');
        document.getElementById('status-region').textContent = 'Please fix the errors before saving.';
        if (firstErrorInput) firstErrorInput.focus();
        return; // stop here — don't save
    }

    clearAllErrors();

    if (id) {
        // Editing an existing record
        state.updateRecord(id, Object.assign({}, data, { amount: parseFloat(rawAmount) }));
        showToast('Transaction updated', 'success');
    } else {
        // Adding a new record
        state.addRecord(Object.assign({}, data, { amount: parseFloat(rawAmount) }));
        showToast('Transaction added', 'success');
    }

    closeFormModal();
}

// ---- Field validation helpers ----

function validateFormField(field, showRequired) {
    if (showRequired === undefined) showRequired = false;

    const input = document.getElementById('form-' + field);
    if (!input) return;

    // If empty and we're not forcing the required check, just clear the error
    if (!input.value && !showRequired) {
        clearFieldError(field);
        return;
    }

    const result = validateField(field, input.value);

    if (!result.isValid) {
        document.getElementById('error-' + field).textContent = result.message;
        input.parentElement.classList.add('error');
    } else {
        clearFieldError(field);
    }
}

function clearFieldError(field) {
    const errorEl = document.getElementById('error-' + field);
    const inputEl = document.getElementById('form-' + field);
    if (errorEl) errorEl.textContent = '';
    if (inputEl) inputEl.parentElement.classList.remove('error');
}

function clearAllErrors() {
    const fields = ['description', 'amount', 'category', 'date'];
    for (const field of fields) {
        clearFieldError(field);
    }
}

// ============================================================
// DELETE
// ============================================================

// Open the delete confirmation dialog for a record.
function requestDelete(id) {
    state.setDeleteConfirmingId(id);
    openModal('delete-modal');
    document.getElementById('btn-confirm-delete').focus();
}

// The user confirmed the delete — go ahead and remove the record.
function confirmDelete() {
    if (state.deleteConfirmingId) {
        state.deleteRecord(state.deleteConfirmingId);
        showToast('Transaction deleted', 'success');
    }
    closeModal('delete-modal');
    state.setDeleteConfirmingId(null);
}

// The user confirmed clearing all data.
function confirmClearAll() {
    state.clearRecords();
    closeModal('clear-modal');
    showToast('All data cleared', 'success');
}

// ============================================================
// KEYBOARD MAP MODAL
// ============================================================

function openKeyboardMap() {
    openModal('keyboard-modal');
    document.getElementById('btn-close-keyboard').focus();
}

// ============================================================
// SETTINGS
// ============================================================

function setupSettings() {
    document.getElementById('btn-add-category')
        .addEventListener('click', addCategory);

    // Allow pressing Enter to add a category
    document.getElementById('new-category')
        .addEventListener('keypress', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
        });

    document.getElementById('base-currency')
        .addEventListener('change', updateCurrency);
    document.getElementById('display-currency')
        .addEventListener('change', updateCurrency);

    // Exchange rate inputs
    ['rwf', 'ugx'].forEach(function(currCode) {
        document.getElementById('rate-' + currCode)
            .addEventListener('change', updateRates);
    });

    document.getElementById('btn-save-cap')
        .addEventListener('click', saveCap);

    document.getElementById('btn-clear-data')
        .addEventListener('click', function() {
            openModal('clear-modal');
            document.getElementById('btn-confirm-clear').focus();
        });

    document.getElementById('btn-keyboard-map')
        .addEventListener('click', openKeyboardMap);
}

function addCategory() {
    const input        = document.getElementById('new-category');
    const categoryName = input.value.trim();

    if (!categoryName) {
        showToast('Please enter a category name', 'error');
        input.focus();
        return;
    }

    // Check for duplicates (case-insensitive)
    const existingLower = state.settings.categories.map(function(c) { return c.toLowerCase(); });
    if (existingLower.includes(categoryName.toLowerCase())) {
        showToast('Category already exists', 'error');
        input.focus();
        return;
    }

    // Validate with Rule 4 (letters, spaces, hyphens only)
    const CATEGORY_RULE = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;
    if (!CATEGORY_RULE.test(categoryName)) {
        showToast('Letters, spaces, and hyphens only', 'error');
        input.focus();
        return;
    }

    state.settings.categories.push(categoryName);
    state.updateSettings({ categories: state.settings.categories });
    input.value = '';
    showToast('Category "' + categoryName + '" added', 'success');
    input.focus();
}

function removeCategory(name) {
    const updated = state.settings.categories.filter(function(c) { return c !== name; });
    state.updateSettings({ categories: updated });
    showToast('Category "' + name + '" removed', 'success');
}

function updateCurrency() {
    state.updateSettings({
        baseCurrency:    document.getElementById('base-currency').value,
        displayCurrency: document.getElementById('display-currency').value
    });
    showToast('Currency settings saved', 'success');
}

function updateRates() {
    const rwfRate = parseFloat(document.getElementById('rate-rwf').value) || 1300;
    const ugxRate = parseFloat(document.getElementById('rate-ugx').value) || 3700;

    state.updateSettings({
        exchangeRates: { RWF: rwfRate, UGX: ugxRate }
    });
    showToast('Exchange rates updated', 'success');
}

function saveCap() {
    const raw = document.getElementById('budget-cap').value;
    const cap = raw ? parseFloat(raw) : null;

    if (raw && (isNaN(cap) || cap < 0)) {
        showToast('Enter a valid positive amount', 'error');
        return;
    }

    state.updateSettings({ budgetCap: cap });
    updateStats(); // refresh the budget card immediately

    if (cap) {
        const displayCap = convertAndFormat(
            cap,
            state.settings.baseCurrency,
            state.settings.displayCurrency,
            state.settings.exchangeRates
        );
        showToast('Budget cap set to ' + displayCap, 'success');
    } else {
        showToast('Budget cap removed', 'success');
    }
}

// Fill the Settings form with the current values from state.
function loadSettingsUI() {
    populateCategories({ onRemove: removeCategory });
    populateFormCategories();

    document.getElementById('base-currency').value    = state.settings.baseCurrency;
    document.getElementById('display-currency').value = state.settings.displayCurrency;
    document.getElementById('rate-rwf').value         = state.settings.exchangeRates.RWF != null
        ? state.settings.exchangeRates.RWF : 1300;
    document.getElementById('rate-ugx').value         = state.settings.exchangeRates.UGX != null
        ? state.settings.exchangeRates.UGX : 3700;

    if (state.settings.budgetCap) {
        document.getElementById('budget-cap').value = state.settings.budgetCap;
    }
}

// ============================================================
// IMPORT / EXPORT
// ============================================================

function exportData() {
    const jsonText = exportJSON(state.records);
    downloadFile(jsonText, 'application/json', '.json');
    showToast('Data exported', 'success');
}

function exportDataCSV() {
    const csvText = exportCSV(state.records);
    downloadFile(csvText, 'text/csv;charset=utf-8;', '.csv');
    showToast('Exported as CSV', 'success');
}

// Create a temporary link element to trigger a file download.
function downloadFile(content, mimeType, extension) {
    const blob      = new Blob([content], { type: mimeType });
    const url       = URL.createObjectURL(blob);
    const link      = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0]; // "2025-09-29"

    link.href     = url;
    link.download = 'finance-tracker-' + dateStamp + extension;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url); // free browser memory
}

function importData() {
    // Open a file picker — only JSON files
    const fileInput  = document.createElement('input');
    fileInput.type   = 'file';
    fileInput.accept = 'application/json,.json';

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', function(event) {
            const result = importJSON(event.target.result);

            if (!result.success) {
                showToast('Import failed: ' + result.error, 'error', 5000);
                return;
            }

            // Drop records that fail full validation
            const validRecords   = result.records.filter(function(r) { return validateRecord(r).isValid; });
            const invalidCount   = result.records.length - validRecords.length;

            // Skip records whose ID already exists
            const existingIds    = new Set(state.records.map(function(r) { return r.id; }));
            const newRecords     = validRecords.filter(function(r) { return !existingIds.has(r.id); });
            const duplicateCount = validRecords.length - newRecords.length;

            state.setRecords(state.records.concat(newRecords));

            // Build a summary message
            const added = newRecords.length;
            const noun  = added === 1 ? 'transaction' : 'transactions';
            let msg = 'Imported ' + added + ' ' + noun;
            if (duplicateCount > 0) msg += ' (' + duplicateCount + ' duplicate' + (duplicateCount !== 1 ? 's' : '') + ' skipped)';
            if (invalidCount   > 0) msg += ' (' + invalidCount   + ' invalid'   + (invalidCount   !== 1 ? 's' : '') + ' skipped)';
            showToast(msg, 'success', 4000);
        });

        reader.readAsText(file);
    });

    fileInput.click();
}

// ============================================================
// THEME (light / dark mode)
// ============================================================

function initTheme() {
    const savedTheme = localStorage.getItem('ft-theme');

    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Decide which button label to show at startup
    const startTheme = savedTheme ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    updateThemeBtn(startTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    const next = (current === 'dark') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ft-theme', next);
    updateThemeBtn(next);
}

function updateThemeBtn(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    const isDark = (theme === 'dark');
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');

    const iconEl  = btn.querySelector('.theme-icon');
    const labelEl = btn.querySelector('.theme-label');
    if (iconEl)  iconEl.textContent  = isDark ? '☀️' : '🌙';
    if (labelEl) labelEl.textContent = isDark ? 'Light' : 'Dark';
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+S / Cmd+S — show "auto-saved" confirmation
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            showToast('Auto-saved to browser', 'success', 2000);
        }
        // Alt+K — open keyboard shortcut map
        if (e.altKey && e.key === 'k') { e.preventDefault(); openKeyboardMap(); }
        // Alt+N — open "Add Transaction" form
        if (e.altKey && e.key === 'n') { e.preventDefault(); openAddForm(); }
    });
}

// ============================================================
// SEED DATA — loads sample transactions on the very first visit
// ============================================================

async function loadSeedIfEmpty() {
    // Skip if the user already has records
    if (state.records.length > 0) return;

    try {
        const response = await fetch('./seed.json');
        if (!response.ok) return;

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) return;

        // Shift all dates so the most recent falls on yesterday —
        // this keeps the 7-day chart populated no matter when the app is opened.
        state.setRecords(shiftDatesToRecent(data));
        showToast('Sample data loaded. Import your own via Dashboard', 'info', 5000);

    } catch (error) {
        // Silently skip — happens if the file can't be fetched (e.g., file:// protocol)
    }
}

// Move every record's date forward by the same number of days so the
// newest seed record lands on yesterday.
function shiftDatesToRecent(records) {
    // Find the latest date in the seed data
    const allDates  = records.map(function(r) { return r.date; }).filter(Boolean);
    if (allDates.length === 0) return records;

    allDates.sort(); // ISO dates sort correctly as strings
    const newestDateStr = allDates[allDates.length - 1]; // e.g., "2025-09-29"

    // Parse the newest seed date
    const parts     = newestDateStr.split('-').map(Number);
    const newestSeed = new Date(parts[0], parts[1] - 1, parts[2]);

    // We want the newest record to appear on yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // How many days to shift forward?
    const msPerDay  = 86400000;
    const dayOffset = Math.round((yesterday - newestSeed) / msPerDay);

    // Apply the offset to every record's date
    return records.map(function(record) {
        if (!record.date) return record;

        const dateParts = record.date.split('-').map(Number);
        const original  = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        original.setDate(original.getDate() + dayOffset);

        return Object.assign({}, record, { date: formatDate(original) });
    });
}

// ============================================================
// INLINE FORM (the "Add Record" section, separate from the modal)
// ============================================================

function setupInlineForm() {
    const form     = document.getElementById('inline-transaction-form');
    const resetBtn = document.getElementById('inline-reset-btn');
    if (!form) return;

    // Keep the category dropdown in sync with settings
    function syncInlineCategories() {
        const select = document.getElementById('inline-category');
        if (!select) return;
        const currentValue = select.value;
        const options = state.settings.categories.map(function(c) {
            return '<option value="' + c + '">' + c + '</option>';
        });
        select.innerHTML = '<option value="">Select a category</option>' + options.join('');
        if (currentValue) select.value = currentValue;
    }

    syncInlineCategories();
    state.subscribe(function(change) {
        if (change.type === 'settings:updated') syncInlineCategories();
    });

    // Default date to today
    document.getElementById('inline-date').value = formatDate(new Date());

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const id        = document.getElementById('inline-record-id').value;
        const rawAmount = document.getElementById('inline-amount').value;

        const data = {
            description: document.getElementById('inline-description').value.trim(),
            amount:      rawAmount,
            category:    document.getElementById('inline-category').value,
            date:        document.getElementById('inline-date').value
        };

        const validation = validateRecord(data);
        if (!validation.isValid) {
            showFormErrors(validation.errors, 'inline-', 'inline-error-');
            return;
        }

        clearInlineErrors();

        if (id) {
            state.updateRecord(id, Object.assign({}, data, { amount: parseFloat(rawAmount) }));
            showToast('Transaction updated', 'success');
        } else {
            state.addRecord(Object.assign({}, data, { amount: parseFloat(rawAmount) }));
            showToast('Transaction added', 'success');
        }

        resetInlineForm();
    });

    resetBtn.addEventListener('click', resetInlineForm);
}

function resetInlineForm() {
    const form = document.getElementById('inline-transaction-form');
    if (!form) return;

    form.reset();
    document.getElementById('inline-record-id').value        = '';
    document.getElementById('inline-record-meta').hidden     = true;
    document.getElementById('inline-date').value             = formatDate(new Date());
    document.getElementById('inline-submit-btn').textContent = 'Save Transaction';
    clearInlineErrors();
}

function clearInlineErrors() {
    const fields = ['description', 'amount', 'category', 'date'];
    for (const field of fields) {
        const errorEl = document.getElementById('inline-error-' + field);
        const inputEl = document.getElementById('inline-' + field);
        if (errorEl) errorEl.textContent = '';
        if (inputEl) inputEl.parentElement.classList.remove('error');
    }
}

// ============================================================
// ABOUT CARDS — scroll-in animation using IntersectionObserver
// ============================================================

function setupAboutCards() {
    const cards = document.querySelectorAll('.about-card[data-aos]');
    if (!cards.length) return;

    // IntersectionObserver fires when an element enters the viewport
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible'); // triggers the CSS transition
                observer.unobserve(entry.target);         // stop watching — animate only once
            }
        });
    }, { threshold: 0.12 }); // fire when 12% of the card is visible

    cards.forEach(function(card) {
        observer.observe(card);
    });
}

// ============================================================
// START THE APP
// ============================================================

document.addEventListener('DOMContentLoaded', init);
