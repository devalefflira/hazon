// src/pages/Solicitacoes/components/DetalhesSolicitacaoModal.tsx
import { useState } from 'react';
import { solicitacoesService } from '../services/solicitacoesService';
import type { 
  SolicitacaoView, 
  TipoAtendimento 
} from '../types/solicitacoes.types';

interface Props {
  solicitacao: SolicitacaoView;
  usuarioLogadoId: string;
  onFechar: () => void;
  onRespostaSalva: () => void;
}

export default function DetalhesSolicitacaoModal({
  solicitacao,
  usuarioLogadoId,
  onFechar,
  onRespostaSalva
}: Props) {
  const isPendente = solicitacao.status === 'Pendente';

  // Estados de resposta tipados estritamente com os valores do banco
  const [modoDecisao, setModoDecisao] = useState<'Aprovada Total' | 'Aprovada Parcial' | 'Negada' | null>(null);
  const [tipoAtendimento, setTipoAtendimento] = useState<TipoAtendimento>('Imediato');
  const [prazoLimite, setPrazoLimite] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [quantidadesAtendidas, setQuantidadesAtendidas] = useState<Record<string, number>>(() => {
    const iniciais: Record<string, number> = {};
    solicitacao.itens.forEach((it) => {
      iniciais[it.id] = it.quantidade_solicitada;
    });
    return iniciais;
  });

  const [salvando, setSalvando] = useState(false);

  const handleSalvarResposta = async () => {
    if (!modoDecisao) return;

    if (modoDecisao === 'Negada' && !justificativa.trim()) {
      alert('A justificativa é obrigatória para solicitações negadas.');
      return;
    }

    if (modoDecisao === 'Aprovada Parcial' && !justificativa.trim()) {
      alert('A justificativa é obrigatória para aprovações parciais.');
      return;
    }

    if ((modoDecisao === 'Aprovada Total' || modoDecisao === 'Aprovada Parcial') && tipoAtendimento === 'Com Prazo' && !prazoLimite) {
      alert('Informe a data limite para o atendimento com prazo.');
      return;
    }

    try {
      setSalvando(true);

      const itensPayload = modoDecisao === 'Aprovada Parcial'
        ? Object.entries(quantidadesAtendidas).map(([item_id, quantidade_atendida]) => ({
            item_id,
            quantidade_atendida
          }))
        : undefined;

      await solicitacoesService.responderSolicitacao({
        solicitacao_id: solicitacao.id,
        usuario_id: usuarioLogadoId,
        status: modoDecisao,
        tipo_atendimento: modoDecisao !== 'Negada' ? tipoAtendimento : undefined,
        prazo_limite: modoDecisao !== 'Negada' && tipoAtendimento === 'Com Prazo' ? prazoLimite : undefined,
        justificativa: justificativa.trim() || undefined,
        itens_atendidos: itensPayload
      });

      alert(`Solicitação marcada como ${modoDecisao}!`);
      onRespostaSalva();
    } catch (err: any) {
      alert(`Erro ao processar resposta: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onFechar}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl sm:rounded-4xl p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-[#09797a] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                #{solicitacao.codigo_customizado}
              </span>
              <span className="text-xs font-black uppercase text-slate-500">
                {solicitacao.tipo_solicitacao}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-800 uppercase mt-1">
              Detalhes da Solicitação
            </h2>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Informações dos Envolvidos e Metadados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block">Solicitante</span>
            <span className="font-bold text-slate-800">{solicitacao.solicitante_nome}</span>
            <span className="text-[10px] text-slate-400 ml-2">
              {solicitacao.data_registro.split('-').reverse().join('/')} às {solicitacao.hora_registro}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block">Destinatário Responsável</span>
            <span className="font-bold text-slate-800">{solicitacao.destinatario_nome}</span>
          </div>
        </div>

        {/* Finalidade */}
        <div className="bg-teal-50/40 border border-teal-100 p-3.5 rounded-2xl text-xs">
          <span className="text-[10px] uppercase font-black text-teal-800 block mb-1">
            Finalidade Apontada:
          </span>
          <p className="text-slate-700 font-medium leading-relaxed italic">
            "{solicitacao.finalidade}"
          </p>
        </div>

        {/* Itens do Pedido ou Descrição Geral */}
        {solicitacao.tipo_solicitacao === 'Produto' ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 px-1">
              Produtos Solicitados ({solicitacao.itens.length})
            </span>

            <div className="flex flex-col gap-2">
              {solicitacao.itens.map((it) => (
                <div 
                  key={it.id} 
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-black text-slate-600">
                        {it.codprod || 'S/C'}
                      </span>
                      <span className="font-black text-slate-800 uppercase">
                        {it.descricao_produto}
                      </span>
                    </div>
                    {it.observacao && (
                      <span className="text-[10px] text-slate-400 italic block mt-0.5">
                        Obs: "{it.observacao}"
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="font-bold text-slate-600 text-[11px]">
                      Pedido: <strong>{it.quantidade_solicitada} {it.unidade_medida}</strong>
                    </span>

                    {modoDecisao === 'Aprovada Parcial' && (
                      <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200">
                        <label className="text-[9px] font-black uppercase text-amber-800">Atender:</label>
                        <input
                          type="number"
                          min="0"
                          max={it.quantidade_solicitada}
                          step="any"
                          value={quantidadesAtendidas[it.id] ?? it.quantidade_solicitada}
                          onChange={(e) => setQuantidadesAtendidas({
                            ...quantidadesAtendidas,
                            [it.id]: Number(e.target.value)
                          })}
                          className="w-16 bg-white border border-amber-300 rounded px-1.5 py-0.5 text-xs font-black text-slate-800 text-center"
                        />
                      </div>
                    )}

                    {!isPendente && it.quantidade_atendida !== undefined && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-black text-[10px] rounded-lg border border-amber-200">
                        Atendido: {it.quantidade_atendida} {it.unidade_medida}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">
              Detalhamento do Pedido / Reparo:
            </span>
            <p className="text-slate-700 font-medium whitespace-pre-line leading-relaxed">
              {solicitacao.descricao_geral || 'Nenhum detalhe adicional informado.'}
            </p>
          </div>
        )}

        {/* Histórico de Conclusão */}
        {!isPendente && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="font-black text-slate-700 uppercase">Parecer do Atendimento</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                solicitacao.status === 'Aprovada Total'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : solicitacao.status === 'Aprovada Parcial'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {solicitacao.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div>
                Respondido por: <strong className="text-slate-800">{solicitacao.respondido_por_nome || 'Responsável'}</strong>
              </div>
              <div>
                Prazo: <strong className="text-slate-800">
                  {solicitacao.tipo_atendimento === 'Com Prazo' && solicitacao.prazo_limite
                    ? `Até ${solicitacao.prazo_limite.split('-').reverse().join('/')}`
                    : solicitacao.tipo_atendimento || 'Imediato'}
                </strong>
              </div>
            </div>

            {solicitacao.justificativa_resposta && (
              <div className="mt-1 bg-white p-2.5 rounded-xl border border-slate-200 text-slate-600 italic">
                "{solicitacao.justificativa_resposta}"
              </div>
            )}
          </div>
        )}

        {/* Tomar Decisão (Apenas para Pendentes) */}
        {isPendente && (
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Tomar Decisão Operacional
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setModoDecisao('Aprovada Total')}
                className={`py-2.5 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                  modoDecisao === 'Aprovada Total'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-900/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                ✓ Aprovar Total
              </button>

              <button
                type="button"
                onClick={() => setModoDecisao('Aprovada Parcial')}
                className={`py-2.5 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                  modoDecisao === 'Aprovada Parcial'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-900/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                }`}
              >
                ⚠️ Aprovar Parcial
              </button>

              <button
                type="button"
                onClick={() => setModoDecisao('Negada')}
                className={`py-2.5 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                  modoDecisao === 'Negada'
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-900/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-red-50 hover:text-red-800'
                }`}
              >
                ✕ Negar
              </button>
            </div>

            {(modoDecisao === 'Aprovada Total' || modoDecisao === 'Aprovada Parcial') && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 animate-fadeIn">
                <label className="text-[10px] font-black uppercase text-slate-500">
                  Previsão de Atendimento
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoAtendimento('Imediato')}
                    className={`py-2 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                      tipoAtendimento === 'Imediato'
                        ? 'bg-[#09797a] text-white border-[#09797a]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    ⚡ Imediato (Hoje)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoAtendimento('Com Prazo')}
                    className={`py-2 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                      tipoAtendimento === 'Com Prazo'
                        ? 'bg-[#09797a] text-white border-[#09797a]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    📅 Com Prazo Limite
                  </button>
                </div>

                {tipoAtendimento === 'Com Prazo' && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#09797a] block mb-1">
                      * Data Limite para Atendimento
                    </label>
                    <input
                      type="date"
                      value={prazoLimite}
                      onChange={(e) => setPrazoLimite(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                    />
                  </div>
                )}
              </div>
            )}

            {modoDecisao && (
              <div className="animate-fadeIn">
                <label className="text-[10px] font-black uppercase text-slate-700 block mb-1">
                  {modoDecisao === 'Aprovada Total' ? 'Observações Opcionais' : '* Justificativa Obrigatória'}
                </label>
                <textarea
                  rows={2}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder={modoDecisao === 'Negada' ? 'Explique o motivo da recusa...' : 'Escreva a justificativa/instruções...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#09797a]"
                />
              </div>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onFechar}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase cursor-pointer hover:bg-slate-50"
          >
            Fechar
          </button>

          {isPendente && modoDecisao && (
            <button
              type="button"
              disabled={salvando}
              onClick={handleSalvarResposta}
              className="px-6 py-2.5 bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {salvando ? 'Gravando...' : `Confirmar Decisão`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}