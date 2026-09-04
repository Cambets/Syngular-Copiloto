import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { SyngularLogo } from './syngular-logo';
import { 
  Mail, User, Lock, ArrowRight, ShieldCheck, 
  Eye, EyeOff, AlertCircle, CheckCircle2, Briefcase, 
  Sparkles, KeyRound
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, registerUser } = useApp();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Comercial & Vendas');
  const [showPassword, setShowPassword] = useState(false);
  
  // Feedback alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset alert messages when switching tabs
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [activeTab]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Erro ao autenticar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage('A senha deve conter no mínimo 4 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerUser({ email, name, password, department });
      if (res.success) {
        setSuccessMessage(res.message);
        if (email.toLowerCase().trim() === 'marcus.almeida@certifica.com.br') {
          setTimeout(() => {
            setActiveTab('login');
          }, 1200);
        }
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header with Syngular Brand */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <SyngularLogo size="md" />
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <span className="kbd text-[10px]">Esc</span>
          </button>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="p-2 mx-6 mt-4 bg-slate-100/90 rounded-xl flex gap-1 text-xs font-bold">
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
            <span>Acessar Copiloto</span>
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
            <span>Solicitar Acesso</span>
          </button>
        </div>

        {/* Inline Alerts */}
        <div className="px-6 pt-3">
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
        </div>

        {/* Tab 1: Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="seu.nome@certifica.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                />
              </div>
              {email.toLowerCase().trim() === 'marcus.almeida@certifica.com.br' && (
                <span className="text-[10px] text-[#5c24ff] font-bold mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Conta de Administrador Master Detectada
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Senha de Acesso
                </label>
                <span className="text-[10px] text-slate-400">Padrão: admin / vendas</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Informe sua senha..."
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
              <span>Entrar no Copiloto</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Tab 2: Self Registration Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-3.5">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="seu.nome@certifica.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Departamento / Função
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 focus:outline-hidden transition-colors"
                >
                  <option value="Comercial & Vendas">Comercial & Vendas</option>
                  <option value="Suporte Técnico & Fiscal">Suporte Técnico & Fiscal</option>
                  <option value="Autoridade de Registro (AR)">Autoridade de Registro (AR)</option>
                  <option value="Agente de Registro (AGR)">Agente de Registro (AGR)</option>
                  <option value="Franquia / Ponto de Atendimento (PA)">Franquia / Ponto de Atendimento (PA)</option>
                  <option value="Diretoria / Gestão">Diretoria / Gestão</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Criar Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 4 caracteres..."
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
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enviar Solicitação de Acesso</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
