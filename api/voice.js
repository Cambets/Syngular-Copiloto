// Vercel Serverless Function: Voice Replication and Audio Synthesis Backend
export default async function handler(req, res) {
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
    const { action, sourceAudioBase64, consentAudioBase64, displayName, text, voiceId } = body || {};

    const BUILTIN_KEY = Buffer.from('QVEuQWI4Uk42S0dvLUVDaFF2aUhYY3QxcnM3UnpPUmlYZkI5dnk0U0dZNWlaNmtVNHZfaHc=', 'base64').toString('utf-8');
    const activeKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || BUILTIN_KEY;

    if (!activeKey) {
      return res.status(500).json({ success: false, message: 'Chave de API do Gemini não configurada no servidor' });
    }

    // 1. AÇÃO: Replicar / Clonar a voz do usuário
    if (action === 'replicate') {
      if (!sourceAudioBase64 || !consentAudioBase64) {
        return res.status(400).json({ success: false, message: 'Áudio de amostra e consentimento são obrigatórios.' });
      }

      const cleanSource = sourceAudioBase64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+;base64,/, '');
      const cleanConsent = consentAudioBase64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+;base64,/, '');

      const payload = {
        store: true,
        voice: {
          model: 'gemini-3.8-flash-tts',
          type: 'replicated',
          display_name: displayName || 'Voz Oficial Syngular',
          language_code: 'pt-BR',
          replicated: {
            source_audio: {
              mime_type: 'audio/wav',
              data: cleanSource
            },
            consent_audio: {
              mime_type: 'audio/wav',
              data: cleanConsent
            }
          }
        }
      };

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/voices?key=${activeKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const resData = await geminiRes.json();

      if (geminiRes.ok && (resData.id || resData.voice?.id)) {
        const createdVoiceId = resData.id || resData.voice?.id;
        return res.status(200).json({
          success: true,
          voiceId: createdVoiceId,
          message: 'Voz replicada com sucesso na API do Google Gemini!'
        });
      } else {
        const errorDetail = resData.error?.message || 'Erro nos critérios de segurança de áudio.';
        console.warn('Erro ao replicar voz no Gemini:', JSON.stringify(resData));
        return res.status(400).json({
          success: false,
          error: errorDetail,
          message: `Falha ao validar gravação com a IA: ${errorDetail}`
        });
      }
    }

    // 2. AÇÃO: Sintetizar fala usando a voz replicada ou voz neural HD
    if (action === 'synthesize') {
      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: 'Texto para síntese é obrigatório.' });
      }

      const speechConfig = voiceId 
        ? { voiceConfig: { voice: voiceId } }
        : { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } };

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${activeKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: text.trim() }]
            }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig
            }
          })
        }
      );

      const resData = await geminiRes.json();
      const audioData = resData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (geminiRes.ok && audioData) {
        return res.status(200).json({
          success: true,
          audioBase64: audioData,
          mimeType: 'audio/wav'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: resData.error?.message || 'Falha ao sintetizar áudio.'
        });
      }
    }

    return res.status(400).json({ success: false, message: 'Ação não suportada.' });
  } catch (error) {
    console.error('Erro na rota de voz:', error);
    return res.status(500).json({ success: false, message: 'Erro interno ao processar voz.' });
  }
}
