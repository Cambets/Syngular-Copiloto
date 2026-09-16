// Vercel Serverless Function: High-performance AI Copilot Chat Engine
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { query, history, systemInstruction, imageBase64, apiKey } = body || {};

    const activeKey = apiKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

    if (activeKey) {
      const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      
      for (const model of models) {
        try {
          const userParts = [{ text: query || 'Olá!' }];
          if (imageBase64) {
            const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (mimeMatch) {
              userParts.push({
                inlineData: {
                  mimeType: mimeMatch[1],
                  data: mimeMatch[2]
                }
              });
            }
          }

          const geminiContents = [];
          if (Array.isArray(history)) {
            for (const h of history.slice(-20)) {
              geminiContents.push({
                role: h.role === 'model' ? 'model' : 'user',
                parts: [{ text: h.parts || h.content || '' }]
              });
            }
          }
          geminiContents.push({ role: 'user', parts: userParts });

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: geminiContents,
                systemInstruction: { parts: [{ text: systemInstruction || '' }] },
                generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
                safetySettings: [
                  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
                ]
              })
            }
          );

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const parts = data.candidates?.[0]?.content?.parts;
            const text = Array.isArray(parts) 
              ? parts.map(p => p.text || '').join('')
              : data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text && text.trim().length > 0) {
              return res.status(200).json({ success: true, text, model });
            }
          }
        } catch (e) {
          console.warn(`Model ${model} failed in serverless chat:`, e.message);
        }
      }
    }

    return res.status(200).json({ success: false, message: 'Nenhum motor cloud retornou' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
