import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Product, CustomRule } from '../contexts/AppContext';
import { queryGeminiVoiceTurn } from '../lib/assistantBrain';
import { SynRobotMascot } from './syngular-logo';
import { 
  PhoneOff, Mic, MicOff, Volume2, VolumeX,
  Radio, Sparkles, AlertCircle
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
  const [speechRate, setSpeechRate] = useState<number>(1.1);
  const [userTranscript, setUserTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [turns, setTurns] = useState<VoiceConversationTurn[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const isSpeakingRef = useRef<boolean>(false);
  const turnsRef = useRef<VoiceConversationTurn[]>([]);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  turnsRef.current = turns;

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

  // Cancela fala do sintetizador se fechar
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    isSpeakingRef.current = false;
    activeUtteranceRef.current = null;
  }, []);

  // Falar texto com o sintetizador de voz do navegador (pt-BR)
  const speakText = useCallback((textToSpeak: string, onEndCallback?: () => void) => {
    if (!synthRef.current || !textToSpeak.trim()) {
      if (onEndCallback) onEndCallback();
      return;
    }

    stopSpeaking();
    setCallState('speaking');
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    // Tenta selecionar uma voz em português brasileiro natural
    const voices = synthRef.current.getVoices();
    const ptVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.includes('pt'));
    const preferredVoice = ptVoices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Luciana') || v.name.includes('Francisca')) || ptVoices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      isSpeakingRef.current = false;
      activeUtteranceRef.current = null;
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      isSpeakingRef.current = false;
      activeUtteranceRef.current = null;
      if (onEndCallback) onEndCallback();
    };

    activeUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [speechRate, stopSpeaking]);

  // Processar fala do usuário via Gemini e responder
  const handleProcessUserSpeech = useCallback(async (speechText: string) => {
    const query = speechText.trim();
    if (!query) {
      setCallState('listening');
      return;
    }

    stopSpeaking();
    setCallState('thinking');
    setUserTranscript(query);
    setInterimTranscript('');

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

      // Fala a resposta e ao terminar retoma escuta se for viva-voz
      speakText(cleanReply, () => {
        if (mode === 'hands-free' && !isMuted) {
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
      const fallback = 'Tive uma pequena oscilação aqui na linha. Pode repetir para mim, parceiro?';
      setAssistantReply(fallback);
      speakText(fallback, () => {
        setCallState('listening');
      });
    }
  }, [geminiApiKey, knowledgeBase, customRules, mode, isMuted, speakText, stopSpeaking]);

  // Inicialização do Reconhecimento de Fala (STT Local)
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMessage('Seu navegador não suporta reconhecimento de fala nativo. Utilize o Google Chrome, Edge ou Safari para conversar por voz.');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'pt-BR';
    recognition.continuous = mode === 'hands-free';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setErrorMessage(null);
      if (!isSpeakingRef.current) {
        setCallState('listening');
      }
    };

    recognition.onresult = (event: any) => {
      // Se a IA estiver falando e o usuário começar a falar, interrompe a IA (Barge-in natural)
      if (isSpeakingRef.current) {
        stopSpeaking();
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
        setInterimTranscript('');
        setUserTranscript(final);

        // No modo viva-voz, após detectar pausa ou sentença final, dispara para a IA
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          handleProcessUserSpeech(final);
        }, 800);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Silêncio normal, ignora
        return;
      }
      if (event.error === 'not-allowed') {
        setErrorMessage('Permissão de microfone negada. Clique no cadeado na barra de endereços para permitir o acesso.');
        setCallState('paused');
        return;
      }
      console.warn('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      // No modo viva-voz contínuo, reinicia automaticamente se não estiver em pensamento ou fala
      if (isOpen && mode === 'hands-free' && !isMuted && !isSpeakingRef.current && callState !== 'thinking') {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;

    // Saudação inicial de abertura da ligação
    const initialGreeting = 'Fala parceiro! SynCop na linha. O que você precisa resolver hoje?';
    setAssistantReply(initialGreeting);
    speakText(initialGreeting, () => {
      setCallState('listening');
      try {
        recognition.start();
      } catch {}
    });

    return () => {
      clearTimeout(silenceTimerRef.current);
      stopSpeaking();
      try {
        recognition.stop();
      } catch {}
    };
  }, [isOpen, mode, speakText, stopSpeaking, handleProcessUserSpeech, isMuted]);

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
        recognitionRef.current?.stop();
      } catch {}
    }
  };

  // Encerrar chamada
  const handleEndCall = () => {
    stopSpeaking();
    try {
      recognitionRef.current?.stop();
    } catch {}
    onClose(turnsRef.current);
  };

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#130d2a] via-[#0f0920] to-[#090514] border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center justify-between min-h-[580px] overflow-hidden">
        
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#5c24ff]/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header */}
        <div className="w-full flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <SynRobotMascot size="sm" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-wide">SynCop Direto</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <span className="text-[11px] font-mono text-purple-300/80">
                {formatTimer(callDuration)} &bull; Ultra-baixo consumo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle de Velocidade da Voz */}
            <button
              onClick={() => {
                const nextRate = speechRate === 1.0 ? 1.25 : (speechRate === 1.25 ? 1.5 : 1.0);
                setSpeechRate(nextRate);
              }}
              className="px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-800/60 text-purple-200 text-[11px] font-mono font-bold hover:bg-purple-900/60 transition-colors cursor-pointer"
              title="Velocidade da voz do SynCop"
            >
              {speechRate}x
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
              <span>{mode === 'hands-free' ? 'Viva-Voz' : 'Push-to-Talk'}</span>
            </button>
          </div>
        </div>

        {/* Alerta de Erro se houver */}
        {errorMessage && (
          <div className="w-full mt-3 p-3 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-center gap-2 text-rose-200 text-xs relative z-10 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Centro: Orbe Sonora Pulsante */}
        <div className="my-auto flex flex-col items-center justify-center relative z-10 py-4">
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
              className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative ${
                callState === 'listening'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/40 scale-105'
                  : callState === 'speaking'
                  ? 'bg-gradient-to-tr from-[#5c24ff] via-[#8b5cf6] to-[#ec4899] shadow-purple-500/50 scale-105 animate-pulse'
                  : callState === 'thinking'
                  ? 'bg-gradient-to-tr from-purple-800 to-indigo-600 shadow-purple-900/60 scale-95'
                  : 'bg-slate-800 shadow-slate-900/40 scale-100'
              }`}
            >
              {callState === 'speaking' && <Volume2 className="w-12 h-12 text-white animate-bounce" />}
              {callState === 'listening' && <Mic className="w-12 h-12 text-white animate-pulse" />}
              {callState === 'thinking' && <Sparkles className="w-12 h-12 text-purple-200 animate-spin" />}
              {callState === 'paused' && <MicOff className="w-12 h-12 text-slate-400" />}
              {callState === 'idle' && <Mic className="w-12 h-12 text-white/80" />}
            </div>
          </div>

          {/* Status Textual */}
          <div className="mt-6 text-center">
            <span className="text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200">
              {callState === 'listening' && '🟢 Ouvindo você... Fale à vontade'}
              {callState === 'thinking' && '🟣 SynCop pensando...'}
              {callState === 'speaking' && '🔊 SynCop falando...'}
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
                userTranscript || <span className="text-slate-500 italic">Comece a falar qualquer dúvida sobre Certifica ERP, Ponto, GED, SST ou normas...</span>
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
