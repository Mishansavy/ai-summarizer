let abortController = null;
export function setAbortController(newCtl) {
    if (newCtl === null) {
        const old = abortController;
        abortController = null;
        return old;
    }
    abortController = newCtl;
    return abortController;
}

async function getSettings() {
    return chrome.storage.sync.get(['apiBase']);
}

function chunkText(text, maxChars = 16000, overlap = 400) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        const end = Math.min(i + maxChars, text.length);
        chunks.push(text.slice(i, end));
        i = end - overlap;
        if (i < 0) i = 0;
    }
    return chunks;
}

function buildPrompt(text) {
    return `
You are a precise technical summarizer.
Summarize the content below into **this exact format**:

Main point: <one punchy sentence>

Bullets:
- <bullet 1: concise, factual>
- <bullet 2>
- <bullet 3>
- <bullet 4>
- <bullet 5>

Rules:
- 5–10 bullets.
- Prefer facts, numbers, names, and caveats over fluff.
- No preamble, no apologies, no extra headings.

CONTENT START
${text}
CONTENT END
`.trim();
}

async function callModel({ apiBase, prompt }) {
    if (!apiBase) throw new Error("Set proxy base URL in the popup.");
    const ctl = new AbortController();
    setAbortController(ctl);

    const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            model: "gemini-1.5-flash",
            temperature: 0.25
        }),
        signal: ctl.signal
    });

    setAbortController(null);

    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Proxy HTTP ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    if (!data?.text) throw new Error('Empty response from model');
    return data.text;
}

async function summarizeLong(text) {
    const { apiBase } = await getSettings();
    const chunks = chunkText(text);
    const partials = [];
    for (const c of chunks) {
        const prompt = buildPrompt(c);
        const out = await callModel({ apiBase, prompt });
        partials.push(out);
    }
    const mergePrompt = `
Merge the partial summaries into one final output using the exact format:

Main point: <one sentence>

Bullets:
- <bullet 1>
- <bullet 2>
- <bullet 3>
- <bullet 4>
- <bullet 5>

PARTIALS:
${partials.join('\n\n---\n\n')}
`.trim();

    const { apiBase: base2 } = await getSettings();
    return callModel({ apiBase: base2, prompt: mergePrompt });
}

function parseToHtml(raw) {
    const mainMatch = raw.match(/Main point:\s*(.+)/i);
    const main = mainMatch ? mainMatch[1].trim() : "No main point found.";

    const bullets = Array.from(raw.matchAll(/^\s*-\s+(.+)$/gm)).map(m => m[1]);
    const dedup = [...new Set(bullets.map(s => s.trim()))];

    const bulletHTML = dedup.length
        ? dedup.map(b => `<li>${escapeHtml(b)}</li>`).join('')
        : `<li>(No bullets found)</li>`;

    return `
    <div>
      <h3>Main point</h3>
      <p>${escapeHtml(main)}</p>
      <h3>Bullets</h3>
      <ul>${bulletHTML}</ul>
    </div>
  `;
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function summarizePage({ text, url, title }) {
    const short = text.length < 15000;
    const result = short
        ? await callModel({ apiBase: (await getSettings()).apiBase, prompt: buildPrompt(text) })
        : await summarizeLong(text);

    // Optional: cache by URL + rough content length
    try {
        const key = `summary:${url}:${text.length}`;
        await chrome.storage.local.set({ [key]: result });
    } catch { }

    return parseToHtml(result);
}
