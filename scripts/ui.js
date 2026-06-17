// ui.js
// All DOM rendering and display updates.
// This module reads from `state` and writes to the page — it never changes state directly.

import state from './state.js';
import { compileRegex, searchRecords, highlightMatches, escapeHtml } from './search.js';
import { convertAndFormat, getTotalSpending, getTopCategory, sortRecords, formatDate } from './utils.js';

// ---- Shared display helper -------------------------------------------------

// Convert and format an amount for display using the current currency settings.
function displayAmount(amount) {
    const base    = state.settings.baseCurrency;
    const display = state.settings.displayCurrency;
    const rates   = state.settings.exchangeRates;
    return convertAndFormat(amount, base, display, rates);
}

// ---- Animated number counter -----------------------------------------------

// Count a stat element from 0 up to targetValue over `ms` milliseconds.
// format = a function that turns a number into the display string (e.g., currency).
function animateCount(element, targetValue, format, ms) {
    if (ms === undefined) ms = 650;

    const startTime = performance.now();

    function step(currentTime) {
        const elapsed  = currentTime - startTime;
        const progress = Math.min(elapsed / ms, 1);             // 0 → 1
        const eased    = 1 - Math.pow(1 - progress, 3);         // ease-out cubic curve

        element.textContent = format(targetValue * eased);

        if (progress < 1) {
            requestAnimationFrame(step); // keep going until progress reaches 1
        } else {
            element.textContent = format(targetValue); // snap to exact final value
        }
    }

    requestAnimationFrame(step);
}

// Briefly trigger the "pop" animation on a stat value element.
function pulse(element) {
    element.classList.remove('stat-value--pop');
    void element.offsetWidth; // force the browser to notice the class was removed
    element.classList.add('stat-value--pop');
}

// ---- Search highlight helpers ----------------------------------------------

// Highlight a cell where the stored value (e.g., "12.50") differs from the
// displayed value (e.g., "$12.50"). We test the raw value but show the formatted one.
function highlightCell(rawValue, displayValue, regex) {
    if (!regex) return escapeHtml(displayValue);
    if (regex.global) regex.lastIndex = 0;

    if (regex.test(rawValue)) {
        return '<mark>' + escapeHtml(displayValue) + '</mark>';
    }
    return escapeHtml(displayValue);
}

// Build the four HTML strings (description, category, amount, date) for one record.
// Matches are wrapped in <mark> for highlighting.
function buildFieldHtml(record, regex) {
    const formattedAmount = displayAmount(record.amount);
    const formattedDate   = record.date
        ? new Date(record.date + 'T00:00:00').toLocaleDateString()
        : record.date;

    return {
        desc: highlightMatches(record.description, regex),
        cat:  highlightMatches(record.category, regex),
        amt:  highlightCell(record.amount.toFixed(2), formattedAmount, regex),
        date: highlightCell(record.date || '', formattedDate, regex)
    };
}

// ---- Navigation ------------------------------------------------------------

