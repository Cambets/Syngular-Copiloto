import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import type { ChatMessage } from '../contexts/AppContext';
import { queryGemini } from '../lib/assistantBrain';
import { SynRobotMascot } from './syngular-logo';
import { 
  ArrowUp, Copy, Check, RotateCcw,
  Image as ImageIcon,
  X, Mic,
  Brain, Trash2, Plus,
  SendHorizontal, User
} from 'lucide-react';

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

const ecosystemQuestions = [
  {
    id: 'nr1-changes',
    prompt: 'Quais são as principais mudanças nas novas normas da NR1 e SST?',
  },
  {
    id: 'registro-marca',
    prompt: 'Por que oferecer registro de marca com o Syn Registro para contadores?',
  },
  {
    id: 'up-digital',
    prompt: 'Como o Syn UP Digital ajuda as empresas a aumentarem a presença online?',
  },
  {
    id: 'nr1-facilidades',
    prompt: 'Quais as facilidades da NR1 para MEI, ME e EPP no Syn SST?',
  },
  {
    id: 'ged-dores',
    prompt: 'Que dores o Syn GED resolve na gestão de documentos e contratos?',
  },
  {
    id: 'erp-objecoes',
    prompt: 'Como contornar objeções comuns de preço ao apresentar o Syn ERP?',
  }
];

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

  // Estados da interface clean e acolhedora
  const [heroCopied, setHeroCopied] = useState(false);
  const [heroFeedback, setHeroFeedback] = useState<'up' | 'down' | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Manipulador de Microfone (Reconhecimento de Voz / Ditado)
  const handleToggleVoice = useCallback(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Reconhecimento de voz não suportado neste navegador. Utilize o Google Chrome, Edge ou Safari.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue(prev => prev ? `${prev} ${transcript}` : transcript);
        }
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [isListening]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);


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
    const assistantMsgId = Math.random().toString(36).substring(2, 9);
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, initialAssistantMsg]);
    setIsTyping(true);

    const apiHistory = messages.map(msg => ({
      role: (msg.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: msg.text
    }));

    const reply = await queryGemini(
      text, 
      apiHistory, 
      knowledgeBase, 
      geminiApiKey, 
      currentImg || undefined, 
      customRules,
      (streamedText) => {
        setIsTyping(false);
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: streamedText } : m));
      }
    );

    setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: reply || m.text } : m));
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Suporte a colar print direto da área de transferência (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/85 dark:bg-[#0e0a1a]/85 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-purple-900/40 shadow-sm overflow-hidden relative">

      {/* Top Conversation Bar (Sempre Visível) */}
      <div className="h-11 px-4 border-b border-slate-100 dark:border-purple-900/30 flex items-center justify-between bg-slate-50/70 dark:bg-[#120b22]/80 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-purple-200">
          <span className="w-2 h-2 rounded-full bg-[#5c24ff] dark:bg-[#c084fc] animate-pulse"></span>
          <span>Copiloto Syngular & Syn+</span>
        </div>

        <div className="flex items-center gap-2">
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
        
        {/* Empty State Hero - Clean & Amistoso (Matching Reference Design) */}
        {messages.length === 0 && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-2">
            
            {/* Friendly Speech Bubble / Welcome Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white/90 dark:bg-[#110c22]/90 backdrop-blur-md border border-slate-200/90 dark:border-purple-900/40 shadow-xs space-y-4">
              <p className="text-xs sm:text-[13px] leading-relaxed text-slate-800 dark:text-slate-100 font-normal">
                Olá! Sou o <strong className="font-bold text-[#5c24ff] dark:text-[#a78bfa]">SynCop</strong>, copiloto de vendas e especialista no ecossistema <strong className="font-bold text-slate-900 dark:text-white">Syngular</strong>. Estou aqui para ajudar você com dúvidas sobre emissão, superação de objeções de clientes, produtos e parcerias comerciais. Como posso ajudar você hoje?
              </p>

              {/* Feedback & Actions Toolbar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("Olá! Sou o SynCop, copiloto de vendas e especialista no ecossistema Syngular. Estou aqui para ajudar você com dúvidas sobre emissão, superação de objeções de clientes, produtos e parcerias comerciais. Como posso ajudar você hoje?");
                      setHeroCopied(true);
                      setTimeout(() => setHeroCopied(false), 1500);
                    }}
                    className="flex items-center gap-1 hover:text-[#5c24ff] dark:hover:text-[#a78bfa] transition-colors cursor-pointer text-[11px] font-medium"
                    title="Copiar mensagem de apresentação"
                  >
                    {heroCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{heroCopied ? 'Copiado!' : 'Copiar'}</span>
                  </button>

                  <span className="text-slate-300 dark:text-slate-700">&bull;</span>

                  <button
                    onClick={() => setHeroFeedback('up')}
                    className={`flex items-center gap-1 transition-colors cursor-pointer text-[11px] font-medium ${heroFeedback === 'up' ? 'text-emerald-600 font-bold' : 'hover:text-emerald-600'}`}
                    title="Essa resposta foi útil"
                  >
                    <span>👍</span>
                    <span>Útil</span>
                  </button>

                  <button
                    onClick={() => setHeroFeedback('down')}
                    className={`flex items-center gap-1 transition-colors cursor-pointer text-[11px] font-medium ${heroFeedback === 'down' ? 'text-rose-600 font-bold' : 'hover:text-rose-600'}`}
                    title="Essa resposta foi pouco útil"
                  >
                    <span>👎</span>
                    <span>Pouco útil</span>
                  </button>
                </div>

                <span className="text-[10px] text-slate-400 italic">
                  {heroFeedback ? 'Obrigado pelo seu feedback!' : 'Se quiser, conte se essa resposta te ajudou — é rapidinho.'}
                </span>
              </div>
            </div>

            {/* Section Heading */}
            <div className="text-center pt-2 pb-1">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                Explore o conhecimento<br className="hidden xs:inline" /> do nosso ecossistema
              </h2>
            </div>

            {/* 6 Clean Question Cards (2 cols on tablet, 3 cols on desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ecosystemQuestions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleSendMessage(q.prompt)}
                  className="p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-[#120c24]/85 hover:bg-purple-50/50 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-purple-950/50 hover:border-[#5c24ff]/50 text-slate-700 dark:text-slate-200 hover:text-[#5c24ff] dark:hover:text-purple-300 transition-all duration-150 cursor-pointer text-center flex items-center justify-center min-h-[92px] shadow-2xs group active:scale-[0.98]"
                >
                  <span className="text-xs sm:text-[13px] font-medium leading-snug">
                    {q.prompt}
                  </span>
                </button>
              ))}
            </div>

          </div>
        )}

        {/* Mensagens do Chat */}
        {messages.map((msg) => {
          if (!msg.text && !msg.image && msg.sender === 'assistant') return null;
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

        {/* Clean Minimalist Input Bar (Matching Reference Design) */}
        <div className="relative flex items-center bg-white dark:bg-[#120d26] border border-slate-200/90 dark:border-purple-950/60 focus-within:border-[#5c24ff] rounded-2xl p-2 shadow-xs transition-all">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          <input
            ref={textareaRef as any}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Digite sua dúvida sobre produtos, vendas ou operação..."
            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />

          <div className="flex items-center gap-1.5 shrink-0 pr-1">
            {/* Botão de Print / Imagem */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Anexar print de tela"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Botão de Microfone (Ditado de Voz) */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isListening ? 'Ouvindo... Clique para pausar' : 'Falar por microfone'}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Botão de Envio (Seta para cima em destaque) */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={(!inputValue.trim() && !selectedImage) || isTyping}
              className="p-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 shadow-xs"
              title="Enviar mensagem"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Clean Footer Hint */}
        <div className="text-center pt-0.5">
          <span className="text-[10px] text-slate-400">
            Enter para enviar &bull; Shift+Enter para quebrar linha
          </span>
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
    </div>
  );
};