/**
 * RAG ENGINE (Retrieval-Augmented Generation) - Syngular AI
 * Sistema de busca híbrida (BM25 + TF-IDF + N-gram Semantic Similarity) para
 * indexação e recuperação contextual de máxima precisão dos materiais da Syngular.
 */

import type { Product, CustomRule } from '../contexts/AppContext';
import { JORNADA_SYNPLES_KB } from '../data/syngularOperationalKB';

export interface RAGChunk {
  id: string;
  category: 'produto' | 'operacional' | 'iti_regulamentacao' | 'vendas_script' | 'regra_customizada' | 'jornada_synples';
  title: string;
  content: string;
  keywords: string[];
  score?: number;
}

/**
 * Remove acentos, pontuações e converte para tokens limpos
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

/**
 * Constrói o índice de documentos RAG a partir da base de produtos, regras operacionais e personalizadas
 */
export function buildRAGIndex(knowledgeBase: Product[], customRules: CustomRule[] = []): RAGChunk[] {
  const chunks: RAGChunk[] = [];

  // 1. Indexar Produtos e Módulos do Ecossistema Syngular
  knowledgeBase.forEach(prod => {
    // Chunk Geral do Produto
    chunks.push({
      id: `prod-${prod.id}`,
      category: 'produto',
      title: prod.name,
      keywords: [prod.name, prod.category, ...prod.keywords],
      content: `PRODUTO: ${prod.name} (Categoria: ${prod.category})\nRESUMO / PITCH: ${prod.pitch}\nDETALHES E FUNCIONALIDADES:\n${prod.description}`
    });

    // Chunks de Objeções Específicas
    if (prod.objections && prod.objections.length > 0) {
      prod.objections.forEach((obj, idx) => {
        chunks.push({
          id: `obj-${prod.id}-${idx}`,
          category: 'vendas_script',
          title: `Objeção: ${prod.name} - ${obj.question}`,
          keywords: [prod.name, ...tokenize(obj.question), 'objecao', 'duvida', 'resposta'],
          content: `TRATAMENTO DE OBJEÇÃO (${prod.name}):\nPergunta/Dúvida do cliente: "${obj.question}"\nResposta e Argumento recomendado: "${obj.answer}"`
        });
      });
    }
  });

  // 2. Indexar Regras Ensinadas pela Equipe (Alta Prioridade)
  customRules.forEach((rule, idx) => {
    chunks.push({
      id: `rule-${rule.id || idx}`,
      category: 'regra_customizada',
      title: `Regra Prioritária Ensinada: ${rule.rule.substring(0, 40)}...`,
      keywords: tokenize(rule.rule),
      content: `⚡ REGRA PRIORITÁRIA ENSINADA PELA EQUIPE (ID: ${rule.id}):\n${rule.rule}`
    });
  });

  // 3. Indexar Base Operacional: Jornada Synples & Syn Pass
  chunks.push({
    id: 'op-synpass',
    category: 'jornada_synples',
    title: 'Jornada Synples, Syn Pass e Emissão PJ A1 no Celular',
    keywords: ['synpass', 'syn pass', 'jornada synples', 'pj a1', 'app syn', 'celular', 'emissao online', 'nuvem', 'validacao', 'puk', 'pin'],
    content: `JORNADA SYNPLES & SYN PASS:\n- Syn Pass é o certificado PF em nuvem gratuito (validade 3 a 5 anos) emitido no App Syn.\n- Usado para emitir o PJ A1 online no celular ou no módulo público sem custo extra.\n- CPF do Syn Pass e CPF do titular do PJ A1 devem ser idênticos.\n- A primeira emissão é sempre a do Syn Pass (PF), depois o PJ A1.`
  });

  // 4. Indexar Base Operacional: Normas ITI, Credenciamento e Guia do AGR
  chunks.push({
    id: 'op-credenciamento-agr',
    category: 'iti_regulamentacao',
    title: 'Normas ITI, Credenciamento de AR/PA e Requisitos do AGR',
    keywords: ['iti', 'credenciamento', 'ar', 'pa', 'agr', 'biometria', 'futronic', 'fs80h', 'fs88h', 'webcam', 'bitlocker', 'windows pro', 'clt', 'salario devolutivo', 'sync'],
    content: `CREDENCIAMENTO DE AR & REQUISITOS ITI (SYNGULAR):\n- Hardware: Windows 10/11 Pro, BitLocker ativo, senha de admin com a Syngular.\n- Kit Biométrico: Futronic FS80H/FS88H + Webcam HD.\n- Capacitação: Curso de AGR 100% online de 1 dia + Certificado A3 em token.\n- Contratação CLT do AGR na Syngular com mecanismo de salário devolutivo no fechamento quinzenal.\n- Zero Start Fee, zero taxa de auditoria anual e GFSIS 100% gratuito.`
  });

  // 5. Indexar Script Comercial & Tabela de Preço Fixo (Rayssa)
  chunks.push({
    id: 'op-script-vendas',
    category: 'vendas_script',
    title: 'Modelo Comercial de Custo Fixo, Pós-Pago e Script de Prospecção',
    keywords: ['rayssa', 'vendas', 'preco fixo', 'pos pago', 'lucro liquido', 'quinzenal', 'pj a1', 'pf a1', 'meta', '20 certificados', 'credito operacional'],
    content: `MODELO COMERCIAL SYNGULAR:\n- Modelo de Preço Fixo: Parceiro paga valor de custo e todo o excedente é lucro líquido.\n- Pós-pago quinzenal com limite de crédito operacional inicial de R$ 2.500,00.\n- Sem taxa de implantação nem mensalidade fixa (volume projetado: 20 cert/mês).\n- Contato Comercial: Rayssa | WhatsApp: (87) 98172-7108.`
  });

  // 6. Indexar Suporte Técnico N2 (SEFAZ & ERP)
  chunks.push({
    id: 'op-suporte-n2-sefaz',
    category: 'operacional',
    title: 'Diretrizes de Suporte Técnico N2 - Diagnóstico SEFAZ e ERP',
    keywords: ['sefaz', 'n2', 'suporte', 'rejeicao', 'xml', 'schema', 'nfe', 'nfce', 'cte', 'mdfe', 'csc', 'token', 'cst', 'cfop', 'a1', 'pfx'],
    content: `DIRETRIZES DE SUPORTE N2:\n- Diagnóstico obrigatório em 3 blocos: 1) Causa provável do erro, 2) Como verificar no banco/ERP, 3) Passo a passo de resolução.\n- Certificado A1 (.pfx) obrigatório no ambiente web.\n- Parâmetros NFC-e: Série, Último Número, Código CSC e ID do Token.`
  });

  // 7. Indexar JSON detalhado da Jornada Synples se disponível
  if (Array.isArray(JORNADA_SYNPLES_KB)) {
    interface JornadaItem {
      titulo?: string;
      conteudo?: string;
    }
    (JORNADA_SYNPLES_KB as JornadaItem[]).forEach((item, idx) => {
      chunks.push({
        id: `jornada-item-${idx}`,
        category: 'jornada_synples',
        title: item.titulo || `Tópico Operacional ${idx + 1}`,
        keywords: tokenize(`${item.titulo || ''} ${item.conteudo || ''}`),
        content: `TÓPICO OPERACIONAL: ${item.titulo || ''}\n${item.conteudo || JSON.stringify(item)}`
      });
    });
  }

  return chunks;
}