// Show one page section and hide all others.
export function showSection(name) {
    // Hide every section
    const allSections = document.querySelectorAll('.section');
    allSections.forEach(function(section) {
        section.classList.remove('active');
        section.classList.add('hidden');
        section.setAttribute('aria-hidden', 'true');
    });

    // Show the requested section
    const targetSection = document.getElementById(name + '-section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
        targetSection.removeAttribute('aria-hidden');
    }

    // Scroll back to the top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update nav link active states
    document.querySelectorAll('.nav-link').forEach(function(link) {
        const isActive = link.dataset.section === name;
        link.classList.toggle('active', isActive);
        link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Show contact strip only on the about section
    const contactStrip = document.querySelector('.contact-strip');
    if (contactStrip) {
        contactStrip.classList.toggle('hidden', name !== 'about');
    }

    state.setCurrentSection(name);
}

// ---- Records (table + mobile cards) ----------------------------------------

// Render all records into both the desktop table and the mobile card list.
// Returns the number of records shown (used to update the search result count).
export function renderRecords(callbacks) {
    const onEdit   = callbacks.onEdit;
    const onDelete = callbacks.onDelete;

    // 1. Sort the records
    const sorted = sortRecords(state.records, state.sortField, state.sortDesc);

    // 2. Apply the search filter (if any)
    let filtered;
    if (state.searchPattern) {
        const regex = compileRegex(state.searchPattern, state.searchCaseInsensitive);
        filtered = regex
            ? searchRecords(sorted, regex, ['description', 'category', 'amount', 'date'])
            : sorted;
    } else {
        filtered = sorted;
    }

    // 3. Build the active regex again for highlighting
    const highlightRegex = state.searchPattern
        ? compileRegex(state.searchPattern, state.searchCaseInsensitive)
        : null;

    // 4. Render desktop TABLE rows
    const tableRows = filtered.map(function(record, index) {
        const fields = buildFieldHtml(record, highlightRegex);
        const delay  = Math.min(index, 12) * 35; // stagger animation, cap at 12

        return [
            '<tr class="row-enter" style="animation-delay:' + delay + 'ms">',
            '  <td class="id-cell">' + escapeHtml(record.id) + '</td>',
            '  <td>' + fields.desc + '</td>',
            '  <td class="amount-cell">' + fields.amt + '</td>',
            '  <td><span class="cat-badge" data-category="' + escapeHtml(record.category) + '">' + fields.cat + '</span></td>',
            '  <td>' + fields.date + '</td>',
            '  <td class="actions-cell">',
            '    <button class="btn btn-sm btn-edit" data-id="' + escapeHtml(record.id) + '" aria-label="Edit ' + escapeHtml(record.description) + '">Edit</button>',
            '    <button class="btn btn-sm btn-danger btn-delete" data-id="' + escapeHtml(record.id) + '" aria-label="Delete ' + escapeHtml(record.description) + '">Delete</button>',
            '  </td>',
            '</tr>'
        ].join('');
    });
    document.getElementById('records-tbody').innerHTML = tableRows.join('');

    // 5. Render MOBILE CARD list
    const cardItems = filtered.map(function(record, index) {
        const fields  = buildFieldHtml(record, highlightRegex);
        const delay   = Math.min(index, 12) * 35;
        const created = record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A';
        const updated = record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'N/A';

        return [
            '<li class="row-enter" style="animation-delay:' + delay + 'ms">',
            '  <article class="record-card">',
            '    <div class="record-card-header">',
            '      <div class="record-card-title">' + fields.desc + '</div>',
            '      <div class="record-card-amount">' + fields.amt + '</div>',
            '    </div>',
            '    <dl class="record-card-meta">',
            '      <div class="record-card-field">',
            '        <dt class="record-card-field-label">Category</dt>',
            '        <dd class="record-card-field-value"><span class="cat-badge" data-category="' + escapeHtml(record.category) + '">' + fields.cat + '</span></dd>',
            '      </div>',
            '      <div class="record-card-field">',
            '        <dt class="record-card-field-label">Date</dt>',
            '        <dd class="record-card-field-value">' + fields.date + '</dd>',
            '      </div>',
            '      <div class="record-card-field">',
            '        <dt class="record-card-field-label">ID</dt>',
            '        <dd class="record-card-field-value id-cell">' + escapeHtml(record.id) + '</dd>',
            '      </div>',
            '      <div class="record-card-field">',
            '        <dt class="record-card-field-label">Created</dt>',
            '        <dd class="record-card-field-value">' + escapeHtml(created) + '</dd>',
            '      </div>',
            '      <div class="record-card-field">',
            '        <dt class="record-card-field-label">Updated</dt>',
            '        <dd class="record-card-field-value">' + escapeHtml(updated) + '</dd>',
            '      </div>',
            '    </dl>',
            '    <div class="record-card-actions">',
            '      <button class="btn btn-sm btn-edit" data-id="' + escapeHtml(record.id) + '" aria-label="Edit ' + escapeHtml(record.description) + '">Edit</button>',
            '      <button class="btn btn-sm btn-danger btn-delete" data-id="' + escapeHtml(record.id) + '" aria-label="Delete ' + escapeHtml(record.description) + '">Delete</button>',
            '    </div>',
            '  </article>',
            '</li>'
        ].join('');
    });
    document.getElementById('records-cards').innerHTML = cardItems.join('');

    // 6. Show the empty state message if there are no results
    const isEmpty  = filtered.length === 0;
    const emptyEl  = document.getElementById('empty-state');
    const tableEl  = document.getElementById('table-wrapper');
    const cardsEl  = document.getElementById('records-cards');

    emptyEl.hidden = !isEmpty;
    tableEl.classList.toggle('records-hidden', isEmpty);
    cardsEl.classList.toggle('records-hidden', isEmpty);

    // 7. Attach click handlers to Edit and Delete buttons
    document.querySelectorAll('.btn-edit').forEach(function(btn) {
        btn.addEventListener('click', function() { onEdit(btn.dataset.id); });
    });
    document.querySelectorAll('.btn-delete').forEach(function(btn) {
        btn.addEventListener('click', function() { onDelete(btn.dataset.id); });
    });

    return filtered.length;
}

// ---- Dashboard stats -------------------------------------------------------

export function updateStats() {
    const total  = getTotalSpending(state.records);
    const topCat = getTopCategory(state.records);

    // Animate and update Total Spent
    const totalEl = document.getElementById('stat-total');
    animateCount(totalEl, total, function(v) { return displayAmount(v); });
    pulse(totalEl);

    // Animate and update Transaction Count
    const countEl = document.getElementById('stat-count');
    animateCount(countEl, state.records.length, function(v) { return String(Math.round(v)); });
    pulse(countEl);

    // Update Top Category
    if (topCat) {
        document.getElementById('stat-category').textContent = topCat[0];
        const catAmtEl = document.getElementById('stat-category-amount');
        animateCount(catAmtEl, topCat[1], function(v) { return displayAmount(v); });
        pulse(catAmtEl);
    } else {
        document.getElementById('stat-category').textContent        = 'N/A';
        document.getElementById('stat-category-amount').textContent = '';
    }

    updateBudget(total);
    updateChart();
}

// Update the budget cap card and banner based on total spending vs. the cap.
function updateBudget(total) {
    const cap       = state.settings.budgetCap;
    const capEl     = document.getElementById('stat-cap-remaining');
    const capLabel  = document.getElementById('stat-cap-label');
    const capSpent  = document.getElementById('stat-cap-spent');
    const banner    = document.getElementById('budget-banner');
    const statusEl  = document.getElementById('status-region'); // polite ARIA live region
    const alertEl   = document.getElementById('alert-region');  // assertive ARIA live region
    const cardEl    = document.getElementById('budget-stat-card');

    if (cap && cap > 0) {
        const remaining = cap - total;
        capSpent.textContent = 'Spent: ' + displayAmount(total);
        capSpent.hidden      = false;

        if (remaining >= 0) {
            // Under budget
            capEl.textContent    = displayAmount(remaining);
            capLabel.textContent = 'remaining of ' + displayAmount(cap) + ' cap';
            banner.textContent   = 'Budget on track: ' + displayAmount(remaining) + ' remaining.';
            banner.className     = 'budget-banner budget-ok';
            banner.hidden        = false;
            cardEl.classList.remove('budget-exceeded');
            statusEl.textContent = 'Budget status: ' + displayAmount(remaining) + ' remaining of ' + displayAmount(cap) + ' monthly cap.';
        } else {
            // Over budget
            const overBy = Math.abs(remaining);
            capEl.textContent    = displayAmount(overBy);
            capLabel.textContent = 'over ' + displayAmount(cap) + ' cap';
            banner.textContent   = 'Budget exceeded by ' + displayAmount(overBy) + '!';
            banner.className     = 'budget-banner budget-over';
            banner.hidden        = false;
            cardEl.classList.add('budget-exceeded');
            alertEl.textContent  = 'Warning: You have exceeded your budget cap by ' + displayAmount(overBy) + '.';
        }
    } else {
        // No budget cap set
        capEl.textContent    = 'No limit';
        capLabel.textContent = 'set in Settings';
        capSpent.hidden      = true;
        banner.hidden        = true;
        banner.className     = 'budget-banner hidden';
        cardEl.classList.remove('budget-exceeded');
    }
}

// Build the 7-day spending trend chart.
function updateChart() {
    const chart   = document.getElementById('trend-chart');
    const amounts = [];  // daily totals
    const labels  = [];  // day names and date strings
    const today   = formatDate(new Date());

    // Gather data for each of the last 7 days
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
        const date    = new Date();
        date.setDate(date.getDate() - daysAgo);

        const dateStr = formatDate(date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        // Sum all transactions on this day
        let dayTotal = 0;
        for (const record of state.records) {
            if (record.date === dateStr) {
                dayTotal = dayTotal + record.amount;
            }
        }

        amounts.push(dayTotal);
        labels.push({ day: dayName, date: dateStr });
    }

    // The highest day sets 100% bar width; minimum 1 to avoid division by zero
    const maxAmount = Math.max.apply(null, amounts.concat([1]));

    // Build a chart row for each day
    const rows = amounts.map(function(amount, i) {
        const label    = labels[i];
        const isToday  = label.date === today;
        const barWidth = amount > 0 ? Math.max((amount / maxAmount) * 100, 2) : 0;
        const rowClass = 'chart-row' + (isToday ? ' chart-row--today' : '');

        return [
            '<div class="' + rowClass + '">',
            '  <span class="chart-row-day" aria-hidden="true">' + label.day + '</span>',
            '  <div class="chart-row-track" role="img" aria-label="' + escapeHtml(label.day + ': ' + displayAmount(amount)) + '">',
            '    <div class="chart-row-fill' + (amount === 0 ? ' chart-row-fill--empty' : '') + '"',
            '         data-width="' + barWidth + '"',
            '         style="width:0%;transition:width .5s cubic-bezier(.4,0,.2,1) ' + (i * 55) + 'ms"></div>',
            '  </div>',
            '  <span class="chart-row-amt">' + (amount === 0 ? '—' : displayAmount(amount)) + '</span>',
            '</div>'
        ].join('');
    });

    chart.innerHTML = rows.join('');

    // Animate the bars after the first paint (double rAF ensures the DOM is ready)
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            const bars = chart.querySelectorAll('.chart-row-fill[data-width]');
            bars.forEach(function(bar) {
                bar.style.width = bar.dataset.width + '%';
            });
        });
    });

    // Update the hidden accessible data table (used by screen readers)
    const tbody = document.getElementById('trend-chart-table-body');
    if (tbody) {
        const tableRows = amounts.map(function(amount, i) {
            const label = labels[i];
            return '<tr><td>' + escapeHtml(label.day) + '</td><td>' + escapeHtml(label.date) + '</td><td>' + escapeHtml(displayAmount(amount)) + '</td></tr>';
        });
        tbody.innerHTML = tableRows.join('');
    }
}

