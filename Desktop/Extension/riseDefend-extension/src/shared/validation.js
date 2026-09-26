export const Validation = {
  isValidDomain(domain) {
    // Ensure domains are strictly formatted. Blocks malicious injection via wildcards.
    if (!domain || typeof domain !== 'string') return false;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,12}$/;
    return domainRegex.test(domain);
  },
  sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      return { url: parsed.href, hostname: parsed.hostname, valid: true };
    } catch {
      return { url, hostname: null, valid: false };
    }
  }
};
