# Improve Gambling Detection in AI Analyzer

## Plan
1. Add new gambling indicators (markets, bet slip, stake, deposit, withdraw, live betting, jackpots)
2. Implement combination logic (3+ terms → heavy score boost)
3. Add hostname heuristics (bet/odds/casino in hostname)
4. Preserve SAFE_MODIFIERS and educational content detection
5. Build and verify

## Steps
- [x] Step 1: Expand GAMBLING weights with new terms
- [x] Step 2: Add combination boost logic
- [x] Step 3: Add hostname heuristics
- [x] Step 4: Ensure SAFE_MODIFIERS remain intact
- [x] Step 5: Build project to verify
- [x] Step 6: Provide explanation of changes

OPENROUTER_API_KEY=replace_with_your_secret_key
