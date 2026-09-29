// src/pages/RupturaGondola/index.tsx
import { useState, useEffect } from 'react';
import { rupturaService } from './services/rupturaService';
import { AuditoriaPainel } from './components/AuditoriaPainel';
import { ModalImportarEntradasErp } from './components/ModalImportarEntradasErp';
import type { RupturaAuditoria, ErpEntradaImportacao } from './types/ruptura.types';

interface RupturaGondolaProps {
  usuarioLogadoId: string;
  onVoltarParaHome: () => void;
}

export default function RupturaGondola({ usuarioLogadoId, onVoltarParaHome }: RupturaGondolaProps) {
  const [auditorias, setAuditorias] = useState<RupturaAuditoria[]>([]);
  const [importacoes, setImportacoes] = useState<ErpEntradaImportacao[]>([]);
  const [auditoriaAtivaId, setAuditoriaAtivaId] = useState<string | null>(null);
  const [modalNovaAberto, setModalNovaAberto] = useState(false);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Form nova auditoria
  const [setor, setSetor] = useState('Mercearia');
  const [corredor, setCorredor] = useState('');
  const [obs, setObs] = useState('');

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [dadosAuditorias, dadosImportacoes] = await Promise.all([
        rupturaService.listarAuditorias(),
        rupturaService.listarUltimasImportacoes()
      ]);
      setAuditorias(dadosAuditorias);
      setImportacoes(dadosImportacoes);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCriarAuditoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nova = await rupturaService.criarAuditoria({
        usuario_id: usuarioLogadoId,
        setor_nome: setor,
        rua_corredor: corredor,
        observacao: obs
      });
      setModalNovaAberto(false);
      setCorredor('');
      setObs('');
      setAuditoriaAtivaId(nova.id);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans relative">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-7 flex flex-col gap-5 min-h-[calc(100vh-24px)]">
        
        {auditoriaAtivaId ? (
          <AuditoriaPainel
            auditoriaId={auditoriaAtivaId}
            onVoltar={() => {
              setAuditoriaAtivaId(null);
              carregarDados();
            }}
          />
        ) : (
          <>
            {/* CABEÇALHO */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-3">
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
                    Ruptura de Gôndola
                  </h1>
                  <p className="text-xs text-slate-400 font-bold">
                    Auditoria de Presença e Cruzamento com Entradas ERP
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalImportarAberto(true)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>📥</span> Importar Entradas ERP (.csv)
                </button>

                <button
                  type="button"
                  onClick={() => setModalNovaAberto(true)}
                  className="px-4 py-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl font-black text-xs uppercase shadow-sm cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>+</span> Nova Auditoria
                </button>
              </div>
            </div>

            {/* STATUS DA BASE DE ENTRADAS DO ERP */}
            {importacoes.length > 0 && (
              <div className="p-3.5 bg-teal-50/60 border border-teal-200/80 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-teal-950">
                    Base ERP Ativa: {importacoes[0].nome_arquivo}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-teal-800">
                  Período: {importacoes[0].periodo_inicio} a {importacoes[0].periodo_fim} ({importacoes[0].total_registros} itens)
                </span>
              </div>
            )}

            {/* LISTAGEM DE AUDITORIAS */}
            <div className="flex flex-col gap-3">
              {carregando ? (
                <div className="p-8 text-center text-xs font-black uppercase text-[#09797a] animate-pulse">
                  Carregando auditorias de gôndola...
                </div>
              ) : auditorias.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  Nenhuma auditoria registrada até o momento.
                </div>
              ) : (
                auditorias.map((aud) => (
                  <div
                    key={aud.id}
                    onClick={() => setAuditoriaAtivaId(aud.id)}
                    className="p-4 bg-white border-2 border-slate-200/90 hover:border-[#09797a] rounded-3xl shadow-xs cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-black text-[#09797a]">
                        #{aud.codigo_customizado}
                      </span>
                      <strong className="text-xs font-black uppercase text-slate-900 mt-0.5">
                        {aud.setor_nome} {aud.rua_corredor ? `• ${aud.rua_corredor}` : ''}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Por: {aud.usuario_nome} • {new Date(aud.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-800 block">
                          {aud.total_itens_auditados} itens
                        </span>
                        <span className="text-[10px] font-bold text-rose-600 block">
                          {aud.total_rupturas} vazios
                        </span>
                      </div>
                      <span className="text-slate-400 text-sm">➔</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL NOVA AUDITORIA */}
      {modalNovaAberto && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn"
          onClick={() => setModalNovaAberto(false)}
        >
          <form
            onSubmit={handleCriarAuditoria}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 animate-slideUp font-sans"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black uppercase text-slate-900">
                Iniciar Nova Auditoria
              </h3>
              <button
                type="button"
                onClick={() => setModalNovaAberto(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Setor</label>
              <select
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Mercearia">Mercearia</option>
                <option value="Hortifrúti">Hortifrúti</option>
                <option value="Açougue">Açougue</option>
                <option value="Frios e Laticínios">Frios e Laticínios</option>
                <option value="Padaria">Padaria</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Higiene e Limpeza">Higiene e Limpeza</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Rua / Corredor</label>
              <input
                type="text"
                value={corredor}
                onChange={(e) => setCorredor(e.target.value)}
                placeholder="Ex: Corredor 04 - Biscoitos"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Observações (Opcional)</label>
              <textarea
                rows={2}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalNovaAberto(false)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 cursor-pointer"
              >
                Iniciar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL IMPORTAÇÃO CSV */}
      {modalImportarAberto && (
        <ModalImportarEntradasErp
          usuarioLogadoId={usuarioLogadoId}
          onFechar={() => setModalImportarAberto(false)}
          onSucesso={carregarDados}
        />
      )}
    </div>
  );
}