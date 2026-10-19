import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Square, Check, X,
  Sparkles, CheckCircle2, AlertCircle,
  Loader2, Trash2, Volume2
} from 'lucide-react';
import { SynRobotMascot } from './syngular-logo';
import { replicateVoiceDirect, synthesizeGeminiVoice } from '../lib/assistantBrain';

interface VoiceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name: string; email: string };
  geminiApiKey?: string;
}

// Converte áudio gravado no navegador para WAV 24kHz 16-bit mono exigido pelo Gemini
async function convertBlobToWav24k(audioBlob: Blob): Promise<string> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioCtx();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const sampleRate = 24000;
  const numChannels = 1;

  // Renderizar para 24kHz mono
  const offlineCtx = new OfflineAudioContext(numChannels, Math.ceil(decodedBuffer.duration * sampleRate), sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);
  const numSamples = channelData.length;

  const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  let binary = '';
  const bytes = new Uint8Array(wavBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const VoiceStudioModal: React.FC<VoiceStudioModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  geminiApiKey
}) => {
  // Amostra de fala (10 a 30s)
  const [sampleAudioBlob, setSampleAudioBlob] = useState<Blob | null>(null);
  const [sampleAudioUrl, setSampleAudioUrl] = useState<string | null>(null);
  const [isRecordingSample, setIsRecordingSample] = useState(false);
  const [sampleDuration, setSampleDuration] = useState(0);

  // Consentimento obrigatório
  const [consentAudioBlob, setConsentAudioBlob] = useState<Blob | null>(null);
  const [consentAudioUrl, setConsentAudioUrl] = useState<string | null>(null);
  const [isRecordingConsent, setIsRecordingConsent] = useState(false);
  const [consentDuration, setConsentDuration] = useState(0);

  // Estados de processamento e feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Carregar status prévio da voz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('syncop_custom_voice_id');
      if (existing) {
        setSavedVoiceId(existing);
      }
    }
  }, [isOpen]);

  // Limpeza ao fechar
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current = null;
      }
      setIsRecordingSample(false);
      setIsRecordingConsent(false);
      setIsTesting(false);
    }
  }, [isOpen]);

  const startRecording = async (type: 'sample' | 'consent') => {
    setFeedback(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);

        if (type === 'sample') {
          setSampleAudioBlob(blob);
          setSampleAudioUrl(url);
          setIsRecordingSample(false);
        } else {
          setConsentAudioBlob(blob);
          setConsentAudioUrl(url);
          setIsRecordingConsent(false);
        }

        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start(250);

      if (type === 'sample') {
        setIsRecordingSample(true);
        setSampleDuration(0);
        timerRef.current = setInterval(() => setSampleDuration(d => d + 1), 1000);
      } else {
        setIsRecordingConsent(true);
        setConsentDuration(0);
        timerRef.current = setInterval(() => setConsentDuration(d => d + 1), 1000);
      }
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      setFeedback({ type: 'error', message: 'Não foi possível acessar seu microfone. Verifique as permissões de áudio no navegador.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSaveVoice = async () => {
    if (!sampleAudioBlob) {
      setFeedback({ type: 'error', message: 'Por favor, grave a amostra de voz de 15 a 30 segundos.' });
      return;
    }

    if (!consentAudioBlob) {
      setFeedback({ type: 'error', message: 'A gravação do consentimento é obrigatória para ativação.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // 1. Converte gravações locais para WAV 24kHz PCM sem perdas
      const sourceWavB64 = await convertBlobToWav24k(sampleAudioBlob);
      const consentWavB64 = await convertBlobToWav24k(consentAudioBlob);

      const displayName = currentUser?.name ? `Voz Oficial (${currentUser.name})` : 'Voz Oficial Syngular';

      // 2. Envia para replicação
      const result = await replicateVoiceDirect(sourceWavB64, consentWavB64, displayName, geminiApiKey);

      if (result.success && result.voiceId) {
        localStorage.setItem('syncop_custom_voice_id', result.voiceId);
        localStorage.setItem('syncop_custom_voice_name', displayName);
        setSavedVoiceId(result.voiceId);
        setFeedback({
          type: 'success',
          message: 'Sua voz foi validada e vinculada com sucesso! Agora o assistente usará o seu timbre nas chamadas de voz.'
        });
      } else {
        const errorMsg = result.error || 'Não foi possível validar o consentimento. Certifique-se de falar claramente a frase exata sem ruídos de fundo.';
        setFeedback({
          type: 'error',
          message: errorMsg
        });
      }
    } catch (err: any) {
      console.error('Erro ao processar voz:', err);
      setFeedback({ type: 'error', message: 'Erro ao converter áudio. Tente regravar.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Testar a voz diretamente no modal
  const handleTestClonedVoice = async () => {
    if (!savedVoiceId || isTesting) return;
    setIsTesting(true);

    try {
      const phrase = 'Olá parceiro! Esta é a minha voz oficial ativa no Copiloto Syngular.';
      const audioB64 = await synthesizeGeminiVoice(phrase, savedVoiceId, geminiApiKey);

      if (audioB64) {
        const audio = new Audio('data:audio/wav;base64,' + audioB64);
        testAudioRef.current = audio;
        audio.onended = () => setIsTesting(false);
        audio.onerror = () => setIsTesting(false);
        await audio.play();
      } else {
        setIsTesting(false);
        alert('Não foi possível gerar a prévia sonora no momento.');
      }
    } catch (err) {
      console.error('Erro no teste de voz:', err);
      setIsTesting(false);
    }
  };

  const handleRemoveVoice = () => {
    if (confirm('Deseja desativar a sua voz personalizada e voltar para a voz neural padrão?')) {
      localStorage.removeItem('syncop_custom_voice_id');
      localStorage.removeItem('syncop_custom_voice_name');
      setSavedVoiceId(null);
      setSampleAudioBlob(null);
      setSampleAudioUrl(null);
      setConsentAudioBlob(null);
      setConsentAudioUrl(null);
      setFeedback({ type: 'success', message: 'Voz personalizada removida. O assistente voltará a usar as vozes neurais padrão.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white dark:bg-[#120b24] border border-purple-200 dark:border-purple-800/80 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-purple-900/40 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/30">
          <div className="flex items-center gap-2.5">
            <SynRobotMascot size="sm" />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Gravação de Voz Oficial
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                  Exclusivo Gestão
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-purple-300">
                Grave sua voz para que o assistente responda aos usuários com o seu timbre
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          
          {/* Feedback de status */}
          {feedback && (
            <div className={`p-3 rounded-xl flex items-center gap-2 animate-fade-in ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/50' 
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/50'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="leading-snug">{feedback.message}</span>
            </div>
          )}

          {/* Banner de status atual da voz */}
          {savedVoiceId && (
            <div className="p-3 bg-purple-100/70 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                  Sua voz oficial está ATIVA no Copiloto!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestClonedVoice}
                  disabled={isTesting}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Ouvir uma frase falada com a sua voz"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>{isTesting ? 'Falando...' : 'Ouvir Teste'}</span>
                </button>
                <button
                  onClick={handleRemoveVoice}
                  className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Desativar
                </button>
              </div>
            </div>
          )}

          {/* Etapa 1: Amostra de Voz */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-purple-950/20 border border-slate-200 dark:border-purple-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Amostra de Voz (15 a 30 segundos)</span>
              </span>
              {sampleAudioUrl && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Gravada com sucesso
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-purple-300">
              Clique em gravar e leia o texto abaixo em voz alta e tom natural:
            </p>

            <div className="p-3 rounded-xl bg-white dark:bg-[#0c071a] border border-slate-200 dark:border-purple-900/30 text-slate-700 dark:text-purple-200 text-[11px] leading-relaxed italic select-text">
              "Olá! Eu sou o assistente e copiloto inteligente da Syngular. Estou aqui para apoiar nossa equipe em todos os processos de certificação digital, conformidade com as normas do ITI e na operação dos softwares do ecossistema, incluindo o Certifica ERP, Certifica Ponto, Certifica GED e emissões fiscais integradas."
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              {!isRecordingSample ? (
                <button
                  onClick={() => startRecording('sample')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{sampleAudioUrl ? 'Regravar Amostra' : 'Iniciar Gravação'}</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Parar ({sampleDuration}s)</span>
                </button>
              )}

              {sampleAudioUrl && (
                <audio controls src={sampleAudioUrl} className="h-8 max-w-[200px]" />
              )}
            </div>
          </div>

          {/* Etapa 2: Consentimento Obrigatório */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-purple-950/20 border border-slate-200 dark:border-purple-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Autorização de Consentimento Obrigatória</span>
              </span>
              {consentAudioUrl && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Gravado
                </span>
              )}
            </div>

            <p className="text-[11px] text-amber-600 dark:text-amber-300 font-semibold">
              ⚠️ Leia a frase abaixo com clareza exatamente como está escrita (exigência do validador de IA):
            </p>

            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-slate-800 dark:text-amber-100 text-[11px] font-medium leading-relaxed italic select-text">
              "Eu sou o proprietário desta voz e autorizo o Google a usá-la para criar um modelo de voz sintética."
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              {!isRecordingConsent ? (
                <button
                  onClick={() => startRecording('consent')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{consentAudioUrl ? 'Regravar Consentimento' : 'Gravar Consentimento'}</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Parar ({consentDuration}s)</span>
                </button>
              )}

              {consentAudioUrl && (
                <audio controls src={consentAudioUrl} className="h-8 max-w-[200px]" />
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-purple-900/30 flex items-center justify-end gap-2 bg-slate-50/70 dark:bg-[#0f0920]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-purple-900/40 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleSaveVoice}
            disabled={!sampleAudioBlob || !consentAudioBlob || isSubmitting}
            className="px-5 py-2 bg-[#5c24ff] hover:bg-[#4d1cdb] disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando com a IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Salvar & Ativar Minha Voz</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
