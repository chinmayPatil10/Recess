/* ═══════════════════════════════════════════════════════════
   nav.js — shared nav injected into #nav-root on every page
   Shows key count + click-to-open mini vault dropdown.
   ═══════════════════════════════════════════════════════════ */

const Nav = {
  _dropdownOpen: false,

  /** Nav.inject(activePage)  activePage: 'lobby' | 'game' */
  inject(activePage = 'game') {
    const root = document.getElementById('nav-root');
    if (!root) return;

    const providers = KeyManager.getAvailableProviders();
    const count     = providers.length;
    const freeUsed  = KeyManager.isFreeUsed();
    const isLobby   = activePage === 'lobby';
    const prefix    = isLobby ? '' : '../';

    const PROVIDER_NAMES = {
      openai:    'OpenAI',
      anthropic: 'Claude',
      gemini:    'Gemini',
      deepseek:  'DeepSeek',
      mistral:   'Mistral',
    };

    // ── Key status indicator (clickable) ──────────────────────
    let dotColor, dotClass, statusText;
    if (count === 0) {
      dotColor  = 'var(--pink)';
      dotClass  = 'nav-dot-pulse-red';
      statusText = 'NO KEY';
    } else if (count === 1) {
      dotColor  = 'var(--accent)';
      dotClass  = '';
      statusText = `1 KEY · ${PROVIDER_NAMES[providers[0]] || providers[0].toUpperCase()}`;
    } else {
      dotColor  = 'var(--green)';
      dotClass  = '';
      statusText = `${count} KEYS`;
    }

    const statusHtml = `
      <button class="nav-key-status" id="nav-key-status-btn" onclick="Nav._toggleDropdown(event)">
        <span class="nav-dot ${dotClass}" style="background:${dotColor}"></span>
        <span class="nav-key-status-text">${statusText}</span>
        <span class="nav-key-caret">▾</span>
      </button>
    `;

    // ── Mini vault dropdown ────────────────────────────────────
    const dropRows = KeyManager.PROVIDERS.map(p => {
      const key = KeyManager.get(p);
      const active = key && key.length > 4;
      return active
        ? `<div class="nav-vault-row">
             <span class="nav-vault-dot active"></span>
             <span class="nav-vault-name">${PROVIDER_NAMES[p]}</span>
             <span class="nav-vault-mask">${KeyManager.mask(key)}</span>
             <button class="nav-vault-remove" onclick="Nav._removeKey('${p}')">✕</button>
           </div>`
        : '';
    }).filter(Boolean).join('');

    const addHref = `${prefix}index.html#key-entry`;
    const dropdownHtml = `
      <div class="nav-vault-dropdown" id="nav-vault-dropdown" style="display:none">
        ${dropRows || '<div class="nav-vault-empty">No keys saved</div>'}
        <a class="nav-vault-add-link" href="${addHref}">+ Add another key</a>
      </div>
    `;

    const backLink = !isLobby
      ? `<a class="nav-back-link" href="../index.html">← GAMES</a>`
      : '';

    root.innerHTML = `
      <nav class="arcade-nav">
        <a class="nav-logo" href="${isLobby ? '#' : '../index.html'}">
          <span class="nav-logo-plug">Recess</span>
        </a>
        <div class="nav-spacer"></div>
        ${backLink}
        <div class="nav-key-wrap" style="position:relative">
          ${statusHtml}
          ${dropdownHtml}
        </div>
      </nav>
    `;

    // Close dropdown on outside click
    document.addEventListener('click', Nav._outsideClick, { capture: true, once: false });
  },

  _toggleDropdown(e) {
    e.stopPropagation();
    const dd = document.getElementById('nav-vault-dropdown');
    if (!dd) return;
    const open = dd.style.display !== 'none';
    dd.style.display = open ? 'none' : 'block';
    Nav._dropdownOpen = !open;
  },

  _outsideClick(e) {
    const wrap = document.querySelector('.nav-key-wrap');
    if (wrap && !wrap.contains(e.target)) {
      const dd = document.getElementById('nav-vault-dropdown');
      if (dd) dd.style.display = 'none';
      Nav._dropdownOpen = false;
    }
  },

  _removeKey(provider) {
    KeyManager.remove(provider);
    // Re-inject nav with same activePage context
    const isLobby = !window.location.pathname.includes('/games/');
    Nav.inject(isLobby ? 'lobby' : 'game');
    // Re-render games if on lobby
    if (typeof renderGames === 'function') renderGames();
    if (typeof renderKeyVault === 'function') renderKeyVault();
  },

  // Backward compat — was used by older code
  _changeKey() {
    if (confirm('Clear all API keys and return to the lobby?')) {
      KeyManager.clear();
      window.location.href = window.location.pathname.includes('/games/')
        ? '../index.html'
        : 'index.html';
    }
  },
};
