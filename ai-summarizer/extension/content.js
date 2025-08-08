// Extracts readable text from page and posts it back to the extension
(() => {
    function fallbackGrab() {
        return Array.from(document.querySelectorAll('article, main, p, h1, h2, h3, li'))
            .map(n => n.innerText?.trim())
            .filter(Boolean)
            .join('\n');
    }

    try {
        const clone = document.cloneNode(true);
        clone.querySelectorAll('script,style,noscript,svg,iframe').forEach(n => n.remove());
        let text = "";
        if (window.Readability) {
            const article = new window.Readability(clone).parse();
            if (article?.textContent) text = article.textContent;
        }
        if (!text || text.trim().length < 400) text = fallbackGrab();

        chrome.runtime.sendMessage({
            type: 'PAGE_TEXT',
            text,
            title: document.title,
            url: location.href
        });
    } catch (e) {
        chrome.runtime.sendMessage({
            type: 'PAGE_TEXT',
            text: fallbackGrab(),
            title: document.title,
            url: location.href
        });
    }
})();
