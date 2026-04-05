/* ═══════════════════════════════════════════════════════════
   share-card.js — result overlay with tweet + upgrade prompt
   ═══════════════════════════════════════════════════════════ */

const ShareCard = {
  /**
   * ShareCard.show({ game, headline, body, tweetText })
   * In free mode, automatically appends the upgrade prompt.
   */
  show({ game, headline, body, tweetText }) {
    const existing = document.getElementById('share-card-overlay');
    if (existing) existing.remove();

    const siteUrl = 'https://plugai-arcade.vercel.app';
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(siteUrl)}`;
    const isFree = KeyManager.isFreeMode();

    const upgradeHtml = isFree ? `
      <div style="
        border-top: 1px solid var(--dim);
        margin-top: 1.5rem; padding-top: 1.5rem;
        text-align: left;
      ">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:var(--muted);text-transform:uppercase;margin-bottom:0.4rem">
          FREE ROUND USED
        </div>
        <div style="font-family:var(--display);font-size:1.1rem;margin-bottom:0.5rem">
          Enter your key to keep playing
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:0.85rem">
          Gemini is completely free — no credit card needed.
          <a href="../index.html#key-entry" style="color:var(--accent);cursor:crosshair">Get a key →</a>
        </div>
        <div style="display:flex;gap:0.5rem">
          <input
            type="password"
            id="upgrade-key-input"
            class="arcade-input"
            placeholder="Paste your API key..."
            style="flex:1;font-size:12px"
            autocomplete="off"
          >
          <button
            onclick="ShareCard._saveUpgradeKey()"
            style="padding:0 1rem;background:var(--accent);border:none;color:var(--bg);font-family:var(--mono);font-size:11px;font-weight:700;cursor:crosshair;white-space:nowrap;letter-spacing:0.08em"
          >UNLOCK ▶</button>
        </div>
        <div id="upgrade-key-status" style="font-size:11px;color:var(--green);margin-top:0.4rem;display:none">
          ✓ Key saved — play again for unlimited rounds!
        </div>
      </div>
    ` : '';

    const overlay = document.createElement('div');
    overlay.id = 'share-card-overlay';
    overlay.className = 'result-overlay visible';
    overlay.innerHTML = `
      <div class="result-card" style="max-width:${isFree ? '480px' : '520px'}">
        <div class="result-game-tag">
          <span class="arcade-tag">${escHtml(game)}</span>
          ${isFree ? '<span class="arcade-tag" style="margin-left:0.4rem;background:rgba(232,48,138,0.12);border-color:rgba(232,48,138,0.3);color:var(--pink)">FREE MODE</span>' : ''}
        </div>
        <div class="result-headline">${escHtml(headline)}</div>
        <div class="result-body">${escHtml(body)}</div>
        <div class="result-actions">
          <a
            class="arcade-btn-primary"
            href="${tweetUrl}"
            target="_blank"
            rel="noopener noreferrer"
          >𝕏 TWEET THIS</a>
          <button class="arcade-btn-ghost" onclick="location.reload()">↺ PLAY AGAIN</button>
          <a class="arcade-btn-ghost" href="../index.html">⊞ MORE GAMES</a>
        </div>
        ${upgradeHtml}
      </div>
    `;

    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  },

  _saveUpgradeKey() {
    const input = document.getElementById('upgrade-key-input');
    const key = input?.value?.trim();
    if (!key || key.length < 5) return;
    const provider = detectProvider(key) || 'openai';
    KeyManager.save(key, provider);
    const status = document.getElementById('upgrade-key-status');
    if (status) status.style.display = 'block';
    input.value = '••••••••';
    input.disabled = true;
  },

  hide() {
    const el = document.getElementById('share-card-overlay');
    if (el) el.remove();
  },
};

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
