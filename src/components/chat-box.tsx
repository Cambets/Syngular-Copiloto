import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import type { ChatMessage } from '../contexts/AppContext';
import { queryGemini } from '../lib/assistantBrain';
import { SynRobotMascot } from './syngular-logo';
import { 
  ArrowUp, Copy, Check, RotateCcw,
  Zap, ShieldAlert,
  ArrowRight, RefreshCw, Smartphone,
  FileCheck2, SendHorizontal, User, Image as ImageIcon,
  X, Users, Headphones, Sparkles,
  Brain, Trash2, Plus, Key
} from 'lucide-react';

const allScenarioPlaybooks = [
  {
    id: 'pos-venda-validacao',
    badge: 'Suporte N2 & Validação',
    title: 'Diagnóstico de Rejeição SEFAZ / Erro de Emissão',
    context: 'Diagnóstico N2 estruturado em 3 blocos: Causa provável, verificação no ERP e resolução passo a passo.',
    icon: Headphones,
    prompt: 'O cliente está com erro na transmissão de NF-e/NFC-e no ERP. Como diagnosticar e resolver seguindo o padrão N2 (Causa provável, Como verificar no cadastro/ERP e Passo a passo para resolver)?'
  },
  {
    id: 'parceiro-credenciamento',
    badge: 'Expansão de Parceiros',
    title: 'Captação de nova AR / Posto de Atendimento',
    context: 'Argumentos para credenciar uma nova AR com suporte da AC e alta rentabilidade.',
    icon: Users,
    prompt: 'Quais os principais argumentos e diferenciais da Syngular ID para apresentar a um empresário ou contador interessado em abrir uma AR ou Posto de Atendimento (PA)?'
  },
  {
    id: 'pos-venda-validacao-cert',
    badge: 'Suporte & Pós-Venda',
    title: 'Pendência em Videoconferência ou Emissão',
    context: 'Como orientar o parceiro quando um certificado digital entra em pendência na emissão.',
    icon: Headphones,
    prompt: 'O parceiro AR está com um certificado digital travado por pendência na validação por videoconferência. Como oriento os procedimentos operacionais de forma rápida?'
  },
  {
    id: 'reativacao-parceiro',
    badge: 'Reativação de Carteira',
    title: 'Resgatar Parceiro / AR Inativa há 60 dias',
    context: 'Abordagem consultiva para entender o motivo da pausa e reativar as emissões.',
    icon: RefreshCw,
    prompt: 'Monte um roteiro consultivo de abordagem para reativar um parceiro contador que parou de emitir certificados conosco há mais de 60 dias.'
  },
  {
    id: 'indicador-plus-pitch',
    badge: 'Expansão de Parcerias',
    title: 'Abordar Contador para o Programa Indicador+',
    context: 'Modelo pós-pago, lucro de R$ 100 a R$ 150 por certificado e 10% recorrente em sistemas.',
    icon: Users,
    prompt: 'Monte uma abordagem prática de WhatsApp para um contador sobre o programa Indicador+, destacando o modelo pós-pago (lucro imediato de R$ 100 a R$ 150 por certificado sem pagar adiantado), bonificações de certificados grátis e 10% de comissão recorrente nas 9 soluções do ecossistema.'
  },
  {
    id: 'pa-reducao-custos',
    badge: 'Credenciamento de PA',
    title: 'Proposta de Redução de 30% em Custos para Dono de PA/AR',
    context: 'Eliminar taxas de auditoria, custos de sistemas e acelerar emissões com esteira Sync.',
    icon: Sparkles,
    prompt: 'Como apresentar uma proposta comercial para um dono de Ponto de Atendimento (PA) ou AR concorrente demonstrando como a Syngular reduz 30% dos custos operacionais de bastidores e aumenta o lucro líquido por certificado?'
  },
  {
    id: 'ponto-objecao',
    badge: 'Quebra de Objeção',
    title: 'Cliente achando o Certifica Ponto caro',
    context: 'Argumentos de segurança jurídica contra passivo trabalhista e Portaria 671.',
    icon: ShieldAlert,
    prompt: 'Um cliente com 15 colaboradores disse que achou o Certifica Ponto caro. Me dê 2 argumentos práticos e uma pergunta reflexiva sobre passivo trabalhista para eu fechar a venda agora.'
  },
  {
    id: 'erp-food',
    badge: 'Pitch de Impacto',
    title: 'Apresentar ERP Food para Restaurante',
    context: 'Fluxo integrado de comandas, delivery, mesas e PIX obrigatório na NFC-e.',
    icon: Zap,
    prompt: 'Monte um pitch objetivo de 1 minuto para o dono de um restaurante sobre o Certifica ERP Food, destacando comandas, delivery e conformidade de PIX na NFC-e com a SEFAZ.'
  },
  {
    id: 'syn-nuvem',
    badge: 'Migração & Vendas',
    title: 'Migrar cliente de Token para Syn na Nuvem',
    context: 'Vantagens do certificado A3 no celular com biometria facial, sem risco de quebra.',
    icon: Smartphone,
    prompt: 'Como estruturar um pitch para um cliente que usa token físico migrar para o Syn na nuvem, destacando a praticidade no celular e a biometria facial?'
  },
  {
    id: 'certifica-sst',
    badge: 'Segurança do Trabalho',
    title: 'PGR e NR-01 atualizada no Certifica SST',
    context: 'Evitar multas do MTE, dispensas de MEI/ME e laudos com certificação ICP-Brasil.',
    icon: FileCheck2,
    prompt: 'Como abordar uma empresa sobre o Certifica SST com foco nas exigências do PGR (NR-01 atualizada) para evitar multas trabalhistas?'
  },
  {
    id: 'roleplay-parceiro',
    badge: '🎭 Simulação de Treino',
    title: 'Treino: Contador que já emite com outra AC',
    context: 'Pratique convencer um contador que diz ter contrato exclusivo com outra certificadora.',
    icon: Users,
    prompt: '[INICIAR_ROLEPLAY] Vamos fazer um treino de vendas. Você é um contador parceiro de outra certificadora tradicional e acha trabalhoso migrar para a Syngular. Inicie a conversa com essa resistência.'
  },
  {
    id: 'roleplay-ponto',
    badge: '🎭 Simulação de Treino',
    title: 'Treino de Objeção: Cliente achando Ponto caro',
    context: 'O Copiloto assume o papel de cliente resistente para você praticar seu fechamento e receber nota.',
    icon: ShieldAlert,
    prompt: '[INICIAR_ROLEPLAY] Vamos fazer um treino de vendas real. Você será o dono de uma empresa com 20 funcionários que acha o Certifica Ponto caro e prefere folha manual. Comece a ligação com sua objeção inicial.'
  }
];

