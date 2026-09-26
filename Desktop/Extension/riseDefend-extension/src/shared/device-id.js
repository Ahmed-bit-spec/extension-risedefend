export const DeviceId = {
  async getStableId() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
         return resolve({ uuid: 'dev-mode', runtimeId: 'dev' });
      }
      chrome.storage.local.get(['device_uuid'], (data) => {
        if (data.device_uuid) {
           return resolve({
             uuid: data.device_uuid,
             runtimeId: chrome.runtime?.id || 'unknown',
             userAgent: navigator.userAgent
           });
        }
        const newUuid = crypto.randomUUID();
        chrome.storage.local.set({ device_uuid: newUuid }, () => {
           resolve({
             uuid: newUuid,
             runtimeId: chrome.runtime?.id || 'unknown',
             userAgent: navigator.userAgent
           });
        });
      });
    });
  }
};
