import { DANGEROUS_CATEGORIES } from './heuristics.js';
import { GAMBLING_COMBINATIONS, SUSPICIOUS_HOSTNAME_PATTERNS, escapeRegExp } from './patterns.js';
import { SAFE_HOSTNAMES, SAFE_MODIFIERS } from './safe-context.js';
import { CATEGORIES } from '../../shared/constants.js';

export const AIAnalyzer = {
  analyzeText(text, context = {}) {
    const normalizedText = (text || '').toLowerCase();
    const hostname = (context.hostname || '').toLowerCase();
    const title = (context.title || '').toLowerCase();
    const referrer = (context.referrer || '').toLowerCase();
    const pathname = (context.pathname || '').toLowerCase();
    const search = (context.search || '').toLowerCase();
    
    // Adaptive profile passed from scanner. Default to 1.0 multiplier
    const riskMultiplier = context.riskMultiplier || 1.0; 

    const combinedText = `${hostname} ${title} ${pathname} ${search} ${normalizedText}`.trim();
    const signals = [];

    const SEARCH_ENGINES = ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com'];
    const isSearchEngine = SEARCH_ENGINES.some(se => hostname.includes(se) || referrer.includes(se));

    if (!combinedText) {
      return { block: false, category: CATEGORIES.SAFE, reason: 'No readable text', confidence: 0, signals: ['No text found'], riskScore: 0 };
    }

    if (SAFE_HOSTNAMES.includes(hostname)) {
      signals.push(`Trusted educational domain: ${hostname}`);
      return { block: false, category: CATEGORIES.SAFE, reason: 'Trusted Domain', confidence: 0, signals, riskScore: 0 };
    }

    const allDangerousWords = Object.values(DANGEROUS_CATEGORIES).flatMap(cat => Object.keys(cat.weights));
    const fastScanRegex = new RegExp(allDangerousWords.map(escapeRegExp).join('|'), 'i');
    
    const isSuspiciousHostname = Object.values(SUSPICIOUS_HOSTNAME_PATTERNS)
      .flat()
      .some(pattern => pattern && hostname.includes(pattern));

    if (!isSuspiciousHostname && !fastScanRegex.test(combinedText)) {
      signals.push('Fast scan clear');
      return { block: false, category: CATEGORIES.SAFE, reason: 'Fast scan clear', confidence: 0, signals, riskScore: 0 };
    }

    let topCategory = null;
    let topScore = 0;
    let topReason = 'Safe content';
    let topSignals = ['Scanned content successfully'];
    let topMatchedTerms = [];

    const activeCategories = context.categories || { PORNOGRAPHY: true, GAMBLING: true, DRUGS: true };

    for (const [category, data] of Object.entries(DANGEROUS_CATEGORIES)) {
      if (activeCategories[category] === false) {
        continue;
      }
      let score = 0;
      let distinctMatches = 0;
      const currentSignals = [];
      const currentMatchedTerms = [];
      const terms = Object.keys(data.weights);

      for (const term of terms) {
        const weight = data.weights[term];
        const termRx = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'g');
        const matches = combinedText.match(termRx);
        
        if (matches) {
          distinctMatches++;
          currentMatchedTerms.push(term);
          const inContext = title.includes(term) || hostname.includes(term) || pathname.includes(term);
          const contextMultiplier = inContext ? 2.0 : 1.0;
          if (inContext) currentSignals.push(`Keyword '${term}' in high-priority context (URL/Title)`);
          
          const logMultiplier = 1 + Math.log10(matches.length);
          score += logMultiplier * weight * contextMultiplier;
        }
      }

      // Hostname pattern boost — applies to all categories
      if (SUSPICIOUS_HOSTNAME_PATTERNS[category]) {
        for (const pattern of SUSPICIOUS_HOSTNAME_PATTERNS[category]) {
          if (hostname.includes(pattern)) {
            score += 3.0; // Strong boost to exceed threshold 2.5 on hostname match alone
            if (!currentMatchedTerms.includes(pattern)) {
              currentMatchedTerms.push(pattern);
            }
            currentSignals.push(`Suspicious hostname pattern: '${pattern}'`);
            break;
          }
        }
      }

      // GAMBLING-specific combo and density analysis
      if (category === CATEGORIES.GAMBLING) {
        if (distinctMatches >= 5) {
          score += 2.5;
          currentSignals.push(`High density of unique gambling terms: ${distinctMatches}`);
        } else if (distinctMatches >= 3) {
          score += 1.5;
          currentSignals.push(`Multiple gambling terms detected: ${distinctMatches}`);
        }

        let maxComboBoost = 0;
        let matchedComboName = '';
        for (const combo of GAMBLING_COMBINATIONS) {
          let matchedTerms = 0;
          for (const term of combo) {
            if (new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(combinedText)) {
              matchedTerms++;
            }
          }
          if (matchedTerms >= 3) {
            maxComboBoost = Math.max(maxComboBoost, 2.0);
            matchedComboName = combo.join(' + ');
          } else if (matchedTerms === 2) {
            maxComboBoost = Math.max(maxComboBoost, 0.8);
            matchedComboName = combo.join(' + ');
          }
        }
        
        if (maxComboBoost > 0) {
          score += maxComboBoost;
          currentSignals.push(`Pattern structure match: ${matchedComboName}`);
        }

        if (distinctMatches >= 2) {
          const oddsRegex = /(?<![\$£€])\b[1-9]\d{0,1}\.\d{2}\b/g;
          const oddsMatches = combinedText.match(oddsRegex);
          if (oddsMatches) {
            if (oddsMatches.length >= 10) {
              score += 2.0;
              currentSignals.push(`Detected massive table of betting odds (${oddsMatches.length} items)`);
            } else if (oddsMatches.length >= 5) {
              score += 1.0;
              currentSignals.push(`Detected repeated fractional odds patterns`);
            }
          }
        }

        const sports = ['soccer', 'football', 'basketball', 'tennis', 'cricket', 'rugby', 'hockey', 'baseball'];
        let sportsMatchCount = 0;
        for (const sport of sports) {
          if (new RegExp(`\\b${sport}\\b`, 'i').test(combinedText)) {
            sportsMatchCount++;
          }
        }
        if (sportsMatchCount >= 3 && distinctMatches >= 1) {
          score += 1.0;
          currentSignals.push(`Multiple sports listed alongside gambling context`);
        }
      }

      for (const [safePhrase, modifier] of Object.entries(SAFE_MODIFIERS)) {
        if (combinedText.includes(safePhrase)) {
          score += modifier;
          currentSignals.push(`Educational/Safe modifier triggered: '${safePhrase}'`);
        }
      }

      // Apply the adaptive risk multiplier 
      if (riskMultiplier > 1.0 && score > 0) {
        score = score * riskMultiplier;
        currentSignals.push(`Adaptive learning multiplier applied (x${riskMultiplier.toFixed(2)}) based on history`);
      }

      const threshold = data.threshold;
      
      if (score > topScore) {
        topScore = score;
        topCategory = category;
        topSignals = currentSignals;
        topMatchedTerms = currentMatchedTerms;
        
        let categoryHumanReason = 'Detected restricted content';
        if (category === 'GAMBLING') {
          categoryHumanReason = 'RiseDefend blocked this page because it contains gambling-related content.';
        } else if (category === 'PORNOGRAPHY') {
          categoryHumanReason = 'RiseDefend blocked this page because it contains adult/sexually explicit content.';
        } else if (category === 'DRUGS') {
          categoryHumanReason = 'RiseDefend blocked this page because it contains drug/narcotics-related content.';
        }

        topReason = score >= threshold 
          ? categoryHumanReason
          : `Monitored but below threshold`;
      }
    }

    // Default to SAFE objects if no category passed score > 0
    if (!topCategory) {
       return { block: false, category: CATEGORIES.SAFE, reason: 'Safe content', confidence: 0, signals: ['Clean trace'], matchedTerms: [], riskScore: 0 };
    }

    const finalThreshold = DANGEROUS_CATEGORIES[topCategory].threshold;
    const isBlock = topScore >= finalThreshold;

    console.log(`[ RiseDefend ] Scan started`);
    console.log(`[ RiseDefend ] Category: ${topCategory}`);
    if (topMatchedTerms.length > 0) {
      console.log(`[ RiseDefend ] Signal: ${topMatchedTerms.join(', ')}`);
    }
    console.log(`[ RiseDefend ] Score: ${topScore.toFixed(2)}`);
    console.log(`[ RiseDefend ] Threshold: ${finalThreshold}`);
    console.log(`[ RiseDefend ] Decision: ${isBlock ? 'BLOCK' : 'ALLOW'}`);

    if (isBlock) {
      // Final sanity checks
      if (
        hostname.endsWith('.edu') ||
        hostname.includes('news') ||
        combinedText.includes('syllabus') ||
        combinedText.includes('curriculum')
      ) {
        topSignals.push('Blocked avoided: Educational or News context detected');
        return { block: false, category: CATEGORIES.SAFE, reason: 'Educational context detected', confidence: 0, signals: topSignals, matchedTerms: [], riskScore: topScore };
      }

      if (isSearchEngine && topScore < finalThreshold * 3) {
        topSignals.push('Blocked avoided: Search Engine Intent Inferred & not severely dangerous');
        return { block: false, category: CATEGORIES.SAFE, reason: 'Search Engine intent inferred', confidence: 0, signals: topSignals, matchedTerms: [], riskScore: topScore };
      }

      return {
        block: true,
        category: topCategory,
        reason: topReason,
        signals: topSignals,
        matchedTerms: topMatchedTerms,
        confidence: Math.min(topScore / finalThreshold, 1.0) * 100,
        riskScore: topScore
      };
    }

    return { 
      block: false, 
      category: topCategory, 
      reason: 'Score below threshold', 
      signals: topSignals,
      matchedTerms: topMatchedTerms,
      confidence: Math.min(topScore / finalThreshold, 1.0) * 100, 
      riskScore: topScore 
    };
  }
};
