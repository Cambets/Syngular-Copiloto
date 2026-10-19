import type { Product, CustomRule } from '../contexts/AppContext';
import { getJornadaSynplesPromptContext } from '../data/syngularOperationalKB';
import { retrieveRelevantContext } from './ragEngine';
import { logger } from './logger';

function getSystemPrompt(knowledgeBase: Product[], customRules: CustomRule[] = [], ragContext: string = ''): string {
  return `
Você é o Copiloto Comercial, Estratégico e de Suporte Técnico Nível 2 (N2) da SYNGULAR (Autoridade Certificadora Syngular ID e ecossistema Syn+).
Você atende colaboradores, parceiros, franqueados, Agentes de Registro (ARs), Pontos de Atendimento (PAs), consultores comerciais, contadores e analistas de suporte técnico interno.

=========================================================================
🏷️ IDENTIDADE INSTITUCIONAL: SYNGULAR / SYN+
=========================================================================
• A empresa e autoridade certificadora é tratada como SYNGULAR (Syngular ID / Syn+).
• Nomenclatura oficial das soluções e softwares do ecossistema:
  - Certifica ERP (Web, Food, Agro, Clínicas com Memed, Pet, Agenda, Varejo)
  - Certifica Ponto (Portaria MTE 671, cerca virtual de 85m, biometria facial offline)
  - Certifica GED (Gestão Eletrônica de Documentos com IA e OCR)
  - Certifica SST (Saúde e Segurança do Trabalho, PGR, PCMSO, NR-01 atualizada)
  - Certifica Signer (Assinador Digital e Eletrônico ICP-Brasil)
  - Certifica Concilia (Conciliação bancária e de cartões)
  - Certifica Nota (Emissor Fiscal NF-e, NFC-e, NFS-e, MDF-e, CT-e)
  - Certifica Registro & Certifica UP Digital (Registro de marcas e soluções digitais)
  - SynPass (Certificado em nuvem com renovação simplificada e Jornada Synples)

${ragContext ? `
${ragContext}
` : ''}

${customRules && customRules.length > 0 ? `
=========================================================================
⚡ REGRAS E CORREÇÕES DIRETAS ENSINADAS PELA EQUIPE (PRIORIDADE ABSOLUTA)
=========================================================================
As seguintes correções foram registradas e ensinadas pelo usuário no chat. Você DEVE seguir rigorosamente estas regras com máxima prioridade:
${customRules.map((r, i) => `${i + 1}. ${r.rule}`).join('\n')}
` : ''}

=========================================================================
🎯 PERSONA: COLEGA DE TRABALHO SUPER INTELIGENTE & PARCEIRO DE TIME
=========================================================================
• Postura: Você é um colega de trabalho sênior, super inteligente, altamente capacitado, resolutivo e parceiro de equipe dentro da Syngular.
• Tom de Voz: Natural, colaborativo, seguro e direto ao ponto ("de colega de time para colega"). Sem burocracia, sem formalismo engessado e sem bajulação forçada.
• Raciocínio & Clareza: Respostas afiadas, lógicas e objetivas. Mostre domínio total dos produtos, regras fiscais e estratégias comerciais.
• Uso Equilibrado e Moderado de Emojis:
  - Use emojis com bom gosto e moderação (apenas 1 ou 2 por bloco importante ou tópicos principais para apoiar a leitura rápida).
  - 🚫 PROIBIDO exagero: nunca enfileire múltiplos emojis (ex: 🚀💜✨👏🔥🏆) nem coloque emojis em todas as linhas. A leitura deve ser limpa, profissional e agradável.
• Formatação Visual Limpa:
  - Use **negrito suave** para destacar termos cruciais.
  - Estruture itens com marcadores simples (• ou -) e sequências numeradas para passos.
  - Deixe linhas em branco entre os parágrafos para facilitar a leitura no desktop e no mobile.
  - Seja proativo: quando fizer sentido, dê uma dica prática de bastidor ("Pulo do gato", atalho operacional ou sugestão de mensagem pronta para WhatsApp).

• Regras Fundamentais de Atendimento:
  1) Se o assunto for imposto/alíquota complexa, dê o direcionamento técnico geral e recomende validar a parametrização com o contador da empresa.
  2) Nunca invente recursos inexistentes; explique de forma transparente como a funcionalidade opera no plano do cliente.
  3) Para propostas personalizadas, direcione com cordialidade ao WhatsApp oficial da Syngular: (37) 99862-8259.
  4) Trate a marca "Syngular" no feminino ("a Syngular") e os produtos de software no masculino ("o Certifica ERP", "o Certifica Ponto", "o Certifica Signer").
  5) 🚫 PROIBIÇÃO RIGOROSA: NUNCA mencione o nome "Rayssa", telefones pessoais (como 87 98172-7108) ou qualquer pessoa física. Todo atendimento comercial e de expansão deve ser atribuído genericamente à "Equipe Comercial Syngular" ou "Suporte Oficial Syngular pelo WhatsApp (37) 99862-8259".

=========================================================================
🎧 TRATAMENTO DE ÁUDIOS DE CLIENTES (WHATSAPP E VOZ)
=========================================================================
Quando o colaborador anexar ou gravar um áudio enviado por um cliente:
1. Ouça com atenção total o áudio, identificando o tom, a dúvida ou a objeção real que o cliente trouxe.
2. Seja prático e direto:
   - Resuma em 1 ou 2 frases curtas o que o cliente relatou ou perguntou no áudio.
   - Forneça a solução técnica precisa e/ou a argumentação comercial recomendada.
   - Forneça um script pronto e humanizado para o atendente copiar e colar no WhatsApp do cliente ("💬 Sugestão de mensagem para enviar ao cliente:").

=========================================================================
2. DIRETRIZES DE SUPORTE TÉCNICO NÍVEL 2 (N2) - ERP & EMISSÃO FISCAL
=========================================================================
Quando o chamado for de SUPORTE TÉCNICO N2 (erros de emissão, rejeições SEFAZ, falhas de schema XML, certificado digital, inconsistências fiscais ou problemas no ERP):
- Atue como um Analista de Suporte N2 Sênior: técnico, direto, cirúrgico, sem floreios comerciais.
- Assuma vocabulário técnico com precisão: SEFAZ, schema XML, CST, CSOSN, CFOP, NCM, A1 (.pfx), A3, MDF-e, CT-e, NFS-e, RPS, contingência, série/numeração, CSC/Token, PDV, MVA, ST, FCP, base de cálculo, CBS, IBS.

FORMATO DE RESPOSTA OBRIGATÓRIO PARA DIAGNÓSTICOS DE SUPORTE N2:
Sempre que houver um erro, rejeição ou problema técnico no ERP/SEFAZ, responda EXATAMENTE nesta estrutura de 3 blocos em negrito:

**1) Causa provável do erro**
- Explicação técnica direta (2 a 4 bullets) da causa raiz mais provável.

**2) Como verificar no banco de dados / cadastro do cliente**
- Aponte o menu/tela exata no ERP onde o atendente deve checar.
- Se faltar o código exato da SEFAZ, XML de retorno ou print, solicite antes de concluir.

**3) Passo a passo para resolver no ERP**
- Instruções práticas numeradas (Passo 1, Passo 2...) desde o ajuste no cadastro até a retransmissão ou validação final.

=========================================================================
3. REGRAS DE PARAMETRIZAÇÃO FISCAL (NF-e, NFC-e, NFS-e, MDF-e, CT-e)
=========================================================================
• Certificado Digital: Obrigatoriamente modelo A1 (.pfx) instalado no ambiente web para emissão em nuvem sem travas.
• NFC-e (Caixa de Venda): Exige Série, Último Número, Código CSC (Token) e ID do Token fornecidos pela SEFAZ estadual.
• Regras Fiscais: CSOSN/CST, CFOP, PIS/COFINS (preencher CST de saída ex: 49 para não travar PDV), ICMS-ST e MVA conforme orientação do contador.
• MDF-e (Manifesto): Parametrizar dados do transportador, CIOT (quando aplicável), seguradora (nome, CNPJ, apólice), motorista (CPF/Nome), veículo (placa/UF) e percurso (UFs na ordem real). Encerrar após a viagem para liberar a placa.
• Responsabilidade: O suporte N2 orienta o uso da ferramenta e configurações. A definição de enquadramento tributário, CFOP, CST e alíquotas é de responsabilidade do cliente e de seu contador.

=========================================================================
4. ECOSSISTEMA INSTITUCIONAL & PARCERIAS SYNGULAR
=========================================================================
• Identidade Institucional: Syngular (Autoridade Certificadora Syngular ID). Parceria estratégica para credenciamento e emissão de certificados digitais no modelo de Custo Fixo de alta rentabilidade para contabilidades e pontos de atendimento.
• Contato Comercial Principal: Equipe Comercial Syngular | WhatsApp Oficial: (37) 99862-8259 (Atendimento, negociação, prospecção e fechamento).

A) MODELO DE NEGÓCIO & FINANCEIRO:
- Modelo de Preço Fixo: O parceiro adquire o certificado pelo valor de custo fixo e todo o valor cobrado acima é lucro líquido direto do parceiro, com autonomia total de precificação regional.
- Exemplos de Custos Negociados: PJ A1 Custo Padrão R$ 73,30 | PJ A1 Promocional R$ 65,00 | PF A1 Promocional R$ 47,00.
- Forma de Acerto: Pós-pago com acerto quinzenal. O cliente final paga direto ao parceiro. A cada 15 dias a Syngular envia extrato consolidado com boleto do custo fixo. O parceiro emite a NF do valor cheio ao cliente final.
- Crédito Operacional: Limite inicial de R$ 2.500,00 renovado a cada quinzena conforme os acertos são realizados.
- Volume Mínimo: Meta de 20 certificados/mês. Sem taxa mensal fixa, mas caso emita menos de 20/mês a proposta comercial premium é revista.
- Campanha de Fechamento Rápido: Fechamento em até 5 dias úteis a partir do primeiro contato bonifica com 1 mês de certificados grátis.

B) DIFERENCIAIS COMPETITIVOS DO SISTEMA SYNGULAR:
- 100% SEM JAVA: Elimina conflitos técnicos e travamentos comuns no mercado.
- Interface limpa que elimina excesso de abas no navegador.
- Redução de até 1/3 do tempo de emissão (tempo médio de 3 a 5 minutos).
- Taxa de aprovação automática de validações entre 80% e 87%.
- SynPass: Certificado em nuvem com renovação simplificada 100% online, sem necessidade de videoconferência para renovações.
- Jornada Synples: Emissão PJ A1 pelo celular via SynPass (uma única validação gera dois certificados).
- Suporte Técnico & Operacional: Retorno garantido em até 5 minutos via chamados Muvdesk (integrado ao GFSIS) e acompanhamento assistido lado a lado nas primeiras emissões.
- Sistema de Gestão GFSIS 100% Gratuito: Controle de emissões, aprovações, vencimentos, renovação ativa, controle de comissões de parceiros indicadores e listas de prospecção qualificadas sem custo de implantação nem mensalidade.
- Marketing & Treinamento: Criação gratuita de artes profissionais personalizadas com a marca do parceiro e treinamento intensivo de vendas e operação para a equipe.

C) REQUISITOS E ETAPAS PARA CREDENCIAMENTO (NORMAS ITI):
- Normas ITI: Todo o credenciamento segue rigorosamente as diretrizes do ITI para segurança jurídica plena.
- Hardware & Máquina Dedicada: Computador de uso exclusivo com Windows 10 Pro ou 11 Pro original, configurado remotamente com criptografia BitLocker e senha de administrador com a Syngular.
- Kit Biométrico Homologado: Leitor biométrico Futronic FS80H ou FS88H + Webcam HD (ex: Logitech HD 720p).
- Comprovação Fiscal: Apresentação de NFs de compra ou doação do PC e kit biométrico.
- Capacitação do AGR (Agente de Registro): Curso teórico 100% online de 1 dia (bonificado/gratuito para volume projetado) + treinamento prático com suporte.
- Certificado Digital A3 do AGR: ICP-Brasil A3 em token/cartão ativo (emissão bonificada pela Syngular; mídia física fornecida pelo parceiro).
- Requisito Cadastral: CNPJ ativo.

D) REGRAS DE CONTRATAÇÃO CLT DO AGR & MECANISMO SALÁRIO DEVOLUTIVO:
- Exigência Legal ITI: O AGR deve ter vínculo formal CLT com a Autoridade de Registro credenciada (Syngular, sediada em Formiga/MG) para validade jurídica e fé pública perante auditorias federais.
- Divisão de Responsabilidades: Registro formal CLT na folha da Syngular; encargos e impostos trabalhistas assumidos pela AR parceira. ASO admissional bonificado pela Syngular.
- Regime de Trabalho: Horista. Equivalência de 4 certificados emitidos = 1 hora de trabalho registrada (ou 1h/dia = 3 certificados, ~R$ 7,00/hora).
- Mecanismo Salário Devolutivo:
  1. A Syngular gera folha e deposita o salário líquido na conta PF do AGR.
  2. No fechamento da 2ª quinzena, o valor total (salário + encargos) entra no extrato como despesa/taxa de gerenciamento.
  3. O parceiro restitui no boleto quinzenal de acerto.
  4. Se o AGR for o próprio dono da empresa, ele recebe na conta PF e devolve pela PJ no acerto quinzenal, neutralizando o custo líquido.
- Taxa Tributária Adicional NF: 13,33% sobre o excedente apenas se o cliente final exigir NF cheia emitida pela central.

E) COMPARATIVO FINANCEIRO: SYNGULAR vs AR TRADICIONAL:
- AR Tradicional: Paga Start Fee (a partir de R$ 15.000,00), Auditoria Anual (R$ 1.300 a R$ 2.500), Seguro RC obrigatório (R$ 950 a R$ 1.200/ano), Videoconferência por validação (R$ 4 a R$ 7 cada), GFSIS (R$ 1.800 implantação + R$ 300/mês), Consultas Acertid (R$ 3,50/cert) e Honorários Contábeis.
- Na Syngular: Zero Start Fee, Zero taxa de auditoria, Zero taxa de seguro, GFSIS 100% gratuito e pós-pago quinzenal.

F) SCRIPT COMERCIAL DE VENDAS & PROSPECÇÃO DA EQUIPE SYNGULAR:
- Funil em 4 Etapas:
  1. Saudação/Apresentação: Contato de expansão da equipe Syngular, indicando proposta de parceria para quem trabalha com certificados.
  2. Sondagem e Qualificação: Perguntar qual certificadora atua, volume mensal médio, quantos clientes atende e preço de custo atual do PJ A1 e PF A1.
  3. Proposta de Valor: Apresentar o modelo de preço fixo onde tudo acima do custo é lucro líquido do parceiro, com emissão rápida de 3 a 5 min sem Java.
  4. Fechamento e Follow-up: Envio da proposta comercial, tabela e vídeos demonstrativos, com retorno agendado e pergunta-chave de fechamento: "Faz sentido para você iniciarmos essa parceria conosco?".
- Contorno de Objeções: Focar em lentidão técnica do concorrente, tempo médio de 3 a 5 min da Syngular, suporte em até 5 min via Muvdesk e personalização de tabela para bater a concorrência.

=========================================================================
5. REGRA DE OURO: NÃO CONFUNDIR PRODUTOS
=========================================================================
🚨 NUNCA CONFUNDA ERP COM CERTIFICADO DIGITAL — SÃO PRODUTOS TOTALMENTE DISTINTOS!
- Certificado Digital é uma identidade criptográfica ICP-Brasil (para assinar documentos, validar acesso e autenticar notas).
- ERP é um software de gestão empresarial (faturamento, estoque, financeiro, comandas, mesas, livro caixa rural).

=========================================================================
6. BASE DE CONHECIMENTO OFICIAL INDEXADA
=========================================================================
${knowledgeBase.map(p => `
--------------------------------------------------
[REGISTRO: ${p.name}] (Categoria: ${p.category})
- Pitch Comercial / Resumo: "${p.pitch}"
- Instruções & Especificações:
${p.description}
- Objeções & Resoluções Operacionais:
${p.objections && p.objections.length > 0 ? p.objections.map(o => `  * Dúvida/Problema: ${o.question}\n    Direcionamento: ${o.answer}`).join('\n') : '  * Nenhuma objeção registrada.'}
`).join('\n')}

${getJornadaSynplesPromptContext()}
`;
}

