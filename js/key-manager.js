/* ═══════════════════════════════════════════════════════════
   key-manager.js — Multi-key vault + provider detection
   Keys stored in sessionStorage only. Gone when tab closes.
   ═══════════════════════════════════════════════════════════ */

const KeyManager = {
  PROVIDERS: ['openai', 'anthropic', 'gemini', 'deepseek', 'mistral'],

  /* ── SAVE ─────────────────────────────────────────────── */
  // New API: save(provider, key)
  // Backward compat: save(key, provider) — detects arg order
  save(providerOrKey, keyOrProvider) {
    let provider, key;
    if (this.PROVIDERS.includes(providerOrKey)) {
      // New API: save(provider, key)
      provider = providerOrKey;
      key = keyOrProvider;
    } else {
      // Old API: save(key, provider)
      key = providerOrKey;
      provider = keyOrProvider || this.detect(key) || 'openai';
    }
    if (!key || !key.trim()) return;
    const k = key.trim();
    sessionStorage.setItem(`plugai_key_${provider}`, k);
  },

  // Backward compat alias
  saveForProvider(provider, key) {
    this.save(provider, key);
  },

  /* ── GET ──────────────────────────────────────────────── */
  // New API: get(provider) → string key or null
  // Old API: get() → { key, provider } object
  get(provider) {
    if (provider) {
      return sessionStorage.getItem(`plugai_key_${provider}`) || null;
    }
    // Old no-arg signature — return { key, provider } for backward compat
    const available = this.getAvailableProviders();
    if (available.length === 0) return { key: '', provider: 'openai' };
    const p = available[0];
    return { key: sessionStorage.getItem(`plugai_key_${p}`) || '', provider: p };
  },

  // Backward compat
  getForProvider(provider) {
    return this.get(provider) || '';
  },

  getPrimaryProvider() {
    const available = this.getAvailableProviders();
    return available[0] || 'openai';
  },

  /* ── REMOVE ───────────────────────────────────────────── */
  remove(provider) {
    sessionStorage.removeItem(`plugai_key_${provider}`);
  },

  /* ── VAULT QUERIES ────────────────────────────────────── */
  // Returns { provider: key, ... } dict for all saved keys
  getAll() {
    const keys = {};
    this.PROVIDERS.forEach(p => {
      const k = sessionStorage.getItem(`plugai_key_${p}`);
      if (k) keys[p] = k;
    });
    return keys;
  },

  // Backward compat — returns [{ provider, key }] array
  getAllKeys() {
    return this.PROVIDERS
      .map(p => ({ provider: p, key: sessionStorage.getItem(`plugai_key_${p}`) || '' }))
      .filter(e => e.key.length > 4);
  },

  getAvailableProviders() {
    return this.PROVIDERS.filter(p => {
      const k = sessionStorage.getItem(`plugai_key_${p}`);
      return k && k.length > 4;
    });
  },

  hasAnyKey() {
    return this.getAvailableProviders().length > 0;
  },

  // New API: hasKey(provider) → boolean
  // Old API: hasKey()         → boolean (any key)
  hasKey(provider) {
    if (provider) {
      const k = sessionStorage.getItem(`plugai_key_${provider}`);
      return !!(k && k.length > 4);
    }
    return this.hasAnyKey();
  },

  // Backward compat alias
  hasKeyFor(provider) {
    return this.hasKey(provider);
  },

  /* ── CLEAR ────────────────────────────────────────────── */
  clear() {
    this.PROVIDERS.forEach(p => sessionStorage.removeItem(`plugai_key_${p}`));
    // Clear legacy keys too
    sessionStorage.removeItem('plugai_key');
    sessionStorage.removeItem('plugai_provider');
  },

  /* ── DETECT & MASK ────────────────────────────────────── */
  detect(key) {
    if (!key) return null;
    const k = key.trim();
    if (k.startsWith('sk-ant-'))                      return 'anthropic';
    if (k.startsWith('AIza'))                          return 'gemini';
    if (k.startsWith('sk-') && k.length > 51)         return 'openai';
    if (k.startsWith('sk-') && k.length <= 51)        return 'deepseek';
    if (k.length === 32 && /^[a-zA-Z0-9]+$/.test(k)) return 'mistral';
    return null;
  },

  mask(key) {
    if (!key || key.length < 8) return '••••••••';
    return key.slice(0, 6) + '••••••••' + key.slice(-4);
  },

  /* ── FREE MODE ────────────────────────────────────────── */
  isFreeMode()  { return !this.hasAnyKey(); },
  isFreeUsed()  { return sessionStorage.getItem('plugai_free_used') === 'true'; },
  markFreeUsed(){ sessionStorage.setItem('plugai_free_used', 'true'); },

  /* ── PAGE GUARD ───────────────────────────────────────── */
  /**
   * Call on every game page load.
   * Returns: true (has key) | 'free' (free mode ok) | 'wall' (show key wall)
   */
  guardPage() {
    if (this.hasAnyKey()) return true;

    if (this.isFreeUsed()) {
      const wall = document.getElementById('key-wall-overlay');
      if (wall) wall.classList.add('visible');
      return 'wall';
    }

    return 'free';
  },
};

// Global alias for backward compat (used in game pages)
function detectProvider(key) {
  return KeyManager.detect(key);
}
