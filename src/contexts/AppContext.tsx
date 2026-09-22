import React, { createContext, useContext, useState, useEffect } from 'react';
import { hashPassword, verifyPassword } from '../lib/security';
import { pushSharedUsersToCloud, pullSharedUsersFromCloud, pushSingleUserRequest } from '../lib/cloudSync';
import { logger } from '../lib/logger';

export interface Product {
  id: string;
  name: string;
  category: 'Syngular' | 'Certifica+' | 'Parcerias' | 'Pos-Venda' | 'Reativacao';
  description: string;
  pitch: string;
  objections: { question: string; answer: string }[];
  keywords: string[];
  protocolNumber?: string;
  registeredAt?: string;
  registeredBy?: string;
}

export interface User {
  email: string;
  name: string;
  passwordHash?: string;
  salt?: string;
  role: 'admin' | 'user';
  status: 'approved' | 'blocked' | 'pending';
  department?: string;
  createdAt?: string;
  lastLogin?: string;
  authProvider?: 'credentials' | 'google';
}

export interface LegacyUser extends User {
  password?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  image?: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  userEmail: string;
  messages: ChatMessage[];
  timestamp: string;
}

export interface CustomRule {
  id: string;
  rule: string;
  category?: string;
  createdAt: string;
  createdBy?: string;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  knowledgeBase: Product[];
  customRules: CustomRule[];
  chatHistory: ChatSession[];
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  login: (email: string, password?: string) => Promise<AuthResponse>;
  loginWithGoogle: (googleEmail?: string, googleName?: string) => Promise<AuthResponse>;
  logout: () => void;
  registerUser: (userData: { email: string; name: string; password?: string; department?: string }) => Promise<AuthResponse>;
  invitePartner: (partnerData: { email: string; name: string; department: string; password?: string; role?: 'admin' | 'user' }) => Promise<AuthResponse>;
  updateUserStatus: (email: string, status: 'approved' | 'blocked' | 'pending') => void;
  updateUserRole: (email: string, role: 'admin' | 'user') => void;
  resetUserPassword: (email: string, newPassword?: string) => Promise<void>;
  changeCurrentUserPassword: (currentPassword: string, newPassword: string) => Promise<AuthResponse>;
  deleteUser: (email: string) => void;
  addOrUpdateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addCustomRule: (ruleText: string, createdBy?: string) => CustomRule;
  deleteCustomRule: (id: string) => void;
  saveChatSession: (messages: ChatMessage[], sessionId?: string) => string;
  deleteChatSession: (sessionId: string) => void;
  clearChatHistory: () => void;
}