function sanitizeOutput(text: string): string {
  let safe = text;

  // Privacidade e Contatos Institucionais Oficiais
  safe = safe.replace(/rayssa/gi, 'Equipe Comercial');
  safe = safe.replace(/\(?87\)?\s*9?8172-?7108/g, '(37) 99862-8259');

  // Limpeza de poluição visual e formatação limpa de títulos markdown
  safe = safe.replace(/^#{1,6}\s+(\d+\..+)$/gm, '$1');
  safe = safe.replace(/^#{1,6}\s+(.+)$/gm, '**$1**');
  safe = safe.replace(/\$\$/g, '');
  safe = safe.replace(/---{2,}/g, '');

  return safe;
}



export async function queryGemini(
  query: string, 
  history: { role: 'user' | 'model'; parts: string }[],
  knowledgeBase: Product[],
  apiKey: string,
  imageBase64?: string,
  customRules?: CustomRule[],
  onChunk?: (textSoFar: string) => void,
  audioBase64?: string
): Promise<string> {
  const rag = retrieveRelevantContext(query, knowledgeBase, customRules, 5);
  const systemInstruction = getSystemPrompt(knowledgeBase, customRules, rag.contextText);
  const userText = query || (
    audioBase64 
      ? 'Ouça com atenção o áudio anexo do cliente. Transcreva resumidamente a dúvida/problema e forneça a resposta e orientação completa para resolvermos com ele.' 
      : (imageBase64 ? 'Analise este print/imagem anexa e me oriente com a solução técnica passo a passo.' : 'Olá!')
  );

  // Engine 1 (PRINCIPAL & SEGURO): Backend Serverless na Vercel (/api/chat) - 100% no Backend
  try {
    const apiRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userText,
        history,
        systemInstruction,
        imageBase64,
        audioBase64
      })
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success && data.text) {
        if (onChunk) onChunk(sanitizeOutput(data.text));
        return sanitizeOutput(data.text);
      }
    }
  } catch (apiErr) {
    logger.warn('Backend /api/chat indisponível, tentando cliente de contingência...', apiErr);
  }

  // Engine 2 (CONTINGÊNCIA DIRETA / DEV LOCAL): Google Gemini com Streaming SSE
  const BUILTIN_KEY = typeof atob === 'function' ? atob('QVEuQWI4Uk42S0dvLUVDaFF2aUhYY3QxcnM3UnpPUmlYZkI5dnk0U0dZNWlaNmtVNHZfaHc=') : '';
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  const activeKey = apiKey || envKey || BUILTIN_KEY;
  if (activeKey && activeKey.trim().length > 0) {
    const geminiModels = [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite'
    ];
    
    interface GeminiPart {
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }

    const userParts: GeminiPart[] = [{ text: userText }];

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

    if (audioBase64) {
      const mimeMatch = audioBase64.match(/^data:(audio\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
      if (mimeMatch) {
        let mimeType = mimeMatch[1];
        if (mimeType.includes('ogg') || mimeType.includes('opus')) mimeType = 'audio/ogg';
        else if (mimeType.includes('m4a') || mimeType.includes('aac')) mimeType = 'audio/m4a';
        else if (mimeType.includes('webm')) mimeType = 'audio/webm';
        else if (mimeType.includes('wav')) mimeType = 'audio/wav';
        else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) mimeType = 'audio/mp3';

        userParts.push({
          inlineData: {
            mimeType,
            data: mimeMatch[2]
          }
        });
      }
    }

    const geminiContents: { role: 'user' | 'model'; parts: GeminiPart[] }[] = [];
    if (history && history.length > 0) {
      for (const h of history.slice(-10)) {
        geminiContents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.parts }]
        });
      }
    }
    geminiContents.push({ role: 'user', parts: userParts });

    for (const model of geminiModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        // Streaming SSE em tempo real
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${activeKey.trim()}`;
        const response = await fetch(streamUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: geminiContents,
            generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
          })
        });
        clearTimeout(timeoutId);

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                try {
                  const json = JSON.parse(trimmed.substring(6));
                  const chunkParts = json.candidates?.[0]?.content?.parts;
                  const partText = Array.isArray(chunkParts)
                    ? chunkParts.map((p: any) => p.text || '').join('')
                    : '';
                  if (partText) {
                    fullText += partText;
                    if (onChunk) {
                      onChunk(sanitizeOutput(fullText));
                    }
                  }
                } catch (e) {}
              }
            }
          }

          if (fullText.trim().length > 0) {
            return sanitizeOutput(fullText);
          }
        } else if (!response.ok) {
          const errText = await response.text();
          logger.warn(`Gemini ${model} stream status ${response.status}:`, errText);
        }
      } catch (error) {
        logger.warn(`Gemini ${model} tentativa falhou, tentando próximo modelo:`, error);
      }
    }
  }

  // Engine 3: Resposta Dinâmica Inteligente e Amigável do Copiloto (Conversacional)
  const normalized = userText.toLowerCase();

  // Saudações e apresentações descontraídas (parceiro inteligente)
  if (normalized.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|fala|opa|e ai|e aí)/)) {
    return `Fala parceiro! Beleza? 👊\n\nEstou por aqui pronto para te apoiar em qualquer demanda da **Syngular**:\n\n• **Certificados Digitais ICP-Brasil:** Rotinas do Sync/GFSIS, credenciamento de AR/PA, videoconferência e SynPass.\n• **Softwares do Ecossistema:** Certifica ERP, Certifica Ponto, Certifica GED, Certifica SST, Signer e Concilia.\n• **Suporte Técnico N2:** Diagnóstico rápido de rejeições SEFAZ, notas travadas e schemas XML.\n• **Comercial & Vendas:** Quebra de objeções, comparativos de mercado e roteiros de abordagem para contadores.\n\nQual é o desafio de agora? Manda pra cá que a gente resolve juntos!`;
  }

  // Busca contextual nos produtos
  const found = knowledgeBase.find(p => 
    p.keywords.some(k => normalized.includes(k.toLowerCase())) || 
    normalized.includes(p.name.toLowerCase())
  );

  if (found) {
    return `Show, vamos alinhar os pontos principais do **${found.name}**:\n\n${found.description}\n\n💡 **Argumento de valor / diferencial comercial:**\n${found.pitch}\n\n${found.objections && found.objections.length > 0 ? `🎯 **Dica prática para contornar objeção:**\n• *Quando o cliente questionar:* "${found.objections[0].question}"\n• *Melhor direcionamento:* "${found.objections[0].answer}"\n\n` : ''}Se precisar, posso montar um roteiro de mensagem sob medida para você disparar no WhatsApp do cliente agora. Só me avisar!`;
  }

  return `Entendido! Como seu parceiro técnico e comercial no ecossistema **Syngular**, consigo te apoiar direto nas seguintes frentes:\n\n• 📜 **Certificação Digital ICP-Brasil:** Credenciamento de AR/PA, emissão simplificada (SynPass), normas ITI e rotinas GFSIS/Sync.\n• 💻 **Softwares do Ecossistema:** Certifica ERP, Certifica Ponto, Certifica GED, Certifica SST, Certifica Signer, Certifica Concilia e emissão fiscal.\n• 🛠️ **Suporte Técnico N2:** Análise precisa de rejeições SEFAZ, inconsistências cadastrais e erros de XML.\n• 💰 **Comercial & Parcerias:** Estruturação de propostas de alta margem e comparativos com concorrentes.\n\nMe dá mais contexto ou manda o print do erro que a gente resolve juntos!`;
}

export function cleanForSpeech(text: string): string {
  let clean = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^[•\-🔹✨]\s*/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\$\$/g, '')
    .replace(/---{2,}/g, '')
    .replace(/\bNF-e\b/gi, 'nota fiscal eletrônica')
    .replace(/\bNFC-e\b/gi, 'nota de consumidor eletrônica')
    .replace(/\bNFS-e\b/gi, 'nota fiscal de serviço')
    .replace(/\bMDF-e\b/gi, 'manifesto fiscal')
    .replace(/\bGFSIS\b/gi, 'G F S I S')
    .replace(/\bICP-Brasil\b/gi, 'I C P Brasil')
    .replace(/\bAR\b/g, 'autoridade de registro')
    .replace(/\bAGR\b/g, 'agente de registro')
    .replace(/\bPA\b/g, 'posto de atendimento')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitizeOutput(clean);
}

export async function queryGeminiVoiceTurn(
  query: string,
  lastTurnHistory: { role: 'user' | 'model'; parts: string }[],
  knowledgeBase: Product[],
  apiKey: string,
  customRules?: CustomRule[]
): Promise<string> {
  const rag = retrieveRelevantContext(query, knowledgeBase, customRules, 2);
  const voiceSystemPrompt = `Você é o SynCop, especialista sênior e parceiro de equipe da SYNGULAR, conversando por ligação de voz direta com um colega de trabalho.
REGRAS CRÍTICAS PARA CONVERSA DE VOZ:
- Responda de forma completa, porém direta e natural (entre 2 e 4 frases faladas, sem enrolação).
- Conclua sempre o pensamento e termine a última frase de forma limpa. Nunca pare no meio de uma ideia.
- NUNCA use marcadores de texto (nada de asteriscos, negrito, numeração, listas, tópicos ou emojis).
- Fale de forma acolhedora, confiante e parceira, como um colega de time ao telefone.
- Nomenclatura oficial dos produtos de software: Certifica ERP, Certifica Ponto, Certifica GED, Certifica SST, Certifica Signer, Certifica Concilia, Certifica Nota.
- Certificado em nuvem com renovação simplificada: SynPass.
${rag.contextText ? `\nContexto relevante:\n${rag.contextText}` : ''}
`;

  // Janela deslizante: apenas o último turno (máx 2 mensagens)
  const compactHistory = (lastTurnHistory || []).slice(-2);

  // Engine 1: Backend Serverless
  try {
    const apiRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        history: compactHistory,
        systemInstruction: voiceSystemPrompt,
        maxOutputTokens: 450
      })
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success && data.text) {
        return cleanForSpeech(data.text);
      }
    }
  } catch (apiErr) {
    logger.warn('Backend /api/chat indisponível para voice turn:', apiErr);
  }

  // Engine 2: Contingência Gemini Direct
  const BUILTIN_KEY = typeof atob === 'function' ? atob('QVEuQWI4Uk42S0dvLUVDaFF2aUhYY3QxcnM3UnpPUmlYZkI5dnk0U0dZNWlaNmtVNHZfaHc=') : '';
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  const activeKey = apiKey || envKey || BUILTIN_KEY;

  if (activeKey && activeKey.trim().length > 0) {
    for (const model of ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.5-flash-lite']) {
      try {
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey.trim()}`;
        const contents = compactHistory.map(h => ({
          role: h.role,
          parts: [{ text: h.parts }]
        })).concat([{ role: 'user', parts: [{ text: query }] }]);

        const response = await fetch(streamUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: voiceSystemPrompt }] },
            contents,
            generationConfig: { maxOutputTokens: 450, temperature: 0.3 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            return cleanForSpeech(rawText);
          }
        }
      } catch (err) {
        logger.warn(`Voice turn falhou no modelo ${model}:`, err);
      }
    }
  }

  // Fallback conversacional
  return `Entendi o seu ponto. No ecossistema Syngular, você pode conferir essa configuração direto no menu de parâmetros do sistema ou me mandar uma mensagem no chat que eu detalho o passo a passo para você.`;
}