function renderFormattedMessage(text: string) {
  if (!text) return null;
  
  // Limpa caracteres técnicos de Markdown residuais (###, ##, $$, etc.)
  const cleaned = text
    .replace(/^#{1,6}\s*(\d+)\.\s*/gm, '🔹 $1. ')
    .replace(/^#{1,6}\s*/gm, '✨ ')
    .replace(/\$\$/g, '')
    .replace(/---{2,}/g, '');

  const lines = cleaned.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+[.)]/.test(trimmed) || trimmed.startsWith('🔹') || trimmed.startsWith('✨');

        // Renderiza negrito **texto**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);

        return (
          <div 
            key={lineIdx} 
            className={`${isBullet ? 'pl-0.5 sm:pl-1' : ''}`}
          >
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldContent = part.slice(2, -2);
                return (
                  <strong key={pIdx} className="font-bold text-slate-900 dark:text-purple-200">
                    {boldContent}
                  </strong>
                );
              }
              return <span key={pIdx}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

interface ChatBoxProps {
  activeSessionId?: string | null;
  onGoHome?: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ activeSessionId, onGoHome }) => {
  const { 
    knowledgeBase, 
    customRules, 
    addCustomRule, 
    deleteCustomRule, 
    currentUser, 
    geminiApiKey,
    setGeminiApiKey,
    saveChatSession, 
    chatHistory 
  } = useApp();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedZapId, setCopiedZapId] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [newRuleModalInput, setNewRuleModalInput] = useState('');

  // API Key Quick Setup Modal
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(geminiApiKey || '');

  // Estados dos playbooks
  const [displayedPlaybooks, setDisplayedPlaybooks] = useState(allScenarioPlaybooks.slice(0, 4));
  const [isRotating, setIsRotating] = useState(false);


  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar sessão ativa quando o usuário clica em uma conversa do histórico
  const prevActiveSessionIdRef = useRef<string | null | undefined>(null);

  useEffect(() => {
    if (activeSessionId !== prevActiveSessionIdRef.current) {
      prevActiveSessionIdRef.current = activeSessionId;
      if (activeSessionId) {
        const session = chatHistory.find(s => s.id === activeSessionId);
        if (session) {
          setMessages(session.messages);
        }
      }
    }
  }, [activeSessionId, chatHistory]);

  const practicalChips = [
    { label: '🤝 Como captar e credenciar nova AR?', prompt: 'Quais os principais diferenciais da Syngular ID para captação e expansão de novas Autoridades de Registro (ARs)?' },
    { label: '📱 Vender Syn na nuvem (sem token)', prompt: 'Quais os 3 principais argumentos de venda do Syn na nuvem para clientes que querem se livrar de token físico?' },
    { label: '🛠️ Pós-Venda: Erro de biometria / videoconferência', prompt: 'Quais os passos operacionais para resolver pendências de biometria e emissão por videoconferência no pós-venda?' },
    { label: '🔄 Script de reativação para parceiro inativo', prompt: 'Me dê uma mensagem direta e consultiva para enviar no WhatsApp a um parceiro que não emite certificados há 45 dias.' },
    { label: '⚖️ Cerca virtual de 85m no Certifica Ponto', prompt: 'Explique como funciona a cerca virtual de 85m e a biometria facial offline no Certifica Ponto.' },
    { label: '🌾 ERP Agro: Livro Caixa & NFe Rural', prompt: 'Quais os diferenciais do Certifica ERP Agro e como ele atende o Livro Caixa do Produtor Rural?' }
  ];

  const handleShufflePlaybooks = useCallback(() => {
    setIsRotating(true);
    setTimeout(() => {
      const shuffled = [...allScenarioPlaybooks].sort(() => 0.5 - Math.random());
      setDisplayedPlaybooks(shuffled.slice(0, 4));
      setIsRotating(false);
    }, 200);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputValue]);

  const simulationScenarios = [
    {
      title: 'Contador parceiro de outra AC concorrente',
      prompt: '[INICIAR_ROLEPLAY] Vamos fazer um roleplay. Você é um contador parceiro de outra certificadora tradicional e acha trabalhoso migrar para a Syngular. Inicie a conversa com essa resistência.'
    },
    {
      title: 'Cliente achando o Certifica Ponto caro',
      prompt: '[INICIAR_ROLEPLAY] Vamos fazer um treino de vendas real. Você será o dono de uma empresa com 20 funcionários que acha o Certifica Ponto caro e prefere folha manual. Comece a ligação com sua objeção inicial.'
    },
    {
      title: 'Contador desconfiado do Syn na Nuvem',
      prompt: '[INICIAR_ROLEPLAY] Vamos fazer um roleplay. Você será um contador tradicional que exige token A3 físico e duvida da segurança do Syn na nuvem com biometria no celular. Inicie a ligação com sua objeção.'
    }
  ];

  const handleStartSimulation = () => {
    const randomScenario = simulationScenarios[Math.floor(Math.random() * simulationScenarios.length)];
    handleSendMessage(randomScenario.prompt);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend || inputValue).trim();
    if ((!rawText && !selectedImage) || isTyping) return;

    // 1. Intercepta comandos de ensino e correção direta no chat (/corrigir, /ensinar, /regra, /aprender) - APENAS ADMIN
    const commandMatch = rawText.match(/^\/(corrigir|ensinar|regra|aprenda|aprender)(?:\s+([\s\S]*))?$/i);
    if (commandMatch) {
      const userMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'user',
        text: rawText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      if (currentUser?.role !== 'admin') {
        const denyMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'assistant',
          text: `🔒 **Acesso Restrito:** Apenas administradores do sistema têm permissão para calibrar regras ou registrar correções permanentes na memória da IA. Para sugerir ajustes na base oficial, contate a administração.`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg, denyMsg]);
        setInputValue('');
        return;
      }

      const ruleBody = commandMatch[2]?.trim();

      if (!ruleBody) {
        // Se digitou apenas o comando sem instrução, orienta como usar
        const helpMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'assistant',
          text: `🧠 **Como ensinar ou corrigir uma resposta (Modo Administrador):**\n\nComo administrador, você pode calibrar a IA a qualquer momento usando \`/corrigir\` ou \`/ensinar\` seguido da instrução.\n\n**Exemplos:**\n• \`/corrigir Quando perguntarem sobre o SynPass, reforce que a renovação não precisa de videoconferência.\`\n• \`/ensinar O suporte de urgência aos sábados atende pelo WhatsApp (37) 99862-8259 das 8h às 12h.\`\n• \`/regra Nunca informe alíquota de ICMS sem orientar validação com o contador.\`\n\nToda regra ensinada é gravada imediatamente na memória de alta prioridade! ✨`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg, helpMsg]);
        setInputValue('');
        return;
      }

      // Salva a nova regra
      addCustomRule(ruleBody, currentUser?.name || 'Equipe');

      const confirmMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: `✅ **Correção Aprendida e Gravada na Memória!**\n\nEu registrei a seguinte regra prioritária:\n\n> 📌 *"${ruleBody}"*\n\n**O que acontece agora?**\nEm todas as próximas conversas e perguntas relacionadas, aplicarei esta regra imediatamente com prioridade máxima sobre respostas anteriores! 🧠🎯`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, userMsg, confirmMsg]);
      setInputValue('');
      return;
    }

    // Injeta a instrução da lente selecionada de forma invisível
    const text = rawText;

    const currentImg = selectedImage;
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: rawText || (currentImg ? '📸 Imagem enviada para análise' : ''),
      image: currentImg || undefined,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    const apiHistory = messages.map(msg => ({
      role: (msg.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: msg.text
    }));

    const reply = await queryGemini(text, apiHistory, knowledgeBase, geminiApiKey, currentImg || undefined, customRules);

    const assistantMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'assistant',
      text: reply,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, assistantMsg]);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Suporte a colar print direto da área de transferência (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setSelectedImage(event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Conversor inteligente para mensagem humana de WhatsApp
  const handleCopyWhatsApp = (id: string, text: string) => {
    const zapFormatted = text
      .replace(/\*\*(.*?)\*\*/g, '*$1*')
      .replace(/### (.*?)\n/g, '*$1*\n')
      .replace(/## (.*?)\n/g, '*$1*\n')
      .replace(/# (.*?)\n/g, '*$1*\n')
      .replace(/```([\s\S]*?)```/g, '$1')
      .trim();

    navigator.clipboard.writeText(zapFormatted);
    setCopiedZapId(id);
    setTimeout(() => setCopiedZapId(null), 2500);
  };

  const handleResetConversation = () => {
    if (messages.length > 0) {
      saveChatSession(messages);
      setMessages([]);
      setSelectedImage(null);
      handleShufflePlaybooks();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/85 dark:bg-[#0e0a1a]/85 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-purple-900/40 shadow-sm overflow-hidden relative">

      {/* Top Conversation Bar (Sempre Visível) */}
      <div className="h-11 px-4 border-b border-slate-100 dark:border-purple-900/30 flex items-center justify-between bg-slate-50/70 dark:bg-[#120b22]/80 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-purple-200">
          <span className="w-2 h-2 rounded-full bg-[#5c24ff] dark:bg-[#c084fc] animate-pulse"></span>
          <span>Copiloto Syngular ID & Syn+</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Ativação / Conexão de IA */}
          <button
            onClick={() => {
              setTempApiKey(geminiApiKey || '');
              setIsApiKeyModalOpen(true);
            }}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              geminiApiKey 
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border-emerald-300 dark:border-emerald-800' 
                : 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 border-amber-300 dark:border-amber-800 animate-pulse'
            }`}
            title={geminiApiKey ? 'IA Google Gemini 2.5 Flash Conectada e Ativa' : 'Clique para colar sua chave gratuita do Google Gemini e ativar a IA'}
          >
            <Key className="w-3.5 h-3.5 text-[#5c24ff]" />
            <span>{geminiApiKey ? '🟢 IA Ativa' : '⚡ Conectar IA'}</span>
          </button>

          {/* Botão de Memória / Regras Ensinadas */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-2.5 py-1 rounded-md border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
            title="Ver e gerenciar regras ensinadas à IA"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Memória ({customRules.length})</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleResetConversation}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#5c24ff] dark:text-slate-400 dark:hover:text-[#a78bfa] bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Nova Consulta"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Nova Consulta</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Thread Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative z-10">
        
        {/* Empty State Hero */}
        {messages.length === 0 && (
          <div className="max-w-3xl mx-auto space-y-5 animate-fade-in pb-2">
            
            {/* Hero Card */}
            <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-purple-50/60 via-slate-50/30 to-white dark:from-purple-950/40 dark:via-purple-900/20 dark:to-[#120b22]/60 backdrop-blur-md border border-purple-100/80 dark:border-purple-800/40 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#a855f7]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

              <div className="relative flex items-center gap-4">
                <SynRobotMascot size="xl" onClick={onGoHome} />
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ede8ff] dark:bg-purple-950/60 text-[#5c24ff] dark:text-purple-300 border border-[#5c24ff]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5c24ff] animate-pulse"></span>
                    <span>Copiloto Ativo & Pronto</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
                    Como posso ajudar no seu atendimento hoje?
                  </h1>
                </div>
              </div>

              {!geminiApiKey && (
                <div className="mt-3 pt-3 border-t border-purple-200/50 dark:border-purple-900/40 flex items-center justify-between gap-3 flex-wrap relative z-10">
                  <span className="text-xs text-purple-950 dark:text-purple-200 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#5c24ff] shrink-0 animate-pulse" />
                    <span>Conecte sua chave gratuita da IA Google Gemini para respostas 100% ao vivo.</span>
                  </span>
                  <button
                    onClick={() => {
                      setTempApiKey(geminiApiKey || '');
                      setIsApiKeyModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#5c24ff] hover:bg-[#4d1cdb] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Conectar Chave Grátis</span>
                  </button>
                </div>
              )}
            </div>

            {/* Playbooks Dinâmicos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Cenários Rápidos de Atendimento & Parcerias</span>
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleStartSimulation}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#5c24ff] hover:bg-[#4d1cdb] px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs"
                    title="Iniciar Treino de Vendas contra Parceiro/Cliente Resistente"
                  >
                    <span>🎭</span>
                    <span>Iniciar Treino</span>
                  </button>

                  <button
                    onClick={handleShufflePlaybooks}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-md transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                    title="Alternar para outros cenários"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
                    <span>Alternar</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedPlaybooks.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="p-4 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151822] hover:border-[#5c24ff]/60 hover:bg-purple-50/15 dark:hover:bg-purple-950/20 hover:shadow-xs transition-all duration-150 cursor-pointer group flex flex-col justify-between space-y-2.5 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/50 text-[#5c24ff] dark:text-purple-300 group-hover:bg-[#5c24ff] group-hover:text-white transition-colors">
                          {item.badge}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-[#5c24ff] group-hover:translate-x-0.5 transition-all" />
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug mb-1 group-hover:text-[#5c24ff] transition-colors flex items-center gap-1.5">
                          <IconComp className="w-3.5 h-3.5 text-[#5c24ff] shrink-0" />
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {item.context}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chips Rápidos */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Consultas Rápidas por Área
              </span>
              <div className="flex flex-wrap gap-1.5">
                {practicalChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip.prompt)}
                    className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#5c24ff] dark:hover:text-[#a78bfa] hover:border-purple-200 dark:hover:border-purple-800 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs text-left"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Mensagens do Chat */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'} animate-fade-in`}
            >
              {!isUser && (
                <div className="shrink-0 mt-0.5">
                  <SynRobotMascot size="sm" onClick={onGoHome} />
                </div>
              )}

              <div className={`space-y-1 group relative ${isUser ? 'items-end' : 'items-start'}`}>
                
                {/* Print Thumbnail */}
                {msg.image && (
                  <div className={`mb-1.5 ${isUser ? 'flex justify-end' : ''}`}>
                    <img 
                      src={msg.image} 
                      alt="Print anexado" 
                      className="max-w-xs max-h-56 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs object-contain bg-black/5"
                    />
                  </div>
                )}

                <div 
                  className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed select-text shadow-2xs ${
                    isUser 
                      ? 'bg-[#0d0d12] dark:bg-[#5c24ff] text-white font-normal rounded-tr-xs whitespace-pre-wrap' 
                      : 'bg-slate-100 dark:bg-[#181b26] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
                  }`}
                >
                  {isUser ? msg.text : renderFormattedMessage(msg.text)}
                </div>

                {/* Ações da Mensagem */}
                <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 px-1 pt-0.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span>{msg.timestamp}</span>

                  {!isUser && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="hover:text-[#5c24ff] dark:hover:text-[#a78bfa] p-0.5 cursor-pointer flex items-center gap-0.5"
                        title="Copiar texto completo"
                      >
                        {copiedId === msg.id ? (
                          <span className="text-[#5c24ff] dark:text-[#a78bfa] flex items-center gap-0.5"><Check className="w-3 h-3" /> Copiado!</span>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      {/* Botão de WhatsApp Formatado */}
                      <button
                        onClick={() => handleCopyWhatsApp(msg.id, msg.text)}
                        className="hover:text-emerald-600 dark:hover:text-emerald-400 p-1 px-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer flex items-center gap-1 font-bold text-[10px] transition-all shadow-2xs"
                        title="Copiar script formatado para WhatsApp"
                      >
                        {copiedZapId === msg.id ? (
                          <span className="text-emerald-600 flex items-center gap-0.5"><Check className="w-3 h-3" /> Copiado Zap!</span>
                        ) : (
                          <>
                            <SendHorizontal className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Script Zap</span>
                          </>
                        )}
                      </button>

                      {/* Botão Ensinar / Corrigir Resposta - Apenas Administrador */}
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setInputValue('/corrigir ');
                            if (textareaRef.current) textareaRef.current.focus();
                          }}
                          className="hover:text-purple-700 dark:hover:text-purple-300 p-1 px-1.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 cursor-pointer flex items-center gap-1 font-bold text-[10px] transition-all shadow-2xs"
                          title="Ensinar uma correção ou nova regra para esta resposta (Apenas Administrador)"
                        >
                          <Brain className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span>Corrigir / Ensinar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
              )}
            </div>
          );
        })}

        {/* Spinner */}
        {isTyping && (
          <div className="flex gap-3 max-w-2xl mr-auto justify-start">
            <div className="shrink-0 mt-0.5">
              <SynRobotMascot size="sm" onClick={onGoHome} />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#181b26] border border-slate-200/80 dark:border-slate-800 rounded-tl-xs flex items-center space-x-1.5 shadow-2xs">
              <div className="w-1.5 h-1.5 bg-[#5c24ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-[#5c24ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-[#5c24ff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box e Upload */}
      <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-purple-900/30 bg-white/95 dark:bg-[#120b22]/90 backdrop-blur-md flex-shrink-0 space-y-2 relative z-10">

        {/* Preview da Imagem */}
        {selectedImage && (
          <div className="mb-2 flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl w-fit animate-fade-in shadow-2xs">
            <img 
              src={selectedImage} 
              alt="Preview do print" 
              className="w-12 h-12 object-cover rounded-lg border border-purple-300 dark:border-purple-700"
            />
            <div className="pr-2">
              <p className="text-[11px] font-bold text-[#5c24ff] dark:text-purple-300 leading-tight">Print anexado</p>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">A IA analisará a imagem</span>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Remover imagem"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Textarea Container */}
        <div className="relative border border-slate-200 dark:border-slate-700 focus-within:border-[#5c24ff] focus-within:ring-1 focus-within:ring-[#5c24ff] rounded-xl bg-slate-50/50 dark:bg-[#151822] p-2 transition-all">
          
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Cole um print (Ctrl+V) ou digite dúvidas de ARs, produtos, suporte e parcerias..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden resize-none px-2 py-1 max-h-36 leading-relaxed"
          />

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/80 mt-1 px-1">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 p-1 px-2 rounded-md bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-[#5c24ff] dark:text-purple-300 font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                title="Anexar foto ou print de tela"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <span className="hidden md:inline text-slate-400">
                Cole prints com <strong className="text-slate-600 dark:text-slate-300">Ctrl+V</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400">
                <span>Enter</span>
                <span className="kbd text-[9px]">↵</span>
              </div>

              <button
                onClick={() => handleSendMessage()}
                disabled={(!inputValue.trim() && !selectedImage) || isTyping}
                className="p-2 bg-[#5c24ff] hover:bg-[#4d1cdb] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 shadow-2xs"
                title="Enviar mensagem"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Barra de Ajuda de Comandos / Ensinar IA - Apenas Administrador */}
        {currentUser?.role === 'admin' && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-400 pt-0.5 px-1 flex-wrap gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300">
                <Brain className="w-3 h-3" />
                <span>Ensinar a IA:</span>
              </span>
              <button
                onClick={() => {
                  setInputValue('/corrigir ');
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="px-1.5 py-0.5 rounded bg-purple-100/80 dark:bg-purple-950/80 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 font-mono font-bold transition-colors cursor-pointer"
                title="Clique para preencher o comando de correção"
              >
                /corrigir [regra]
              </button>
              <span className="hidden sm:inline text-slate-400">ou</span>
              <button
                onClick={() => {
                  setInputValue('/ensinar ');
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="hidden sm:inline px-1.5 py-0.5 rounded bg-purple-100/80 dark:bg-purple-950/80 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 font-mono font-bold transition-colors cursor-pointer"
                title="Clique para preencher o comando de ensino"
              >
                /ensinar [regra]
              </button>
            </div>

            <button 
              onClick={() => setShowRulesModal(true)} 
              className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer ml-auto"
              title="Ver e gerenciar todas as regras ensinadas"
            >
              <span>{customRules.length} regra(s) na memória</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            </button>
          </div>
        )}

      </div>

      {/* Modal de Gerenciamento de Memória & Regras da IA - Apenas Administrador */}
      {currentUser?.role === 'admin' && showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#15102a] border border-purple-200 dark:border-purple-800/80 rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-purple-900/40 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Memória & Regras Ensinadas à IA
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300">
                    Instruções prioritárias que sobrepõem respostas padrão do assistente.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              
              {/* Adicionar Nova Regra Manualmente */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-purple-950/20 border border-slate-200 dark:border-purple-900/40 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Adicionar Nova Regra / Correção:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRuleModalInput}
                    onChange={(e) => setNewRuleModalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRuleModalInput.trim()) {
                        addCustomRule(newRuleModalInput, currentUser?.name || 'Equipe');
                        setNewRuleModalInput('');
                      }
                    }}
                    placeholder="Ex: No estado do RJ a alíquota padrão de ICMS interna é 20%..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f0920] text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (newRuleModalInput.trim()) {
                        addCustomRule(newRuleModalInput, currentUser?.name || 'Equipe');
                        setNewRuleModalInput('');
                      }
                    }}
                    disabled={!newRuleModalInput.trim()}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    Salvar
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  💡 Você também pode ensinar diretamente no chat digitando <code className="font-mono font-bold text-purple-600 dark:text-purple-400">/corrigir [sua regra]</code>.
                </p>
              </div>

              {/* Lista de Regras Gravadas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Regras Ativas na Memória ({customRules.length})
                  </span>
                </div>

                {customRules.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-purple-900/40 bg-slate-50/50 dark:bg-purple-950/10 space-y-1.5">
                    <Brain className="w-8 h-8 text-slate-300 dark:text-purple-500/40 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Nenhuma regra personalizada gravada ainda</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Sempre que o assistente der uma resposta que precisa de ajuste, digite <span className="font-mono text-purple-600 font-semibold">/corrigir</span> no chat para ensinar a resposta ideal!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {customRules.map((rule, idx) => (
                      <div
                        key={rule.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-purple-900/30 bg-white dark:bg-[#130b24] flex items-start justify-between gap-3 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 transition-colors group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              Ensinada por {rule.createdBy || 'Equipe'} • {new Date(rule.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed pl-7 select-text font-normal">
                            {rule.rule}
                          </p>
                        </div>

                        <button
                          onClick={() => deleteCustomRule(rule.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Remover esta regra da memória"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-100 dark:border-purple-900/30 flex justify-end bg-slate-50/50 dark:bg-[#100b20]">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Concluído
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Conectar Chave da IA Google Gemini */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
          <div className="bg-white dark:bg-[#120c24] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-purple-900/50 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-purple-900/40 flex items-center justify-between bg-slate-50/70 dark:bg-[#150d28]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center shadow-xs">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Conectar Inteligência Artificial Google Gemini</h3>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300/70">Ative respostas ao vivo com o modelo Gemini 2.5 Flash</p>
                </div>
              </div>

              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-purple-200/80 leading-relaxed">
                Para o Copiloto responder de forma 100% natural, descontraída e com raciocínio ao vivo durante sua apresentação, basta colar sua chave gratuita do **Google AI Studio**:
              </p>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-purple-300 mb-1">
                  Chave de API (Google Gemini)
                </label>
                <input
                  type="password"
                  placeholder="Cole aqui sua chave (ex: AIzaSy...)"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0c0818] border border-slate-200 dark:border-purple-900/60 focus:border-[#5c24ff] rounded-xl text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-purple-50/80 dark:bg-purple-950/40 rounded-xl border border-purple-200/60 dark:border-purple-800/40 space-y-1.5">
                <span className="font-bold text-[#5c24ff] dark:text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Como pegar sua chave grátis em 15 segundos:</span>
                </span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-purple-200/70">
                  <li>Acesse <strong>aistudio.google.com/apikey</strong></li>
                  <li>Clique em <strong>"Create API Key"</strong></li>
                  <li>Copie e cole aqui!</li>
                </ol>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-purple-900/30">
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGeminiApiKey(tempApiKey.trim());
                    setIsApiKeyModalOpen(false);
                  }}
                  className="px-4 py-2 bg-[#5c24ff] hover:bg-[#4d1cdb] active:scale-95 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar & Ativar IA</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};