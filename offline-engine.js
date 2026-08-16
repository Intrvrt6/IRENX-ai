/* IRENX Local Brain — deterministic offline fallback.
   This is not an LLM and does not claim to predict markets without data.
   It preserves the IRENX safety rule: insufficient evidence => NO TRADE. */
(function (global) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function analyze(series) {
    const prices = Array.isArray(series) ? series.map(Number).filter(Number.isFinite) : [];
    if (prices.length < 8) return {
      mode: 'OFFLINE', bias: 'WAIT', score: 0,
      decision: 'NO TRADE', reason: 'Insufficient local market data'
    };

    const last = prices[prices.length - 1];
    const fast = prices.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, prices.length);
    const slow = prices.slice(-8).reduce((a, b) => a + b, 0) / Math.min(8, prices.length);
    const delta = last - prices[prices.length - 2];
    const trend = fast - slow;
    const range = Math.max(...prices.slice(-8)) - Math.min(...prices.slice(-8));
    const momentum = range > 0 ? clamp(Math.abs(delta) / range, 0, 1) : 0;
    const direction = trend > 0 ? 'BUY' : trend < 0 ? 'SELL' : 'WAIT';
    const score = Math.round(clamp(50 + Math.abs(trend / (range || 1)) * 45 + momentum * 5, 0, 100));
    const decision = score >= 78 && direction !== 'WAIT' ? direction : 'NO TRADE';

    return {
      mode: 'OFFLINE', bias: direction, score, decision,
      regime: trend > 0 ? 'UP' : trend < 0 ? 'DOWN' : 'FLAT',
      liquidity: 'UNVERIFIED', reflexivity: momentum > 0.35 ? 'ACTIVE' : 'QUIET',
      reason: decision === 'NO TRADE' ? 'Confluence threshold not met' : 'Local deterministic confluence passed',
      price: last
    };
  }

  global.IRENXOfflineBrain = { analyze };
})(window);