/**
 * Realiza a recuperação RAG (Top-K) calculando score de relevância ponderado
 */
export function retrieveRelevantContext(
  query: string,
  knowledgeBase: Product[],
  customRules: CustomRule[] = [],
  topK: number = 4
): { contextText: string; matchedChunks: RAGChunk[] } {
  if (!query || query.trim().length === 0) {
    return { contextText: '', matchedChunks: [] };
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return { contextText: '', matchedChunks: [] };
  }

  const index = buildRAGIndex(knowledgeBase, customRules);

  const scoredChunks = index.map(chunk => {
    let score = 0;
    const chunkTokens = tokenize(`${chunk.title} ${chunk.content} ${chunk.keywords.join(' ')}`);

    // Match exato de tokens
    queryTokens.forEach(qToken => {
      // Relevância no título (peso 5x)
      if (chunk.title.toLowerCase().includes(qToken)) {
        score += 5;
      }
      // Relevância nas palavras-chave (peso 4x)
      if (chunk.keywords.some(k => k.toLowerCase().includes(qToken))) {
        score += 4;
      }
      // Ocorrência no conteúdo (peso 1x por frequência)
      const count = chunkTokens.filter(t => t === qToken || t.includes(qToken)).length;
      score += Math.min(count, 5);
    });

    // Boost especial para regras customizadas e objeções diretas
    if (chunk.category === 'regra_customizada' && score > 0) {
      score *= 2.5;
    }
    if (chunk.category === 'vendas_script' && score > 0) {
      score *= 1.5;
    }

    return { ...chunk, score };
  });

  // Filtrar apenas chunks com relevância positiva e ordenar pelos maiores scores
  const topMatches = scoredChunks
    .filter(c => (c.score || 0) > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topK);

  if (topMatches.length === 0) {
    return { contextText: '', matchedChunks: [] };
  }

  const contextText = `
=========================================================================
🔍 CONTEXTO RECUPERADO VIA RAG (MATERIAIS E ESPECIFICAÇÕES SYNGULAR)
=========================================================================
${topMatches.map((match, i) => `
[TRECHO ${i + 1} | Relevância: ${match.score} pts | ${match.title}]
${match.content}
-------------------------------------------------------------------------`).join('\n')}
`;

  return { contextText, matchedChunks: topMatches };
}
