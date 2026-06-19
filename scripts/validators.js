// validators.js


// The 5 rules
const RULES = {

    // Rule 1 — Description must not start or end with a whitespace character
    description: {
        re:  /^\S(?:.*\S)?$/,
        msg: 'No leading/trailing spaces; must be at least 1 character'
    },

    // Rule 2 — Amount must be a positive number with at most 2 decimal places
    // Allows: 0, 12, 12.5, 12.50   Rejects: -5, 12.999, abc
    amount: {
        re:  /^(0|[1-9]\d*)(\.\d{1,2})?$/,
        msg: 'Positive number with at most 2 decimal places (e.g., 12.50)'
    },

    // Rule 3 — Date must be YYYY-MM-DD with valid month (01-12) and day (01-31)
    date: {
        re:  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
        msg: 'Must be a valid date in YYYY-MM-DD format'
    },

    // Rule 4 — Category must use letters only (spaces and hyphens between words are OK)
    // Allows: Food, Coffee Shop, On-Campus   Rejects: 123Food, Food & Drink
    category: {
        re:  /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
        msg: 'Letters, spaces, and hyphens only (e.g., Food, On-Campus)'
    },

    // Rule 5 (Advanced) — back-reference \1 catches the same word repeated twice.
    // e.g. "test test" or "Coffee COFFEE" both fail. "test testing" is fine.
    duplicateWords: {
        re:  /\b(\w+)\s+\1\b/i,
        msg: 'Description contains duplicate consecutive words'
    }
};

// Exported so tests.html can check every pattern and run examples against it
export const validators = {
    description:    { pattern: RULES.description.re,    test: function(v) { return RULES.description.re.test(v); } },
    amount:         { pattern: RULES.amount.re,          test: function(v) { return RULES.amount.re.test(String(v)); } },
    date:           { pattern: RULES.date.re,            test: function(v) { return _validDate(v); } },
    category:       { pattern: RULES.category.re,        test: function(v) { return RULES.category.re.test(v); } },
    duplicateWords: { pattern: RULES.duplicateWords.re,  test: function(v) { return RULES.duplicateWords.re.test(v); } }
};

// Check that a "YYYY-MM-DD" string is also a real calendar date.
// The regex alone allows "2025-02-30" — this function catches those cases.
function _validDate(val) {
    if (!RULES.date.re.test(val)) return false; 

    const d = new Date(val + 'T00:00:00Z');     

    // Round-trip check: if the date was invalid (e.g., Feb 30), the Date object
    // will roll over to the next valid date, so the ISO string won't match.
    return d instanceof Date &&
           !isNaN(d) &&
           d.toISOString().slice(0, 10) === val;
}

// validateField
// Check a single form field value.
// Returns: { isValid: true/false, message: 'error text (empty string if valid)' }
export function validateField(fieldId, value) {

    // An empty field always fails
    if (!value && value !== 0) {
        return { isValid: false, message: 'This field is required' };
    }

    if (fieldId === 'description') {
        // Check Rule 1: no leading/trailing spaces
        if (!RULES.description.re.test(value)) {
            return { isValid: false, message: RULES.description.msg };
        }
        // Check Rule 5: no duplicate consecutive words (back-reference)
        if (RULES.duplicateWords.re.test(value)) {
            return { isValid: false, message: RULES.duplicateWords.msg };
        }
        return { isValid: true, message: '' };
    }

    if (fieldId === 'amount') {
        // Check Rule 2: positive number, max 2 decimal places
        if (!RULES.amount.re.test(String(value))) {
            return { isValid: false, message: RULES.amount.msg };
        }
        return { isValid: true, message: '' };
    }

    if (fieldId === 'date') {
        // Check Rule 3: valid YYYY-MM-DD calendar date
        if (!_validDate(value)) {
            return { isValid: false, message: RULES.date.msg };
        }
        return { isValid: true, message: '' };
    }

    if (fieldId === 'category') {
        // Check Rule 4: letters, spaces, hyphens only
        if (!RULES.category.re.test(value)) {
            return { isValid: false, message: RULES.category.msg };
        }
        return { isValid: true, message: '' };
    }

    return { isValid: false, message: 'Unknown field' };
}

// validateRecord 
// Validate all 4 fields of a transaction object at once.
// Returns: { isValid: true/false, errors: { fieldName: 'message' } }
export function validateRecord(record) {
    const errors = {};
    const fields = ['description', 'amount', 'date', 'category'];

    for (const field of fields) {
        const result = validateField(field, record[field]);
        if (!result.isValid) {
            errors[field] = result.message; 
        }
    }

    return {
        isValid: Object.keys(errors).length === 0, 
        errors:  errors
    };
}

//getValidatorCatalog 
// All 5 rules with sample inputs. Used by tests.html for display.
export function getValidatorCatalog() {
    return [
        {
            name: 'Description',
            pattern: RULES.description.re.source,
            examples: [
                { value: 'Lunch at cafeteria', valid: true  },
                { value: 'X',                  valid: true  },
                { value: ' spaces ',           valid: false },
                { value: 'trailing ',          valid: false }
            ]
        },
        {
            name: 'Amount',
            pattern: RULES.amount.re.source,
            examples: [
                { value: '12.50',  valid: true  },
                { value: '0',      valid: true  },
                { value: '999.99', valid: true  },
                { value: '-5',     valid: false },
                { value: '12.999', valid: false }
            ]
        },
        {
            name: 'Date',
            pattern: RULES.date.re.source,
            examples: [
                { value: '2025-09-29', valid: true  },
                { value: '2025-01-01', valid: true  },
                { value: '29-09-2025', valid: false },
                { value: '2025-13-01', valid: false }
            ]
        },
        {
            name: 'Category',
            pattern: RULES.category.re.source,
            examples: [
                { value: 'Food',         valid: true  },
                { value: 'Coffee Shop',  valid: true  },
                { value: 'On-Campus',    valid: true  },
                { value: '123Food',      valid: false },
                { value: 'Food & Drink', valid: false }
            ]
        },
        {
            name: 'Duplicate Words (Advanced)',
            pattern: RULES.duplicateWords.re.source,
            examples: [
                { value: 'test test',     valid: true  },
                { value: 'Coffee COFFEE', valid: true  },
                { value: 'no duplicates', valid: false },
                { value: 'test testing',  valid: false }
            ]
        }
    ];
}
