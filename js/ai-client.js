/* ═══════════════════════════════════════════════════════════
   ai-client.js — AI provider calls, model families, selector UI
   Direct browser → provider. No proxy. No backend.
   ═══════════════════════════════════════════════════════════ */

/* ─── MODEL FAMILIES ──────────────────────────────────────── */
const MODEL_FAMILIES = {
  openai: [
    { modelId: 'gpt-4o',        display: 'GPT-4o' },
    { modelId: 'gpt-4o-mini',   display: 'GPT-4o mini' },
    { modelId: 'gpt-3.5-turbo', display: 'GPT-3.5' },
  ],
  anthropic: [
    { modelId: 'claude-opus-4-6',           display: 'Claude Opus' },
    { modelId: 'claude-sonnet-4-6',         display: 'Claude Sonnet' },
    { modelId: 'claude-haiku-4-5-20251001', display: 'Claude Haiku' },
  ],
  gemini: [
    { modelId: 'gemini-1.5-pro',   display: 'Gemini Pro' },
    { modelId: 'gemini-1.5-flash', display: 'Gemini Flash' },
    { modelId: 'gemini-1.0-pro',   display: 'Gemini 1.0' },
  ],
  deepseek: [
    { modelId: 'deepseek-chat',      display: 'DeepSeek Chat' },
    { modelId: 'deepseek-reasoner',  display: 'DeepSeek Reasoner' },
  ],
  mistral: [
    { modelId: 'mistral-large-latest', display: 'Mistral Large' },
    { modelId: 'mistral-small-latest', display: 'Mistral Small' },
  ],
  free: [
    { modelId: 'openai',  display: 'GPT (free)',     tag: 'free', color: '#40e890' },
    { modelId: 'mistral', display: 'Mistral (free)', tag: 'free', color: '#e8308a' },
    { modelId: 'llama',   display: 'Llama (free)',   tag: 'free', color: '#30c8e8' },
  ],
};

/* ─── DISPLAY HELPERS ─────────────────────────────────────── */
function getModelDisplayName(providerOrModelId) {
  // Check specific modelId first
  for (const family of Object.values(MODEL_FAMILIES)) {
    const m = family.find(x => x.modelId === providerOrModelId);
    if (m) return m.display;
  }
  // Fall back to provider name
  return {
    openai:    'GPT-4o mini',
    anthropic: 'Claude Haiku',
    gemini:    'Gemini Flash',
    deepseek:  'DeepSeek',
    mistral:   'Mistral',
    free:      'Free AI',
    llama:     'Llama 3.1',
    gemma:     'Gemma 2',
  }[providerOrModelId] || providerOrModelId;
}

function getModelColor(providerOrModelId) {
  // Check free model colors
  const freeModel = MODEL_FAMILIES.free.find(m => m.modelId === providerOrModelId);
  if (freeModel) return freeModel.color;

  return {
    openai:    '#40e890',
    anthropic: '#f0e040',
    gemini:    '#30c8e8',
    deepseek:  '#e8308a',
    mistral:   '#a040f0',
    free:      '#f0a040',
  }[providerOrModelId] || '#6b6880';
}

/* ─── SSE STREAM PARSER ───────────────────────────────────── */
async function parseSSE(response, extractText, onChunk, onDone) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) { onDone(full); return; }

    const lines = decoder.decode(value, { stream: true }).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') { onDone(full); return; }
      try {
        const text = extractText(JSON.parse(data));
        if (text) { full += text; onChunk(text); }
      } catch { /* incomplete chunk */ }
    }
  }
}

/* ─── PROVIDER CALLS ──────────────────────────────────────── */
async function _callOpenAI(key, modelId, messages, onChunk, onDone, onError) {
  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: modelId || 'gpt-4o-mini', messages, stream: true, max_tokens: 512 }),
    });
  } catch { onError('Network error — check your internet connection'); return; }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) onError('Invalid API key — check your key matches the provider');
    else if (res.status === 429) onError('Rate limited — wait a moment and try again');
    else if (res.status === 403) onError('Access denied — check your account has API access');
    else onError(err.error?.message || `OpenAI error ${res.status}`);
    return;
  }
  await parseSSE(res, j => j.choices?.[0]?.delta?.content || '', onChunk, onDone);
}

async function _callAnthropic(key, modelId, messages, onChunk, onDone, onError) {
  let systemPrompt = '';
  const userMessages = messages.filter(m => {
    if (m.role === 'system') { systemPrompt = m.content; return false; }
    return true;
  });
  const body = {
    model: modelId || 'claude-haiku-4-5-20251001',
    max_tokens: 512, stream: true,
    messages: userMessages,
  };
  if (systemPrompt) body.system = systemPrompt;

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch { onError('Network error — check your internet connection'); return; }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) onError('Invalid API key — check your key matches the provider');
    else if (res.status === 429) onError('Rate limited — wait a moment and try again');
    else if (res.status === 403) onError('Access denied — check your account has API access');
    else onError(err.error?.message || `Anthropic error ${res.status}`);
    return;
  }
  await parseSSE(res, j => {
    if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') return j.delta.text || '';
    return '';
  }, onChunk, onDone);
}

