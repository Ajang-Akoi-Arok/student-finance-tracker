// search.js

//compileRegex

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

//escapeHtml 

// Escape special HTML characters so user input can't inject scripts (XSS).
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

//highlightMatches 

export function highlightMatches(text, regex) {
    if (!text)  return '';
    if (!regex) return escapeHtml(text); 

    try {
        // Make sure the regex has the global flag so exec() finds all matches
        const flags   = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
        const globalRegex = new RegExp(regex.source, flags);

        let result    = '';  
        let lastIndex = 0;   
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
        return escapeHtml(text); 
    }
}

//searchRecords 


export function searchRecords(records, regex, fields) {
    if (fields === undefined) fields = ['description', 'category', 'amount', 'date'];
    if (!regex) return records;

    const matching = [];

    for (const record of records) {
        let recordMatches = false;

        for (const field of fields) {
            const rawValue = record[field];
            if (rawValue == null) continue; 

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

//Example patterns (shown in docs / README) 
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