const defaultProducts: Product[] = [
  // --- SYNGULAR ID, PARCERIAS & CREDENCIAMENTO ---
  {
    id: 'parceria-syngular-preco-fixo',
    name: 'Parceria Syngular / Newtech (Modelo Preço Fixo)',
    category: 'Parcerias',
    description: 'Parceria estratégica para credenciamento e emissão de certificados digitais no modelo de Custo Fixo (PJ A1 padrão R$ 73,30, PJ A1 promocional R$ 65,00 e PF A1 promocional R$ 47,00). Pós-pago com acerto quinzenal via boleto com base nas emissões reais. Limite de crédito operacional de R$ 2.500,00 renovado a cada quinzena. Meta de 20 certificados/mês sem taxa fixa de manutenção. Bonificação de 1 mês de certificados grátis para fechamentos em até 5 dias úteis. Contato comercial oficial Syngular: WhatsApp (37) 99862-8259.',
    pitch: 'Adquira certificados por custo fixo preestabelecido e lucre 100% do valor cobrado acima com acerto pós-pago quinzenal.',
    keywords: ['syngular', 'newtech', 'preco fixo', 'pos-pago', 'comercial', 'credenciamento', 'custo fixo', 'parceria', 'comissao'],
    objections: [
      { question: 'Como funciona o acerto financeiro?', answer: 'O cliente final paga diretamente ao parceiro pelo valor cheio. A cada 15 dias a Syngular envia um extrato consolidado com o boleto referente apenas ao custo fixo dos certificados emitidos.' },
      { question: 'Existe fidelidade ou taxa mensal fixa?', answer: 'Não há taxa mensal fixa nem mensalidades de sistema. A meta é de 20 emissões/mês para manter a tabela comercial premium.' }
    ]
  },
  {
    id: 'diferenciais-emissao-syngular',
    name: 'Diferenciais do Sistema Syngular (100% Sem Java & SynPass)',
    category: 'Syngular',
    description: 'Sistema próprio de emissão 100% sem Java (elimina conflitos e travamentos de navegador), interface limpa sem excesso de abas, tempo de emissão de apenas 3 a 5 minutos (1/3 do mercado) e taxa de aprovação automática de 80% a 87%. Inclui SynPass (renovação online em nuvem sem videoconferência), Jornada Synples (PJ A1 emitido no celular gerando 2 certificados em 1 única validação) e Certifica+ (proteção com reemissão gratuita por perda/dano). Suporte via Muvdesk em até 5 minutos.',
    pitch: 'Emita certificados em 3 a 5 minutos, 100% sem Java, com aprovação automática de até 87% e suporte garantido em 5 minutos.',
    keywords: ['sem java', 'synpass', 'jornada synples', 'certifica mais', 'muvdesk', 'emissao rapida', 'aprovacao automatica'],
    objections: [
      { question: 'O sistema necessita de instalação do Java?', answer: 'Não! O sistema Syngular é 100% livre de Java, acabando com incompatibilidades e lentidão no navegador.' },
      { question: 'Como funciona a renovação no SynPass?', answer: 'É 100% online em nuvem, dispensando videoconferência para clientes que já possuem biometria cadastrada.' }
    ]
  },
  {
    id: 'gfsis-gestao-parceiro',
    name: 'Sistema de Gestão GFSIS (100% Gratuito)',
    category: 'Parcerias',
    description: 'Plataforma completa de gestão de certificados disponibilizada 100% sem custo (zero taxa de implantação e zero mensalidade) para parceiros credenciados. Controle de pedidos, esteira de aprovação, alertas de vencimento com renovação ativa, eliminação de planilhas Excel, gestão financeira de parceiros indicadores e geração automática de listas de prospecção regional.',
    pitch: 'Sistema GFSIS completo com controle de vencimentos e listas de prospecção 100% gratuito para o parceiro.',
    keywords: ['gfsis', 'gestao de certificados', 'renovacao ativa', 'sem mensalidade', 'gratis', 'indicadores', 'prospeccao'],
    objections: [
      { question: 'O GFSIS tem custo de implantação ou mensalidade?', answer: 'Zero custo! Na Syngular o sistema GFSIS é liberado gratuitamente e sem cobrança de mensalidades.' }
    ]
  },
  {
    id: 'credenciamento-agr-iti',
    name: 'Credenciamento de Máquina & CLT do AGR (Normas ITI)',
    category: 'Parcerias',
    description: 'Processo regulamentado pelo ITI. Máquina de uso exclusivo com Windows 10/11 Pro configurada com BitLocker e senha de admin com a Syngular. Leitor biométrico Futronic FS80H ou FS88H + Webcam HD com NFs de compra ou doação. AGR realiza curso teórico online de 1 dia (bonificado para bom volume) e treinamento prático. Registro formal CLT do AGR na folha da Syngular (Formiga/MG) no regime horista (4 certs = 1h ou 1h/dia = 3 certs), com mecanismo Salário Devolutivo onde o valor retorna no acerto quinzenal (neutralizando custos para o dono da empresa).',
    pitch: 'Credenciamento homologado pelo ITI com máquina segura BitLocker, suporte assistido e regularidade CLT simplificada.',
    keywords: ['iti', 'agr', 'clt', 'salario devolutivo', 'bitlocker', 'futronic', 'fs80h', 'fs88h', 'credenciamento pa', 'hardware'],
    objections: [
      { question: 'Por que o AGR precisa de registro CLT pela Syngular?', answer: 'É exigência legal do ITI para fé pública e auditoria federal. O custo salarial é devolvido pelo parceiro no acerto quinzenal, neutralizando o valor caso o operador seja o dono.' },
      { question: 'E se eu não tiver a nota fiscal do computador antigo?', answer: 'A Syngular possui contato terceirizado que viabiliza a emissão das notas fiscais necessárias de forma simples.' }
    ]
  },
  {
    id: 'comparativo-ar-tradicional',
    name: 'Comparativo Financeiro (Syngular vs AR Tradicional)',
    category: 'Parcerias',
    description: 'Demonstrativo de economia real: AR Tradicional cobra Start Fee de R$ 15.000+, Auditoria Anual de R$ 1.300 a R$ 2.500, Seguro RC de R$ 950 a R$ 1.200/ano, R$ 4 a R$ 7 por videoconferência e GFSIS por R$ 1.800 + R$ 300/mês. Na Syngular: R$ 0 Start Fee, R$ 0 Auditoria, R$ 0 Seguro RC, GFSIS grátis e custo apenas no certificado emitido.',
    pitch: 'Economize mais de R$ 20.000 em taxas de abertura e manutenção operando com a Syngular.',
    keywords: ['comparativo', 'economia', 'sem taxa', 'ar tradicional', 'start fee', 'auditoria', 'seguro rc'],
    objections: [
      { question: 'Qual a real economia frente a uma AR tradicional?', answer: 'O parceiro economiza mais de R$ 20.000 por ano ao não pagar taxa de entrada, auditorias anuais, seguro RC e mensalidades de software.' }
    ]
  },
  {
    id: 'syn-nuvem',
    name: 'Syn (Certificado Digital na Nuvem)',
    category: 'Syngular',
    description: 'Certificado digital ICP-Brasil padrão A3 em nuvem. Funciona diretamente no smartphone com autenticação biométrica facial e OTP, eliminando risco de quebra ou perda de token físico/smartcard.',
    pitch: 'Sua assinatura digital sempre com você no celular, com biometria facial e sem mídias físicas.',
    keywords: ['syn', 'certificado na nuvem', 'a3', 'icp-brasil', 'biometria facial', 'sem token', 'celular', 'synpass'],
    objections: [
      { question: 'É seguro assinar pelo celular?', answer: 'Sim, homologado pelo ITI com chaves criptográficas de padrão A3 e liberação por biometria facial com prova de vida.' },
      { question: 'E se eu trocar de aparelho?', answer: 'Basta revogar o dispositivo antigo e reinstalar o app Syn no novo smartphone com validação de segurança.' }
    ]
  },
  {
    id: 'indicador-plus',
    name: 'Indicador+ (Parceria para Contadores e Escritórios)',
    category: 'Parcerias',
    description: 'Programa de parcerias e comissionamento para contadores e escritórios de contabilidade. Modelo pós-pago inovador: o cliente é atendido via videoconferência live em até 5 minutos (Lyve) sem pagamento prévio. O contador define o preço final de venda (ex.: R$ 220), retendo de R$ 100 a R$ 150 de lucro líquido imediato por certificado sobre a tabela de custo (Base 75$, 85$ ou 99$), com acerto via PIX ou fatura mensal. Inclui comissões recorrentes de 10% em todas as soluções do ecossistema e bonificações na 1ª, 3ª e 15ª indicações (certificados PF/PJ grátis).',
    pitch: 'Transforme indicações contábeis em lucro líquido imediato e recorrência de 10% sem complexidade operacional.',
    keywords: ['indicador+', 'indicador', 'contador', 'parceria contador', 'pos-pago', 'comissao contador', 'lyve', 'videoconferencia'],
    objections: [
      { question: 'O contador tem responsabilidade pelo suporte do cliente?', answer: 'Não. 100% da responsabilidade de atendimento, validação, emissão e suporte pós-venda é da Syngular. O contador apenas indica em menos de 2 minutos pelo painel.' },
      { question: 'Como funcionam as bonificações?', answer: 'Na 1ª indicação ganha e-CPF e e-CNPJ próprio grátis; na 3ª ganha certificados adicionais para o escritório; na 15ª ganha vouchers PJ A1 e PF A1 para usar ou revender com 100% de lucro.' }
    ]
  },

  // --- ECOSSISTEMA DE SOFTWARES & GESTÃO (CERTIFICA) ---
  {
    id: 'certifica-erp-web',
    name: 'Certifica ERP Web',
    category: 'Certifica+',
    description: 'Sistema de gestão empresarial e fiscal em nuvem para comércio, atacado, varejo e serviços (atende o segmento do antigo Shop). Planos: MEI (15 docs/mês), Contador (10 docs/mês), Básico, Intermediário, Avançado e Premium (ilimitados). Emite NFe, NFCe, NFSe, CTe, MDFe com suporte a SPED. Suporta PIX integrado (tipo 17 SEFAZ) com bloqueio antifraude e conciliação automática no XML.',
    pitch: 'Gestão comercial, financeira e faturamento fiscal em nuvem, pronto para as novas exigências de PIX na NFC-e da SEFAZ.',
    keywords: ['erp web', 'certifica erp', 'nfe', 'nfce', 'nfse', 'pix integrado', 'sefaz', 'estoque', 'financeiro', 'sped', 'varejo', 'comercio', 'loja'],
    objections: [
      { question: 'Como funciona o PIX integrado tipo 17 na NFC-e?', answer: 'No PDV, o QR Code dinâmico é gerado com tela bloqueada, detecta o pagamento, impede cancelamento sem estorno e amarra as tags de PIX diretamente no XML da NFC-e conforme exigência da SEFAZ.' }
    ]
  },
  {
    id: 'certifica-erp-food',
    name: 'Certifica ERP Food',
    category: 'Certifica+',
    description: 'Software para bares, restaurantes, lanchonetes e delivery. Planos Básico, Intermediário, Avançado e Premium. Comandas mobile, controle de mesas, painel do garçom, controle de entregador, cardápio digital via QR Code, módulo Fast Food, Anota Aí, frete por KM e integração nativa com iFood.',
    pitch: 'Controle ágil de comandas, mesas, delivery e cozinha integrado ao frente de caixa.',
    keywords: ['food', 'certifica food', 'restaurante', 'bar', 'comandas', 'mesas', 'ifood', 'garçom', 'delivery', 'cardápio digital', 'fast food'],
    objections: [
      { question: 'Integra diretamente com o iFood?', answer: 'Sim, o módulo iFood recebe e gerencia os pedidos diretamente no painel do ERP com baixa automática.' }
    ]
  },
  {
    id: 'certifica-erp-agro',
    name: 'Certifica ERP Agro & Agro Fiscal',
    category: 'Certifica+',
    description: 'Gestão para produtores rurais e agronegócio. Planos Agro: Light (40 docs/mês), Básico, Intermediário e Avançado. Planos Agro Fiscal de A30 a A3200 docs/mês e Ilimitado. Emissão de NFe/CTe/MDFe rural, Livro Caixa Digital do Produtor Rural (LCDPR), controle de romaneios de grãos/gado e múltiplas Inscrições Estaduais.',
    pitch: 'Controle de romaneios, finanças e Livro Caixa Rural em uma única plataforma homologada.',
    keywords: ['agro', 'certifica agro', 'produtor rural', 'livro caixa', 'lcdpr', 'romaneio', 'graos', 'gado', 'nfe rural', 'agro fiscal'],
    objections: [
      { question: 'Gera o arquivo oficial do Livro Caixa para a Receita Federal?', answer: 'Sim, compila todas as receitas e despesas rurais no layout homologado para o LCDPR.' }
    ]
  },
  {
    id: 'certifica-erp-clinicas',
    name: 'Certifica ERP Clínicas',
    category: 'Certifica+',
    description: 'Sistema para clínicas e consultórios médicos e odontológicos. Planos: Light (até 2 prof.), Básico (até 4), Intermediário (até 6), Avançado (até 8) e Premium (acima de 8 prof.). Prontuário eletrônico unificado, agenda por profissional, personalização de receitas/atestados e Prescritor Memed com receitas digitais válidas nacionalmente.',
    pitch: 'Prontuário eletrônico, agenda unificada e Prescritor Memed integrado para consultórios.',
    keywords: ['clinicas', 'certifica clinicas', 'medicos', 'consultorio', 'prontuario', 'memed', 'receita digital', 'pacientes', 'odontologia'],
    objections: [
      { question: 'As receitas digitais são aceitas em farmácias?', answer: 'Sim, com o Prescritor Memed integrado e assinatura digital ICP-Brasil, as receitas possuem validade nacional.' }
    ]
  },
  {
    id: 'certifica-erp-pet',
    name: 'Certifica ERP Pet',
    category: 'Certifica+',
    description: 'Sistema especializado para clínicas veterinárias e pet shops. Planos: Básico (até 10 prof.), Intermediário (11 a 20), Avançado (21 a 30) e Premium (acima de 30). Prontuário veterinário, anamnese, controle de atendimento, agenda, estoque, venda de produtos e emissão fiscal.',
    pitch: 'Prontuário veterinário, controle de atendimentos, banho e tosa e emissão fiscal integrados.',
    keywords: ['pet', 'certifica pet', 'pet shop', 'veterinaria', 'anamnese', 'prontuario pet', 'banho e tosa'],
    objections: [
      { question: 'O sistema emite notas fiscais de produtos e serviços veterinários?', answer: 'Sim, emite NFe, NFCe e NFSe com integração total ao cadastro de animais e clientes.' }
    ]
  },
  {
    id: 'certifica-erp-agenda',
    name: 'Certifica ERP Agenda',
    category: 'Certifica+',
    description: 'Sistema de gestão de agendamentos e faturamento para salões de beleza, barbearias, clínicas de estética, estúdios, quadras esportivas, salas/boxes/consultórios e prestadores de serviços em geral (substitui integralmente o antigo ERP Salões). Inclui link online de agendamento, agenda por profissional ou por espaço físico, controle de serviços/procedimentos, pagamento antecipado (Asaas/Mercado Pago), comissão automática e emissão fiscal via certificado A1 (.pfx).',
    pitch: 'Agendamentos online, controle de profissionais/espaços e emissão fiscal ágil para salões, estética e prestadores de serviços.',
    keywords: ['agenda', 'certifica agenda', 'erp agenda', 'salao', 'barbearia', 'estetica', 'agendamento online', 'prestador de servico', 'a1', 'nfe', 'link na bio', 'servicos', 'quadras'],
    objections: [
      { question: 'O ERP Agenda atende salões de beleza e barbearias?', answer: 'Sim, o ERP Agenda substituiu integralmente o antigo ERP Salões, gerenciando a grade de horários, comandas, comissões da equipe e frente de caixa.' },
      { question: 'Qual certificado digital é necessário?', answer: 'O Certifica Agenda opera com certificado digital modelo A1 (.pfx) para garantir estabilidade e emissão automática em nuvem.' }
    ]
  },
  {
    id: 'certifica-nota',
    name: 'Certifica Nota (Emissor Fiscal)',
    category: 'Certifica+',
    description: 'Emissor fiscal eletrônico multiformato especializado (NFe, NFCe, CTe, CTe OS, MDFe e SPED). Desenvolvido para empresas que buscam simplicidade e agilidade, sem a complexidade ou custo de módulos extras de ERP (estoque, CRM). Utilização imediata e integração validada com a SEFAZ.',
    pitch: 'Emissor fiscal rápido, 100% legalizado e sem complexidade de ERP.',
    keywords: ['nota', 'certifica nota', 'emissor fiscal', 'nfe', 'nfce', 'cte', 'mdfe', 'sped', 'sefaz', 'sem erp'],
    objections: [
      { question: 'O Certifica Nota é um ERP completo?', answer: 'Não. É um emissor fiscal especializado que foca exclusivamente na emissão rápida e segura com a SEFAZ, sem módulos desnecessários.' }
    ]
  },
  {
    id: 'certifica-ponto',
    name: 'Certifica Ponto',
    category: 'Certifica+',
    description: 'Controle de ponto eletrônico homologado pela Portaria 671 do MTE. Reconhecimento facial com prova de vida (liveness), cerca virtual com raio a partir de 85m (bloqueio ou notificação), registro offline com sincronização, armazenamento Amazon S3 com retenção de 5 anos, +40 relatórios gerenciais e app do colaborador. Planos por vidas: Básico (1 a 10 vidas), Intermediário (11 a 20 vidas) e Avançado (21 a 30 vidas). Sem fidelidade.',
    pitch: 'Controle de jornada com biometria facial, cerca virtual de 85m e 100% conforme a Portaria 671.',
    keywords: ['ponto', 'certifica ponto', 'portaria 671', 'mte', 'cerca virtual', 'biometria facial', 'liveness', 'banco de horas', 'offline', 'vidas'],
    objections: [
      { question: 'Funciona se a equipe estiver sem sinal de internet?', answer: 'Sim, o ponto é registrado offline com foto e GPS, sincronizando automaticamente ao recuperar a conexão.' },
      { question: 'Impede marcações fora da empresa?', answer: 'A cerca virtual com raio a partir de 85 metros bloqueia marcações ou notifica o gestor caso o ponto seja batido fora da área.' }
    ]
  },
  {
    id: 'certifica-ged',
    name: 'Certifica GED & Assinador',
    category: 'Certifica+',
    description: 'Guarda eletrônica de documentos com assinador digital integrado. Planos oficiais: Básico, Intermediário e Avançado (escalonados em até 5, 6 a 10 ou ilimitados usuários). Inclui pastas, templates, checklists, CLM, gestão de tarefas Kanban, assinatura em massa e alertas de validade de certidões. Solução altamente recomendada para empresas que participam de licitações.',
    pitch: 'Centralize documentos corporativos, certidões para licitações e contratos com assinatura digital.',
    keywords: ['ged', 'certifica ged', 'documentos', 'assinador', 'licitacao', 'certidoes', 'contratos', 'nuvem', 'clm', 'kanban'],
    objections: [
      { question: 'Quais são os planos oficiais do GED?', answer: 'Os nomes oficiais são Básico, Intermediário e Avançado (nunca use Basic ou Starter). Cada plano possui um conjunto estrito de funcionalidades.' }
    ]
  },
  {
    id: 'certifica-sst',
    name: 'Certifica SST (Saúde e Segurança)',
    category: 'Certifica+',
    description: 'Gestão completa de SST e mensageria eSocial conforme a NR-01 (Portaria MTE 765/2025). Geração de PGR (inventário de riscos vivo e plano de ação), PCMSO, LTCAT (sob demanda quando houver agentes nocivos), Análise de Riscos Psicossociais em 6 etapas, capacitação EAD (Anexo II) e envio dos eventos S-2210 (CAT), S-2220 (ASO) e S-2240. Planos mensais por vidas: Básico (até 5 func.), Intermediário (até 10 func.) e Avançado (até 20 func.). NUNCA divulgue valores.',
    pitch: 'Envie os eventos de SST ao eSocial e mantenha o PGR e treinamentos da NR-01 em dia sem multas.',
    keywords: ['sst', 'certifica sst', 'esocial', 'nr-01', 'pgr', 'pcmso', 'ltcat', 'cat', 's-2240', 's-2220', 'psicossociais', 's-2210'],
    objections: [
      { question: 'Empresas pequenas precisam de SST?', answer: 'Sim, o envio ao eSocial é obrigatório para todas as empresas com colaboradores CLT. O sistema identifica dispensas legais para MEI/ME/EPP.' },
      { question: 'Qual o valor dos planos?', answer: 'Os valores são sob consulta diretamente com o consultor especializado no WhatsApp oficial.' }
    ]
  },
  {
    id: 'certifica-concilia',
    name: 'Certifica Concilia',
    category: 'Certifica+',
    description: 'Plataforma especializada de conciliação financeira de vendas em cartões de crédito, débito e PIX. Preço acessível de R$ 199/mês. Conciliação em 3 níveis: vendas no POS/TEF, financeira (adquirentes como Stone, Rede, Cielo, GetNet, PagSeguro, Mercado Pago) e extrato bancário. Alertas automáticos de divergências de taxas, atrasos e chargebacks.',
    pitch: 'Auditoria e conciliação automática de vendas em cartão e PIX por R$ 199/mês para recuperar taxas cobradas a mais.',
    keywords: ['conciliacao', 'certifica concilia', 'cartao', 'taxas', 'adquirente', 'chargeback', 'tef', 'pos', 'pix', '199'],
    objections: [
      { question: 'Qual a vantagem frente ao controle manual?', answer: 'O sistema audita automaticamente cada taxa contratada em 3 níveis e identifica cancelamentos ou chargebacks despercebidos com ROI rápido.' }
    ]
  },
  {
    id: 'certifica-signer',
    name: 'Certifica Signer (Assinaturas Digitais)',
    category: 'Certifica+',
    description: 'Plataforma completa para assinatura eletrônica e digital de documentos com validade jurídica nacional (MP 2.200-2). Assinatura híbrida (com ou sem certificado ICP-Brasil), múltiplos signatários simultâneos ou sequenciais, assinatura em lote, geolocalização do signatário, carimbo do tempo e trilha de auditoria completa.',
    pitch: 'Assine contratos e documentos com validade jurídica, múltiplos signatários e trilha de auditoria.',
    keywords: ['signer', 'certifica signer', 'assinatura eletronica', 'assinatura digital', 'mp 2200', 'contratos', 'lote', 'geolocalizacao'],
    objections: [
      { question: 'Os documentos assinados têm validade jurídica?', answer: 'Sim, validade jurídica plena em todo o território nacional conforme a MP 2.200-2 e trilha de auditoria auditável.' }
    ]
  },
  {
    id: 'certifica-registro-marca',
    name: 'Certifica Registro (Marcas & Patentes)',
    category: 'Certifica+',
    description: 'Assessoria jurídica para registro e proteção de marcas no INPI. Planos: Básico (pesquisa, cadastro, GRUs, depósito e alertas), Intermediário (+ manifestações e recursos) e Avançado (+ notificações extrajudiciais e garantia estendida de novo protocolo sem honorários se indeferido). Serviço continuado Marca Monitorada (Legal Lab) para vigilância semanal na RPI contra marcas concorrentes pós-registro.',
    pitch: 'Garanta o direito de uso exclusivo da sua marca no INPI e mantenha a vigilância contínua na RPI.',
    keywords: ['registro de marca', 'certifica registro', 'inpi', 'marcas', 'marca monitorada', 'legal lab', 'rpi', 'propriedade industrial'],
    objections: [
      { question: 'Por que contratar a Marca Monitorada após registrar?', answer: 'Para acompanhar semanalmente as publicações da RPI e barrar tentativas de registro de concorrentes com nomes semelhantes antes que sejam aprovadas.' }
    ]
  },
  {
    id: 'certifica-up-digital',
    name: 'Certifica UP Digital (Presença Online)',
    category: 'Certifica+',
    description: 'Solução completa de presença digital para micro e pequenas empresas locais. Criação e configuração profissional de perfis no Google Meu Negócio / Google Maps (SEO local), Instagram, Facebook e WhatsApp Business. Inclui catálogo digital de até 10 produtos/serviços e configuração de mensagens automáticas.',
    pitch: 'Coloque sua empresa no mapa digital e atraia clientes locais no Google e nas redes sociais.',
    keywords: ['up digital', 'certifica up digital', 'google meu negocio', 'google maps', 'seo local', 'instagram', 'presenca digital', 'catalogo'],
    objections: [
      { question: 'Vale a pena para comércios locais pequenos?', answer: 'Sim, o Google Meu Negócio otimizado com SEO local coloca seu negócio nas primeiras buscas do Google Maps quando clientes procuram serviços na sua região.' }
    ]
  },
  {
    id: 'certifica-design',
    name: 'Certifica Design',
    category: 'Certifica+',
    description: 'Criação de marcas e identidade visual estratégica via ClickUp. Fluxos de Naming (15 dias para até 2 rodadas de 5 opções de nome) e Identidade Visual (30 dias para logotipo, paleta, manual e vetores). Prazo total integrado de 45 dias com 2 reuniões de apresentação. NUNCA divulgue valores.',
    pitch: 'Identidade visual profissional e criação de nome (Naming) com metodologia ágil.',
    keywords: ['design', 'certifica design', 'naming', 'logotipo', 'identidade visual', 'marca', 'branding', 'clickup'],
    objections: [
      { question: 'Qual o prazo de entrega?', answer: '15 dias para Naming, 30 dias para Identidade Visual e 45 dias para o projeto integrado, com reuniões de alinhamento.' }
    ]
  },
  {
    id: 'universidade-syngular',
    name: 'Universidade Corporativa',
    category: 'Parcerias',
    description: 'Plataforma de capacitação online com +100 cursos, +60 materiais complementares e +5.000 alunos certificados com QR Code. Trilha destaque AR360º voltada para formação de Agentes de Registro (ARs), processos de emissão ICP-Brasil e expansão comercial.',
    pitch: 'Capacitação prática para franqueados, emissores e equipes comerciais com certificação oficial.',
    keywords: ['universidade', 'treinamento', 'ar360', 'capacitacao', 'ead', 'cursos', 'ar', 'certificacao'],
    objections: [
      { question: 'Quem tem acesso à Universidade?', answer: 'Todos os parceiros credenciados, franqueados e colaboradores da rede possuem acesso ao ambiente AVA.' }
    ]
  },
  {
    id: 'jornada-synples-syn-pass',
    name: 'Jornada Synples & Syn Pass',
    category: 'Syngular',
    description: 'A Jornada Synples utiliza o Syn Pass (PF em nuvem gratuito de 3 anos, que será de 5 anos na cadeia V12) para emitir online o certificado PJ A1 sob o mesmo CPF de titular. Criado no GFSIS com opção "Emissão Synples" e produto "PJ A1 Emissão Online", gerando 2 protocolos vinculados. O Syn Pass é emitido no App Syn (com PIN/PUK) e usado como autenticador para emitir o PJ A1. Status GFSIS: Aguardando Autenticação (dispensa dossiê PJ) ou Recebida (exige envio de dossiê PJ para Central de Verificação). Não há custo adicional para a Jornada Synples.',
    pitch: 'Emissão ágil de PJ A1 no celular ou computador autenticado pelo Syn Pass gratuito em nuvem.',
    keywords: ['jornada synples', 'syn pass', 'gfsis', 'emissao synples', 'pj a1 online', 'app syn', 'aguardando autenticacao', 'recebida', 'v12'],
    objections: [
      { question: 'O Syn Pass tem custo para a AR?', answer: 'Não, o Syn Pass é 100% gratuito para a AR (há apenas o custo da consulta de API na validação).' },
      { question: 'Posso emitir o Syn Pass no computador?', answer: 'Não, o Syn Pass deve obrigatoriamente ser emitido no aplicativo Syn no smartphone. Já o PJ A1 correspondente pode ser emitido no app Syn ou no Módulo Público do computador.' }
    ]
  },
  {
    id: 'guia-operacional-agr-sync',
    name: 'Guia Operacional do AGR & Sync',
    category: 'Syngular',
    description: 'Manual completo do Agente de Registro (AGR) no sistema Sync (ar.syngularid.com.br, extensão SyngularID no Chrome). Inclui: Roteiro oficial de Videoconferência v1.8 (3 perguntas obrigatórias + 1 aleatória), critérios de biometria PSBIO (emitidos pós-2019) e CNH (pós-2017), Matriz de Aprovação Datavalid (>93% aprovação direta; 85-92,99% dossiê/CV; <84,99% não segue), Sistema Antifraude SAF (Sexo obrigatório + 2 traços físicos), documentos aceitos PF/PJ (REDESIM validade 7 dias, Certidão 30 dias, Contrato Social consolidado), proibição de documentos federais (Decreto 10.266/2020), substituição de caracteres especiais no Sync (Ç->C, @->A, &->E, $->S) e consolidação de dossiê PDF.',
    pitch: 'Diretrizes completas de conformidade ICP-Brasil, validações biométricas e atendimento por videoconferência.',
    keywords: ['guia agr', 'sync', 'videoconferencia', 'roteiro 1.8', 'datavalid', 'psbio', 'saf', 'antifraude', 'redesim', 'dossie', 'ilovepdf'],
    objections: [
      { question: 'Qual a pontuação mínima do Datavalid para aprovação direta na videoconferência?', answer: 'Pontuação estritamente maior que 93% no Datavalid garante aprovação direta sem necessidade de envio de dossiê.' },
      { question: 'Documentos emitidos por ministérios federais podem ser aceitos?', answer: 'Não. Conforme o Decreto Federal nº 10.266/2020, documentos emitidos pela Administração Pública Federal e órgãos vinculados à União não podem ser aceitos como documento de identificação.' }
    ]
  }
];