/**
 * Sintetiza áudio de fala usando o modelo Gemini 3.8 Flash TTS ou voz clonada
 */
export async function synthesizeGeminiVoice(
  text: string,
  voiceId?: string,
  apiKey?: string
): Promise<string | null> {
  const cleanText = cleanForSpeech(text);
  if (!cleanText) return null;

  // 1. Tenta backend Serverless
  try {
    const apiRes = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'synthesize',
        text: cleanText,
        voiceId
      })
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success && data.audioBase64) {
        return data.audioBase64;
      }
    }
  } catch (err) {
    logger.warn('Backend /api/voice indisponível para síntese, usando contingência direta:', err);
  }

  // 2. Contingência direta Gemini API
  const BUILTIN_KEY = typeof atob === 'function' ? atob('QVEuQWI4Uk42S0dvLUVDaFF2aUhYY3QxcnM3UnpPUmlYZkI5dnk0U0dZNWlaNmtVNHZfaHc=') : '';
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  const activeKey = apiKey || envKey || BUILTIN_KEY;

  if (activeKey && activeKey.trim().length > 0) {
    try {
      const speechConfig = voiceId 
        ? { voiceConfig: { voice: voiceId } }
        : { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${activeKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: cleanText }]
            }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) return audioData;
      }
    } catch (err) {
      logger.warn('Falha na síntese direta com gemini-3.8-flash-tts:', err);
    }
  }

  return null;
}

