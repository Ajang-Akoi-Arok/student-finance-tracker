// utils.js

//Date helpers

// Format a Date object as a "YYYY-MM-DD" string.
// Example: new Date() → "2025-09-29"
export function formatDate(date) {
    if (typeof date === 'string') date = new Date(date); 
    if (!(date instanceof Date)) return '';

    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day   = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

// Parse a "YYYY-MM-DD" string into a local Date object.

export function parseDate(str) {
    const parts = str.split('-').map(Number); // [2025, 9, 29]
    const year  = parts[0];
    const month = parts[1] - 1; 
    const day   = parts[2];
    return new Date(year, month, day);
}

//Currency helpers


export function formatCurrency(amount, currency) {
    if (currency === undefined) currency = 'USD';

    // RWF and UGX don't use decimal places
    const noDecimals = ['RWF', 'UGX'];
    const decimals   = noDecimals.includes(currency) ? 0 : 2;

    return new Intl.NumberFormat('en-US', {
        style:                 'currency',
        currency:              currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(amount);
}

// Convert an amount from one currency to another using stored exchange rates.
// All rates are relative to USD (e.g., 1 USD = 1300 RWF).
export function convertCurrency(amount, fromCurrency, toCurrency, rates) {
    // No conversion needed if source and target are the same
    if (fromCurrency === toCurrency) return amount;

    // Step 1: Convert the amount to USD (the common base)
    let amountInUSD;
    if (fromCurrency === 'USD') {
        amountInUSD = amount;
    } else {
        amountInUSD = amount / (rates[fromCurrency] || 1);
    }

    // Step 2: Convert from USD to the target currency
    if (toCurrency === 'USD') {
        return amountInUSD;
    } else {
        return amountInUSD * (rates[toCurrency] || 1);
    }
}

// Convert and format an amount in one call.
// This is the function used everywhere an amount needs to be displayed.
export function convertAndFormat(amount, fromCurrency, toCurrency, rates) {
    const converted = convertCurrency(amount, fromCurrency, toCurrency, rates);
    return formatCurrency(converted, toCurrency);
}

//Spending calculations 


export function sumByCategory(records) {
    const totals = {};

    for (const record of records) {
        const category = record.category;
        if (totals[category] === undefined) {
            totals[category] = 0; // first time we see this category
        }
        totals[category] = totals[category] + record.amount;
    }

    return totals;
}

// Return [categoryName, totalAmount] for the category with the highest spending.
// Returns null if there are no records.
export function getTopCategory(records) {
    if (records.length === 0) return null;

    const totals = sumByCategory(records);
    let topName   = null;
    let topAmount = -1;

    for (const category in totals) {
        if (totals[category] > topAmount) {
            topAmount = totals[category];
            topName   = category;
        }
    }

    return [topName, topAmount];
}

// Add up all transaction amounts and return the grand total.
export function getTotalSpending(records) {
    let total = 0;
    for (const record of records) {
        total = total + record.amount;
    }
    return total;
}

// Date range helpers

// Return an array of n date strings, starting n-1 days ago and ending today.
// Default n = 7, so it returns the last 7 days.
export function getLastNDays(n) {
    if (n === undefined) n = 7;
    const days = [];

    for (let i = n - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i); // go back i days from today
        days.push(formatDate(date));
    }

    return days;
}

// Keep only the records whose date falls between start and end (both inclusive).
export function filterByDateRange(records, start, end) {
    const startDate = new Date(start);
    const endDate   = new Date(end);
    const filtered  = [];

    for (const record of records) {
        const recordDate = new Date(record.date);
        if (recordDate >= startDate && recordDate <= endDate) {
            filtered.push(record);
        }
    }

    return filtered;
}

// Keep only the records from the last n days.
export function getLastNDaysRecords(records, n) {
    if (n === undefined) n = 7;

    const start = new Date();
    start.setDate(start.getDate() - (n - 1)); 

    return filterByDateRange(records, start, new Date());
}

//Sorting


export function sortRecords(records, field, sortDesc) {
    if (field    === undefined) field    = 'date';
    if (sortDesc === undefined) sortDesc = true;

    // Slice makes a copy so we don't change the original array
    const copy = records.slice();

    copy.sort(function(a, b) {
        let valueA = a[field];
        let valueB = b[field];

        // Compare strings without caring about uppercase/lowercase
        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (valueA < valueB) return sortDesc ? 1  : -1;
        if (valueA > valueB) return sortDesc ? -1 :  1;
        return 0; 
    });

    return copy;
}

//Debounce

export function debounce(fn, delay) {
    if (delay === undefined) delay = 300;

    let timer;

    return function() {
        const args    = arguments;
        const context = this;

        clearTimeout(timer);

        timer = setTimeout(function() {
            fn.apply(context, args);
        }, delay);
    };
}
