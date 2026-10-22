import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Product, CustomRule } from '../contexts/AppContext';
import { queryGeminiVoiceTurn, synthesizeGeminiVoice } from '../lib/assistantBrain';
import { SynRobotMascot } from './syngular-logo';
import { 
  PhoneOff, Mic, MicOff, Volume2, VolumeX,
  Radio, Sparkles, AlertCircle, Settings2, Play
} from 'lucide-react';

export interface VoiceConversationTurn {
  user: string;
  assistant: string;
}

interface DirectVoiceModalProps {
  isOpen: boolean;
  onClose: (turns: VoiceConversationTurn[]) => void;
  knowledgeBase: Product[];
  customRules?: CustomRule[];
  geminiApiKey: string;
}

type CallState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused';
type InteractionMode = 'hands-free' | 'push-to-talk';

export const DirectVoiceModal: React.FC<DirectVoiceModalProps> = ({
  isOpen,
  onClose,
  knowledgeBase,
  customRules,
  geminiApiKey
}) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [mode, setMode] = useState<InteractionMode>('hands-free');
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.05);
  const [userTranscript, setUserTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [turns, setTurns] = useState<VoiceConversationTurn[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Vozes do Navegador & Seleção de Voz Natural
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [customVoiceName, setCustomVoiceName] = useState<string | null>(null);

  // Refs de controle de concorrência e isolamento acústico
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);
  const keepAliveTimerRef = useRef<any>(null);
  const speechCooldownTimerRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const isSpeakingRef = useRef<boolean>(false);
  const isThinkingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const modeRef = useRef<InteractionMode>('hands-free');
  const isOpenRef = useRef<boolean>(isOpen);
  const turnsRef = useRef<VoiceConversationTurn[]>([]);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  turnsRef.current = turns;
  isMutedRef.current = isMuted;
  modeRef.current = mode;
  isOpenRef.current = isOpen;

  // Carregar e filtrar vozes em Português (Priorizando vozes Humanas/Naturais)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (!allVoices || allVoices.length === 0) return;

      // Filtrar vozes em Português
      const ptVoices = allVoices.filter(v => 
        v.lang.toLowerCase().includes('pt-br') || 
        v.lang.toLowerCase().includes('pt_br') || 
        v.lang.toLowerCase().startsWith('pt')
      );

      // Ordenar por qualidade percebida (Natural/Online do Edge > Google pt-BR > Microsoft Desktop)
      ptVoices.sort((a, b) => {
        const getScore = (v: SpeechSynthesisVoice) => {
          const name = v.name.toLowerCase();
          if (name.includes('natural') || name.includes('online')) return 100;
          if (name.includes('google')) return 80;
          if (name.includes('francisca') || name.includes('antonio') || name.includes('thalita')) return 90;
          if (name.includes('luciana') || name.includes('daniel')) return 50;
          return 10;
        };
        return getScore(b) - getScore(a);
      });

      setAvailableVoices(ptVoices);

      // Restaurar preferência do usuário ou usar a melhor voz detectada
      const savedVoiceUri = localStorage.getItem('syncop_preferred_voice');
      const matchedSaved = ptVoices.find(v => v.voiceURI === savedVoiceUri);
      const chosen = matchedSaved || ptVoices[0] || allVoices.find(v => v.lang.includes('pt')) || allVoices[0];

      if (chosen) {
        setSelectedVoiceUri(chosen.voiceURI);
        selectedVoiceRef.current = chosen;
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Atualizar ref da voz quando selecionada
  useEffect(() => {
    if (selectedVoiceUri && availableVoices.length > 0) {
      const v = availableVoices.find(item => item.voiceURI === selectedVoiceUri);
      if (v) {
        selectedVoiceRef.current = v;
        localStorage.setItem('syncop_preferred_voice', v.voiceURI);
      }
    }
  }, [selectedVoiceUri, availableVoices]);

  // Carrega status da voz clonada personalizada
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const vId = localStorage.getItem('syncop_custom_voice_id');
      const vName = localStorage.getItem('syncop_custom_voice_name');
      if (vId) {
        setCustomVoiceName(vName || 'Sua Voz Oficial');
      } else {
        setCustomVoiceName(null);
      }
    }
  }, [isOpen]);

  // Atualiza tempo de ligação
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      clearInterval(callTimerRef.current);
      return;
    }

    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(callTimerRef.current);
  }, [isOpen]);

  // Cancela fala do sintetizador ou áudio reproduzido com limpeza de timers
  const stopSpeaking = useCallback(() => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {}
      activeAudioRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    clearInterval(keepAliveTimerRef.current);
    isSpeakingRef.current = false;
  }, []);

  // Reproduz voz nativa do navegador como contingência
  const fallbackBrowserSpeak = useCallback((textToSpeak: string, onFinish: () => void) => {
    if (!synthRef.current) {
      onFinish();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    }

    // Chrome 15s bug keepalive fix
    keepAliveTimerRef.current = setInterval(() => {
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.pause();
        synthRef.current.resume();
      } else {
        clearInterval(keepAliveTimerRef.current);
      }
    }, 8000);

    utterance.onend = onFinish;
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis event error:', e);
      onFinish();
    };

    synthRef.current.speak(utterance);
  }, [speechRate]);

  // Falar texto: prioriza a voz clonada do Gemini TTS se houver, ou a voz natural do sistema
  const speakText = useCallback(async (textToSpeak: string, onEndCallback?: () => void) => {
    if (!textToSpeak.trim()) {
      isSpeakingRef.current = false;
      if (onEndCallback) onEndCallback();
      return;
    }

    // 1. Interrompe escuta do microfone IMEDIATAMENTE para evitar eco acústico
    try {
      recognitionRef.current?.abort();
    } catch {}

    stopSpeaking();
    setCallState('speaking');
    isSpeakingRef.current = true;

    const handleSpeechFinish = () => {
      clearInterval(keepAliveTimerRef.current);
      // Delay de 400ms para limpar reverberação ambiente da sala antes de reabrir o microfone
      speechCooldownTimerRef.current = setTimeout(() => {
        isSpeakingRef.current = false;
        if (onEndCallback) onEndCallback();
      }, 400);
    };

    // 2. Prioridade Máxima: Se o usuário gravou a própria voz (ID salvo), gera áudio oficial com o Gemini
    const customVoiceId = typeof window !== 'undefined' ? localStorage.getItem('syncop_custom_voice_id') : null;
    if (customVoiceId) {
      try {
        const audioB64 = await synthesizeGeminiVoice(textToSpeak, customVoiceId, geminiApiKey);
        if (audioB64) {
          const audio = new Audio('data:audio/wav;base64,' + audioB64);
          activeAudioRef.current = audio;
          audio.onended = () => {
            activeAudioRef.current = null;
            handleSpeechFinish();
          };
          audio.onerror = (e) => {
            console.warn('Erro ao tocar áudio de voz clonada, usando contingência:', e);
            activeAudioRef.current = null;
            fallbackBrowserSpeak(textToSpeak, handleSpeechFinish);
          };
          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('Falha na síntese de voz clonada, aplicando contingência local:', err);
      }
    }

    // 3. Contingência: Voz natural do navegador
    fallbackBrowserSpeak(textToSpeak, handleSpeechFinish);
  }, [geminiApiKey, fallbackBrowserSpeak, stopSpeaking]);

  // Testar voz atual com frase de demonstração
  const handleTestVoice = (voiceToTest?: SpeechSynthesisVoice) => {
    if (!synthRef.current) return;
    stopSpeaking();
    setTestingVoice(true);

    const testUtterance = new SpeechSynthesisUtterance(
      'Olá! Essa é a minha voz para conversarmos no ecossistema Syngular. O que acha?'
    );
    testUtterance.lang = 'pt-BR';
    testUtterance.rate = speechRate;
    testUtterance.voice = voiceToTest || selectedVoiceRef.current || null;

    testUtterance.onend = () => setTestingVoice(false);
    testUtterance.onerror = () => setTestingVoice(false);

    synthRef.current.speak(testUtterance);
  };

  // Processar fala do usuário via Gemini e responder
  const handleProcessUserSpeech = useCallback(async (speechText: string) => {
    const query = speechText.trim();
    if (!query || query.length < 2) {
      if (!isSpeakingRef.current) setCallState('listening');
      return;
    }

    // Trava de pensamento e isolamento de áudio
    isThinkingRef.current = true;
    stopSpeaking();
    setCallState('thinking');
    setUserTranscript(query);
    setInterimTranscript('');

    try {
      recognitionRef.current?.abort();
    } catch {}

    const historyPayload = turnsRef.current.slice(-2).map(t => [
      { role: 'user' as const, parts: t.user },
      { role: 'model' as const, parts: t.assistant }
    ]).flat();

    try {
      const response = await queryGeminiVoiceTurn(
        query,
        historyPayload,
        knowledgeBase,
        geminiApiKey,
        customRules
      );

      const cleanReply = response || 'Certo, compreendido. Pode me perguntar mais detalhes.';
      setAssistantReply(cleanReply);

      // Registra o turno
      const newTurn: VoiceConversationTurn = {
        user: query,
        assistant: cleanReply
      };
      setTurns(prev => [...prev, newTurn]);

      isThinkingRef.current = false;

      // Vocaliza a resposta e depois retoma a escuta
      speakText(cleanReply, () => {
        if (isOpenRef.current && modeRef.current === 'hands-free' && !isMutedRef.current) {
          setCallState('listening');
          try {
            recognitionRef.current?.start();
          } catch {}
        } else {
          setCallState('idle');
        }
      });
    } catch (err) {
      console.error('Erro na chamada de voz:', err);
      isThinkingRef.current = false;
      const fallback = 'Tive uma pequena oscilação aqui na linha. Pode repetir para mim, parceiro?';
      setAssistantReply(fallback);
      speakText(fallback, () => {
        if (isOpenRef.current && modeRef.current === 'hands-free' && !isMutedRef.current) {
          setCallState('listening');
          try {
            recognitionRef.current?.start();
          } catch {}
        }
      });
    }
  }, [geminiApiKey, knowledgeBase, customRules, speakText, stopSpeaking]);

  // Inicialização estável do Reconhecimento de Fala (STT Local)
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMessage('Seu navegador não suporta reconhecimento de fala nativo. Utilize o Google Chrome, Edge ou Safari para conversar por voz.');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setErrorMessage(null);
      if (!isSpeakingRef.current && !isThinkingRef.current) {
        setCallState('listening');
      }
    };

    recognition.onresult = (event: any) => {
      // REGRA CRÍTICA ANTI-ECO: Ignora completamente o microfone se a IA estiver falando ou processando
      if (isSpeakingRef.current || isThinkingRef.current) {
        return;
      }

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final) {
        const cleanedFinal = final.trim();
        if (cleanedFinal.length >= 2) {
          setInterimTranscript('');
          setUserTranscript(cleanedFinal);

          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            handleProcessUserSpeech(cleanedFinal);
          }, 900);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed') {
        setErrorMessage('Permissão de microfone negada. Clique no ícone de cadeado na barra de endereços para permitir o microfone.');
        setCallState('paused');
        return;
      }
      console.warn('Speech recognition warning:', event.error);
    };

    recognition.onend = () => {
      // Reinicia apenas se estiver em viva-voz e nenhuma ação de fala/pensamento estiver em curso
      if (
        isOpenRef.current && 
        modeRef.current === 'hands-free' && 
        !isMutedRef.current && 
        !isSpeakingRef.current && 
        !isThinkingRef.current
      ) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;

    // Saudação inicial de boas-vindas
    const initialGreeting = 'Fala parceiro! SynCop na linha. O que você precisa resolver hoje?';
    setAssistantReply(initialGreeting);
    speakText(initialGreeting, () => {
      if (isOpenRef.current && modeRef.current === 'hands-free' && !isMutedRef.current) {
        setCallState('listening');
        try {
          recognition.start();
        } catch {}
      }
    });

    return () => {
      clearTimeout(silenceTimerRef.current);
      clearTimeout(speechCooldownTimerRef.current);
      clearInterval(keepAliveTimerRef.current);
      stopSpeaking();
      try {
        recognition.abort();
      } catch {}
    };
  }, [isOpen, handleProcessUserSpeech, speakText, stopSpeaking]);

  // Controles de PTT (Push to Talk)
  const handlePushToTalkStart = () => {
    if (mode !== 'push-to-talk') return;
    stopSpeaking();
    setCallState('listening');
    try {
      recognitionRef.current?.start();
    } catch {}
  };

  const handlePushToTalkEnd = () => {
    if (mode !== 'push-to-talk') return;
    try {
      recognitionRef.current?.stop();
    } catch {}
  };

  // Mutar/Desmutar microfone
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setCallState('listening');
      try {
        recognitionRef.current?.start();
      } catch {}
    } else {
      setIsMuted(true);
      setCallState('paused');
      try {
        recognitionRef.current?.abort();
      } catch {}
    }
  };

  // Encerrar chamada
  const handleEndCall = () => {
    stopSpeaking();
    try {
      recognitionRef.current?.abort();
    } catch {}
    onClose(turnsRef.current);
  };

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatar nome amigável para vozes
  const formatVoiceName = (voice: SpeechSynthesisVoice) => {
    let label = voice.name;
    const isNatural = label.toLowerCase().includes('natural') || label.toLowerCase().includes('online');
    const isGoogle = label.toLowerCase().includes('google');

    label = label.replace(/microsoft/gi, '').replace(/google/gi, '').replace(/portuguese/gi, '').replace(/\(brazil\)/gi, '').replace(/brasil/gi, '').trim();

    if (isNatural) return `🌟 ${label || 'Natural'} (Humana HD)`;
    if (isGoogle) return `⚡ ${label || 'Google'} (Neural)`;
    return `🎙️ ${label || voice.name}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-slate-950 via-[#150d2a] to-[#0a0614] border border-purple-500/25 rounded-3xl p-5 sm:p-7 shadow-[0_0_80px_-20px_rgba(124,58,237,0.4)] flex flex-col items-center justify-between min-h-[620px] overflow-hidden">
        
        {/* Glows de Fundo da Identidade Syngular (Mesmo tom da Login Page) */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#8b5cf6]/20 rounded-full blur-3xl pointer-events-none -ml-24 -mt-24"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#7c3aed]/20 rounded-full blur-3xl pointer-events-none -mr-24 -mb-24"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#5c24ff]/25 rounded-full blur-3xl pointer-events-none"></div>

        {/* Camada de Granulação Orgânica (Textura Granulada / Film Grain) */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.28] mix-blend-overlay z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Vinheta de Profundidade */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#0a0614]/30 to-[#0a0614]/75 pointer-events-none z-0"></div>
        
        {/* Borda reflexiva sutil interna */}
        <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none z-10"></div>

        {/* Top Header */}
        <div className="w-full flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <SynRobotMascot size="sm" />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-white tracking-wide">SynCop Direto</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {customVoiceName ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/25 text-[#d8b4fe] border border-purple-400/40 text-[10px] font-bold flex items-center gap-1 shadow-[0_0_12px_rgba(124,58,237,0.35)] backdrop-blur-md">
                    <Sparkles className="w-3 h-3 text-[#c084fc] animate-pulse" />
                    <span>{customVoiceName}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/15 text-[10px] font-medium backdrop-blur-md">
                    Voz Padrão
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-purple-300/80">
                {formatTimer(callDuration)} &bull; Baixa latência
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Seletor de Vozes & Configurações */}
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className={`p-2 rounded-full border transition-all cursor-pointer backdrop-blur-md ${
                showVoiceSettings 
                  ? 'bg-[#5c24ff] border-purple-300 text-white shadow-[0_0_15px_rgba(92,36,255,0.5)]' 
                  : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10 hover:border-white/20'
              }`}
              title="Configurar Voz e Timbre"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>

            {/* Alternar Modo (Viva-Voz vs Push-to-Talk) */}
            <button
              onClick={() => {
                stopSpeaking();
                setMode(m => m === 'hands-free' ? 'push-to-talk' : 'hands-free');
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-purple-200 text-[11px] font-medium hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
              title="Alternar entre Viva-Voz contínuo e Pressione para Falar"
            >
              <Radio className="w-3 h-3 text-[#c084fc]" />
              <span>{mode === 'hands-free' ? 'Viva-Voz' : 'PTT'}</span>
            </button>
          </div>
        </div>

        {/* Gaveta de Configurações de Voz & Clonagem */}
        {showVoiceSettings && (
          <div className="w-full mt-3 p-4 bg-slate-950/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl relative z-20 space-y-3 animate-in fade-in zoom-in-95 duration-150 shadow-2xl shadow-purple-950/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#a882ff]" />
                Voz do Assistente:
              </span>
              <span className="text-[10px] text-purple-300 font-medium">
                {customVoiceName ? 'Sua voz gravada ativa' : 'Voz neural selecionada'}
              </span>
            </div>

            <div className="flex gap-2 items-center">
              <select
                value={selectedVoiceUri}
                onChange={(e) => {
                  setSelectedVoiceUri(e.target.value);
                  const v = availableVoices.find(item => item.voiceURI === e.target.value);
                  if (v) handleTestVoice(v);
                }}
                className="flex-1 bg-white/5 border border-white/15 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-purple-400 backdrop-blur-md"
              >
                {availableVoices.length === 0 ? (
                  <option value="">Carregando vozes do sistema...</option>
                ) : (
                  availableVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI} className="bg-slate-900 text-white">
                      {formatVoiceName(v)}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={() => handleTestVoice()}
                disabled={testingVoice}
                className="px-2.5 py-1.5 bg-[#5c24ff] hover:bg-[#4d1cdb] active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-all shadow-xs"
                title="Ouvir teste desta voz"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Testar</span>
              </button>
            </div>

            {/* Ajuste de Velocidade */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px] text-purple-200">
              <span>Velocidade de fala:</span>
              <div className="flex gap-1">
                {[0.9, 1.05, 1.25, 1.4].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setSpeechRate(rate)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer transition-colors ${
                      speechRate === rate 
                        ? 'bg-[#5c24ff] text-white font-bold shadow-xs' 
                        : 'bg-white/5 text-purple-300 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alerta de Erro se houver */}
        {errorMessage && (
          <div className="w-full mt-3 p-3 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-center gap-2 text-rose-200 text-xs relative z-10 animate-fade-in backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Centro: Orbe Sonora Granulada Holográfica tipo Jarvis */}
        <div className="my-auto flex flex-col items-center justify-center relative z-10 py-2 sm:py-4">
          <div className="relative flex items-center justify-center">
            
            {/* 🌌 Anéis Holográficos Externos tipo HUD Jarvis */}
            {/* Anel 1: Órbita Externa Rotativa com Marcadores HUD */}
            <div className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-dashed border-purple-400/25 animate-[spin_30s_linear_infinite] pointer-events-none flex items-center justify-center">
              <span className="absolute -top-1 w-2 h-2 rounded-full bg-[#c084fc] shadow-[0_0_8px_#c084fc]"></span>
              <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-[#7c3aed] shadow-[0_0_8px_#7c3aed]"></span>
              <span className="absolute -left-1 w-2 h-2 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]"></span>
              <span className="absolute -right-1 w-2 h-2 rounded-full bg-[#5c24ff] shadow-[0_0_8px_#5c24ff]"></span>
            </div>

            {/* Anel 2: Giroscópio Segmentado em Rotação Reversa */}
            <div className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-dotted border-purple-300/20 animate-[spin_14s_linear_infinite_reverse] pointer-events-none"></div>

            {/* Ondas de Choque Acústicas quando Falando */}
            {callState === 'speaking' && (
              <>
                <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-[#c084fc]/60 animate-ping opacity-60 pointer-events-none"></div>
                <div className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-[#7c3aed]/40 animate-pulse pointer-events-none"></div>
                <div className="absolute w-68 h-68 sm:w-76 sm:h-76 rounded-full border border-[#5c24ff]/20 animate-pulse delay-150 pointer-events-none"></div>
              </>
            )}

            {callState === 'listening' && (
              <>
                <div className="absolute w-44 h-44 rounded-full border border-emerald-400/50 animate-ping opacity-60 pointer-events-none"></div>
                <div className="absolute w-56 h-56 rounded-full border border-emerald-500/30 animate-pulse pointer-events-none"></div>
              </>
            )}

            {callState === 'thinking' && (
              <div className="absolute w-50 h-50 rounded-full border-2 border-t-[#c084fc] border-r-transparent border-b-[#5c24ff] border-l-transparent animate-spin pointer-events-none"></div>
            )}

            {/* 🔮 O GLOBO GRANULADO HOLOGRÁFICO JARVIS */}
            <div 
              onClick={() => {
                if (callState === 'speaking') stopSpeaking();
              }}
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center relative cursor-pointer select-none transition-all duration-300 overflow-hidden ${
                callState === 'speaking'
                  ? 'scale-105 shadow-[0_0_70px_rgba(168,85,247,0.7),inset_0_0_35px_rgba(192,132,252,0.5)] border-2 border-[#c084fc]/80'
                  : callState === 'listening'
                  ? 'scale-105 shadow-[0_0_60px_rgba(16,185,129,0.7),inset_0_0_30px_rgba(52,211,153,0.5)] border-2 border-emerald-400/80'
                  : callState === 'thinking'
                  ? 'scale-95 shadow-[0_0_50px_rgba(92,36,255,0.6),inset_0_0_30px_rgba(139,92,246,0.5)] border-2 border-purple-500/60'
                  : 'scale-100 shadow-[0_0_40px_rgba(124,58,237,0.35),inset_0_0_25px_rgba(124,58,237,0.25)] border border-purple-400/30 hover:border-purple-400/60'
              }`}
              style={{
                background: callState === 'speaking'
                  ? 'radial-gradient(circle at 40% 35%, #c084fc 0%, #7c3aed 45%, #2e1065 75%, #0d0722 100%)'
                  : callState === 'listening'
                  ? 'radial-gradient(circle at 40% 35%, #34d399 0%, #059669 45%, #064e3b 75%, #022c22 100%)'
                  : callState === 'thinking'
                  ? 'radial-gradient(circle at 50% 50%, #818cf8 0%, #4f46e5 45%, #1e1b4b 75%, #0b0920 100%)'
                  : 'radial-gradient(circle at 40% 35%, #6d28d9 0%, #4c1d95 45%, #1e1338 75%, #0a0614 100%)'
              }}
              title={callState === 'speaking' ? 'Clique para interromper a fala' : undefined}
            >
              {/* ✨ CAMADA 1: Textura Granulada Orgânica Densa do Globo (Partículas Estilo Jarvis) */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-55 mix-blend-color-dodge z-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='jarvisNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23jarvisNoise)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat',
                }}
              />

              {/* 🌐 CAMADA 2: Malha Tridimensional Holográfica (Latitude & Longitude Jarvis) */}
              <svg 
                className={`absolute inset-0 w-full h-full pointer-events-none z-10 transition-transform duration-700 ${
                  callState === 'speaking' ? 'animate-[spin_10s_linear_infinite] opacity-65' : 'opacity-40 animate-[spin_20s_linear_infinite]'
                }`} 
                viewBox="0 0 100 100"
              >
                {/* Linhas de grade polar */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeDasharray="3 2" />
                <ellipse cx="50" cy="50" rx="32" ry="46" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
                <ellipse cx="50" cy="50" rx="16" ry="46" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" strokeDasharray="2 3" />
                <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" strokeDasharray="1 2" />
              </svg>

              {/* ⚡ CAMADA 3: Brilho Especular Superior de Esfera 3D */}
              <div className="absolute inset-0 bg-radial from-white/35 via-transparent to-transparent pointer-events-none z-20 rounded-full"></div>

              {/* 🎙️ CAMADA 4: Núcleo Central de Reação e Ícone */}
              <div className="relative z-30 flex flex-col items-center justify-center">
                {callState === 'speaking' && (
                  <div className="flex flex-col items-center">
                    <Volume2 className="w-11 h-11 sm:w-12 sm:h-12 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)] animate-pulse" />
                    <span className="text-[9px] font-mono tracking-widest text-purple-100 font-extrabold uppercase mt-1 animate-pulse">
                      JARVIS CORE
                    </span>
                  </div>
                )}
                {callState === 'listening' && (
                  <div className="flex flex-col items-center">
                    <Mic className="w-11 h-11 sm:w-12 sm:h-12 text-white drop-shadow-[0_0_15px_rgba(52,211,153,0.9)] animate-pulse" />
                    <span className="text-[9px] font-mono tracking-widest text-emerald-100 font-extrabold uppercase mt-1">
                      RECEPTOR
                    </span>
                  </div>
                )}
                {callState === 'thinking' && (
                  <div className="flex flex-col items-center">
                    <Sparkles className="w-11 h-11 sm:w-12 sm:h-12 text-[#e0e7ff] drop-shadow-[0_0_15px_rgba(199,210,254,0.9)] animate-spin" />
                    <span className="text-[9px] font-mono tracking-widest text-indigo-100 font-extrabold uppercase mt-1">
                      CALCULANDO
                    </span>
                  </div>
                )}
                {callState === 'paused' && (
                  <div className="flex flex-col items-center">
                    <MicOff className="w-11 h-11 sm:w-12 sm:h-12 text-slate-300 drop-shadow-sm" />
                    <span className="text-[9px] font-mono tracking-widest text-slate-300 font-extrabold uppercase mt-1">
                      MUTADO
                    </span>
                  </div>
                )}
                {callState === 'idle' && (
                  <div className="flex flex-col items-center">
                    <Mic className="w-11 h-11 sm:w-12 sm:h-12 text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
                    <span className="text-[9px] font-mono tracking-widest text-purple-200 font-bold uppercase mt-1">
                      ATIVO
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Equalizador Estético de Áudio */}
          <div className="flex items-center justify-center gap-1.5 mt-5 h-6">
            {[35, 65, 95, 55, 90, 45, 80, 60, 30].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full transition-all duration-150"
                style={{
                  height: callState === 'speaking' 
                    ? `${Math.max(12, h * (0.5 + (i % 3) * 0.25))}%` 
                    : callState === 'listening'
                    ? `${Math.max(16, h * 0.4)}%`
                    : '4px',
                  backgroundColor: callState === 'speaking' 
                    ? '#c084fc' 
                    : callState === 'listening' 
                    ? '#34d399' 
                    : 'rgba(255,255,255,0.2)',
                  opacity: callState === 'idle' ? 0.3 : 0.95
                }}
              />
            ))}
          </div>

          {/* Status Textual em Pill Glassmorphic */}
          <div className="mt-3 text-center">
            <span className="text-xs uppercase tracking-widest font-bold px-3.5 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-slate-200 shadow-xs inline-flex items-center gap-1.5">
              {callState === 'listening' && '🟢 Ouvindo você... Pode falar'}
              {callState === 'thinking' && '🟣 SynCop processando resposta...'}
              {callState === 'speaking' && (customVoiceName ? `🔊 Falando com sua voz (${customVoiceName})` : '🔊 SynCop falando (toque p/ pausar)')}
              {callState === 'paused' && '⏸️ Microfone mutado'}
              {callState === 'idle' && 'Pronto para conversar'}
            </span>
          </div>
        </div>

        {/* Caixa de Transcrição e Retorno ao Vivo */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs relative z-10 max-h-36 overflow-y-auto">
          {/* O que o usuário está dizendo ou disse */}
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
              <Mic className="w-3 h-3" /> Você:
            </span>
            <p className="text-slate-200 leading-snug">
              {interimTranscript ? (
                <span className="text-slate-400 italic">{interimTranscript}...</span>
              ) : (
                userTranscript || <span className="text-slate-500 italic">Pode falar qualquer dúvida operacional ou comercial...</span>
              )}
            </p>
          </div>

          {/* O que a IA respondeu */}
          {assistantReply && (
            <div className="pt-2 border-t border-white/10 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[#c084fc] tracking-wider flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-[#a882ff]" /> 
                {customVoiceName ? `SynCop (${customVoiceName}):` : 'SynCop:'}
              </span>
              <p className="text-purple-100 font-medium leading-snug">{assistantReply}</p>
            </div>
          )}
        </div>

        {/* Barra de Controles Inferior */}
        <div className="w-full pt-4 flex items-center justify-center gap-4 relative z-10">
          
          {/* Botão Mudo / Desmudo */}
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-full transition-all cursor-pointer backdrop-blur-md ${
              isMuted 
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-950/60' 
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
            }`}
            title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Botão Push-to-Talk (Apenas ativo se modo for PTT) */}
          {mode === 'push-to-talk' && (
            <button
              onMouseDown={handlePushToTalkStart}
              onMouseUp={handlePushToTalkEnd}
              onTouchStart={handlePushToTalkStart}
              onTouchEnd={handlePushToTalkEnd}
              className={`px-5 py-3.5 rounded-full font-bold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg ${
                callState === 'listening'
                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30'
                  : 'bg-[#5c24ff] hover:bg-[#4d1cdb] text-white border border-purple-400/30 shadow-[0_0_20px_rgba(92,36,255,0.4)]'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{callState === 'listening' ? 'Solte para Enviar' : 'Segure para Falar'}</span>
            </button>
          )}

          {/* Botão Interromper Fala (Barge-in manual) */}
          {callState === 'speaking' && (
            <button
              onClick={stopSpeaking}
              className="p-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-purple-400/40 text-purple-200 backdrop-blur-md transition-all cursor-pointer shadow-lg shadow-purple-950/50"
              title="Interromper fala do SynCop"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}

          {/* Botão Encerrar Ligação */}
          <button
            onClick={handleEndCall}
            className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/60 transition-all cursor-pointer active:scale-95 flex items-center justify-center border border-rose-400/30"
            title="Encerrar ligação e salvar transcrição no chat"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};
