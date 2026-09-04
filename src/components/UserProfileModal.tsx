import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  X, User as UserIcon, Lock, Key, ShieldCheck, 
  Check, AlertCircle, Eye, EyeOff, Building, Mail, Sparkles 
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, changeCurrentUserPassword } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setErrorMessage('Por favor, informe sua senha atual.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('A confirmação da nova senha não confere.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('A nova senha deve ser diferente da senha atual.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeCurrentUserPassword(currentPassword, newPassword);
      if (res.success) {
        setSuccessMessage(res.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Erro ao alterar senha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-white dark:bg-[#15102a] border border-slate-200 dark:border-purple-800/70 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-purple-900/40 flex items-center justify-between bg-slate-50/70 dark:bg-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#7c3aed] to-[#4d1cdb] text-white flex items-center justify-center font-extrabold text-sm shadow-md">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Meu Perfil & Segurança</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300">
                Gerencie seus dados e credenciais de acesso
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-purple-900/40 rounded-lg transition-colors cursor-pointer"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          
          {/* User Info Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1b1435] border border-slate-200/80 dark:border-purple-800/40 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-purple-900/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#7c3aed]" />
                Nome Completo:
              </span>
              <strong className="text-slate-800 dark:text-slate-100 font-bold truncate max-w-[200px]">{currentUser.name}</strong>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-purple-900/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#7c3aed]" />
                E-mail:
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">{currentUser.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#7c3aed]" />
                Função / Vínculo:
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-900/50 text-[#7c3aed] dark:text-purple-300">
                {currentUser.role === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    <span>Administrador</span>
                  </>
                ) : (
                  <span>{currentUser.department || 'Consultor / Parceiro'}</span>
                )}
              </span>
            </div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white pb-1 border-b border-slate-100 dark:border-purple-900/40">
              <Key className="w-4 h-4 text-[#7c3aed]" />
              <span>Alterar Minha Senha</span>
            </div>

            {/* Alert Messages */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Current Password Field */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Senha Atual
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  placeholder="Sua senha atual..."
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-[#1b1435] border border-slate-200 dark:border-purple-800/60 focus:border-[#7c3aed] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Nova Senha
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 4 caracteres..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-[#1b1435] border border-slate-200 dark:border-purple-800/60 focus:border-[#7c3aed] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="Repita a nova senha..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-[#1b1435] border border-slate-200 dark:border-purple-800/60 focus:border-[#7c3aed] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-3"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
