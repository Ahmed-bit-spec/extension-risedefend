import { FLAGS } from './feature-flags.js';

export const Logger = {
  info(msg, data) {
    if (FLAGS.DEBUG_MODE) console.log(`[INFO] ${msg}`, data || '');
  },
  warn(msg, data) {
    if (FLAGS.DEBUG_MODE) console.warn(`[WARN] ${msg}`, data || '');
  },
  error(msg, errorObj) {
    console.error(`[ERROR] ${msg}`, errorObj);
  }
};
