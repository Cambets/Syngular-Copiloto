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
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#130d2a] via-[#0f0920] to-[#090514] border border-purple-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col items-center justify-between min-h-[600px] overflow-hidden">
        
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#5c24ff]/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header */}
        <div className="w-full flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <SynRobotMascot size="sm" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-wide">SynCop Direto</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {customVoiceName && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    ✨ {customVoiceName}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-purple-300/80">
                {formatTimer(callDuration)} &bull; Ultra-baixo consumo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Seletor de Vozes & Configurações */}
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className={`p-2 rounded-full border transition-colors cursor-pointer ${
                showVoiceSettings 
                  ? 'bg-purple-600 border-purple-400 text-white' 
                  : 'bg-purple-950/60 border-purple-800/60 text-purple-200 hover:bg-purple-900/60'
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
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/60 text-purple-200 text-[11px] font-medium hover:bg-purple-900/60 transition-colors cursor-pointer"
              title="Alternar entre Viva-Voz contínuo e Pressione para Falar"
            >
              <Radio className="w-3 h-3 text-[#a78bfa]" />
              <span>{mode === 'hands-free' ? 'Viva-Voz' : 'PTT'}</span>
            </button>
          </div>
        </div>

        {/* Gaveta de Configurações de Voz & Clonagem */}
        {showVoiceSettings && (
          <div className="w-full mt-3 p-3.5 bg-purple-950/80 border border-purple-800/70 rounded-2xl relative z-20 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                Voz do Assistente:
              </span>
              <span className="text-[10px] text-purple-300 font-medium">
                Voz neural ativa
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
                className="flex-1 bg-slate-900/90 border border-purple-700/60 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-purple-400"
              >
                {availableVoices.length === 0 ? (
                  <option value="">Carregando vozes do sistema...</option>
                ) : (
                  availableVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {formatVoiceName(v)}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={() => handleTestVoice()}
                disabled={testingVoice}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                title="Ouvir teste desta voz"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Testar</span>
              </button>
            </div>

            {/* Ajuste de Velocidade */}
            <div className="flex items-center justify-between pt-1 border-t border-purple-900/60 text-[11px] text-purple-200">
              <span>Velocidade de fala:</span>
              <div className="flex gap-1">
                {[0.9, 1.05, 1.25, 1.4].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setSpeechRate(rate)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer transition-colors ${
                      speechRate === rate 
                        ? 'bg-purple-500 text-white font-bold' 
                        : 'bg-purple-900/60 text-purple-300 hover:bg-purple-800'
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
          <div className="w-full mt-3 p-3 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-center gap-2 text-rose-200 text-xs relative z-10 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Centro: Orbe Sonora Pulsante */}
        <div className="my-auto flex flex-col items-center justify-center relative z-10 py-3">
          <div className="relative flex items-center justify-center">
            
            {/* Anéis de pulso de áudio */}
            {callState === 'listening' && (
              <>
                <div className="absolute w-44 h-44 rounded-full border border-emerald-500/40 animate-ping opacity-60"></div>
                <div className="absolute w-56 h-56 rounded-full border border-emerald-500/20 animate-pulse"></div>
              </>
            )}

            {callState === 'speaking' && (
              <>
                <div className="absolute w-44 h-44 rounded-full border border-[#a78bfa]/50 animate-ping opacity-75"></div>
                <div className="absolute w-56 h-56 rounded-full border border-[#5c24ff]/30 animate-pulse"></div>
              </>
            )}

            {callState === 'thinking' && (
              <div className="absolute w-48 h-48 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-purple-600 border-l-transparent animate-spin"></div>
            )}

            {/* Núcleo da Orbe */}
            <div 
              onClick={() => {
                if (callState === 'speaking') stopSpeaking();
              }}
              className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative cursor-pointer ${
                callState === 'listening'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/40 scale-105'
                  : callState === 'speaking'
                  ? 'bg-gradient-to-tr from-[#5c24ff] via-[#8b5cf6] to-[#ec4899] shadow-purple-500/50 scale-105 animate-pulse'
                  : callState === 'thinking'
                  ? 'bg-gradient-to-tr from-purple-800 to-indigo-600 shadow-purple-900/60 scale-95'
                  : 'bg-slate-800 shadow-slate-900/40 scale-100'
              }`}
              title={callState === 'speaking' ? 'Clique para interromper a fala' : undefined}
            >
              {callState === 'speaking' && <Volume2 className="w-12 h-12 text-white animate-bounce" />}
              {callState === 'listening' && <Mic className="w-12 h-12 text-white animate-pulse" />}
              {callState === 'thinking' && <Sparkles className="w-12 h-12 text-purple-200 animate-spin" />}
              {callState === 'paused' && <MicOff className="w-12 h-12 text-slate-400" />}
              {callState === 'idle' && <Mic className="w-12 h-12 text-white/80" />}
            </div>
          </div>

          {/* Status Textual */}
          <div className="mt-5 text-center">
            <span className="text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200">
              {callState === 'listening' && '🟢 Ouvindo você... Pode falar'}
              {callState === 'thinking' && '🟣 SynCop processando resposta...'}
              {callState === 'speaking' && '🔊 SynCop falando (clique na esfera p/ pausar)'}
              {callState === 'paused' && '⏸️ Microfone mutado'}
              {callState === 'idle' && 'Pronto para conversar'}
            </span>
          </div>
        </div>

        {/* Caixa de Transcrição e Retorno ao Vivo */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs relative z-10 max-h-36 overflow-y-auto">
          {/* O que o usuário está dizendo ou disse */}
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Você:</span>
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
            <div className="pt-2 border-t border-white/5 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">SynCop:</span>
              <p className="text-purple-100 font-medium leading-snug">{assistantReply}</p>
            </div>
          )}
        </div>

        {/* Barra de Controles Inferior */}
        <div className="w-full pt-4 flex items-center justify-center gap-4 relative z-10">
          
          {/* Botão Mudo / Desmudo */}
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-full transition-all cursor-pointer ${
              isMuted 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
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
                  : 'bg-[#5c24ff] hover:bg-[#6e39ff] text-white'
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
              className="p-3.5 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 transition-all cursor-pointer"
              title="Interromper fala do SynCop"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}

          {/* Botão Encerrar Ligação */}
          <button
            onClick={handleEndCall}
            className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/40 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            title="Encerrar ligação e salvar transcrição no chat"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};
