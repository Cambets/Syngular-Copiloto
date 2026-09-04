import { useState, useEffect, lazy, Suspense } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { useApp } from './contexts/AppContext';
import { LoginPage } from './components/login-page';
import { SyngularLogo } from './components/syngular-logo';
import { ThemeToggle } from './components/ThemeToggle';
import { ChatInteractiveSpheres } from './components/ChatInteractiveSpheres';
import { UserProfileModal } from './components/UserProfileModal';
import { InstallAppModal } from './components/InstallAppModal';
import { 
  ShieldCheck, LogOut, Smartphone, Share2, 
  PanelLeftClose, PanelLeft, Plus, MessageSquare, 
  Search, Trash2, Phone, Home, Loader2, Key,
  BellRing, UserCheck, X, Download
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPendingCardVisible, setIsPendingCardVisible] = useState(true);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const pendingUsers = users.filter(u => u.status === 'pending');

  const handleGoHome = () => {
    setActiveSessionId(null);
    setIsAdminMode(false);
    setChatResetKey(prev => prev + 1);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // Global keydown shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('session-search-input');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PWA Install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Copiloto Syngular',
        text: 'Acesse o copiloto oficial de vendas e suporte da Syngular ID & Syn+!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link do copiloto copiado com sucesso!');
    }
  };

  // If user is not authenticated, render Full-Page Enterprise Login Screen
  if (!currentUser) {
    return (
      <>
        <LoginPage onOpenInstallModal={() => setIsInstallModalOpen(true)} />
        <InstallAppModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          deferredPrompt={deferredPrompt}
          onInstallNative={handleInstallPWA}
        />
      </>
    );
  }

  const filteredSessions = chatHistory
    .filter(s => s.userEmail === currentUser.email)
    .filter(s => {
      if (!searchTerm.trim()) return true;
      return s.messages.some(m => m.text.toLowerCase().includes(searchTerm.toLowerCase()));
    });

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-screen flex bg-slate-50 dark:bg-[#090514] text-slate-900 dark:text-slate-100 font-sans overflow-hidden antialiased select-none relative">
      
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-25 lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Syngular Style */}
      <aside 
        className={`${
          isSidebarOpen 
            ? 'w-72 sm:w-80 translate-x-0' 
            : 'w-0 -translate-x-full lg:translate-x-0'
        } fixed lg:static inset-y-0 left-0 transition-all duration-200 ease-out flex-shrink-0 bg-white dark:bg-[#0f0920] border-r border-slate-200 dark:border-purple-950/60 flex flex-col h-full overflow-hidden z-30 shadow-2xl lg:shadow-none`}
      >
        {/* Workspace Brand Header with Syngular Logo */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <SyngularLogo size="md" onClick={handleGoHome} />
          
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            title="Recolher barra lateral"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat & Search Toolbar */}
        <div className="p-3 space-y-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#151822]">
          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={handleGoHome}
              className="col-span-1 flex items-center justify-center p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Voltar para o Início"
            >
              <Home className="w-3.5 h-3.5 text-[#5c24ff]" />
            </button>
            <button
              onClick={handleGoHome}
              className="col-span-4 flex items-center justify-between px-3 py-2 bg-[#5c24ff] hover:bg-[#4d1cdb] active:scale-[0.99] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                Nova Consulta
              </span>
              <span className="kbd bg-[#4d1cdb] text-white/90 border-[#3b14a8] text-[9px]">Novo</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="session-search-input"
              type="text"
              placeholder="Buscar no histórico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-12 py-1.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-[#5c24ff] rounded-md text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden transition-colors"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 kbd text-[8px]">Ctrl K</span>
          </div>

          {/* Download / Install App Button */}
          <button
            onClick={() => {
              if (deferredPrompt) handleInstallPWA();
              else setIsInstallModalOpen(true);
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-500/10 to-[#5c24ff]/10 hover:from-purple-500/20 hover:to-[#5c24ff]/20 text-[#5c24ff] dark:text-purple-300 rounded-xl text-xs font-bold transition-all border border-[#5c24ff]/25 cursor-pointer group shadow-2xs mt-1"
            title="Baixar ou Instalar App no Celular ou Computador"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-[#5c24ff] dark:text-purple-300 group-hover:scale-110 transition-transform" />
              <span>Baixar App (Android/iOS/PC)</span>
            </div>
            <Download className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Atendimentos Recentes</span>
            {filteredSessions.length > 0 && (
              <button 
                onClick={clearChatHistory}
                className="hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                title="Limpar histórico"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 space-y-2">
              <p className="text-[11px] leading-relaxed">Nenhuma sessão gravada no seu histórico.</p>
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
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer group flex items-start gap-2.5 ${
                    isActive 
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-slate-900 dark:text-white' 
                      : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <MessageSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isActive ? 'text-[#5c24ff]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate leading-tight">{firstUserMsg}</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(session.timestamp).toLocaleDateString('pt-BR')} • {session.messages.length} msg
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#151822]">
          <div className="flex items-center justify-between gap-1.5">
            <div 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1 -m-1 rounded-lg hover:bg-purple-50/80 dark:hover:bg-purple-950/40 transition-colors cursor-pointer group"
              title="Clique para ver seu perfil ou alterar sua senha"
            >
              <div className="w-8 h-8 rounded-full bg-[#ede8ff] dark:bg-purple-900/40 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center font-extrabold text-xs shrink-0 group-hover:scale-105 transition-transform">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-[#7c3aed] transition-colors">{currentUser.name}</p>
                <span className="text-[10px] text-slate-400 truncate block">{currentUser.email}</span>
                {currentUser.department && (
                  <span className="text-[9px] text-[#5c24ff] dark:text-purple-300 font-semibold truncate block mt-0.5">
                    {currentUser.department}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => { logout(); setIsAdminMode(false); }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer shrink-0"
              title="Sair da Conta (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Viewport Shell */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-white dark:bg-[#090514]">
        
        {/* Top Header Bar */}
        <header className="h-13 border-b border-slate-200 dark:border-purple-950/60 bg-white dark:bg-[#0f0920] px-4 flex items-center justify-between flex-shrink-0 z-20">
          
          {/* Left Title & Toggle */}
          <div className="flex items-center gap-3 min-w-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                title="Expandir barra lateral"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div 
              onClick={handleGoHome}
              className="flex items-center gap-2 cursor-pointer"
              title="Ir para o Início"
            >
              <SyngularLogo size="sm" showText={true} />
              {isAdminMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0d0d12] dark:bg-slate-800 text-white ml-2">
                  Gestão
                </span>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            
            {/* Install PWA Button (Always Visible) */}
            <button
              onClick={() => {
                if (deferredPrompt) handleInstallPWA();
                else setIsInstallModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[#5c24ff] dark:text-purple-300 rounded-md text-xs font-bold transition-colors cursor-pointer border border-[#5c24ff]/30 shadow-2xs"
              title="Baixar ou Instalar App no Celular (Android / iOS) ou PC"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Instalar App</span>
            </button>

            {/* Direct Official WhatsApp Support */}
            <a
              href="https://wa.me/5537998628259"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[#5c24ff] dark:text-[#a78bfa] hover:bg-[#ede8ff]/60 dark:hover:bg-purple-950/40 rounded-md text-xs font-bold transition-colors border border-[#5c24ff]/30 cursor-pointer"
              title="WhatsApp Oficial de Suporte (37) 99862-8259"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Suporte Oficial</span>
            </a>

            {/* Share link */}
            <button
              onClick={handleShareApp}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              title="Compartilhar Copiloto"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Botão de Troca de Tema (Dark / Claro) */}
            <ThemeToggle />

            {/* Admin Toggle */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setIsAdminMode(!isAdminMode)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all border cursor-pointer ${
                  isAdminMode 
                    ? 'bg-[#0d0d12] text-white border-[#0d0d12] dark:bg-purple-600 dark:border-purple-600' 
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#5c24ff] dark:text-purple-300" />
                <span className="hidden sm:inline">{isAdminMode ? 'Voltar ao Chat' : 'Admin'}</span>
                {pendingUsers.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-extrabold rounded-full animate-pulse shadow-xs">
                    {pendingUsers.length}
                  </span>
                )}
              </button>
            )}

            {/* Minha Senha / Perfil */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-[#7c3aed] border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold transition-colors cursor-pointer"
              title="Meu Perfil & Alterar Senha"
            >
              <Key className="w-3.5 h-3.5 text-[#7c3aed]" />
              <span className="hidden sm:inline">Minha Senha</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => { logout(); setIsAdminMode(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold transition-colors cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>

          </div>
        </header>

        {/* Main Content Area with 3D Spheres Background */}
        <main className="flex-1 overflow-hidden relative flex flex-col bg-slate-50/50 dark:bg-[#090514]">
          
          {/* 3D Interactive Floating Spheres across both Light and Dark modes */}
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

      </div>

      {/* Modal de Perfil & Alteração de Senha */}
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {/* Modal Interativo de Instalação de App (Android, iOS, PC) */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallNative={handleInstallPWA}
      />
    </div>
  );
}