import React, { useState } from 'react';
import { Smartphone, Monitor, Apple, X, Download, CheckCircle2 } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallNative: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallNative
}) => {
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios' | 'pc'>(() => {
    if (typeof navigator !== 'undefined') {
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return 'ios';
      if (/Android/.test(navigator.userAgent)) return 'android';
      return 'pc';
    }
    return 'android';
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-white dark:bg-[#120d24] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-purple-900/50 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-purple-950/60 flex items-center justify-between bg-slate-50/70 dark:bg-[#181130]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5c24ff] to-[#7c3aed] text-white flex items-center justify-center shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Instalar Syn+ Copiloto</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Funciona como App Nativo no Celular e PC</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Direct Install Button (When Supported by Browser) */}
        {deferredPrompt && (
          <div className="p-4 bg-gradient-to-r from-purple-500/10 via-[#5c24ff]/10 to-purple-500/10 border-b border-purple-200/40 dark:border-purple-900/40 text-center">
            <button
              onClick={() => {
                onInstallNative();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-[#5c24ff] hover:bg-[#4d1cdb] active:scale-95 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Agora em 1 Clique</span>
            </button>
            <p className="text-[10px] text-purple-600 dark:text-purple-300 mt-1.5 font-medium">
              Seu navegador suporta instalação direta!
            </p>
          </div>
        )}

        {/* Platform Selector Tabs */}
        <div className="p-4">
          <div className="p-1 bg-slate-100 dark:bg-[#1f163d] rounded-xl flex gap-1 text-xs font-bold mb-4">
            <button
              type="button"
              onClick={() => setActivePlatform('android')}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activePlatform === 'android' 
                  ? 'bg-white dark:bg-[#5c24ff] text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-300" />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform('ios')}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activePlatform === 'ios' 
                  ? 'bg-white dark:bg-[#5c24ff] text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Apple className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
              <span>iPhone / iPad</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform('pc')}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activePlatform === 'pc' 
                  ? 'bg-white dark:bg-[#5c24ff] text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-blue-500 dark:text-blue-300" />
              <span>PC / Mac</span>
            </button>
          </div>

          {/* Platform Step-by-Step Instructions */}
          {activePlatform === 'android' && (
            <div className="space-y-3 animate-fade-in text-xs">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#1a1235] rounded-xl border border-slate-100 dark:border-purple-950/60">
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">No Google Chrome do celular:</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do navegador.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#1a1235] rounded-xl border border-slate-100 dark:border-purple-950/60">
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Selecione "Instalar aplicativo"</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Ou toque na opção <strong>"Adicionar à tela inicial"</strong>.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px]">Pronto! O ícone do <strong>Syn+</strong> ficará na sua tela inicial abrindo em tela cheia como qualquer app da Play Store.</p>
              </div>
            </div>
          )}

          {activePlatform === 'ios' && (
            <div className="space-y-3 animate-fade-in text-xs">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#1a1235] rounded-xl border border-slate-100 dark:border-purple-950/60">
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Abra no Safari e toque em Compartilhar:</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Toque no ícone de <strong>Compartilhar (quadrado com seta ⎋)</strong> na barra inferior do Safari.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#1a1235] rounded-xl border border-slate-100 dark:border-purple-950/60">
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Toque em "Adicionar à Tela de Início":</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Role o menu para baixo e selecione a opção <strong>"Adicionar à Tela de Início (+)"</strong>.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px]">Pronto! O app será fixado na tela do seu iPhone sem precisar de App Store e sem ocupar memória!</p>
              </div>
            </div>
          )}

          {activePlatform === 'pc' && (
            <div className="space-y-3 animate-fade-in text-xs">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#1a1235] rounded-xl border border-slate-100 dark:border-purple-950/60">
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">No Chrome, Edge ou Brave:</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Clique no ícone de <strong>Instalar Aplicativo (computador com setinha 🖥️)</strong> localizado na barra de endereços (ao lado da estrelinha de favoritos).</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#1a1235] rounded-xl border border-slate-100 dark:border-purple-950/60">
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5c24ff] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Confirme em "Instalar"</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">O app criará um atalho direto na sua área de trabalho e na barra de tarefas do Windows ou Mac!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px]">Pronto! Ele abre em janela própria ultrarrápida como um software de desktop.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-[#150f28] border-t border-slate-100 dark:border-purple-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-200 dark:bg-purple-900/50 hover:bg-slate-300 dark:hover:bg-purple-900 text-slate-800 dark:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