async function _callGemini(key, modelId, messages, onChunk, onDone, onError) {
  const contents = [];
  let systemInstruction = null;
  for (const m of messages) {
    if (m.role === 'system') { systemInstruction = { parts: [{ text: m.content }] }; }
    else contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
  }
  const model = modelId || 'gemini-1.5-flash';
  const body = { contents, generationConfig: { maxOutputTokens: 512 } };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
  } catch { onError('Network error — check your internet connection'); return; }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 400) onError('Invalid API key — check your key matches the provider');
    else if (res.status === 429) onError('Rate limited — wait a moment and try again');
    else if (res.status === 403) onError('Access denied — check your account has API access');
    else onError(err.error?.message || `Gemini error ${res.status}`);
    return;
  }
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) { onError('Gemini returned an empty response'); return; }
  // Simulate streaming
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    onChunk((i === 0 ? '' : ' ') + words[i]);
    await new Promise(r => setTimeout(r, 14));
  }
  onDone(text);
}

async function _callDeepSeek(key, modelId, messages, onChunk, onDone, onError) {
  let res;
  try {
    res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: modelId || 'deepseek-chat', messages, stream: true, max_tokens: 512 }),
    });
  } catch { onError('Network error — check your internet connection'); return; }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) onError('Invalid API key — check your key matches the provider');
    else if (res.status === 429) onError('Rate limited — wait a moment and try again');
    else if (res.status === 403) onError('Access denied — check your account has API access');
    else onError(err.error?.message || `DeepSeek error ${res.status}`);
    return;
  }
  await parseSSE(res, j => j.choices?.[0]?.delta?.content || '', onChunk, onDone);
}

async function _callMistral(key, modelId, messages, onChunk, onDone, onError) {
  let res;
  try {
    res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: modelId || 'mistral-small-latest', messages, stream: true, max_tokens: 512 }),
    });
  } catch { onError('Network error — check your internet connection'); return; }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) onError('Invalid API key — check your key matches the provider');
    else if (res.status === 429) onError('Rate limited — wait a moment and try again');
    else if (res.status === 403) onError('Access denied — check your account has API access');
    else onError(err.error?.message || `Mistral error ${res.status}`);
    return;
  }
  await parseSSE(res, j => j.choices?.[0]?.delta?.content || '', onChunk, onDone);
}

// Add this helper function in ai-client.js or at top of the game script

function stripPollinationsNotice(text) {
  if (!text) return text;
  
  // The notice always ends with this exact sentence
  const endMarker = 'will continue to work normally.';
  const markerIndex = text.indexOf(endMarker);
  
  if (markerIndex !== -1) {
    // Everything AFTER the notice is the actual response
    const afterNotice = text.slice(markerIndex + endMarker.length).trim();
    
    // If there's content after the notice, use it
    if (afterNotice.length > 20) {
      return afterNotice;
    }
    
    // If nothing after — the notice WAS the entire response body
    // This means the actual model response hasn't been appended yet
    // Return null so we know to retry
    return null;
  }
  
  return text;
}

/* ─── FREE MODE — Pollinations.AI (no key, no proxy, no backend) */
// REPLACE callFreeModel entirely with this simpler version.
// Uses GET endpoint — no streaming, no CORS preflight, no SSE parsing.
// Pollinations GET endpoint works directly from any browser.

