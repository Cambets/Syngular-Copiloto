import type { Product } from '../contexts/AppContext';
import { logger } from './logger';

export async function extractProductFromRawContent(
  rawText: string,
  base64Image?: { data: string; mimeType: string },
  apiKey?: string,
  existingProducts: Product[] = []
): Promise<Product | null> {
  const existingListSummary = existingProducts
    .map(p => `- ID: "${p.id}", Nome: "${p.name}", Categoria: "${p.category}"`)
    .join('\n');

  const systemInstruction = `
Você é o Arquiteto de Conhecimento Estratégico da Syngular ID & Syn+.
Analise o material fornecido (texto, manual, comunicados de ARs, prints, slides ou regras internas) e extraia um registro estruturado em JSON rigoroso.

BASE ATUAL DE CONHECIMENTO:
${existingListSummary || 'Nenhum item indexado ainda.'}

DIRETRIZES DE CLASSIFICAÇÃO:
1. "category": Escolha EXATAMENTE UMA destas 4 opções:
   - "Parcerias": Credenciamento de novas ARs, abertura de PAs, modelo de fábrica de AC própria, tabela de remuneração/comissão, atração de contabilidades e benefícios de parceria.
   - "Pos-Venda": Manuais de emissão, fluxos de validação por videoconferência, resolução de pendências, cancelamentos, revogação e suporte nível 1.
   - "Reativacao": Roteiros para reativar parceiros e clientes inativos, retenção contra concorrência e quebra de objeções de migração.
   - "Syngular": Produtos e softwares diretos (SynPass, Syn na Nuvem, Certifica Ponto, Certifica ERP, Token A3, SST, etc.).

2. "id": Se o conteúdo atualizar um registro JÁ EXISTENTE na lista acima, REUTILIZE o mesmo ID. Se for novo, crie um slug limpo (ex: "credenciamento-nova-ar", "validacao-videoconferencia-pendencia").
3. "name": Título oficial objetivo e claro do procedimento ou produto.
4. "pitch": Frase de impacto resumindo a utilidade do documento ou argumento comercial principal (máx 20 palavras).
5. "description": Instruções técnicas, regras de negócio, limites e procedimentos operacionais completos.
6. "keywords": Array de 4 a 8 tags de busca essenciais (ex: ["ar", "videoconferencia", "pendencia", "icp-brasil"]).
7. "objections": Array de 1 a 3 objetos com dúvidas frequentes ou objeções mapeadas no formato { "question": "Dúvida/Problema", "answer": "Solução/Direcionamento" }.

Retorne APENAS o JSON puro:
{
  "id": "slug-identificado-ou-novo",
  "name": "Nome da Regra, Manual ou Produto",
  "category": "Parcerias",
  "pitch": "Resumo ou argumento central",
  "description": "Detalhamento completo do procedimento",
  "keywords": ["tag1", "tag2", "tag3"],
  "objections": [
    {
      "question": "Dúvida ou objeção operacional",
      "answer": "Direcionamento ou contra-argumento"
    }
  ]
}
`;

  // Motor 1: Gemini 3.6 / 2.5 Flash Multimodal
  if (apiKey && apiKey.trim().length > 0) {
    try {
      interface ContentPart {
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }

      const parts: ContentPart[] = [];
      if (rawText && rawText.trim().length > 0) {
        parts.push({ text: `${systemInstruction}\n\nCONTEÚDO RECEBIDO:\n"""\n${rawText}\n"""` });
      } else {
        parts.push({ text: `${systemInstruction}\n\nAnalise o anexo e estruture o conhecimento.` });
      }

      if (base64Image) {
        parts.push({
          inlineData: {
            mimeType: base64Image.mimeType,
            data: base64Image.data
          }
        });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (res.ok) {
        const data = await res.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) return JSON.parse(jsonText.trim()) as Product;
      }
    } catch (e) {
      logger.warn('Fallback do extrator Gemini...', e);
    }
  }



  // Motor 3: Pollinations
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: `${systemInstruction}\n\nCONTEÚDO:\n${rawText}` }],
        model: 'openai',
        jsonMode: true
      })
    });
    if (res.ok) {
      const text = (await res.text()).replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text) as Product;
    }
  } catch (e) {
    logger.error('Falha em todos os motores de extração', e);
  }

  return null;
}