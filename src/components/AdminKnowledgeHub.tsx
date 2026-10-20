import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Product } from '../contexts/AppContext';
import { extractProductFromRawContent } from '../lib/knowledgeExtractor';
import { 
  Sparkles, Search, Trash2, Tag, ChevronDown, ChevronUp, 
  HelpCircle, CheckCircle2, Loader2, UploadCloud, 
  Image as ImageIcon, FileText, X,
  Package, ShieldCheck, Edit3, FileCheck
} from 'lucide-react';

type KnowledgeCategory = 'ALL' | 'Syngular' | 'Certifica+' | 'Parcerias' | 'Pos-Venda' | 'Reativacao';

export const AdminKnowledgeHub: React.FC = () => {
  const appContext = useApp() as any;
  const knowledgeBase: Product[] = appContext.knowledgeBase || [];
  const geminiApiKey = appContext.geminiApiKey || '';
  const currentUser = appContext.currentUser;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory>('ALL');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const [rawInputText, setRawInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    content?: string;
    base64?: string;
  } | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processSuccessMessage, setProcessSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Estados do Modal de Homologação de Protocolo
  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [isEditingPending, setIsEditingPending] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    setErrorMessage('');
    const fileName = file.name.toLowerCase();

    if (
      fileName.endsWith('.txt') || 
      fileName.endsWith('.md') || 
      fileName.endsWith('.json') || 
      fileName.endsWith('.csv')
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setAttachedFile({ name: file.name, type: 'text', content });
        if (!rawInputText.trim()) setRawInputText(content);
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAttachedFile({
          name: file.name,
          type: 'image',
          base64: result.split(',')[1]
        });
      };
      reader.readAsDataURL(file);
    } else if (
      fileName.endsWith('.ppt') || 
      fileName.endsWith('.pptx') || 
      fileName.endsWith('.pdf') ||
      fileName.endsWith('.docx')
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const cleanText = result.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s+/g, ' ');
        setAttachedFile({ name: file.name, type: 'document', content: cleanText });
        if (!rawInputText.trim()) setRawInputText(cleanText.substring(0, 4000));
      };
      reader.readAsText(file);
    } else {
      setErrorMessage('Formato não suportado. Envie Imagens, .md, .json, .txt, .ppt ou .pdf.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleProcessRawContent = async () => {
    if ((!rawInputText.trim() && !attachedFile) || isProcessing) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const base64Image = attachedFile?.type === 'image' && attachedFile.base64
        ? { data: attachedFile.base64, mimeType: 'image/jpeg' }
        : undefined;

      const textToSend = rawInputText.trim() || attachedFile?.content || '';

      const extracted = await extractProductFromRawContent(
        textToSend,
        base64Image,
        geminiApiKey,
        knowledgeBase
      );

      if (extracted && extracted.name) {
        // Gerar número de protocolo exclusivo com carimbo de tempo
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const protocolCode = `KB-${dateStr}-${randomNum}`;
        const formattedDate = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const preparedProduct: Product = {
          ...extracted,
          id: extracted.id || `kb-${Date.now()}`,
          protocolNumber: protocolCode,
          registeredAt: formattedDate,
          registeredBy: currentUser?.name || currentUser?.email || 'Administrador'
        };

        setPendingProduct(preparedProduct);
        setIsEditingPending(false);
        setProtocolModalOpen(true);
      } else {
        setErrorMessage('Não foi possível estruturar o material. Tente adicionar notas adicionais.');
      }
    } catch {
      setErrorMessage('Erro ao comunicar com o motor de IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmProtocol = () => {
    if (!pendingProduct) return;

    if (typeof appContext.addOrUpdateProduct === 'function') {
      appContext.addOrUpdateProduct(pendingProduct);
    } else if (typeof appContext.saveProduct === 'function') {
      appContext.saveProduct(pendingProduct);
    } else if (typeof appContext.addProduct === 'function') {
      appContext.addProduct(pendingProduct);
    } else if (typeof appContext.setKnowledgeBase === 'function') {
      appContext.setKnowledgeBase([
        pendingProduct,
        ...knowledgeBase.filter((p: any) => p.id !== pendingProduct.id)
      ]);
    }

    const savedProtocol = pendingProduct.protocolNumber;
    setRawInputText('');
    setAttachedFile(null);
    setProtocolModalOpen(false);
    setExpandedProductId(pendingProduct.id);
    setPendingProduct(null);

    setProcessSuccessMessage(`Conhecimento protocolado com sucesso sob o nº #${savedProtocol}!`);
    setTimeout(() => setProcessSuccessMessage(null), 5000);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Deseja remover este item da base de conhecimento?')) {
      if (typeof appContext.deleteProduct === 'function') {
        appContext.deleteProduct(id);
      } else if (typeof appContext.removeProduct === 'function') {
        appContext.removeProduct(id);
      } else if (typeof appContext.setKnowledgeBase === 'function') {
        appContext.setKnowledgeBase(knowledgeBase.filter((p: any) => p.id !== id));
      }
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Parcerias':
        return { label: 'Parcerias & ARs', style: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'Pos-Venda':
        return { label: 'Pós-Venda & Suporte', style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'Reativacao':
        return { label: 'Reativação de Carteira', style: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      default:
        return { label: 'Soluções & Produtos', style: 'bg-purple-100 text-[#7c3aed] dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
    }
  };

  const filteredKnowledge = knowledgeBase.filter((item: Product) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pitch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.protocolNumber && item.protocolNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.keywords && item.keywords.some((k: string) => k.toLowerCase().includes(searchTerm.toLowerCase())));

    if (selectedCategory === 'ALL') return matchesSearch;
    return matchesSearch && item.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso com Protocolo */}
      {processSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-extrabold text-sm leading-snug">Protocolo Homologado!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{processSuccessMessage}</p>
            </div>
          </div>
          <button 
            onClick={() => setProcessSuccessMessage(null)}
            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid Principal: Formulário de Ingestão e Lista Indexada */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Painel Esquerdo: Área de Ingestão de Documentos / Texto */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#7c3aed] flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Ingestão Inteligente de Conhecimento
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  A IA estrutura o conteúdo e gera um protocolo para sua homologação.
                </p>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-[#7c3aed] bg-purple-50/50 dark:bg-purple-950/30' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 bg-slate-50/50 dark:bg-slate-900/30'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                accept=".txt,.md,.json,.csv,.pdf,.ppt,.pptx,.docx,image/*"
              />
              <UploadCloud className="w-8 h-8 text-slate-400 mb-1" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Arraste ou clique para anexar
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                PDFs, Manuais, Tabelas, Imagens ou Textos
              </p>
            </div>

            {/* Arquivo Anexado */}
            {attachedFile && (
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  {attachedFile.type === 'image' ? (
                    <ImageIcon className="w-4 h-4 text-[#7c3aed] shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-[#7c3aed] shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {attachedFile.name}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setAttachedFile(null); }}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                  title="Remover arquivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Textarea de Conteúdo Livre */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Conteúdo Bruto / Notas Operacionais:
              </label>
              <textarea
                value={rawInputText}
                onChange={(e) => setRawInputText(e.target.value)}
                placeholder="Cole aqui textos de manuais, comunicados da diretoria, novas regras fiscais, argumentos comerciais ou tabelas..."
                className="w-full h-36 p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 resize-none"
              />
            </div>

            {/* Mensagem de Erro */}
            {errorMessage && (
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 animate-fade-in">
                {errorMessage}
              </p>
            )}

            {/* Botão de Processamento */}
            <button
              onClick={handleProcessRawContent}
              disabled={isProcessing || (!rawInputText.trim() && !attachedFile)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Estruturando & Gerando Protocolo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analisar e Abrir Protocolo</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Painel Direito: Base de Conhecimento Indexada e Filtrável */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barra de Filtros e Busca */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Base de Conhecimento Indexada ({knowledgeBase.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Itens homologados ativos no cérebro do Copiloto.
                </p>
              </div>

              {/* Categorias Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {(['ALL', 'Syngular', 'Certifica+', 'Parcerias', 'Pos-Venda', 'Reativacao'] as KnowledgeCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#7c3aed] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'Todos' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Input de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, protocolo (#KB-...), palavra-chave ou regra..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40"
              />
            </div>
          </div>

          {/* Lista de Itens Indexados */}
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredKnowledge.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-slate-800 text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">Nenhum registro encontrado para esta busca.</p>
              </div>
            ) : (
              filteredKnowledge.map((item: Product) => {
                const badge = getCategoryBadge(item.category);
                const isExpanded = expandedProductId === item.id;

                return (
                  <div 
                    key={item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {item.name}
                          </span>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${badge.style}`}>
                            {badge.label}
                          </span>
                          {item.protocolNumber && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              📑 {item.protocolNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[#7c3aed] dark:text-purple-300 leading-snug">
                          "{item.pitch}"
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedProductId(isExpanded ? null : item.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Expandir detalhes"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Remover da base"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {item.description}
                    </p>

                    {/* Keywords */}
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <Tag className="w-3 h-3 text-slate-400 mr-0.5" />
                      {item.keywords && item.keywords.map((k: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          {k}
                        </span>
                      ))}
                    </div>

                    {/* Objeções e Dúvidas Frequentes */}
                    {isExpanded && (
                      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3 text-amber-500" />
                            <span>Dúvidas & Quebra de Objeções ({item.objections?.length || 0})</span>
                          </span>
                          {item.registeredAt && (
                            <span className="text-[9px] text-slate-400">
                              Homologado em {item.registeredAt} por {item.registeredBy || 'Admin'}
                            </span>
                          )}
                        </div>

                        {item.objections && item.objections.length > 0 ? (
                          <div className="space-y-2">
                            {item.objections.map((obj: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                  <span className="text-amber-600 dark:text-amber-400">Dúvida / Objeção:</span> "{obj.question}"
                                </div>
                                <div className="text-slate-600 dark:text-slate-300 pl-2 border-l-2 border-[#7c3aed] dark:border-purple-400">
                                  <span className="font-bold text-[#7c3aed] dark:text-purple-300">Direcionamento:</span> {obj.answer}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">Nenhum direcionamento de objeção cadastrado.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 📑 MODAL DE HOMOLOGAÇÃO & PROTOCOLO DE CONHECIMENTO IA */}
      {/* ========================================================================= */}
      {protocolModalOpen && pendingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[#11131a] rounded-3xl border border-purple-200 dark:border-purple-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header do Modal */}
            <div className="p-5 bg-gradient-to-r from-purple-50 via-slate-50 to-white dark:from-purple-950/40 dark:via-slate-900 dark:to-[#11131a] border-b border-purple-100 dark:border-purple-900/60 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#7c3aed] text-white shadow-2xs">
                    <FileCheck className="w-3 h-3" />
                    <span>PROTOCOLO #{pendingProduct.protocolNumber}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Aguardando Homologação</span>
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Mini Relatório de Compreensão da IA
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Revise o que a IA extraiu do material antes de protocolar na base oficial.
                </p>
              </div>

              <button
                onClick={() => setProtocolModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Mini Relatório (Scrollável) */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Botão de Alternar Modo de Edição Rápida */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {isEditingPending ? 'Modo de Edição Ativo' : 'Visualização da Ficha Técnica'}
                </span>
                <button
                  onClick={() => setIsEditingPending(!isEditingPending)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#7c3aed] dark:text-purple-400 hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingPending ? 'Voltar para Visualização' : 'Fazer Ajustes Finos'}</span>
                </button>
              </div>

              {isEditingPending ? (
                /* Formulário de Edição */
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nome do Produto / Processo:</label>
                      <input
                        type="text"
                        value={pendingProduct.name}
                        onChange={(e) => setPendingProduct({ ...pendingProduct, name: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Categoria:</label>
                      <select
                        value={pendingProduct.category}
                        onChange={(e) => setPendingProduct({ ...pendingProduct, category: e.target.value as any })}
                        className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40"
                      >
                        <option value="Certifica+">Certifica+ (Software SaaS)</option>
                        <option value="Syngular">Syngular (Certificação Digital)</option>
                        <option value="Parcerias">Parcerias & ARs</option>
                        <option value="Pos-Venda">Pós-Venda & Suporte</option>
                        <option value="Reativacao">Reativação de Carteira</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Pitch Comercial / Resumo:</label>
                    <input
                      type="text"
                      value={pendingProduct.pitch}
                      onChange={(e) => setPendingProduct({ ...pendingProduct, pitch: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Descrição & Regras Operacionais:</label>
                    <textarea
                      value={pendingProduct.description}
                      onChange={(e) => setPendingProduct({ ...pendingProduct, description: e.target.value })}
                      className="w-full h-28 p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 resize-none"
                    />
                  </div>

                  {/* Editor de Palavras-Chave */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Palavras-Chave de Disparo:</label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {pendingProduct.keywords.map((k, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-[#7c3aed] border border-purple-200 text-[10px] font-bold">
                          {k}
                          <button
                            onClick={() => setPendingProduct({ ...pendingProduct, keywords: pendingProduct.keywords.filter((_, idx) => idx !== i) })}
                            className="hover:text-rose-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        placeholder="Nova tag..."
                        className="flex-1 p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      />
                      <button
                        onClick={() => {
                          if (newKeywordInput.trim()) {
                            setPendingProduct({ ...pendingProduct, keywords: [...pendingProduct.keywords, newKeywordInput.trim().toLowerCase()] });
                            setNewKeywordInput('');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Visualização Estruturada do Mini Relatório */
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Bloco 1: Identificação */}
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        🏷️ Identificação Mapeada
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white dark:bg-purple-900 text-[#7c3aed] border border-purple-200">
                        {pendingProduct.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {pendingProduct.name}
                    </h4>
                  </div>

                  {/* Bloco 2: Pitch Comercial */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      💡 Pitch & Resumo Executivo
                    </span>
                    <p className="text-xs font-bold text-[#7c3aed] dark:text-purple-300 leading-relaxed italic">
                      "{pendingProduct.pitch}"
                    </p>
                  </div>

                  {/* Bloco 3: Especificações & Regras de Negócio */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      📋 Especificações & Regras Técnicas Extraídas
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {pendingProduct.description}
                    </p>
                  </div>

                  {/* Bloco 4: Objeções & Resoluções */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Dúvidas & Objeções Mapeadas ({pendingProduct.objections?.length || 0})</span>
                    </span>

                    {pendingProduct.objections && pendingProduct.objections.length > 0 ? (
                      <div className="space-y-2">
                        {pendingProduct.objections.map((obj, i) => (
                          <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              <span className="text-amber-600 dark:text-amber-400">Dúvida:</span> "{obj.question}"
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-[#7c3aed]">
                              <span className="font-bold text-[#7c3aed]">Direcionamento:</span> {obj.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">Nenhuma objeção específica identificada.</p>
                    )}
                  </div>

                  {/* Bloco 5: Palavras-chave */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      🔍 Palavras-Chave de Disparo
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {pendingProduct.keywords && pendingProduct.keywords.map((k, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-[#7c3aed] dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 text-[10px]">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Footer do Modal com Ações */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setProtocolModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Descartar
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmProtocol}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Homologar & Protocolar na Base</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};