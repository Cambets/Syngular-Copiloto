import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AdminKnowledgeHub } from './AdminKnowledgeHub';
import { 
  Users, Database, Settings, Trash2, 
  Check, Ban, Key, MessageSquare, ArrowLeft,
  Shield, UserCheck, AlertTriangle, Search,
  UserPlus, X, Mail, User, Lock, Briefcase,
  CheckCircle2, AlertCircle
} from 'lucide-react';

interface AdminPanelProps {
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const { 
    users, knowledgeBase, chatHistory, geminiApiKey, setGeminiApiKey,
    updateUserStatus, updateUserRole, resetUserPassword, deleteUser, invitePartner
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'kb' | 'chat_logs' | 'settings'>('users');
  
  // User filter state
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('Autoridade de Registro (AR)');
  const [newUserCustomDept, setNewUserCustomDept] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserPassword, setNewUserPassword] = useState('syngular123');
  const [addUserFeedback, setAddUserFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const pendingUsersCount = users.filter(u => u.status === 'pending').length;

  const handleCustomPasswordReset = async (email: string) => {
    const newPass = prompt(`Defina a nova senha para o usuário ${email}:`, 'syngular123');
    if (newPass && newPass.trim().length > 0) {
      await resetUserPassword(email, newPass.trim());
      alert(`Senha de ${email} redefinida com sucesso para: ${newPass.trim()}`);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserFeedback(null);

    if (!newUserName.trim() || !newUserEmail.trim()) {
      setAddUserFeedback({ type: 'error', message: 'Preencha o nome completo e o e-mail de acesso.' });
      return;
    }

    const finalDept = newUserDepartment === 'Outro' ? (newUserCustomDept.trim() || 'Geral') : newUserDepartment;

    setIsSubmittingUser(true);
    try {
      const res = await invitePartner({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        department: finalDept,
        role: newUserRole,
        password: newUserPassword.trim() || 'syngular123'
      });

      if (res.success) {
        setAddUserFeedback({ type: 'success', message: res.message });
        setTimeout(() => {
          setIsAddUserModalOpen(false);
          setNewUserName('');
          setNewUserEmail('');
          setNewUserCustomDept('');
          setNewUserPassword('syngular123');
          setAddUserFeedback(null);
        }, 1200);
      } else {
        setAddUserFeedback({ type: 'error', message: res.message });
      }
    } catch {
      setAddUserFeedback({ type: 'error', message: 'Erro ao cadastrar usuário. Tente novamente.' });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const filteredUsers = users
    .filter(u => {
      if (userStatusFilter === 'all') return true;
      return u.status === userStatusFilter;
    })
    .filter(u => {
      if (!userSearchTerm.trim()) return true;
      const term = userSearchTerm.toLowerCase();
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.department && u.department.toLowerCase().includes(term))
      );
    });

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col animate-fade-in">
      
      {/* Metric Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 bg-white border border-slate-200 hover:border-[#5c24ff]/50 hover:bg-[#ede8ff]/30 text-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Voltar ao atendimento"
            >
              <ArrowLeft className="w-4 h-4 text-[#5c24ff]" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Painel de Governança & Controle de Acesso
              </h1>
              <p className="text-xs text-slate-500">
                Gerencie colaboradores, aprovação de cadastros, senhas e catálogo de produtos
              </p>
            </div>
          </div>

          {/* Tab Filter Pills */}
          <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'users' ? 'bg-[#5c24ff] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Colaboradores ({users.length})</span>
              {pendingUsersCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${activeTab === 'users' ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white'}`}>
                  {pendingUsersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('kb')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'kb' ? 'bg-[#5c24ff] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Conhecimento ({knowledgeBase.length})
            </button>

            <button
              onClick={() => setActiveTab('chat_logs')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'chat_logs' ? 'bg-[#5c24ff] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Logs ({chatHistory.length})
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'settings' ? 'bg-[#5c24ff] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Configurações
            </button>
          </div>
        </div>

        {/* 3 Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Usuários Ativos / Aprovados</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">
              {users.filter(u => u.status === 'approved').length} de {users.length}
            </span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Pendentes de Aprovação</span>
              <AlertTriangle className={`w-4 h-4 ${pendingUsersCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-300'}`} />
            </div>
            <span className={`text-xl font-extrabold mt-1 block ${pendingUsersCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {pendingUsersCount} solicitações
            </span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Consultas Gravadas</span>
              <MessageSquare className="w-4 h-4 text-[#5c24ff]" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">{chatHistory.length} atendimentos</span>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-5 sm:p-6 bg-white space-y-6">
        
        {/* Tab 1: Users & Access Control */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-bold">
                <button
                  onClick={() => setUserStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    userStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({users.length})
                </button>
                <button
                  onClick={() => setUserStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    userStatusFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <span>Pendentes</span>
                  {pendingUsersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white text-amber-800 font-extrabold">
                      {pendingUsersCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setUserStatusFilter('approved')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    userStatusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Aprovados ({users.filter(u => u.status === 'approved').length})
                </button>
                <button
                  onClick={() => setUserStatusFilter('blocked')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    userStatusFilter === 'blocked' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Bloqueados ({users.filter(u => u.status === 'blocked').length})
                </button>
              </div>

              {/* Search and Add User action buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar colaborador ou e-mail..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
                  />
                </div>

                <button
                  onClick={() => {
                    setAddUserFeedback(null);
                    setIsAddUserModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#5c24ff] hover:bg-[#4d1cdb] active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Novo Colaborador</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-3.5">Colaborador</th>
                    <th className="p-3.5">E-mail Corporativo</th>
                    <th className="p-3.5">Departamento</th>
                    <th className="p-3.5">Cargo</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Ações & Acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        Nenhum colaborador encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.email} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#ede8ff] text-[#5c24ff] flex items-center justify-center font-extrabold text-[11px] shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="leading-tight">{user.name}</p>
                            {user.lastLogin && (
                              <span className="text-[9px] text-slate-400 block font-normal">
                                Último acesso: {new Date(user.lastLogin).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px]">{user.email}</td>
                        <td className="p-3.5 text-slate-600 font-medium">{user.department || 'Geral'}</td>
                        <td className="p-3.5">
                          {user.email !== 'marcus.almeida@certifica.com.br' && user.email !== 'marcus.almeida@syngular.id' && !user.email.startsWith('marcus.almeida@') ? (
                            <button
                              onClick={() => updateUserRole(user.email, user.role === 'admin' ? 'user' : 'admin')}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 ${
                                user.role === 'admin' ? 'bg-[#0d0d12] text-white hover:bg-slate-800' : 'bg-[#ede8ff] text-[#5c24ff] hover:bg-[#5c24ff] hover:text-white'
                              }`}
                              title="Clique para alternar o nível de acesso"
                            >
                              <Shield className="w-3 h-3" />
                              <span>{user.role}</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#0d0d12] text-white inline-flex items-center gap-1">
                              <Shield className="w-3 h-3 text-amber-400" />
                              <span>Master Admin</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            user.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                            user.status === 'blocked' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                            'bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse'
                          }`}>
                            {user.status === 'approved' ? 'Aprovado' : user.status === 'blocked' ? 'Bloqueado' : 'Aguardando Aprovação'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          {user.email !== 'marcus.almeida@certifica.com.br' && user.email !== 'marcus.almeida@syngular.id' && !user.email.startsWith('marcus.almeida@') ? (
                            <div className="inline-flex items-center gap-1">
                              {user.status !== 'approved' && (
                                <button 
                                  onClick={() => updateUserStatus(user.email, 'approved')}
                                  className="p-1.5 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 rounded-md transition-colors cursor-pointer"
                                  title="Aprovar Acesso"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                </button>
                              )}
                              {user.status !== 'blocked' && (
                                <button 
                                  onClick={() => updateUserStatus(user.email, 'blocked')}
                                  className="p-1.5 bg-white border border-slate-200 hover:border-rose-500 hover:text-rose-600 text-slate-600 rounded-md transition-colors cursor-pointer"
                                  title="Bloquear Acesso"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleCustomPasswordReset(user.email)}
                                className="p-1.5 bg-white border border-slate-200 hover:border-[#5c24ff] text-slate-600 hover:text-[#5c24ff] rounded-md transition-colors cursor-pointer"
                                title="Redefinir Senha de Acesso"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm(`Deseja realmente excluir o cadastro de ${user.name} (${user.email})?`)) {
                                    deleteUser(user.email);
                                  }
                                }}
                                className="p-1.5 bg-white border border-slate-200 hover:border-rose-500 hover:text-rose-600 text-slate-600 rounded-md transition-colors cursor-pointer"
                                title="Excluir Cadastro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">Imutável</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Knowledge Base / Catálogo Neural Inteligente */}
        {activeTab === 'kb' && (
          <div className="space-y-4">
            <AdminKnowledgeHub />
          </div>
        )}

        {/* Tab 3: Chat Logs */}
        {activeTab === 'chat_logs' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Histórico Consolidado de Atendimentos
            </h2>

            {chatHistory.length === 0 ? (
              <div className="p-8 text-center border border-slate-200 rounded-xl text-xs text-slate-400">
                Nenhuma sessão gravada no momento.
              </div>
            ) : (
              <div className="space-y-2">
                {chatHistory.map((s) => (
                  <div key={s.id} className="p-3.5 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pb-2 border-b border-slate-100">
                      <span>Vendedor: <strong className="text-slate-800">{s.userEmail}</strong></span>
                      <span>{new Date(s.timestamp).toLocaleString('pt-BR')} • {s.messages.length} mensagens</span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {s.messages.map((m) => (
                        <div key={m.id} className="text-xs">
                          <span className="font-bold text-slate-700">{m.sender === 'user' ? 'Colaborador' : 'Copiloto'}:</span>{' '}
                          <span className="text-slate-600">{m.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Configurações de Inteligência Artificial
            </h2>

            <div className="p-5 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#5c24ff]" />
                Chave da API Google Gemini (Opcional)
              </label>
              <input
                type="password"
                placeholder="Cole sua API Key do Google AI Studio..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:border-[#5c24ff]"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Por padrão, o Copiloto Syngular utiliza o motor neural do navegador com custo zero. Caso prefira usar o Google Gemini 2.5 Flash oficial diretamente, basta colar sua chave gratuita do Google AI Studio.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Modal: Cadastrar Novo Colaborador / Usuário */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#5c24ff] flex items-center justify-center shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Cadastrar Novo Colaborador</h3>
                  <p className="text-[11px] text-slate-500">Crie o acesso com nome, e-mail, cargo e senha</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUserSubmit} className="p-4 sm:p-5 space-y-3.5">
              {addUserFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                  addUserFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {addUserFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{addUserFeedback.message}</span>
                </div>
              )}

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
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="joao.silva@certifica.com.br ou @syngular.id"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Departamento / Cargo
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={newUserDepartment}
                      onChange={(e) => setNewUserDepartment(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 focus:outline-hidden cursor-pointer"
                    >
                      <option value="Autoridade de Registro (AR)">Autoridade de Registro (AR)</option>
                      <option value="Agente de Registro (AGR)">Agente de Registro (AGR)</option>
                      <option value="Consultor Comercial">Consultor Comercial</option>
                      <option value="Suporte Técnico N2">Suporte Técnico N2</option>
                      <option value="Financeiro / Contábil">Financeiro / Contábil</option>
                      <option value="Desenvolvimento / Gestão">Desenvolvimento / Gestão</option>
                      <option value="Outro">Outro (Digitar)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Nível de Acesso
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 focus:outline-hidden cursor-pointer"
                    >
                      <option value="user">Usuário / Consultor Padrão</option>
                      <option value="admin">Administrador Geral</option>
                    </select>
                  </div>
                </div>
              </div>

              {newUserDepartment === 'Outro' && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Especifique o Cargo / Departamento
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Supervisor Operacional"
                    value={newUserCustomDept}
                    onChange={(e) => setNewUserCustomDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Senha Inicial de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Mínimo 4 caracteres (padrão: syngular123)"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#5c24ff] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">O usuário poderá alterar sua senha quando quiser no menu "Minha Senha".</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 bg-[#5c24ff] hover:bg-[#4d1cdb] active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingUser ? 'Cadastrando...' : 'Cadastrar & Liberar'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};