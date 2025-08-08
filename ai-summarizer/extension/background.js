// Creates right-click menu and injects content script on demand
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "summarizePage",
        title: "Summarize this page",
        contexts: ["page", "selection"]
    });
});

async function injectAndGetText(tabId) {
    // Load Readability first
    await chrome.scripting.executeScript({
        target: { tabId },
        files: ["vendor/readability.min.js"]
    });
    // Then run content collector
    await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
    });

    return new Promise((resolve) => {
        const listener = (msg, sender) => {
            if (msg?.type === 'PAGE_TEXT' && sender?.tab?.id === tabId) {
                chrome.runtime.onMessage.removeListener(listener);
                resolve(msg);
            }
        };
        chrome.runtime.onMessage.addListener(listener);
    });
}

async function startSummarize(tab) {
    if (!tab?.id) return;
    chrome.runtime.sendMessage({ type: 'SUMMARIZE_STARTED', tabId: tab.id });
    try {
        const page = await injectAndGetText(tab.id);
        chrome.runtime.sendMessage({ type: 'PAGE_TEXT_READY', payload: page, tabId: tab.id });
    } catch (e) {
        chrome.runtime.sendMessage({ type: 'SUMMARIZE_ERROR', error: e?.message || 'Unknown error' });
    }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "summarizePage") startSummarize(tab);
});

chrome.action.onClicked.addListener(async (tab) => {
    startSummarize(tab);
});
