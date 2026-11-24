import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { SyngularLogo } from './syngular-logo';
import { PurpleParticleOrb } from './PurpleParticleOrb';
import { 
  Mail, User, Lock, ArrowRight, ShieldCheck, 
  Eye, EyeOff, AlertCircle, CheckCircle2, Briefcase, 
  Sparkles, KeyRound, Shield, Check, Globe
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, registerUser } = useApp();
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

    if (!password || password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

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

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row bg-slate-900 text-slate-900 font-sans select-none overflow-y-auto relative">
      
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
                Certifica+ Ecosystem
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
                Acesso seguro para equipes internas e credenciamento de parceiros da rede.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative pt-4 border-t border-white/10 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 z-10">
          <span>© 2026 Syngular ID & Certifica+. Todos os direitos reservados.</span>
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
                    placeholder="Mínimo 6 caracteres..."
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

    </div>
  );
};