// ---- Search status ---------------------------------------------------------

// Show how many results matched, or an error if the pattern is invalid.
export function updateSearchStatus(pattern, count, caseInsensitive) {
    const statusEl = document.getElementById('search-status');
    if (!statusEl) return;

    if (!pattern) {
        // No search active — clear the message
        statusEl.textContent = '';
        statusEl.className   = 'search-status-msg';
        return;
    }

    const regex = compileRegex(pattern, caseInsensitive);

    if (!regex) {
        statusEl.textContent = 'Invalid regex pattern';
        statusEl.className   = 'search-status-msg search-error';
    } else {
        const word = count === 1 ? 'result' : 'results';
        statusEl.textContent = count + ' ' + word + ' found';
        statusEl.className   = 'search-status-msg search-ok';
    }
}

// ---- Categories ------------------------------------------------------------

// Render the category tag list in Settings.
export function populateCategories(callbacks) {
    const onRemove = callbacks.onRemove;
    const list     = document.getElementById('categories-list');

    if (state.settings.categories.length === 0) {
        list.innerHTML = '<li class="no-categories">No categories yet. Add one below.</li>';
        return;
    }

    const items = state.settings.categories.map(function(cat) {
        return [
            '<li class="category-tag">',
            '  <span>' + escapeHtml(cat) + '</span>',
            '  <button type="button" class="btn-remove-cat" data-cat="' + escapeHtml(cat) + '"',
            '          aria-label="Remove category ' + escapeHtml(cat) + '">&times;</button>',
            '</li>'
        ].join('');
    });
    list.innerHTML = items.join('');

    list.querySelectorAll('.btn-remove-cat').forEach(function(btn) {
        btn.addEventListener('click', function() { onRemove(btn.dataset.cat); });
    });
}