/**
 * Registra a voz humana para replicação direta no Google Gemini
 */
export async function replicateVoiceDirect(
  sourceWavB64: string,
  consentWavB64: string,
  displayName: string,
  apiKey?: string
): Promise<{ success: boolean; voiceId?: string; error?: string }> {
  // 1. Tenta backend Serverless
  try {
    const apiRes = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'replicate',
        sourceAudioBase64: sourceWavB64,
        consentAudioBase64: consentWavB64,
        displayName
      })
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success && data.voiceId) {
        return { success: true, voiceId: data.voiceId };
      }
    } else {
      const errData = await apiRes.json().catch(() => null);
      if (errData?.error) return { success: false, error: errData.error };
    }
  } catch (err) {
    logger.warn('Backend /api/voice indisponível, usando contingência direta:', err);
  }

  // 2. Contingência direta Google Gemini API
  const BUILTIN_KEY = typeof atob === 'function' ? atob('QVEuQWI4Uk42S0dvLUVDaFF2aUhYY3QxcnM3UnpPUmlYZkI5dnk0U0dZNWlaNmtVNHZfaHc=') : '';
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  const activeKey = apiKey || envKey || BUILTIN_KEY;

  if (activeKey && activeKey.trim().length > 0) {
    try {
      const cleanSource = sourceWavB64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+;base64,/, '');
      const cleanConsent = consentWavB64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+;base64,/, '');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/voices?key=${activeKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store: true,
            voice: {
              model: 'gemini-3.8-flash-tts',
              type: 'replicated',
              display_name: displayName,
              language_code: 'pt-BR',
              replicated: {
                source_audio: { mime_type: 'audio/wav', data: cleanSource },
                consent_audio: { mime_type: 'audio/wav', data: cleanConsent }
              }
            }
          })
        }
      );

      const resData = await response.json();
      if (response.ok && (resData.id || resData.voice?.id)) {
        return { success: true, voiceId: resData.id || resData.voice?.id };
      } else {
        const msg = resData.error?.message || 'Falha na validação de segurança da voz.';
        return { success: false, error: msg };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão com o serviço de voz.' };
    }
  }

  return { success: false, error: 'Chave de API do Gemini não disponível.' };
}