// Shim to provide util.styleText expected by some compiled CLI files
// This avoids "styleText is not a function" errors from mismatched builds.
const util = require('util');
if (!util.styleText) {
  const chalk = require('chalk');
  const styleText = (style, text) => {
    try {
      if (Array.isArray(style)) {
        // Apply multiple chalk modifiers in order
        return style.reduce((acc, s) => {
          if (acc && acc[s]) return acc[s];
          return chalk[s] || ((t) => t);
        }, chalk)(text);
      }
      if (typeof style === 'string') {
        const fn = chalk[style] || ((t) => t);
        return fn(text);
      }
    } catch (e) {
      // fallback to raw text
    }
    return text;
  };
  util.styleText = styleText;
}
