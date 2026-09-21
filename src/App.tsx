import { useState, useEffect, lazy, Suspense } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { useApp } from './contexts/AppContext';
import { LoginPage } from './components/login-page';
import { ThemeToggle } from './components/ThemeToggle';
import { ChatInteractiveSpheres } from './components/ChatInteractiveSpheres';
import { UserProfileModal } from './components/UserProfileModal';
import { 
  ShieldCheck, LogOut, Plus, MessageSquare, 
  Search, Trash2, Loader2,
  BellRing, UserCheck, X, History, ChevronRight
} from 'lucide-react';

const ChatBox = lazy(() => import('./components/chat-box').then(m => ({ default: m.ChatBox })));
const AdminPanel = lazy(() => import('./components/admin-panel').then(m => ({ default: m.AdminPanel })));

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { currentUser, logout, chatHistory, clearChatHistory, users, updateUserStatus } = useApp();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPendingCardVisible, setIsPendingCardVisible] = useState(true);

  const pendingUsers = users.filter(u => u.status === 'pending');

  const handleGoHome = () => {
    setActiveSessionId(null);
    setIsAdminMode(false);
    setChatResetKey(prev => prev + 1);
    setIsHistoryDrawerOpen(false);
  };

  // Global keydown shortcuts (Ctrl+K to open search & history)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsHistoryDrawerOpen(true);
        setTimeout(() => {
          const searchInput = document.getElementById('history-search-input');
          if (searchInput) searchInput.focus();
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If user is not authenticated, render Full-Page Enterprise Login Screen
  if (!currentUser) {
    return <LoginPage />;
  }

  const filteredSessions = chatHistory
    .filter(s => s.userEmail === currentUser.email)
    .filter(s => {
      if (!searchTerm.trim()) return true;
      return s.messages.some(m => m.text.toLowerCase().includes(searchTerm.toLowerCase()));
    });

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-screen flex flex-col bg-[#fcfcfd] dark:bg-[#070410] text-slate-900 dark:text-slate-100 font-sans overflow-hidden antialiased select-none relative">
      
      {/* 🌟 Clean Minimalist Top Header Bar (Matching reference design) */}
      <header className="h-16 border-b border-slate-200/80 dark:border-purple-950/40 bg-white/90 dark:bg-[#0c081c]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between flex-shrink-0 z-30 shadow-2xs">
        
        {/* Left Action Pills (+ Nova, Histórico, Admin) */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={handleGoHome}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Iniciar Nova Consulta Limpa"
          >
            <Plus className="w-3.5 h-3.5 text-[#5c24ff] dark:text-[#a78bfa]" />
            <span>Nova</span>
          </button>

          <button
            onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
            className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs cursor-pointer active:scale-95 ${
              isHistoryDrawerOpen
                ? 'bg-purple-50 dark:bg-purple-950/60 text-[#5c24ff] dark:text-purple-300 border-[#5c24ff]/40'
                : 'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title="Ver Histórico de Conversas (Ctrl+K)"
          >
            <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden xs:inline">Histórico</span>
          </button>

          {/* Admin Mode Toggle */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs cursor-pointer active:scale-95 ${
                isAdminMode 
                  ? 'bg-orange-500 text-white border-orange-600 shadow-orange-500/20' 
                  : 'bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60'
              }`}
              title="Painel Administrativo & Gestão de Usuários"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
              {pendingUsers.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-extrabold rounded-full animate-pulse shadow-xs">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Center Brand Identity: Syngular & SynCop */}
        <div 
          onClick={handleGoHome}
          className="flex flex-col items-center justify-center cursor-pointer group px-2 py-0.5"
          title="Ir para a Tela Inicial do SynCop"
        >
          <div className="flex items-center gap-2">
            <img 
              src="/syncop-emblem.png" 
              alt="Syngular" 
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-105 transition-transform drop-shadow-sm" 
            />
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
              SYNGULAR
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-purple-300 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>COPILOTO DE VENDAS &bull; SYNCOP</span>
          </div>
        </div>

        {/* Right Controls: Theme, User Pill, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* User Account Pill */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer max-w-[120px] sm:max-w-[190px]"
            title="Meu Perfil & Alterar Senha"
          >
            <div className="w-4 h-4 rounded-full bg-[#ede8ff] dark:bg-purple-900/60 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center font-bold text-[9px] shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-[11px] font-mono">{currentUser.email.split('@')[0]}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={() => { logout(); setIsAdminMode(false); }}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-white dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Sair da Conta (Logout)"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>

        </div>
      </header>

      {/* 🚀 Slide-Over Drawer for History (Clean & Out of the way) */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-40 flex animate-fade-in select-none">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsHistoryDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative ml-0 sm:ml-auto w-full max-w-sm bg-white dark:bg-[#0f0920] h-full shadow-2xl border-r sm:border-r-0 sm:border-l border-slate-200 dark:border-purple-950/60 flex flex-col z-50 animate-in slide-in-from-left sm:slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-[#15102a]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#5c24ff] dark:text-[#a78bfa]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Histórico de Atendimentos
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-[#120c24]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="history-search-input"
                  type="text"
                  placeholder="Buscar no histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-[#5c24ff] rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Nenhum atendimento gravado</p>
                  <p className="text-[11px] text-slate-400">As consultas que você fizer com o SynCop serão guardadas aqui.</p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const firstUserMsg = session.messages.find(m => m.sender === 'user')?.text || `Sessão ${session.id}`;
                  const isActive = activeSessionId === session.id;
                  return (
                    <div
                      key={session.id}
                      onClick={() => { 
                        setActiveSessionId(session.id); 
                        setIsAdminMode(false); 
                        setIsHistoryDrawerOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group flex items-start justify-between gap-2 ${
                        isActive 
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-slate-900 dark:text-white' 
                          : 'bg-white dark:bg-[#15102a] border-slate-200/80 dark:border-slate-800 hover:border-[#5c24ff]/50 text-slate-700 dark:text-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate leading-tight group-hover:text-[#5c24ff] transition-colors">{firstUserMsg}</p>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {new Date(session.timestamp).toLocaleDateString('pt-BR')} • {session.messages.length} msg(s)
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-[#5c24ff] group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0" />
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer with Clear History Option */}
            {filteredSessions.length > 0 && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#15102a] flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  {filteredSessions.length} atendimento(s)
                </span>
                <button
                  onClick={() => {
                    if (confirm('Deseja limpar todo o histórico de conversas gravado?')) {
                      clearChatHistory();
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Tudo</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Main Viewport Shell */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#fcfcfd] dark:bg-[#070410]">
        
        {/* Interactive Floating Spheres across both Light and Dark modes */}
        <ChatInteractiveSpheres />

        {/* Floating Card for Pending Access Requests (Admin Only) */}
        {currentUser.role === 'admin' && pendingUsers.length > 0 && isPendingCardVisible && !isAdminMode && (
          <div className="absolute top-4 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] bg-white dark:bg-[#140f28] border-2 border-[#5c24ff]/40 shadow-2xl rounded-2xl p-3.5 animate-in slide-in-from-top-4 duration-200 backdrop-blur-md">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Nova Solicitação de Acesso</span>
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-extrabold rounded-full">
                      {pendingUsers.length} pendente{pendingUsers.length > 1 ? 's' : ''}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                    <strong className="text-slate-800 dark:text-slate-200">{pendingUsers[0].name}</strong> ({pendingUsers[0].email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPendingCardVisible(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer shrink-0"
                title="Dispensar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-purple-950/60">
              <button
                onClick={() => {
                  updateUserStatus(pendingUsers[0].email, 'approved');
                }}
                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Aprovar ({pendingUsers[0].name.split(' ')[0]})</span>
              </button>
              <button
                onClick={() => setIsAdminMode(true)}
                className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Ver Painel
              </button>
            </div>
          </div>
        )}

        <Suspense fallback={
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-[#7c3aed]" />
            <span className="text-xs font-bold text-slate-500">Carregando ambiente seguro...</span>
          </div>
        }>
          {isAdminMode && currentUser.role === 'admin' ? (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-6xl w-full mx-auto relative z-10">
              <AdminPanel onBack={() => setIsAdminMode(false)} />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto p-2 sm:p-4 relative z-10">
              <ChatBox 
                key={activeSessionId || `home-${chatResetKey}`}
                activeSessionId={activeSessionId}
                onGoHome={handleGoHome}
              />
            </div>
          )}
        </Suspense>
      </main>

      {/* Modal de Perfil & Alteração de Senha */}
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
}