async function callFreeModel(slot, messages, onChunk, onDone, onError) {
  const models = {
    slot1: { id: 'openai',   label: 'GPT (free)'     },
    slot2: { id: 'mistral',  label: 'Mistral (free)'  },
    slot3: { id: 'llama',    label: 'Llama (free)'    }
  };

  const m = models[slot] || models.slot1;

  // Build prompt from messages array
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const userMsg   = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
  const prompt    = userMsg;

  // Use GET endpoint — no CORS preflight, no streaming needed
  // Pollinations GET: https://enter.pollinations.ai/{prompt}?model=X&system=Y
const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`
          + `?model=${m.id}`
          + `&system=${encodeURIComponent(systemMsg)}`
          + `&temperature=0.9`
          + `&seed=${Math.floor(Math.random() * 9999)}`;
  try {
    // Show typing indicator while waiting
    onChunk('');

   const res = await fetch(url, {
  headers: {
    'Referer': 'https://plugai-arcade.vercel.app'
  }
});

  const rawText = await res.text();
const text = stripPollinationsNotice(rawText);

if (!text) {
  // Notice only, no actual content — retry once with different seed
  const retryUrl = url.replace(/seed=\d+/, `seed=${Math.floor(Math.random() * 99999)}`);
  const retryRes = await fetch(retryUrl, {
    headers: { 'Referer': 'https://plugai-arcade.vercel.app' }
  });
  const retryRaw = await retryRes.text();
  const retryText = stripPollinationsNotice(retryRaw);
  
  if (!retryText) {
    onError('Free models are temporarily busy. Wait 15 seconds and try again.');
    return;
  }
  
  // Use retry response
  const words = retryText.split(' ');
  let accumulated = '';
  for (let i = 0; i < words.length; i++) {
    accumulated += (i === 0 ? '' : ' ') + words[i];
    onChunk((i === 0 ? '' : ' ') + words[i]);
    await new Promise(r => setTimeout(r, 18));
  }
  onDone(accumulated);
  return;
}

// Normal path — use text directly
const words = text.split(' ');
let accumulated = '';
for (let i = 0; i < words.length; i++) {
  accumulated += (i === 0 ? '' : ' ') + words[i];
  onChunk((i === 0 ? '' : ' ') + words[i]);
  await new Promise(r => setTimeout(r, 18));
}
onDone(accumulated);
  } catch (err) {
    // Rate limit = 15s between requests on anonymous tier
    if (err.message.includes('429') || err.message.includes('503')) {
      onError('Rate limited — Pollinations free tier allows 1 request per 15 seconds. Wait and try again.');
    } else {
      onError(`Free model unavailable — ${err.message}. Try again in a moment.`);
    }
  }
}

/* ─── MAIN DISPATCHER ─────────────────────────────────────── */
/**
 * callModel(provider, key, messages, onChunk, onDone, onError, modelId?)
 * modelId overrides the default model for that provider.
 * For free mode: provider='free', key=null, modelId='llama'|'gemma'|'mistral'
 */
async function callModel(provider, key, messages, onChunk, onDone, onError, modelId) {
  if (provider === 'free') {
    return callFreeModel(modelId || 'llama', messages, onChunk, onDone, onError);
  }
  if (!key || key.trim().length < 5) {
    onError('No API key — go back to the lobby and enter your key');
    return;
  }
  switch (provider) {
    case 'openai':    return _callOpenAI(key, modelId, messages, onChunk, onDone, onError);
    case 'anthropic': return _callAnthropic(key, modelId, messages, onChunk, onDone, onError);
    case 'gemini':    return _callGemini(key, modelId, messages, onChunk, onDone, onError);
    case 'deepseek':  return _callDeepSeek(key, modelId, messages, onChunk, onDone, onError);
    case 'mistral':   return _callMistral(key, modelId, messages, onChunk, onDone, onError);
    default: onError(`Unknown provider: ${provider}`);
  }
}

/* ─── STREAM-TO-PANEL HELPER ──────────────────────────────── */
/**
 * streamToPanel(modelSpec, messages, panelBodyEl, panelEl)
 * modelSpec: { provider, key, modelId, display }
 * Returns Promise<{ text, error }>
 */
function streamToPanel(modelSpec, messages, panelBodyEl, panelEl) {
  // Backward compat: old positional signature (provider, key, messages, body, panel)
  if (typeof modelSpec === 'string') {
    const [provider, key] = [modelSpec, messages];
    messages = panelBodyEl;
    panelBodyEl = panelEl;
    panelEl = arguments[4];
    modelSpec = { provider, key, modelId: null };
  }

  return new Promise(resolve => {
    panelEl?.classList.add('streaming');
    panelBodyEl.classList.add('panel-content', 'streaming');
    const thinking = panelBodyEl.querySelector('.panel-thinking');
    let accumulated = '';

    callModel(
      modelSpec.provider,
      modelSpec.key,
      messages,
      chunk => {
        if (thinking) thinking.remove();
        accumulated += chunk;
        // During streaming — simple single sentence span with trailing cursor
        const preview = _esc(_stripMeta(accumulated).replace(/\n+/g, ' ').trim());
        panelBodyEl.innerHTML = `<span class="sentence">${preview}&#9611;</span>`;
        panelBodyEl.scrollTop = panelBodyEl.scrollHeight;
      },
      fullText => {
        // On complete — rich structured render
        panelBodyEl.innerHTML = renderResponse(fullText || accumulated);
        panelBodyEl.classList.remove('streaming');
        panelBodyEl.classList.add('done');
        panelEl?.classList.remove('streaming');
        panelEl?.classList.add('done');
        resolve({ text: fullText || accumulated, error: null });
      },
      msg => {
        if (thinking) thinking.remove();
        panelBodyEl.classList.remove('streaming');
        panelEl?.classList.remove('streaming');
        panelBodyEl.innerHTML = `<span class="sentence" style="color:var(--pink)">⚠ ${_esc(msg)}</span>`;
        showToast(msg);
        resolve({ text: accumulated, error: msg });
      },
      modelSpec.modelId || null
    );
  });
}

/* ─── MODEL SELECTOR UI COMPONENT ────────────────────────── */
/**
 * buildSelector(containerEl, { min, max, defaultChecked, onChange })
 * Renders the full model selector into containerEl.
 * Returns { getModels(), isValid(), getNote() }
 *
 * getModels() → [{ provider, key, modelId, display, isFree }]
 */
