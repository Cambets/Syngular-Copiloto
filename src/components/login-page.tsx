import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { SyngularLogo } from './syngular-logo';
import { PurpleParticleOrb } from './PurpleParticleOrb';
import { logger } from '../lib/logger';
import { 
  Mail, User, Lock, ArrowRight, ShieldCheck, 
  Eye, EyeOff, AlertCircle, CheckCircle2, Briefcase, 
  Sparkles, KeyRound, Shield, Check, Globe, X, Smartphone
} from 'lucide-react';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleTokenResponse {
  access_token?: string;
}

interface GoogleGIS {
  accounts?: {
    id?: {
      initialize: (config: { client_id: string; callback: (res: GoogleCredentialResponse) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean }) => void;
      prompt: () => void;
    };
    oauth2?: {
      initTokenClient: (config: { client_id: string; scope: string; callback: (res: GoogleTokenResponse) => void }) => { requestAccessToken: () => void };
    };
  };
}

interface WindowWithGoogle extends Window {
  google?: GoogleGIS;
}

const envClientId = (import.meta as unknown as { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env?.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_ID = envClientId || '703504380960-vh9irbh7tv4lj32uphu4e9h9f8m01g4n.apps.googleusercontent.com';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

interface LoginPageProps {
  onOpenInstallModal?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenInstallModal }) => {
  const { login, loginWithGoogle, registerUser } = useApp();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Autoridade de Registro (AR)');
  const [showPassword, setShowPassword] = useState(false);

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google SSO Modal State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleModalError, setGoogleModalError] = useState<string | null>(null);

  // Inicializa Google Identity Services
  useEffect(() => {
    const initGoogle = () => {
      if (typeof window !== 'undefined') {
        const googleWin = window as unknown as WindowWithGoogle;
        if (googleWin.google?.accounts?.id) {
          try {
            googleWin.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: async (response: GoogleCredentialResponse) => {
                if (response?.credential) {
                  const payload = parseJwt(response.credential);
                  if (payload?.email) {
                    setIsSubmitting(true);
                    try {
                      const res = await loginWithGoogle(payload.email, payload.name);
                      if (res.success) setSuccessMessage(res.message);
                      else setErrorMessage(res.message);
                    } catch {
                      setErrorMessage('Erro ao autenticar com Google.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }
              },
              auto_select: false,
              cancel_on_tap_outside: true,
            });
          } catch (e) {
            logger.warn('Erro ao inicializar Google GIS:', e);
          }
        }
      }
    };

    const googleWin = typeof window !== 'undefined' ? (window as unknown as WindowWithGoogle) : null;
    if (googleWin?.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        const checkWin = window as unknown as WindowWithGoogle;
        if (checkWin.google?.accounts?.id) {
          initGoogle();
          clearInterval(interval);
        }
      }, 400);
      return () => clearInterval(interval);
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Erro ao conectar ao servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await registerUser({
        email,
        name,
        password,
        department
      });
      if (res.success) {
        setSuccessMessage(res.message);
        setActiveTab('login');
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Erro ao cadastrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSSO = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (typeof window !== 'undefined') {
      const googleWin = window as unknown as WindowWithGoogle;
      const google = googleWin.google;
      
      // 1. Tentar OAuth2 Token Client Popup (abre o popup oficial do Google com contas)
      if (google?.accounts?.oauth2) {
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResponse: GoogleTokenResponse) => {
              if (tokenResponse?.access_token) {
                try {
                  setIsSubmitting(true);
                  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                  });
                  if (userInfoRes.ok) {
                    const googleUser = await userInfoRes.json();
                    const res = await loginWithGoogle(googleUser.email, googleUser.name);
                    if (res.success) {
                      setSuccessMessage(res.message);
                    } else {
                      setErrorMessage(res.message);
                    }
                  }
                } catch {
                  setErrorMessage('Erro ao obter dados da conta Google.');
                } finally {
                  setIsSubmitting(false);
                }
              }
            }
          });
          client.requestAccessToken();
          return;
        } catch (err) {
          logger.warn('Google OAuth Token Client erro:', err);
        }
      }

      // 2. Tentar Google GIS Prompt
      if (google?.accounts?.id) {
        try {
          google.accounts.id.prompt();
          return;
        } catch (err) {
          logger.warn('Google GIS prompt erro:', err);
        }
      }
    }

    // 3. Fallback: modal seguro sem pré-preenchimento
    setGoogleEmail('');
    setGoogleName('');
    setGoogleModalError(null);
    setIsGoogleModalOpen(true);
  };

  const handleGoogleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleModalError(null);

    if (!googleEmail.trim()) {
      setGoogleModalError('Por favor, informe seu e-mail do Google.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle(googleEmail.trim(), googleName.trim());
      if (res.success) {
        setIsGoogleModalOpen(false);
        setSuccessMessage(res.message);
      } else {
        setGoogleModalError(res.message);
      }
    } catch {
      setGoogleModalError('Erro ao autenticar com Google. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row bg-slate-900 text-slate-900 font-sans select-none overflow-y-auto relative">
      
      {/* Install PWA Button on Login Screen */}
      {onOpenInstallModal && (
        <button
          onClick={onOpenInstallModal}
          className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-md cursor-pointer shadow-lg active:scale-95"
          title="Instalar como App no Celular ou PC"
        >
          <Smartphone className="w-3.5 h-3.5 text-purple-300" />
          <span>Baixar App (Android / iOS / PC)</span>
        </button>
      )}

      {/* Left Column: Brand Hero & Visual Positioning (Syngular Style) */}
      <div className="lg:w-1/2 bg-gradient-to-br from-slate-950 via-[#150d2a] to-[#0a0614] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        
        {/* Interactive 3D Purple Particle Orb Background */}
        <PurpleParticleOrb radius={270} particleCount={580} className="opacity-85 pointer-events-none" />

        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#8b5cf6]/20 rounded-full blur-3xl pointer-events-none -ml-24 -mt-24"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#7c3aed]/20 rounded-full blur-3xl pointer-events-none -mr-24 -mb-24"></div>

        {/* Top Brand Tag */}
        <div className="relative space-y-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-[#a882ff]" />
            <span>PORTAL OFICIAL DE INTELIGÊNCIA & CAPACITAÇÃO</span>
          </div>

          <div className="flex items-center gap-3">
            <SyngularLogo size="lg" showText={false} />
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                syngular
              </h1>
              <span className="text-xs font-extrabold text-[#a882ff] uppercase tracking-widest block">
                ID & Syn+ Ecosystem
              </span>
            </div>
          </div>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg font-normal">
            Ambiente exclusivo para colaboradores internos, consultores comerciais, atendentes de suporte e franqueados.
          </p>
        </div>

        {/* 3 Core Value Cards */}
        <div className="relative my-8 space-y-3 z-10">
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#5c24ff]/30 text-[#a882ff] flex items-center justify-center font-bold shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Treinamento ICP-Brasil & Softwares de Gestão</h3>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                Domínio completo de regras de emissão, limites de módulos do ERP e requisitos regulatórios do ITI e MTE.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#5c24ff]/30 text-[#a882ff] flex items-center justify-center font-bold shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Quebra Prática de Objeções & Fechamento</h3>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                Argumentos cirúrgicos e roteiros consultivos de alto impacto prontos para uso em ligações e WhatsApp.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#5c24ff]/30 text-[#a882ff] flex items-center justify-center font-bold shrink-0 mt-0.5">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Acesso Híbrido Corporativo & Parceiros</h3>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                Login direto via Google Workspace para equipes internas e aprovação personalizada para parceiros externos.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative pt-4 border-t border-white/10 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 z-10">
          <span>© 2026 Syngular ID & Syn+. Todos os direitos reservados.</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Shield className="w-3 h-3 text-emerald-400" />
            Ambiente 100% Seguro
          </span>
        </div>
      </div>

      {/* Right Column: Authentication Card Shell */}
      <div className="lg:w-1/2 bg-slate-50 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-fade-in">
          
          {/* Card Title Lockup */}
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {activeTab === 'login' ? 'Identificação de Acesso' : 'Solicitação de Acesso de Parceiro'}
            </h2>
            <p className="text-xs text-slate-500">
              {activeTab === 'login' 
                ? 'Selecione seu método de entrada preferido para acessar o Copiloto.'
                : 'Preencha seus dados para receber autorização na plataforma.'
              }
            </p>
          </div>

          {/* Primary Action: Google Workspace SSO Button */}
          <button
            type="button"
            onClick={handleGoogleSSO}
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#5c24ff]/40 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-3 shadow-xs active:scale-[0.99] group"
          >
            {/* Official Google Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="group-hover:text-[#5c24ff] transition-colors">
              Continuar com Google Corporativo
            </span>
          </button>
          
          <div className="text-[10px] text-center text-slate-400 -mt-2">
            Entrada imediata para <strong className="text-slate-600">@certifica.com.br</strong> e <strong className="text-slate-600">@syngular.com.br</strong>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
              ou com e-mail e senha
            </span>
          </div>

          {/* Sub Navigation Tab Toggle */}
          <div className="p-1 bg-slate-100 rounded-xl flex gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'login' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-[#5c24ff]" />
              <span>Entrar com Senha</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'register' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#5c24ff]" />
              <span>Solicitar Acesso (Parceiros)</span>
            </button>
          </div>

          {/* Inline Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-snug">{successMessage}</p>
            </div>
          )}

          {/* Form 1: Direct Credentials Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  E-mail de Acesso 
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@empresa.com.br ou @gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Senha 
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Credencial Protegida</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Sua senha de acesso..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#5c24ff] hover:bg-[#4d1cdb] active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs mt-2"
              >
                <span>Acessar Copiloto</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Form 2: External Partner Registration */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Seu nome ou razão da empresa..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  E-mail de Contato (Qualquer provedor)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="contato@arbrasil.com.br ou @gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Tipo de Vínculo com a Rede
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 focus:outline-hidden transition-colors"
                  >
                    <option value="Autoridade de Registro (AR)">Autoridade de Registro (AR)</option>
                    <option value="Agente de Registro (AGR)">Agente de Registro (AGR)</option>
                    <option value="Franquia / Ponto de Atendimento (PA)">Franquia / Ponto de Atendimento (PA)</option>
                    <option value="Consultor Comercial Externo">Consultor Comercial Externo</option>
                    <option value="Contador Parceiro Indicador">Contador Parceiro Indicador</option>
                    <option value="Colaborador Interno">Colaborador Interno</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Definir Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 4 caracteres..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#5c24ff] hover:bg-[#4d1cdb] active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs mt-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Enviar Solicitação para Aprovação</span>
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Google Authentication Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Entrar com Conta Google</h3>
                  <p className="text-[10px] text-slate-500">Google Workspace & Contas Pessoais</p>
                </div>
              </div>

              <button
                onClick={() => setIsGoogleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGoogleModalSubmit} className="p-4 space-y-3">
              {googleModalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] flex items-center gap-1.5 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{googleModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Seu E-mail Google / Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="seu.email@certifica.com.br ou @gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Seu Nome Completo (Opcional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Como deseja ser chamado(a)..."
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#5c24ff] hover:bg-[#4d1cdb] active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs mt-2"
              >
                <span>{isSubmitting ? 'Autenticando...' : 'Acessar com esta Conta'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