// Populate the category <select> in the transaction form.
export function populateFormCategories() {
    const select       = document.getElementById('form-category');
    const currentValue = select.value; // remember selection before we clear it

    const options = state.settings.categories.map(function(cat) {
        return '<option value="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</option>';
    });
    select.innerHTML = '<option value="">Select a category</option>' + options.join('');

    if (currentValue) select.value = currentValue; // restore previous selection
}

// ---- Toast notifications ---------------------------------------------------

// Show a short message at the bottom of the screen for `duration` milliseconds.
// type can be 'success', 'error', or 'info'.
export function showToast(message, type, duration) {
    if (type     === undefined) type     = 'info';
    if (duration === undefined) duration = 3000;

    const container = document.getElementById('toast-container');

    // Create the toast element
    const toast       = document.createElement('div');
    toast.className   = 'toast toast-' + type;
    toast.textContent = message;
    toast.setAttribute('role',      'status');
    toast.setAttribute('aria-live', 'polite');

    container.appendChild(toast);

    // Trigger the slide-in animation on the next frame
    requestAnimationFrame(function() {
        toast.classList.add('toast-visible');
    });

    // Remove the toast after the duration
    setTimeout(function() {
        toast.classList.remove('toast-visible');
        // Wait for the fade-out transition to finish before removing the element
        toast.addEventListener('transitionend', function() {
            toast.remove();
        }, { once: true });
    }, duration);
}