function buildSelector(containerEl, { min = 2, max = 5, onChange } = {}) {
  let checked = new Set();      // Set of modelId strings
  let extraOpen = false;

  function getAvailableModels() {
    if (KeyManager.isFreeMode()) {
      return MODEL_FAMILIES.free.map(m => ({
        ...m, provider: 'free', key: null, isFree: true,
      }));
    }
    const allKeys = KeyManager.getAllKeys();
    const result = [];
    allKeys.forEach(({ provider, key }) => {
      (MODEL_FAMILIES[provider] || []).forEach(m => {
        result.push({ ...m, provider, key, isFree: false });
      });
    });
    return result;
  }

  // Provider metadata for the key-entry UI
  const PROVIDER_META = [
    { id:'openai',    label:'OpenAI',    hint:'sk-...',      eg:'GPT-4o, GPT-4o mini, GPT-3.5' },
    { id:'anthropic', label:'Anthropic', hint:'sk-ant-...',  eg:'Claude Opus, Sonnet, Haiku' },
    { id:'gemini',    label:'Gemini',    hint:'AIza...',     eg:'Gemini Pro, Flash — free tier available' },
    { id:'deepseek',  label:'DeepSeek',  hint:'sk-...',      eg:'DeepSeek Chat, Reasoner' },
    { id:'mistral',   label:'Mistral',   hint:'32-char key', eg:'Mistral Large, Small' },
  ];

  function render() {
    const isFree = KeyManager.isFreeMode();
    const allAvailable = getAvailableModels();
    const primaryProvider = isFree ? null : KeyManager.getPrimaryProvider();

    // Default: check all available up to max
    if (checked.size === 0) {
      allAvailable.slice(0, Math.min(max, allAvailable.length)).forEach(m => checked.add(m.modelId));
    }

    // Providers that still need a key
    const missingProviders = PROVIDER_META.filter(p => !KeyManager.hasKeyFor(p.id));

    containerEl.innerHTML = `
      <div style="background:var(--bg3);border:1px solid var(--dim)">

        <!-- ── ACTIVE MODELS SECTION ─────────────────────── -->
        <div style="padding:0.85rem 1rem 0.75rem">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;color:var(--muted);margin-bottom:0.6rem;display:flex;align-items:center;justify-content:space-between">
            <span>MODELS IN THIS GAME</span>
            ${isFree
              ? '<span style="color:var(--pink)">⚡ FREE MODE</span>'
              : `<span style="color:var(--green)">✓ ${allAvailable.length} MODEL${allAvailable.length !== 1 ? 'S' : ''} AVAILABLE</span>`
            }
          </div>
          <div class="model-check-grid">
            ${allAvailable.map(m => `
              <label class="model-check-item" style="${m.isFree ? 'border-color:rgba(232,48,138,0.25)' : ''}">
                <input type="checkbox" value="${m.modelId}" ${checked.has(m.modelId) ? 'checked' : ''}>
                <span style="color:${m.color || getModelColor(m.provider)}">${m.display}</span>
                ${m.isFree ? '<span style="font-size:9px;color:var(--muted);margin-left:2px">(free)</span>' : ''}
              </label>
            `).join('')}
          </div>
          ${isFree ? `
            <div style="margin-top:0.65rem;font-size:11px;color:var(--muted)">
              ⚡ 1 free round per session ·
              <a href="../index.html" style="color:var(--accent)">add your key for unlimited play →</a>
            </div>
          ` : ''}
        </div>

        ${!isFree ? `
        <!-- ── ADD MORE PROVIDERS SECTION ────────────────── -->
        <div style="border-top:1px solid var(--dim);padding:0.75rem 1rem">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;color:var(--muted);margin-bottom:0.65rem">
            ADD PROVIDER KEYS — compare across companies
          </div>
          <div style="display:flex;flex-direction:column;gap:0.5rem">
            ${PROVIDER_META.map(p => {
              const active = KeyManager.hasKeyFor(p.id);
              return `
                <div style="display:flex;align-items:center;gap:0.5rem">
                  <!-- Provider label + status -->
                  <div style="width:80px;flex-shrink:0">
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;color:${active ? 'var(--green)' : 'var(--muted)'}">${p.label}</div>
                    ${active
                      ? '<div style="font-size:9px;color:var(--green);margin-top:1px">✓ active</div>'
                      : `<div style="font-size:9px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.eg}</div>`
                    }
                  </div>
                  <!-- Key input or active indicator -->
                  ${active
                    ? `<div style="flex:1;background:rgba(64,232,144,0.07);border:1px solid rgba(64,232,144,0.2);padding:0.35rem 0.6rem;font-size:11px;color:var(--green);font-family:var(--mono)">
                        ••••••••
                        <button onclick="_selectorClearProvider('${p.id}')"
                          style="float:right;background:none;border:none;color:var(--muted);font-size:10px;cursor:crosshair;font-family:var(--mono)">✕</button>
                       </div>`
                    : `<div style="flex:1;display:flex;gap:0.3rem">
                        <input type="password" class="arcade-input" id="extra-key-${p.id}"
                          placeholder="${p.hint}"
                          style="flex:1;font-size:11px;padding:0.35rem 0.5rem">
                        <button onclick="_selectorSaveExtra('${p.id}',this)"
                          style="padding:0 0.65rem;background:var(--dim);border:none;color:var(--text);font-family:var(--mono);font-size:10px;cursor:crosshair;letter-spacing:0.08em;flex-shrink:0">
                          ADD
                        </button>
                       </div>`
                  }
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

      </div>
    `;

    // Wire checkboxes
    containerEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (checked.size >= max) { cb.checked = false; return; }
          checked.add(cb.value);
        } else {
          if (checked.size <= min) { cb.checked = true; return; }
          checked.delete(cb.value);
        }
        onChange && onChange();
      });
    });
  }

  // Global helpers — must be window-level for inline onclick
  window._selectorSaveExtra = function(provider, btn) {
    const input = document.getElementById(`extra-key-${provider}`);
    const val = input?.value?.trim();
    if (!val || val === '••••••••') return;
    KeyManager.saveForProvider(provider, val);
    (MODEL_FAMILIES[provider] || []).forEach(m => { if (checked.size < max) checked.add(m.modelId); });
    render();
    onChange && onChange();
  };

  window._selectorClearProvider = function(provider) {
    sessionStorage.removeItem(`plugai_key_${provider}`);
    // If it was the primary, also clear primary
    if (KeyManager.getPrimaryProvider() === provider) KeyManager.clear();
    // Uncheck models for this provider
    (MODEL_FAMILIES[provider] || []).forEach(m => checked.delete(m.modelId));
    render();
    onChange && onChange();
  };

  render();

  return {
    getModels() {
      const all = getAvailableModels();
      return all.filter(m => checked.has(m.modelId));
    },
    isValid() {
      return checked.size >= min;
    },
    // Info note for top of game area
    getNote() {
      if (KeyManager.isFreeMode()) {
        return 'Free mode · open source AI · 1 round per session';
      }
      const all = getAvailableModels();
      const sel = all.filter(m => checked.has(m.modelId));
      const providers = [...new Set(sel.map(m => m.provider))];
      if (providers.length === 1) {
        const name = providers[0].charAt(0).toUpperCase() + providers[0].slice(1);
        return `Comparing ${sel.length} ${name} models · add more keys to compare across providers`;
      }
      return `Comparing ${sel.length} models across ${providers.length} providers`;
    },
  };
}

/* ─── VS SELECTOR (for model-roast) ──────────────────────── */
/**
 * buildVsSelector(containerAEl, containerBEl)
 * Renders two dropdowns populated from the provider family.
 * Returns { getModelA(), getModelB(), isValid() }
 */
function buildVsSelector(containerAEl, containerBEl) {
  function getOptions() {
    if (KeyManager.isFreeMode()) {
      return MODEL_FAMILIES.free.map(m => ({
        ...m, provider: 'free', key: null,
      }));
    }
    const allKeys = KeyManager.getAllKeys();
    const opts = [];
    allKeys.forEach(({ provider, key }) => {
      (MODEL_FAMILIES[provider] || []).forEach(m => {
        opts.push({ ...m, provider, key });
      });
    });
    return opts;
  }

  function renderSelect(el, defaultIdx) {
    const opts = getOptions();
    el.innerHTML = opts.map((m, i) =>
      `<option value="${m.modelId}" ${i === defaultIdx ? 'selected' : ''}>${m.display}</option>`
    ).join('');
    el.style.display = 'block';
  }

  renderSelect(containerAEl, 0);
  renderSelect(containerBEl, 1);

  function getModel(selectEl) {
    const modelId = selectEl.value;
    const all = getOptions();
    const found = all.find(m => m.modelId === modelId);
    return found || null;
  }

  return {
    getModelA: () => getModel(containerAEl),
    getModelB: () => getModel(containerBEl),
    isValid() {
      return containerAEl.value !== containerBEl.value;
    },
    getNote() {
      if (KeyManager.isFreeMode()) return 'Free mode · open source AI · 1 round';
      const allKeys = KeyManager.getAllKeys();
      if (allKeys.length === 1) {
        const name = allKeys[0].provider.charAt(0).toUpperCase() + allKeys[0].provider.slice(1);
        return `Comparing ${name} models · add more keys to compare across providers`;
      }
      return 'Cross-provider battle';
    },
  };
}

/* ═══════════════════════════════════════════════════════════
   PERSONA ENGINE — same key + different system prompts
   ═══════════════════════════════════════════════════════════ */

/**
 * callPersona(persona, userPrompt, apiKey, provider, onChunk, onDone, onError)
 * persona = { name, systemPrompt, color, emoji }
 * Calls one persona's system prompt with the user's message.
 */
async function callPersona(persona, userPrompt, apiKey, provider, onChunk, onDone, onError) {
  const messages = [
    { role: 'system', content: persona.systemPrompt },
    { role: 'user',   content: userPrompt },
  ];
  // Route through callFreeModel or callModel depending on provider
  if (provider === 'free' || !apiKey) {
    const modelId = persona.freeModel || 'openai';
    await callFreeModel(modelId, messages, onChunk, onDone, onError);
  } else {
    await callModel(provider, apiKey, messages, onChunk, onDone, onError);
  }
}

/**
 * callAllPersonas(personas, userPrompt, apiKey, provider, callbacks)
 * callbacks = array of { onChunk, onDone, onError } — one per persona (same order)
 * Fires all personas in parallel via Promise.all.
 */
async function callAllPersonas(personas, userPrompt, apiKey, provider, callbacks) {
  await Promise.all(
    personas.map((persona, i) =>
      callPersona(
        persona, userPrompt, apiKey, provider,
        callbacks[i].onChunk,
        callbacks[i].onDone,
        callbacks[i].onError,
      )
    )
  );
}

/* ═══════════════════════════════════════════════════════════
   SMART MODEL SELECTOR
   Adapts UI based on how many keys the user has:
     0 keys → free mode  (Pollinations free models)
     1 key  → persona mode toggle + single-provider models
     2+ keys → full multi-provider checkboxes
   ═══════════════════════════════════════════════════════════ */

/**
 * buildModelSelector(containerEl, { min, max, personas, onChange })
 * personas = array of { name, emoji, systemPrompt, color } for this game
 * Returns { getModels(), getPersonas(), getMode(), isValid(), getNote() }
 */
function buildModelSelector(containerEl, { min = 2, max = 5, personas = [], onChange } = {}) {
  const available = KeyManager.getAvailableProviders();
  const PROVIDER_NAMES = {
    openai: 'OpenAI', anthropic: 'Claude', gemini: 'Gemini',
    deepseek: 'DeepSeek', mistral: 'Mistral',
  };

  // ── FREE MODE: no keys ──────────────────────────────────────
  if (available.length === 0) {
    containerEl.innerHTML = `
      <div class="selector-free-notice">
        <span style="color:var(--pink);font-weight:700">⚡ FREE MODE</span>
        <span style="color:var(--muted);font-size:11px;margin-left:0.5rem">via Pollinations · open-source AI</span>
      </div>
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem">
        ${MODEL_FAMILIES.free.map(m => `
          <label class="selector-model-chip" style="border-color:${m.color};color:${m.color}">
            <input type="checkbox" name="free_model" value="${m.modelId}" checked style="display:none">
            ${m.display}
          </label>
        `).join('')}
      </div>
    `;

    function getCheckedFree() {
      return Array.from(containerEl.querySelectorAll('input[name="free_model"]:checked'))
        .map(cb => ({ provider: 'free', key: null, modelId: cb.value, display: MODEL_FAMILIES.free.find(m => m.modelId === cb.value)?.display || cb.value }));
    }

    containerEl.addEventListener('change', () => onChange && onChange());
    return {
      getModels:   getCheckedFree,
      getPersonas: () => [],
      getMode:     () => 'free',
      isValid:     () => getCheckedFree().length >= Math.min(min, MODEL_FAMILIES.free.length),
      getNote:     () => 'Free mode · open-source AI via Pollinations',
    };
  }

  // ── SINGLE KEY: persona toggle + model family ───────────────
  if (available.length === 1) {
    const provider = available[0];
    const key      = KeyManager.get(provider);
    const models   = MODEL_FAMILIES[provider] || [];
    const hasPersonas = personas.length >= 2;
    let currentMode = hasPersonas ? 'personas' : 'models';

    function renderSingle() {
      const modeToggle = hasPersonas ? `
        <div class="selector-mode-toggle" style="margin-bottom:0.75rem">
          <button class="sel-mode-btn ${currentMode === 'personas' ? 'active' : ''}"
            onclick="window._selectorSetMode('personas')">PERSONAS</button>
          <button class="sel-mode-btn ${currentMode === 'models' ? 'active' : ''}"
            onclick="window._selectorSetMode('models')">MODELS</button>
        </div>
      ` : '';

      const personaHtml = hasPersonas ? `
        <div class="selector-persona-list" style="${currentMode !== 'personas' ? 'display:none' : ''}">
          ${personas.map((p, i) => `
            <label class="selector-persona-chip" style="border-color:${p.color || 'var(--accent)'}">
              <input type="checkbox" name="persona_sel" value="${i}" checked style="display:none">
              <span style="font-size:1rem">${p.emoji || '●'}</span>
              <span>${p.name}</span>
            </label>
          `).join('')}
        </div>
      ` : '';

      const modelHtml = `
        <div class="selector-model-list" style="${currentMode !== 'models' ? 'display:none' : ''}">
          ${models.map((m, i) => `
            <label class="selector-model-chip">
              <input type="checkbox" name="model_sel" value="${m.modelId}" ${i < max ? 'checked' : ''} style="display:none">
              ${m.display}
            </label>
          `).join('')}
        </div>
      `;

      containerEl.innerHTML = `
        <div style="font-size:10px;color:var(--muted);letter-spacing:0.06em;margin-bottom:0.5rem">
          Using your ${PROVIDER_NAMES[provider]} key
        </div>
        ${modeToggle}
        ${personaHtml}
        ${modelHtml}
      `;

      containerEl.addEventListener('change', () => onChange && onChange());
    }

    window._selectorSetMode = function(mode) {
      currentMode = mode;
      renderSingle();
      if (onChange) onChange();
    };

    renderSingle();

    return {
      getModels() {
        if (currentMode === 'personas') return [];
        return Array.from(containerEl.querySelectorAll('input[name="model_sel"]:checked'))
          .map(cb => {
            const m = models.find(m => m.modelId === cb.value);
            return m ? { provider, key, modelId: m.modelId, display: m.display } : null;
          }).filter(Boolean);
      },
      getPersonas() {
        if (currentMode !== 'personas') return [];
        return Array.from(containerEl.querySelectorAll('input[name="persona_sel"]:checked'))
          .map(cb => personas[parseInt(cb.value)])
          .filter(Boolean);
      },
      getMode:   () => currentMode,
      isValid() {
        if (currentMode === 'personas') return this.getPersonas().length >= Math.min(min, personas.length);
        return this.getModels().length >= min;
      },
      getNote: () => currentMode === 'personas'
        ? `Persona mode · ${PROVIDER_NAMES[provider]} · same model, different characters`
        : `${PROVIDER_NAMES[provider]} model family`,
    };
  }

  // ── MULTI KEY: full provider/model checkboxes ───────────────
  const opts = [];
  available.forEach(provider => {
    const key = KeyManager.get(provider);
    (MODEL_FAMILIES[provider] || []).forEach(m => {
      opts.push({ ...m, provider, key });
    });
  });

  containerEl.innerHTML = `
    <div style="font-size:10px;color:var(--muted);letter-spacing:0.06em;margin-bottom:0.6rem">
      MODELS IN THIS GAME
    </div>
    <div class="selector-model-list">
      ${opts.slice(0, max * available.length).map((m, i) => `
        <label class="selector-model-chip">
          <input type="checkbox" name="multi_model_sel" value="${i}" ${i < max ? 'checked' : ''} style="display:none">
          <span style="font-size:9px;opacity:0.6">${PROVIDER_NAMES[m.provider]} · </span>${m.display}
        </label>
      `).join('')}
    </div>
  `;

  containerEl.addEventListener('change', () => onChange && onChange());

  function getMultiModels() {
    return Array.from(containerEl.querySelectorAll('input[name="multi_model_sel"]:checked'))
      .map(cb => opts[parseInt(cb.value)])
      .filter(Boolean);
  }

  return {
    getModels:   getMultiModels,
    getPersonas: () => [],
    getMode:     () => 'models',
    isValid:     () => getMultiModels().length >= min,
    getNote:     () => `${available.length} providers · ${getMultiModels().length} models selected`,
  };
}

/* ═══════════════════════════════════════════════════════════
   RESPONSE CLEANING + RENDERING
   ═══════════════════════════════════════════════════════════ */

/**
 * NO_META — append to any system prompt to suppress model preamble.
 * e.g.  const sys = 'You are a comedian...' + NO_META;
 */
const NO_META =
  ' Output your response directly. ' +
  'Do not preface with labels, titles, or meta-commentary like ' +
  '"Here is my response:", "The Roast:", "As a therapist,", ' +
  '"Sure!", "Certainly!", or any similar introduction. ' +
  'Start immediately with the actual content.';

/**
 * cleanResponse(text) → HTML string
 *
 * Strips markdown headers, meta-commentary opening lines,
 * then wraps paragraphs in <p> tags and converts inline
 * **bold** / *italic* / `code` to styled HTML.
 */
function cleanResponse(text) {
  if (!text) return '';

  // Strip markdown headers (# Heading, ## Subheading …)
  text = text.replace(/^#{1,4}\s+.*/gm, '');

  // Strip common meta-commentary opening lines
  const metaPatterns = [
    /^here'?s?\s+(your|my|the)\s+\w+[:\s]*/im,
    /^(the\s+)?(roast|argument|response|rebuttal|haiku|take|advice|opening|closing|statement|session|analysis|verdict)[:\s]*/im,
    /^as (a|an) [\w\s]{2,40}[,:\s]+/im,
    /^(sure|certainly|absolutely|gladly|of course|great)[!.,]?\s+/im,
    /^(allow me to|let me|here is|here are)[^.!:\n]*[.!:]\s*/im,
    /^(alright|okay|ok)[!.,]?\s+/im,
  ];
  for (const pat of metaPatterns) {
    text = text.replace(pat, '');
  }

  text = text.trim();

  // Split on double newlines → paragraphs; collapse single newlines within
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0);

  // Convert inline markdown per paragraph
  const html = paragraphs.map(p => {
    // Escape HTML entities first so we don't double-encode
    p = p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Bold **text** → <strong>
    p = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic *text* or _text_ → <em>
    p = p.replace(/\*(.*?)\*/g, '<em>$1</em>');
    p = p.replace(/_(.*?)_/g, '<em>$1</em>');
    // Inline code `text`
    p = p.replace(/`(.*?)`/g, '<code>$1</code>');
    return `<p>${p}</p>`;
  });

  return html.join('');
}

/**
 * _stripMeta(text) → plain string
 * Shared text-cleaning logic used by both cleanResponse and renderResponse.
 * Returns unescaped plain text with headers and preamble removed.
 */
function _stripMeta(text) {
  if (!text) return '';
  text = text.replace(/^#{1,4}\s+.*/gm, '');
  const metaPatterns = [
    /^here'?s?\s+(your|my|the)\s+\w+[:\s]*/im,
    /^(the\s+)?(roast|argument|response|rebuttal|haiku|take|advice|opening|closing|statement|session|analysis|verdict)[:\s]*/im,
    /^as (a|an) [\w\s]{2,40}[,:\s]+/im,
    /^(sure|certainly|absolutely|gladly|of course|great)[!.,]?\s+/im,
    /^(allow me to|let me|here is|here are)[^.!:\n]*[.!:]\s*/im,
    /^(alright|okay|ok)[!.,]?\s+/im,
  ];
  for (const pat of metaPatterns) text = text.replace(pat, '');
  return text.trim();
}

/**
 * highlightText(escapedHtml) → HTML string
 * Applies inline colour highlights to already-HTML-escaped text.
 * **bold** → .hl-yellow   *italic* → .hl-cyan   "quote" → .hl-cyan
 * numbers/stats → .hl-yellow  `code` → <code>
 */
function highlightText(text) {
  // Bold → yellow
  text = text.replace(/\*\*(.*?)\*\*/g, '<span class="hl-yellow">$1</span>');
  // Italic → cyan (colour only — monospace italic looks bad)
  text = text.replace(/\*(.*?)\*/g, '<span class="hl-cyan">$1</span>');
  text = text.replace(/_(.*?)_/g,   '<span class="hl-cyan">$1</span>');
  // Quoted phrases → cyan
  text = text.replace(/"([^"]{4,60})"/g, '&ldquo;<span class="hl-cyan">$1</span>&rdquo;');
  // Standalone numbers / percentages / multipliers → yellow
  text = text.replace(/\b(\d+(?:\.\d+)?(?:%|x|X|\+)?)\b/g, '<span class="hl-yellow">$1</span>');
  // Inline code
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  return text;
}

/**
 * _esc(str) — minimal HTML escape for plain text before highlight.
 */
function _esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * renderResponse(text) → rich HTML string
 *
 * Structures a model response into:
 *   .sentence.hook   — first sentence  (bright, bold, separated)
 *   .sentence        — body sentences  (dimmer, spacious)
 *   .callout         — the longest body sentence (if >80 chars)
 *   .sentence.closer — last sentence   (bright, bold, separated)
 *
 * Inline markdown and numbers are colour-highlighted via highlightText().
 */
function renderResponse(text) {
  if (!text) return '';

  // Clean meta preamble, collapse newlines
  const clean = _stripMeta(text).replace(/\n+/g, ' ').trim();
  if (!clean) return '';

  // Split on sentence-ending punctuation — keep delimiter attached
  const sentences = (clean.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [clean])
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) {
    return `<span class="sentence">${highlightText(_esc(clean))}</span>`;
  }

  // With only one sentence: just a hook
  if (sentences.length === 1) {
    return `<span class="sentence hook">${highlightText(_esc(sentences[0]))}</span>`;
  }

  let html = '';

  // HOOK — first sentence
  html += `<span class="sentence hook">${highlightText(_esc(sentences[0]))}</span>`;

  // BODY — middle sentences
  const body = sentences.slice(1, -1);
  if (body.length > 0) {
    // Find the longest sentence to promote to callout
    const longestIdx = body.reduce(
      (maxI, s, i, arr) => (s.length > arr[maxI].length ? i : maxI), 0
    );
    body.forEach((s, i) => {
      if (i === longestIdx && s.length > 80) {
        html += `<span class="callout">${highlightText(_esc(s))}</span>`;
      } else {
        html += `<span class="sentence">${highlightText(_esc(s))}</span>`;
      }
    });
  }

  // CLOSER — last sentence
  html += `<span class="sentence closer">${highlightText(_esc(sentences[sentences.length - 1]))}</span>`;

  return html;
}

/* ─── TOAST ───────────────────────────────────────────────── */
function showToast(msg) {
  let toast = document.getElementById('error-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'error-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 4500);
}
