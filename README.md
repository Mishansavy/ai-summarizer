# AI Page Summarizer (Gemini)

## What this is

- A Chrome MV3 extension that summarizes any page into bullet points + a single main takeaway.
- A tiny Vercel proxy that calls Gemini 1.5 so your API key never ships in the extension.

## Quick start

### 1) Deploy the proxy (Vercel)

1. `cd proxy-vercel`
2. `vercel` (or deploy from dashboard)
3. In Vercel Project Settings → Environment Variables:
   - `GEMINI_API_KEY` = your Google AI Studio API key
4. Redeploy if needed. Your endpoint will be: `https://<project>.vercel.app/api/summarize`.

### 2) Load the Chrome extension

1. Put your icons in `extension/icons/` (any PNGs at 16/32/128px).
2. **Download Readability**: save the minified build as `extension/vendor/readability.min.js`.
3. Open `chrome://extensions` → toggle **Developer mode** → **Load unpacked** → select `extension/`.

### 3) Configure

- Click the extension icon → in the popup, set **Proxy base** to your Vercel base:
  - e.g. `https://<project>.vercel.app`
- Click **Save**.

### 4) Use

- Click the toolbar button or right-click → **Summarize this page**.
- You’ll see “Main point” and 5–10 bullets.

## Notes

- Default model: `gemini-1.5-flash`. Change in `extension/summarizer.js`.
- Chunking kicks in for very long pages.
- “Cancel” stops an in-flight request.
- Summaries are cached lightly in `chrome.storage.local` keyed by URL and content length.

## Troubleshooting

- **Proxy HTTP 401/403**: check `GEMINI_API_KEY` is set in Vercel and the project is redeployed.
- **CORS**: Vercel functions send permissive defaults; if you add custom headers, ensure `Content-Type` is allowed.
- **Empty response**: some pages have little readable text; try another page or ensure Readability is present.

## Security

- API key stays server-side in Vercel.
- The extension sends **extracted page text** to your proxy for summarization—document this in your Chrome Web Store privacy policy.
