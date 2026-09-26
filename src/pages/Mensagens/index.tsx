// src/pages/Mensagens/index.tsx
import { useState, useEffect, useRef } from 'react';
import { mensagensService } from './services/mensagensService';
import type { 
  TipoMensagem, 
  SubtipoSol, 
  AnexoMensagem, 
  MensagemView 
} from './types/mensagens.types';

interface MensagensProps {
  usuarioLogadoId: string;
  onVoltarParaHome: () => void;
}

export default function Mensagens({ usuarioLogadoId, onVoltarParaHome }: MensagensProps) {
  const [abaAtiva, setAbaAtiva] = useState<'usuarios' | 'pendentes' | 'resolvidas'>('pendentes');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [mensagens, setMensagens] = useState<MensagemView[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Modal Enviar Mensagem
  const [destinatarioSelecionado, setDestinatarioSelecionado] = useState<any | null>(null);
  const [tipoMensagem, setTipoMensagem] = useState<TipoMensagem>('Solicitação');
  const [subtipoSol, setSubtipoSol] = useState<SubtipoSol>('Cadastrar Produto');
  const [conteudo, setConteudo] = useState('');
  const [anexos, setAnexos] = useState<AnexoMensagem[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Modal Responder/Finalizar
  const [mensagemRespondendo, setMensagemRespondendo] = useState<MensagemView | null>(null);
  const [respostaTexto, setRespostaTexto] = useState('');

  // Visualizador Rápido de Foto em Tela Cheia (Zoom)
  const [fotoVisualizando, setFotoVisualizando] = useState<{ nome: string; url: string } | null>(null);

  // Câmera & Documentos Refs
  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputDocRef = useRef<HTMLInputElement>(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      if (abaAtiva === 'usuarios') {
        const users = await mensagensService.listarUsuarios();
        setUsuarios(users.filter((u: any) => u.id !== usuarioLogadoId));
      } else {
        const msgs = await mensagensService.listarMensagens(
          abaAtiva === 'pendentes' ? 'Pendente' : 'Resolvido',
          usuarioLogadoId
        );
        setMensagens(msgs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [abaAtiva]);

  // Captura direta da Câmera (Permite tirar fotos consecutivas)
  const handleFotoCamera = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const scale = MAX_WIDTH / img.width;
        canvas.width = Math.min(img.width, MAX_WIDTH);
        canvas.height = img.width > MAX_WIDTH ? img.height * scale : img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

        setAnexos((prev) => [
          ...prev,
          { tipo: 'foto', nome: `Foto_${Date.now().toString().slice(-4)}.jpg`, url: dataUrl }
        ]);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload de Múltiplos Documentos (PDF, Planilhas, TXT, Word)
  const handleDocumentos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAnexos((prev) => [
            ...prev,
            { tipo: 'documento', nome: file.name, url: reader.result as string }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removerAnexo = (index: number) => {
    setAnexos((prev) => prev.filter((_, i) => i !== index));
  };

  // Ação ao clicar no anexo: VISUALIZAR
  const handleVisualizarAnexo = (anexo: AnexoMensagem) => {
    if (anexo.tipo === 'foto') {
      setFotoVisualizando({ nome: anexo.nome, url: anexo.url });
    } else {
      // Abre PDF ou outro documento diretamente em nova aba
      try {
        const byteCharacters = atob(anexo.url.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const mimeType = anexo.url.substring(anexo.url.indexOf(':') + 1, anexo.url.indexOf(';'));
        const blob = new Blob([byteArray], { type: mimeType });
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, '_blank');
      } catch {
        window.open(anexo.url, '_blank');
      }
    }
  };

  // Ação de DOWNLOAD (disponibilizada no modal antes da finalização)
  const baixarArquivo = (anexo: AnexoMensagem) => {
    const link = document.createElement('a');
    link.href = anexo.url;
    link.download = anexo.nome;
    link.click();
  };

  const handleEnviar = async () => {
    if (!destinatarioSelecionado) return;
    if (!conteudo.trim()) {
      alert('Escreva a mensagem antes de enviar.');
      return;
    }

    try {
      setEnviando(true);
      await mensagensService.enviarMensagem({
        remetente_id: usuarioLogadoId,
        destinatario_id: destinatarioSelecionado.id,
        tipo_mensagem: tipoMensagem,
        subtipo_solicitacao: tipoMensagem === 'Solicitação' ? subtipoSol : undefined,
        conteudo: conteudo.trim(),
        anexos
      });

      alert('Mensagem enviada com sucesso!');
      setDestinatarioSelecionado(null);
      setConteudo('');
      setAnexos([]);
      setAbaAtiva('pendentes');
    } catch (err: any) {
      alert(`Erro ao enviar: ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  const handleConcluirResposta = async () => {
    if (!mensagemRespondendo) return;
    if (!respostaTexto.trim()) {
      alert('Informe o parecer da resposta antes de finalizar.');
      return;
    }

    try {
      setEnviando(true);
      await mensagensService.responderEFinalizar(mensagemRespondendo.id, respostaTexto.trim());
      alert('Mensagem respondida e finalizada! Os arquivos anexados foram apagados.');
      setMensagemRespondendo(null);
      setRespostaTexto('');
      carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans relative">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-7 flex flex-col gap-5 min-h-[calc(100vh-24px)]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltarParaHome}
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              ←
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                Mensagens Internas
              </h1>
              <p className="text-xs text-slate-400 font-bold">
                Comunicação Operacional & Solicitações Sem WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* 3 ABAS PRINCIPAIS */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setAbaAtiva('pendentes')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              abaAtiva === 'pendentes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ⏳ Pendentes
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('resolvidas')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              abaAtiva === 'resolvidas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ✓ Resolvidas
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('usuarios')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              abaAtiva === 'usuarios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            👥 Usuários
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <div className="p-8 text-center text-xs font-black uppercase text-[#09797a] animate-pulse">
              Carregando dados...
            </div>
          ) : abaAtiva === 'usuarios' ? (
            /* ABA USUÁRIOS */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {usuarios.map((u) => (
                <div key={u.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800">{u.nome}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">{u.setor || 'Geral'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDestinatarioSelecionado(u)}
                    className="px-3 py-1.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-xs cursor-pointer active:scale-95"
                  >
                    Enviar Mensagem
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* ABA PENDENTES OU RESOLVIDAS */
            <div className="flex flex-col gap-3">
              {mensagens.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  Nenhuma mensagem encontrada nesta seção.
                </div>
              ) : (
                mensagens.map((msg) => {
                  const souDestinatario = msg.destinatario_id === usuarioLogadoId;
                  return (
                    <div key={msg.id} className="p-5 bg-white border-2 border-slate-200/90 rounded-3xl shadow-xs flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#09797a]">#{msg.codigo_customizado}</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {msg.tipo_mensagem} {msg.subtipo_solicitacao ? `• ${msg.subtipo_solicitacao}` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 font-medium">
                        De: <strong className="text-slate-800">{msg.remetente_nome}</strong> ➔ Para: <strong className="text-slate-800">{msg.destinatario_nome}</strong>
                      </div>

                      <p className="text-xs text-slate-800 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                        {msg.conteudo}
                      </p>

                      {/* Anexos: Clique para Visualizar na Tela */}
                      {msg.anexos && msg.anexos.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-400">
                            Anexos ({msg.anexos.length}) - Toque para Visualizar:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {msg.anexos.map((a, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleVisualizarAnexo(a)}
                                className="p-2.5 bg-teal-50/80 border border-teal-200/80 hover:bg-teal-100 text-[#09797a] rounded-2xl text-xs font-black uppercase flex items-center justify-between gap-1.5 cursor-pointer transition-all active:scale-95"
                                title="Clique para Visualizar"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span>{a.tipo === 'foto' ? '📸' : '📄'}</span>
                                  <span className="truncate text-[11px]">{a.nome}</span>
                                </div>
                                <span className="text-xs text-teal-700 opacity-70">🔍 Ver</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resposta (se resolvida) */}
                      {msg.resposta_conteudo && (
                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-950 flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase text-emerald-800">Parecer Final:</span>
                          <p>{msg.resposta_conteudo}</p>
                        </div>
                      )}

                      {/* Ação de Resposta se for o Destinatário */}
                      {msg.status === 'Pendente' && souDestinatario && (
                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setMensagemRespondendo(msg)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-xs cursor-pointer active:scale-95"
                          >
                            ✓ Responder e Finalizar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>

      {/* MODAL VISUALIZADOR DE FOTO EM TELA CHEIA (SEM BAIXAR) */}
      {fotoVisualizando && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-60 flex flex-col items-center justify-center p-3 animate-fadeIn"
          onClick={() => setFotoVisualizando(null)}
        >
          <div 
            className="max-w-2xl w-full bg-white rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-col gap-3 max-h-[90vh] animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
              <span className="text-xs font-black uppercase text-slate-800 truncate">
                {fotoVisualizando.nome}
              </span>
              <button 
                type="button"
                onClick={() => setFotoVisualizando(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-900/5 rounded-2xl p-1">
              <img 
                src={fotoVisualizando.url} 
                alt="Visualização" 
                className="max-h-[72vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* INPUTS OCULTOS */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={inputCameraRef}
        onChange={handleFotoCamera}
        className="hidden"
      />
      <input
        type="file"
        multiple
        accept=".pdf,.xls,.xlsx,.csv,.txt,.doc,.docx"
        ref={inputDocRef}
        onChange={handleDocumentos}
        className="hidden"
      />

      {/* MODAL DE ENVIAR MENSAGEM */}
      {destinatarioSelecionado && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn" 
          onClick={() => setDestinatarioSelecionado(null)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-slideUp max-h-[90vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-black uppercase text-[#09797a] block">Nova Mensagem</span>
                <h3 className="text-xs font-black text-slate-900 uppercase">Para: {destinatarioSelecionado.nome}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setDestinatarioSelecionado(null)} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Tipo de Mensagem</label>
              <select
                value={tipoMensagem}
                onChange={(e) => setTipoMensagem(e.target.value as TipoMensagem)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Solicitação">Solicitação</option>
                <option value="Sugestão">Sugestão</option>
                <option value="Relatar Bug">Relatar Bug</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            {tipoMensagem === 'Solicitação' && (
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Subtipo da Solicitação</label>
                <select
                  value={subtipoSol}
                  onChange={(e) => setSubtipoSol(e.target.value as SubtipoSol)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="Cadastrar Produto">Cadastrar Produto</option>
                  <option value="Fazer Oferta">Fazer Oferta</option>
                  <option value="Gerar Relatório">Gerar Relatório</option>
                  <option value="Outras Solicitações">Outras Solicitações</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Mensagem</label>
              <textarea
                rows={4}
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Descreva detalhadamente o que precisa..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-500">
                Anexos ({anexos.length})
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => inputCameraRef.current?.click()}
                  className="py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-[#09797a] rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <span>📷</span>
                  <span>Tirar Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => inputDocRef.current?.click()}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <span>📎</span>
                  <span>Anexar Docs</span>
                </button>
              </div>

              {anexos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto p-1">
                  {anexos.map((a, i) => (
                    <div 
                      key={i} 
                      className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col group"
                    >
                      {a.tipo === 'foto' ? (
                        <img 
                          src={a.url} 
                          alt={`Foto ${i}`} 
                          className="w-full h-20 object-cover"
                        />
                      ) : (
                        <div className="w-full h-20 flex flex-col items-center justify-center p-2 text-center">
                          <span className="text-xl">📄</span>
                          <span className="text-[10px] font-bold text-slate-700 truncate w-full mt-1">
                            {a.nome}
                          </span>
                        </div>
                      )}

                      <div className="p-1 bg-white border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-600 px-2">
                        <span className="truncate">{a.tipo === 'foto' ? 'Foto' : 'Arquivo'}</span>
                        <button
                          type="button"
                          onClick={() => removerAnexo(i)}
                          className="w-4 h-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button 
                type="button" 
                onClick={() => setDestinatarioSelecionado(null)} 
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase cursor-pointer hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={handleEnviar}
                className="px-5 py-2 bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 cursor-pointer"
              >
                {enviando ? 'Enviando...' : 'Enviar Mensagem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESPONDER & FINALIZAR COM OPÇÃO DE DOWNLOAD ANTES DA EXCLUSÃO */}
      {mensagemRespondendo && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn" 
          onClick={() => setMensagemRespondendo(null)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-slideUp max-h-[90vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[10px] font-black uppercase text-[#09797a] block">Conclusão de Chamado</span>
              <h3 className="text-xs font-black text-slate-900 uppercase">Responder e Finalizar Mensagem</h3>
            </div>

            {/* SEÇÃO DE DOWNLOAD OPCIONAL ANTES DE FINALIZAR */}
            {mensagemRespondendo.anexos && mensagemRespondendo.anexos.length > 0 && (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Arquivos da Solicitação ({mensagemRespondendo.anexos.length}) - Deseja baixar algum?
                </span>
                <div className="flex flex-col gap-1.5">
                  {mensagemRespondendo.anexos.map((a, i) => (
                    <div key={i} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span>{a.tipo === 'foto' ? '📸' : '📄'}</span>
                        <span className="font-bold text-slate-800 truncate">{a.nome}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => baixarArquivo(a)}
                        className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-[#09797a] border border-teal-200 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                      >
                        Baixar ⬇
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                * Parecer / Resposta do Destinatário
              </label>
              <textarea
                rows={3}
                value={respostaTexto}
                onChange={(e) => setRespostaTexto(e.target.value)}
                placeholder="Digite o parecer da resolução (ex: Produto cadastrado com sucesso!)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800"
              />
            </div>

            <span className="text-[10px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 block font-medium">
              ⚠️ Ao clicar em Concluir Chamado, a mensagem será finalizada e todos os arquivos anexados serão deletados do banco de dados para poupar espaço.
            </span>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button 
                type="button" 
                onClick={() => setMensagemRespondendo(null)} 
                className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase cursor-pointer hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={handleConcluirResposta}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-xs cursor-pointer active:scale-95"
              >
                Concluir Chamado
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}