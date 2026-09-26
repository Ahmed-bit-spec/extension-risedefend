import { FLAGS } from './feature-flags.js';

export const Logger = {
  info: (...args) => { 
    if (FLAGS.DEBUG_MODE) console.info('[RiseDefend INFO]', ...args); 
  },
  warn: (...args) => { 
    if (FLAGS.DEBUG_MODE) console.warn('[RiseDefend WARN]', ...args); 
  },
  error: (...args) => { 
    console.error('[RiseDefend ERROR]', ...args); // Always log errors
  },
  debug: (...args) => { 
    if (FLAGS.DEBUG_MODE) console.debug('[RiseDefend DEBUG]', ...args); 
  }
};
