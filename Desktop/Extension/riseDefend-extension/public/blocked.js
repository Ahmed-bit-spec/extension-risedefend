/**
 * RiseDefend Simplified Blocked Page Controller
 * External script — MV3 CSP compliant (no inline scripts).
 * Handles: category visual selection, messages, countdown timer, Go Back, and safe redirect.
 */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const rawCat = (params.get('category') || '').toUpperCase();

  const svgGambling = document.getElementById('svgGambling');
  const svgPornography = document.getElementById('svgPornography');
  const svgDrugs = document.getElementById('svgDrugs');

  const categoryMessage = document.getElementById('categoryMessage');
  const protectiveMessage = document.getElementById('protectiveMessage');

  const btnGoBack = document.getElementById('btnGoBack');
  const btnSafeSearch = document.getElementById('btnSafeSearch');
  const countdownEl = document.getElementById('countdown');

  // Match category
  if (rawCat.includes('GAMBLING') || rawCat.includes('BET')) {
    svgGambling.classList.add('active');
    categoryMessage.textContent = 'RiseDefend blocked this page because it contains gambling-related content.';
    protectiveMessage.textContent = 'Protect your money. Gambling can cost more than you expect.';
  } else if (rawCat.includes('DRUG') || rawCat.includes('NARCOTIC')) {
    svgDrugs.classList.add('active');
    categoryMessage.textContent = 'RiseDefend blocked this page because it contains drug-related content.';
    protectiveMessage.textContent = 'Protect your health and your future. Stay away from harmful substances.';
  } else {
    // Default / Pornography / Adult Content
    svgPornography.classList.add('active');
    categoryMessage.textContent = 'RiseDefend blocked this page because it contains pornography or adult content.';
    protectiveMessage.textContent = 'Protect your energy and focus. Choose content that helps you move forward.';
  }

  // Countdown timer 5 → 4 → 3 → 2 → 1 → Redirect
  let seconds = 5;
  const safeUrl = 'https://www.google.com';

  const timer = setInterval(() => {
    seconds -= 1;
    if (countdownEl) countdownEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(timer);
      window.location.href = safeUrl;
    }
  }, 1000);

  // Button actions
  if (btnGoBack) {
    btnGoBack.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = safeUrl;
      }
    });
  }

  if (btnSafeSearch) {
    btnSafeSearch.addEventListener('click', () => {
      window.location.href = safeUrl;
    });
  }
});
