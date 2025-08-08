import { summarizePage, setAbortController } from './summarizer.js';

const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const apiBaseEl = document.getElementById('apiBase');
const saveBtn = document.getElementById('save');
const summarizeBtn = document.getElementById('summarizeBtn');
const cancelBtn = document.getElementById('cancelBtn');

function status(msg) { statusEl.textContent = msg; }
function show(html) { outputEl.innerHTML = html; }

async function loadSettings() {
    const { apiBase } = await chrome.storage.sync.get(['apiBase']);
    if (apiBase) apiBaseEl.value = apiBase;
}
saveBtn.onclick = async () => {
    await chrome.storage.sync.set({ apiBase: apiBaseEl.value.trim() });
    status('Saved.');
};

summarizeBtn.onclick = async () => {
    // Trigger collection and summarization flow via background
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.runtime.sendMessage({ type: 'SUMMARIZE_STARTED', tabId: tab.id });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["vendor/readability.min.js"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
};

cancelBtn.onclick = () => {
    const ctl = setAbortController(null);
    if (ctl) ctl.abort();
    status('Canceled.');
};

chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg.type === 'SUMMARIZE_STARTED') status('Summarizing...');
    if (msg.type === 'SUMMARIZE_ERROR') status('Error: ' + msg.error);
    if (msg.type === 'PAGE_TEXT_READY') {
        try {
            status('Summarizing...');
            const html = await summarizePage({ text: msg.payload.text, url: msg.payload.url, title: msg.payload.title });
            chrome.runtime.sendMessage({ type: 'SUMMARIZE_DONE' });
            show(html);
            status('Done.');
        } catch (e) {
            status('Error: ' + (e?.message || 'Unknown'));
        }
    }
});

// Auto-load settings
loadSettings();
