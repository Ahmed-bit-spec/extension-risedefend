import { StorageUtils } from './storage-utils.js';

export const EngineState = {
  async isEnabled() {
    const data = await StorageUtils.get(['enabled']);
    return data.enabled !== false; // Default true if undefined
  },

  async setEnabled(enabled) {
    await StorageUtils.set({ enabled });
  }
};