const MOCK_EMAILS = [
  'vendas@syngular.com.br',
  'suporte@certifica.com.br',
  'parceiro.ar@syngular.com.br'
];

const defaultUsers: User[] = [
  {
    email: 'marcus.almeida@certifica.com.br',
    name: 'Marcus Almeida',
    salt: 'salt_adm_9941',
    passwordHash: '7a13d7199c90538a74e4fe62c0ebdf58d601b0f02377ebba9c323fca8eb2f7c0',
    role: 'admin',
    status: 'approved',
    department: 'Diretoria Executiva',
    createdAt: '2026-08-01T10:00:00.000Z',
    lastLogin: '2026-08-28T12:00:00.000Z',
    authProvider: 'google'
  },
  {
    email: 'marcus.almeida@syngular.id',
    name: 'Marcus Almeida',
    salt: 'salt_adm_9941',
    passwordHash: '7a13d7199c90538a74e4fe62c0ebdf58d601b0f02377ebba9c323fca8eb2f7c0',
    role: 'admin',
    status: 'approved',
    department: 'Diretoria Executiva',
    createdAt: '2026-08-01T10:00:00.000Z',
    lastLogin: '2026-08-28T12:00:00.000Z',
    authProvider: 'google'
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('syngular_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('syngular_users_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(u => !MOCK_EMAILS.includes(u.email?.toLowerCase()));
        }
      } catch (e) {
        logger.error('Erro ao ler usuários do localStorage:', e);
      }
    }
    return defaultUsers;
  });

  const [knowledgeBase, setKnowledgeBase] = useState<Product[]>(() => {
    const saved = localStorage.getItem('syngular_kb_v6');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        logger.error('Erro ao ler base de conhecimento:', e);
      }
    }
    return defaultProducts;
  });

  const [customRules, setCustomRules] = useState<CustomRule[]>(() => {
    const saved = localStorage.getItem('syngular_custom_rules_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        logger.error('Erro ao ler regras customizadas:', e);
      }
    }
    return [];
  });

  const [chatHistory, setChatHistory] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('syngular_chat_history');
    return saved ? JSON.parse(saved) : [];
  });

  const DEFAULT_GEMINI_KEY = typeof atob === 'function' ? atob('QVEuQWI4Uk42S0dvLUVDaFF2aUhYY3QxcnM3UnpPUmlYZkI5dnk0U0dZNWlaNmtVNHZfaHc=') : '';
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>(() => {
    const saved = localStorage.getItem('syngular_gemini_key');
    if (saved && saved.trim().length > 0) return saved.trim();
    const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
    return envKey || DEFAULT_GEMINI_KEY;
  });

  useEffect(() => {
    localStorage.setItem('syngular_users_v2', JSON.stringify(users));
    pushSharedUsersToCloud(users);
  }, [users]);

  // Sincronização multi-dispositivo em tempo real (atualiza solicitações vindas de outros navegadores/celulares)
  useEffect(() => {
    const syncWithCloud = async () => {
      const cloudUsers = await pullSharedUsersFromCloud();
      if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        setUsers(prev => {
          let hasChanges = false;
          const merged = [...prev];
          
          for (const cu of cloudUsers) {
            const idx = merged.findIndex(u => u.email.toLowerCase() === cu.email.toLowerCase());
            if (idx === -1) {
              merged.push(cu);
              hasChanges = true;
            } else if (merged[idx].status !== cu.status) {
              merged[idx] = { ...merged[idx], status: cu.status };
              hasChanges = true;
            }
          }
          return hasChanges ? merged : prev;
        });
      }
    };

    syncWithCloud();
    const interval = setInterval(syncWithCloud, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('syngular_kb_v6', JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  useEffect(() => {
    localStorage.setItem('syngular_custom_rules_v1', JSON.stringify(customRules));
  }, [customRules]);

  useEffect(() => {
    localStorage.setItem('syngular_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const setGeminiApiKey = (key: string) => {
    setGeminiApiKeyState(key);
    localStorage.setItem('syngular_gemini_key', key);
  };

  const login = async (email: string, password?: string): Promise<AuthResponse> => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      return { success: false, message: 'Por favor, informe seu e-mail de acesso.' };
    }

    let existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!existing) {
      return { 
        success: false, 
        message: 'E-mail não encontrado. Caso seja parceiro ou colaborador, solicite seu acesso!' 
      };
    }

    // Sync with cloud in real-time to get fresh approval status
    try {
      const cloudUsers = await pullSharedUsersFromCloud();
      if (cloudUsers && Array.isArray(cloudUsers)) {
        const cloudUser = cloudUsers.find(u => u.email?.toLowerCase() === cleanEmail);
        if (cloudUser) {
          const mergedUser: User = { ...existing, ...cloudUser };
          existing = mergedUser;
          setUsers(prev => {
            const idx = prev.findIndex(u => u.email.toLowerCase() === cleanEmail);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = mergedUser;
              return updated;
            }
            return [...prev, mergedUser];
          });
        }
      }
    } catch {
      // continua com estado local
    }

    const legacyExisting = existing as LegacyUser;
    if (existing.passwordHash && existing.salt && password) {
      const isValid = await verifyPassword(password.trim(), existing.passwordHash, existing.salt);
      if (!isValid) {
        return { success: false, message: 'Senha incorreta. Verifique suas credenciais de acesso.' };
      }
    } else if (legacyExisting.password && password) {
      // Legacy plaintext migration to hash
      if (legacyExisting.password !== password.trim()) {
        return { success: false, message: 'Senha incorreta. Verifique suas credenciais de acesso.' };
      }
      const { hash, salt } = await hashPassword(password.trim());
      existing.passwordHash = hash;
      existing.salt = salt;
      delete legacyExisting.password;
    }

    if (cleanEmail === 'marcus.almeida@certifica.com.br' || cleanEmail === 'marcus.almeida@syngular.id' || cleanEmail.startsWith('marcus.almeida@')) {
      existing = { ...existing, role: 'admin', status: 'approved' };
    }

    if (existing.status === 'blocked') {
      return { success: false, message: 'Sua conta está bloqueada pelo administrador da plataforma.' };
    }

    if (existing.status === 'pending') {
      return { success: false, message: 'Seu cadastro está aguardando aprovação de um administrador.' };
    }

    const updatedUser: User = {
      ...existing,
      lastLogin: new Date().toISOString()
    };

    // Sanitize user for session storage
    const safeUser: User = {
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      status: updatedUser.status,
      department: updatedUser.department,
      createdAt: updatedUser.createdAt,
      lastLogin: updatedUser.lastLogin,
      authProvider: updatedUser.authProvider
    };

    setUsers(prev => prev.map(u => u.email === cleanEmail ? updatedUser : u));
    setCurrentUser(safeUser);
    localStorage.setItem('syngular_current_user', JSON.stringify(safeUser));

    return { 
      success: true, 
      message: `Bem-vindo de volta, ${safeUser.name}!`,
      user: safeUser 
    };
  };

  const loginWithGoogle = async (googleEmail?: string, googleName?: string): Promise<AuthResponse> => {
    if (!googleEmail || !googleEmail.trim()) {
      return { success: false, message: 'Por favor, selecione ou informe uma conta Google válida.' };
    }
    const cleanEmail = googleEmail.toLowerCase().trim();
    const isCorporate = cleanEmail.endsWith('@certifica.com.br') || cleanEmail.endsWith('@syngular.id') || cleanEmail.endsWith('@syngular.com.br');

    let existing = users.find(u => u.email.toLowerCase() === cleanEmail);

    // Sync with cloud in real-time to get fresh approval status
    try {
      const cloudUsers = await pullSharedUsersFromCloud();
      if (cloudUsers && Array.isArray(cloudUsers)) {
        const cloudUser = cloudUsers.find(u => u.email?.toLowerCase() === cleanEmail);
        if (cloudUser) {
          existing = existing ? { ...existing, ...cloudUser } : cloudUser;
        }
      }
    } catch {
      // continua
    }

    if (!existing) {
      const isMasterAdmin = cleanEmail === 'marcus.almeida@certifica.com.br' || cleanEmail === 'marcus.almeida@syngular.id' || cleanEmail.startsWith('marcus.almeida@');
      const role: 'admin' | 'user' = isMasterAdmin ? 'admin' : 'user';
      const status: 'approved' | 'pending' = (isCorporate || isMasterAdmin) ? 'approved' : 'pending';

      const generatedName = googleName?.trim() || cleanEmail
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const newGoogleUser: User = {
        email: cleanEmail,
        name: generatedName || 'Usuário Google',
        role,
        status,
        department: isCorporate ? 'Colaborador Corporativo' : 'Parceiro Externo (Google)',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        authProvider: 'google'
      };
      existing = newGoogleUser;

      setUsers(prev => [...prev, newGoogleUser]);
      pushSingleUserRequest(newGoogleUser);

      // Se não for e-mail corporativo, bloqueia a entrada direta e exige aprovação do Admin
      if (!isCorporate && !isMasterAdmin) {
        return {
          success: false,
          message: `Solicitação enviada com sucesso! Como seu e-mail (${cleanEmail}) é externo, o administrador foi notificado para aprovar seu acesso ao Copiloto.`
        };
      }
    } else {
      if (existing.status === 'blocked') {
        return { success: false, message: 'Esta conta Google foi bloqueada pelo administrador.' };
      }
      if (existing.status === 'pending' && !isCorporate) {
        return { 
          success: false, 
          message: `Seu acesso com a conta (${cleanEmail}) ainda está em análise e aguarda aprovação de um administrador.` 
        };
      }
      if (isCorporate && existing.status !== 'approved') {
        existing = { ...existing, status: 'approved' };
      }
      const updated = { ...existing, lastLogin: new Date().toISOString(), authProvider: 'google' as const };
      existing = updated;
      setUsers(prev => prev.map(u => u.email === cleanEmail ? updated : u));
    }

    const safeUser: User = {
      email: existing.email,
      name: existing.name,
      role: existing.role,
      status: existing.status,
      department: existing.department,
      createdAt: existing.createdAt,
      lastLogin: existing.lastLogin,
      authProvider: existing.authProvider
    };

    setCurrentUser(safeUser);
    localStorage.setItem('syngular_current_user', JSON.stringify(safeUser));
    return { 
      success: true, 
      message: `Bem-vindo(a), ${safeUser.name}! Acesso corporativo direto liberado.`, 
      user: safeUser 
    };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('syngular_current_user');
  };

  const registerUser = async (userData: { email: string; name: string; password?: string; department?: string }): Promise<AuthResponse> => {
    const cleanEmail = userData.email.toLowerCase().trim();
    const cleanName = userData.name.trim();

    if (!cleanEmail || !cleanName) {
      return { success: false, message: 'Nome e e-mail são obrigatórios.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, message: 'Por favor, informe um endereço de e-mail válido.' };
    }

    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { 
        success: false, 
        message: 'Este e-mail já possui cadastro ativo ou pendente na plataforma.' 
      };
    }

    const isMasterAdmin = cleanEmail === 'marcus.almeida@certifica.com.br' || cleanEmail === 'marcus.almeida@syngular.id' || cleanEmail.startsWith('marcus.almeida@');
    const role: 'admin' | 'user' = isMasterAdmin ? 'admin' : 'user';
    const status: 'approved' | 'pending' = isMasterAdmin ? 'approved' : 'pending';

    const { hash, salt } = await hashPassword(userData.password?.trim() || 'syngular123');

    const newUser: User = {
      email: cleanEmail,
      name: cleanName,
      passwordHash: hash,
      salt,
      department: userData.department?.trim() || 'Parceiro Comercial / AR',
      role,
      status,
      createdAt: new Date().toISOString(),
      authProvider: 'credentials'
    };

    setUsers(prev => [...prev, newUser]);
    pushSingleUserRequest(newUser);

    return {
      success: true,
      message: isMasterAdmin 
        ? 'Conta de Administrador criada com sucesso. Faça seu login!' 
        : 'Solicitação enviada com sucesso! O administrador foi notificado para aprovar seu acesso.'
    };
  };

  const invitePartner = async (partnerData: { email: string; name: string; department: string; password?: string; role?: 'admin' | 'user' }): Promise<AuthResponse> => {
    const cleanEmail = partnerData.email.toLowerCase().trim();
    const cleanName = partnerData.name.trim();

    if (!cleanEmail || !cleanName) {
      return { success: false, message: 'Nome e e-mail são obrigatórios.' };
    }

    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, message: 'Este usuário já está cadastrado.' };
    }

    const { hash, salt } = await hashPassword(partnerData.password?.trim() || 'syngular123');

    const newPartner: User = {
      email: cleanEmail,
      name: cleanName,
      passwordHash: hash,
      salt,
      department: partnerData.department || 'Agente de Registro (AR)',
      role: partnerData.role || 'user',
      status: 'approved',
      createdAt: new Date().toISOString(),
      authProvider: 'credentials'
    };

    setUsers(prev => [...prev, newPartner]);
    pushSingleUserRequest(newPartner);
    return { success: true, message: `Colaborador ${newPartner.name} cadastrado e liberado com sucesso!` };
  };

  const updateUserStatus = (email: string, status: 'approved' | 'blocked' | 'pending') => {
    const clean = email.toLowerCase().trim();
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.email.toLowerCase() === clean) {
          if (clean === 'marcus.almeida@certifica.com.br' || clean === 'marcus.almeida@syngular.id' || clean.startsWith('marcus.almeida@')) return u;
          return { ...u, status };
        }
        return u;
      });
      pushSharedUsersToCloud(updated);
      return updated;
    });
  };

  const updateUserRole = (email: string, role: 'admin' | 'user') => {
    const clean = email.toLowerCase().trim();
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.email.toLowerCase() === clean) {
          if (clean === 'marcus.almeida@certifica.com.br' || clean === 'marcus.almeida@syngular.id' || clean.startsWith('marcus.almeida@')) return u;
          return { ...u, role };
        }
        return u;
      });
      pushSharedUsersToCloud(updated);
      return updated;
    });
  };

  const resetUserPassword = async (email: string, newPassword?: string): Promise<void> => {
    const clean = email.toLowerCase().trim();
    const pwd = newPassword || 'syngular123';
    const { hash, salt } = await hashPassword(pwd);
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.email.toLowerCase() === clean) {
          return { ...u, passwordHash: hash, salt };
        }
        return u;
      });
      pushSharedUsersToCloud(updated);
      return updated;
    });
  };

  const changeCurrentUserPassword = async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
    if (!currentUser) {
      return { success: false, message: 'Usuário não autenticado.' };
    }

    const cleanCurrent = currentPassword.trim();
    const cleanNew = newPassword.trim();

    if (!cleanCurrent) {
      return { success: false, message: 'Informe sua senha atual.' };
    }

    if (!cleanNew || cleanNew.length < 4) {
      return { success: false, message: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    const existingUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (!existingUser) {
      return { success: false, message: 'Cadastro de usuário não encontrado.' };
    }

    // Verify current password
    const legacyUser = existingUser as LegacyUser;
    if (existingUser.passwordHash && existingUser.salt) {
      const isValid = await verifyPassword(cleanCurrent, existingUser.passwordHash, existingUser.salt);
      if (!isValid) {
        return { success: false, message: 'Senha atual incorreta. Digite sua senha vigente para confirmar.' };
      }
    } else if (legacyUser.password) {
      if (legacyUser.password !== cleanCurrent) {
        return { success: false, message: 'Senha atual incorreta.' };
      }
    }

    // Generate new hash with fresh salt
    const { hash, salt } = await hashPassword(cleanNew);

    setUsers(prev => prev.map(u => {
      if (u.email.toLowerCase() === currentUser.email.toLowerCase()) {
        const updated: LegacyUser = { ...u, passwordHash: hash, salt };
        delete updated.password;
        return updated;
      }
      return u;
    }));

    return { success: true, message: 'Sua senha foi alterada com sucesso!' };
  };

  const deleteUser = (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === 'marcus.almeida@certifica.com.br' || cleanEmail === 'marcus.almeida@syngular.id' || cleanEmail.startsWith('marcus.almeida@')) return;
    setUsers(prev => {
      const updated = prev.filter(u => u.email.toLowerCase() !== cleanEmail);
      pushSharedUsersToCloud(updated);
      return updated;
    });
  };

  const addOrUpdateProduct = (product: Product) => {
    setKnowledgeBase(prev => {
      const idx = prev.findIndex(p => p.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [...prev, product];
    });
  };

  const deleteProduct = (id: string) => {
    setKnowledgeBase(prev => prev.filter(p => p.id !== id));
  };

  const addCustomRule = (ruleText: string, createdBy?: string): CustomRule => {
    const newRule: CustomRule = {
      id: Math.random().toString(36).substring(2, 9),
      rule: ruleText.trim(),
      createdAt: new Date().toISOString(),
      createdBy: createdBy || currentUser?.name || 'Equipe'
    };
    setCustomRules(prev => [newRule, ...prev]);
    return newRule;
  };

  const deleteCustomRule = (id: string) => {
    setCustomRules(prev => prev.filter(r => r.id !== id));
  };

  const saveChatSession = (messages: ChatMessage[], sessionId?: string): string => {
    if (!currentUser || messages.length === 0) return '';
    const targetId = sessionId || Math.random().toString(36).substring(2, 9);
    setChatHistory(prev => {
      const idx = prev.findIndex(s => s.id === targetId);
      const session: ChatSession = {
        id: targetId,
        userEmail: currentUser.email,
        messages,
        timestamp: new Date().toISOString()
      };
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = session;
        return updated;
      }
      return [session, ...prev];
    });
    return targetId;
  };

  const deleteChatSession = (sessionId: string) => {
    setChatHistory(prev => prev.filter(s => s.id !== sessionId));
  };

  const clearChatHistory = () => {
    setChatHistory([]);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      users,
      knowledgeBase,
      customRules,
      chatHistory,
      geminiApiKey,
      setGeminiApiKey,
      login,
      loginWithGoogle,
      logout,
      registerUser,
      invitePartner,
      updateUserStatus,
      updateUserRole,
      resetUserPassword,
      changeCurrentUserPassword,
      deleteUser,
      addOrUpdateProduct,
      deleteProduct,
      addCustomRule,
      deleteCustomRule,
      saveChatSession,
      deleteChatSession,
      clearChatHistory
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};