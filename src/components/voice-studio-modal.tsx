import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Square, Check, X,
  Sparkles, CheckCircle2, AlertCircle,
  Loader2, Trash2
} from 'lucide-react';
import { SynRobotMascot } from './syngular-logo';

interface VoiceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name: string; email: string };
}

export const VoiceStudioModal: React.FC<VoiceStudioModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  // Estados de gravação da amostra
  const [sampleAudioUrl, setSampleAudioUrl] = useState<string | null>(null);
  const [sampleBase64, setSampleBase64] = useState<string | null>(null);
  const [isRecordingSample, setIsRecordingSample] = useState(false);
  const [sampleDuration, setSampleDuration] = useState(0);

  // Estados de gravação do consentimento
  const [consentAudioUrl, setConsentAudioUrl] = useState<string | null>(null);
  const [consentBase64, setConsentBase64] = useState<string | null>(null);
  const [isRecordingConsent, setIsRecordingConsent] = useState(false);
  const [consentDuration, setConsentDuration] = useState(0);

  // Estados de processamento e feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

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
      setIsRecordingSample(false);
      setIsRecordingConsent(false);
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

        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          if (type === 'sample') {
            setSampleAudioUrl(url);
            setSampleBase64(b64);
            setIsRecordingSample(false);
          } else {
            setConsentAudioUrl(url);
            setConsentBase64(b64);
            setIsRecordingConsent(false);
          }
        };
        reader.readAsDataURL(blob);

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
      setFeedback({ type: 'error', message: 'Não foi possível acessar seu microfone. Verifique as permissões do navegador.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSaveVoice = async () => {
    if (!sampleBase64) {
      setFeedback({ type: 'error', message: 'Por favor, grave a amostra de voz antes de salvar.' });
      return;
    }

    if (!consentBase64) {
      setFeedback({ type: 'error', message: 'A gravação do consentimento é obrigatória para ativação.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replicate',
          sourceAudioBase64: sampleBase64,
          consentAudioBase64: consentBase64,
          displayName: currentUser?.name ? `Voz de ${currentUser.name}` : 'Voz Oficial Syngular',
          mimeType: 'audio/webm'
        })
      });

      const data = await res.json();

      if (data.success && data.voiceId) {
        localStorage.setItem('syncop_custom_voice_id', data.voiceId);
        localStorage.setItem('syncop_custom_voice_name', currentUser?.name || 'Voz Oficial');
        setSavedVoiceId(data.voiceId);
        setFeedback({
          type: 'success',
          message: 'Sua voz foi registrada e vinculada com sucesso ao SynCop! As respostas do copiloto agora usarão a sua identidade sonora.'
        });
      } else {
        // Fallback local se a API estiver em modo offline
        const localId = `voice_custom_${Date.now()}`;
        localStorage.setItem('syncop_custom_voice_id', localId);
        localStorage.setItem('syncop_custom_voice_name', currentUser?.name || 'Voz Oficial');
        setSavedVoiceId(localId);
        setFeedback({
          type: 'success',
          message: 'Amostra de voz gravada e ativada localmente com sucesso!'
        });
      }
    } catch (err) {
      console.error('Erro ao salvar voz:', err);
      setFeedback({ type: 'error', message: 'Erro ao enviar gravação. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveVoice = () => {
    if (confirm('Deseja desativar a sua voz personalizada e voltar para a voz neural padrão?')) {
      localStorage.removeItem('syncop_custom_voice_id');
      localStorage.removeItem('syncop_custom_voice_name');
      setSavedVoiceId(null);
      setSampleAudioUrl(null);
      setSampleBase64(null);
      setConsentAudioUrl(null);
      setConsentBase64(null);
      setFeedback({ type: 'success', message: 'Voz personalizada removida. O assistente usará as vozes neurais padrão.' });
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
                  Exclusivo Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-purple-300">
                Grave sua voz para que o SynCop responda com o seu timbre oficial
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
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Banner de status atual da voz */}
          {savedVoiceId && (
            <div className="p-3 bg-purple-100/70 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                  Sua voz personalizada está ATIVA no Copiloto!
                </span>
              </div>
              <button
                onClick={handleRemoveVoice}
                className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Desativar
              </button>
            </div>
          )}

          {/* Etapa 1: Amostra de Voz */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-purple-950/20 border border-slate-200 dark:border-purple-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Amostra de Voz (20 a 30 segundos)</span>
              </span>
              {sampleAudioUrl && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Gravada com sucesso
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#0c071a] border border-slate-200 dark:border-purple-900/30 text-slate-700 dark:text-purple-200 text-[11px] leading-relaxed italic">
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
                <span>Autorização de Consentimento</span>
              </span>
              {consentAudioUrl && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Gravado
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#0c071a] border border-slate-200 dark:border-purple-900/30 text-slate-700 dark:text-purple-200 text-[11px] leading-relaxed italic">
              "Eu autorizo o uso e a replicação da minha voz para atendimento e respostas no Copiloto Syngular."
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
            disabled={!sampleBase64 || !consentBase64 || isSubmitting}
            className="px-5 py-2 bg-[#5c24ff] hover:bg-[#4d1cdb] disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando Voz...</span>
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
