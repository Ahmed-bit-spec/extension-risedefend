import { StorageUtils } from '../../shared/storage-utils.js';

export const AdaptiveScoring = {
  // We'll maintain a dictionary of { "hostname": { riskMultiplier: 1.0, lastSeen: timestamp, offenseCount: 0 } }
  async getDomainProfile(hostname) {
    if (!hostname) return { riskMultiplier: 1.0, offenseCount: 0 };
    
    // Simple top-level domain normalization could go here. For now, exact match.
    const key = `domain_profile_${hostname}`;
    const data = await StorageUtils.get(key);
    
    if (data && data[key]) {
      return data[key];
    }
    
    return { riskMultiplier: 1.0, offenseCount: 0, lastSeen: Date.now() };
  },

  async updateDomainProfile(hostname, isSuspicious, currentRiskScore, blockThreshold) {
    if (!hostname) return;

    let profile = await this.getDomainProfile(hostname);
    profile.lastSeen = Date.now();

    if (isSuspicious) {
      // It crossed the threshold or got very close
      profile.offenseCount += 1;
      // Cap the multiplier at 2.0 to prevent runaway scoring, but enough to trigger block faster
      profile.riskMultiplier = Math.min(2.0, profile.riskMultiplier + 0.1); 
    } else if (currentRiskScore < (blockThreshold * 0.3)) {
      // Safe zone - slowly forgive
      profile.offenseCount = Math.max(0, profile.offenseCount - 1);
      profile.riskMultiplier = Math.max(1.0, profile.riskMultiplier - 0.05);
    }

    const key = `domain_profile_${hostname}`;
    await StorageUtils.set({ [key]: profile });
    return profile;
  }
};
