export const StateManager = {
  async getState() {
    return new Promise(r => chrome.storage.local.get(['sys_state'], data => r(data.sys_state || {})));
  },
  async updateState(partial) {
    const current = await this.getState();
    const merged = { ...current, ...partial, lastUpdated: Date.now() };
    return new Promise(r => chrome.storage.local.set({ sys_state: merged }, () => r(merged)));
  }
};
