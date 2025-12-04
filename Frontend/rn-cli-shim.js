console.log('--- rn-cli-shim.js loaded! ---');

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

// Shim for os.availableParallelism (added in Node.js 19.4.0 / 18.14.0)
const os = require('os');
if (!os.availableParallelism) {
  os.availableParallelism = () => os.cpus().length;
}

// Shim for Array.prototype.toReversed (added in Node.js 20.0.0)
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return this.slice().reverse();
  };
}

// Shim for URL.canParse (added in Node.js 19.8.0)
if (!global.URL.canParse) {
  global.URL.canParse = function (url, base) {
    try {
      new global.URL(url, base);
      return true;
    } catch (e) {
      return false;
    }
  };
}

// Shim for fetch (added in Node.js 18)
if (!global.fetch) {
  try {
    const nodeFetch = require('node-fetch');
    global.fetch = nodeFetch;
    global.Headers = nodeFetch.Headers;
    global.Request = nodeFetch.Request;
    global.Response = nodeFetch.Response;
    console.log('--- fetch polyfilled ---');
  } catch (e) {
    console.warn('--- failed to polyfill fetch: node-fetch not found ---');
  }
}
