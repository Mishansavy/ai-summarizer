// Serverless function: POST { prompt, model?, temperature? } -> { text }
// Deploy on Vercel. Keep GEMINI_API_KEY in project settings (never in the extension).
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

    try {
        const { prompt, model = "gemini-1.5-flash", temperature = 0.25 } = req.body || {};
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature,
                topK: 32,
                topP: 0.95,
                maxOutputTokens: 1024
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const errText = await resp.text();
            return res.status(resp.status).json({ error: errText });
        }

        const data = await resp.json();
        const text =
            data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim() || '';

        return res.status(200).json({ text });
    } catch (e) {
        return res.status(500).json({ error: e.message || 'Server error' });
    }
}
