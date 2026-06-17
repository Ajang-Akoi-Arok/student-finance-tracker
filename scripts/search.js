// search.js
// Three utilities for the live search feature:
//   1. compileRegex  — turn user text into a safe RegExp
//   2. highlightMatches — wrap matches in <mark> tags for visual highlighting
//   3. searchRecords — filter a list of records by the compiled regex

// ---- compileRegex ----------------------------------------------------------

// Try to compile the user's input into a RegExp object.
// Returns the RegExp on success, or null if the pattern is invalid.
// Supports the /pattern/flags syntax (e.g., /coffee/gi).
export function compileRegex(input, caseInsensitive) {
    if (caseInsensitive === undefined) caseInsensitive = false;
    if (!input || !input.trim()) return null; // empty input → no search

    try {
        // Check if the user typed a pattern in /regex/flags format
        const slashPattern = input.match(/^\/(.+)\/([gimsuy]*)$/);

        if (slashPattern) {
            // User used /pattern/flags — extract the parts
            let flags = slashPattern[2] || '';
            if (caseInsensitive && !flags.includes('i')) {
                flags = flags + 'i'; // add the 'i' flag if needed
            }
            return new RegExp(slashPattern[1], flags);
        }

        // Plain text search — treat the whole input as the pattern
        const flags = caseInsensitive ? 'i' : '';
        return new RegExp(input, flags);

    } catch (error) {
        return null; // invalid pattern (e.g., unmatched parenthesis)
    }
}

// ---- escapeHtml ------------------------------------------------------------

// Replace special HTML characters so they display as text instead of markup.
// This prevents XSS (Cross-Site Scripting) when showing user data in the DOM.
// Example: '<script>' becomes '&lt;script&gt;'
export function escapeHtml(text) {
    const str = String(text == null ? '' : text);

    return str.replace(/[&<>"']/g, function(char) {
        const map = {
            '&':  '&amp;',
            '<':  '&lt;',
            '>':  '&gt;',
            '"':  '&quot;',
            "'":  '&#039;'
        };
        return map[char];
    });
}

// ---- highlightMatches ------------------------------------------------------

// Return an HTML string where every regex match is wrapped in <mark>...</mark>.
// Text that does NOT match is HTML-escaped for safety.
export function highlightMatches(text, regex) {
    if (!text)  return '';
    if (!regex) return escapeHtml(text); // no search active — just escape and return

    try {
        // Make sure the regex has the global flag so exec() finds all matches
        const flags   = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
        const globalRegex = new RegExp(regex.source, flags);

        let result    = '';  // the HTML string we are building
        let lastIndex = 0;   // where we left off in the original text
        let match;

        // Walk through every match in the text
        while ((match = globalRegex.exec(text)) !== null) {
            // Add the non-matching text before this match (escaped)
            result += escapeHtml(text.slice(lastIndex, match.index));

            // Wrap the matched text in a <mark> highlight tag
            result += '<mark>' + escapeHtml(match[0]) + '</mark>';

            lastIndex = match.index + match[0].length;

            // Guard against zero-length matches causing an infinite loop
            if (match[0].length === 0) globalRegex.lastIndex++;
        }

        // Add any remaining text after the last match
        result += escapeHtml(text.slice(lastIndex));
        return result;

    } catch (error) {
        return escapeHtml(text); // if anything goes wrong, just show plain text
    }
}

// ---- searchRecords ---------------------------------------------------------

// Return only the records where at least one of the given fields matches the regex.
// If no regex is provided, all records are returned unchanged.
export function searchRecords(records, regex, fields) {
    if (fields === undefined) fields = ['description', 'category', 'amount', 'date'];
    if (!regex) return records;

    const matching = [];

    for (const record of records) {
        let recordMatches = false;

        for (const field of fields) {
            const rawValue = record[field];
            if (rawValue == null) continue; // skip empty fields

            // Amount is stored as a number; convert it to "12.50" format for matching
            const textValue = (field === 'amount')
                ? Number(rawValue).toFixed(2)
                : String(rawValue);

            // Reset lastIndex before testing (important for global regex)
            if (regex.global) regex.lastIndex = 0;

            if (regex.test(textValue)) {
                recordMatches = true;
                break; // one matching field is enough — stop checking
            }
        }

        if (recordMatches) {
            matching.push(record);
        }
    }

    return matching;
}

// ---- Example patterns (shown in docs / README) -----------------------------
export const REGEX_EXAMPLES = {
    description: [
        { pattern: 'coffee|tea',          description: 'Find "coffee" or "tea"' },
        { pattern: '\\b(\\w+)\\s+\\1\\b', description: 'Find duplicate consecutive words' },
        { pattern: '^[A-Z]',              description: 'Descriptions starting with uppercase' }
    ],
    amount: [
        { pattern: '\\.\\d{2}\\b', description: 'Amounts with cents (e.g., 12.50)' },
        { pattern: '\\.99$',       description: 'Amounts ending in .99' }
    ],
    category: [
        { pattern: 'Food|Entertainment', description: '"Food" or "Entertainment"' }
    ],
    date: [
        { pattern: '2025-09', description: 'September 2025 expenses' },
        { pattern: '-29$',    description: 'Expenses on the 29th' }
    ]
};
