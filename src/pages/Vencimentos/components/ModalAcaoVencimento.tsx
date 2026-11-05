// src/pages/Vencimentos/components/ModalAcaoVencimento.tsx
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Handshake, Repeat, Tag, Trash2, TriangleAlert, X } from 'lucide-react';
import { vencimentosService } from '../services/vencimentosService';
import type {
  AcaoVencimento,
  FornecedorOpcao,
  NovaAcaoPayload,
  ProdutoVencimento,
  TipoAcaoVencimento
} from '../services/vencimentosService';
import {
  MODALIDADES_NEGOCIACAO,
  MOTIVOS_DESCARTE,
  ROTULO_ACAO,
  corDias,
  descontoSobreVenda,
  diasAte,
  formatarDataBR,
  hojeISO,
  margemSobreVenda,
  moeda,
  numeroBR,
  percentual,
  precoPorMargem,
  quantidadePorTipo,
  textoDias
} from '../utils/vencimentosUtils';

export interface AlvoAcao {
  codigo: string;
  produto?: ProdutoVencimento;
  lote: string;
  quantidade: number;
  data_validade: string;
  custo: number;
  venda: number;
  acoesAnteriores: AcaoVencimento[];
}

interface ModalAcaoVencimentoProps {
  tipo: TipoAcaoVencimento;
  alvo: AlvoAcao;
  salvando: boolean;
  permitirAvaria: boolean;
  onCancelar: () => void;
  onSalvar: (payload: NovaAcaoPayload, extras: { registrarAvaria: boolean }) => void;
}

const classeCampo =
  'w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#09797a]/30 focus:border-[#09797a]';
const classeRotulo = 'text-[10px] font-bold text-gray-500 uppercase px-1';

const ICONE_ACAO: Record<TipoAcaoVencimento, typeof Tag> = {
  Oferta: Tag,
  Troca: Repeat,
  Descarte: Trash2,
  'Negociação': Handshake
};

const paraNumero = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return isNaN(n) ? null : n;
};

// ---------- Seletor de fornecedor ----------
function SeletorFornecedor({
  selecionado,
  onSelecionar
}: {
  selecionado: FornecedorOpcao | null;
  onSelecionar: (f: FornecedorOpcao | null) => void;
}) {
  const [termo, setTermo] = useState('');
  const [opcoes, setOpcoes] = useState<FornecedorOpcao[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (selecionado || !aberto) return;
    const timer = setTimeout(async () => {
      try {
        setOpcoes(await vencimentosService.buscarFornecedores(termo));
      } catch (err) {
        console.error('Erro ao buscar fornecedores:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [termo, selecionado, aberto]);

  if (selecionado) {
    return (
      <div className="flex items-center justify-between gap-2 bg-teal-50/60 border border-teal-200 rounded-xl px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs font-black text-gray-800 uppercase truncate">{selecionado.nome_fantasia}</div>
          <div className="text-[10px] font-mono text-gray-500 truncate">{selecionado.razao_social} • {selecionado.cnpj}</div>
        </div>
        <button type="button" onClick={() => onSelecionar(null)} className="text-gray-400 hover:text-red-600 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={termo}
        placeholder="Busque por nome fantasia, razão social ou CNPJ..."
        onFocus={() => setAberto(true)}
        onChange={(e) => {
          setTermo(e.target.value);
          setAberto(true);
        }}
        className={classeCampo}
      />
      {aberto && opcoes.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-44 overflow-y-auto z-30 divide-y divide-gray-100">
          {opcoes.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                onSelecionar(f);
                setAberto(false);
                setTermo('');
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-teal-50/50"
            >
              <div className="text-xs font-bold text-gray-800 uppercase">{f.nome_fantasia}</div>
              <div className="text-[10px] font-mono text-gray-400">{f.razao_social} • {f.cnpj}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ModalAcaoVencimento({
  tipo,
  alvo,
  salvando,
  permitirAvaria,
  onCancelar,
  onSalvar
}: ModalAcaoVencimentoProps) {
  const prod = alvo.produto;
  const unidade = prod?.unidade || 'UN';
  const dias = diasAte(alvo.data_validade);
  const hoje = hojeISO();

  const margemAtual = margemSobreVenda(alvo.custo, alvo.venda);
  const ofertasAnteriores = alvo.acoesAnteriores.filter((a) => a.tipo === 'Oferta');
  const ultimaOferta = ofertasAnteriores[ofertasAnteriores.length - 1];

  const qtdDestinada = quantidadePorTipo(alvo.acoesAnteriores, 'Troca') + quantidadePorTipo(alvo.acoesAnteriores, 'Descarte');
  const saldo = Math.max(0, alvo.quantidade - qtdDestinada);

  // Oferta
  const [margemDesejada, setMargemDesejada] = useState('');
  const [precoOferta, setPrecoOferta] = useState('');
  const [validadeOferta, setValidadeOferta] = useState(alvo.data_validade >= hoje ? alvo.data_validade : hoje);
  const [confirmaAbaixoCusto, setConfirmaAbaixoCusto] = useState(false);

  // Troca / Descarte / Negociação
  const [quantidade, setQuantidade] = useState(String(saldo || alvo.quantidade));
  const [fornecedor, setFornecedor] = useState<FornecedorOpcao | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [registrarAvaria, setRegistrarAvaria] = useState(false);
  const [modalidade, setModalidade] = useState<string>(MODALIDADES_NEGOCIACAO[0]);
  const [novoCusto, setNovoCusto] = useState('');
  const [valorNegociado, setValorNegociado] = useState('');
  const [valorEditadoManual, setValorEditadoManual] = useState(false);
  const [observacao, setObservacao] = useState('');

  const precoOfertaNum = paraNumero(precoOferta);
  const margemOferta = precoOfertaNum !== null ? margemSobreVenda(alvo.custo, precoOfertaNum) : null;
  const descontoOferta = precoOfertaNum !== null ? descontoSobreVenda(alvo.venda, precoOfertaNum) : null;
  const abaixoDoCusto = precoOfertaNum !== null && alvo.custo > 0 && precoOfertaNum < alvo.custo;
  const acimaDaVenda = precoOfertaNum !== null && alvo.venda > 0 && precoOfertaNum >= alvo.venda;
  const validadeInvalida = !validadeOferta || validadeOferta < hoje || validadeOferta > alvo.data_validade;

  const qtdNum = paraNumero(quantidade);
  const novoCustoNum = paraNumero(novoCusto);

  // Rebaixa de custo: sugere o valor negociado = (custo atual - novo custo) × quantidade
  useEffect(() => {
    if (tipo !== 'Negociação' || modalidade !== 'Rebaixa de Custo' || valorEditadoManual) return;
    if (novoCustoNum !== null && qtdNum !== null && alvo.custo > novoCustoNum) {
      setValorNegociado(((alvo.custo - novoCustoNum) * qtdNum).toFixed(2));
    }
  }, [tipo, modalidade, novoCustoNum, qtdNum, alvo.custo, valorEditadoManual]);

  const handleMargemDesejada = (valor: string) => {
    setMargemDesejada(valor);
    const m = paraNumero(valor);
    if (m === null) return;
    const preco = precoPorMargem(alvo.custo, m);
    if (preco !== null) setPrecoOferta(preco.toFixed(2));
  };

  let erro: string | null = null;
  if (tipo === 'Oferta') {
    if (precoOfertaNum === null || precoOfertaNum <= 0) erro = 'Informe o preço da oferta.';
    else if (acimaDaVenda) erro = 'O preço da oferta deve ser menor que o preço de venda atual.';
    else if (validadeInvalida) erro = `A validade da oferta deve ficar entre hoje e o vencimento do produto (${formatarDataBR(alvo.data_validade)}).`;
    else if (abaixoDoCusto && !confirmaAbaixoCusto) erro = 'Confirme a oferta abaixo do custo.';
  } else {
    if (qtdNum === null || qtdNum <= 0) erro = 'Informe a quantidade.';
    else if ((tipo === 'Troca' || tipo === 'Negociação') && !fornecedor) erro = 'Selecione o fornecedor.';
    else if (tipo === 'Descarte' && justificativa.trim().length < 5) erro = 'Descreva a justificativa do descarte.';
    else if (tipo === 'Negociação' && modalidade === 'Rebaixa de Custo' && (novoCustoNum === null || novoCustoNum < 0)) erro = 'Informe o novo custo negociado.';
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (erro) return;

    if (tipo === 'Oferta') {
      onSalvar(
        {
          tipo,
          preco_custo: alvo.custo,
          preco_venda: alvo.venda,
          margem_atual_pct: margemAtual !== null ? Number(margemAtual.toFixed(2)) : null,
          preco_oferta: precoOfertaNum,
          margem_oferta_pct: margemOferta !== null ? Number(margemOferta.toFixed(2)) : null,
          validade_oferta: validadeOferta,
          observacao
        },
        { registrarAvaria: false }
      );
      return;
    }

    onSalvar(
      {
        tipo,
        quantidade: qtdNum,
        preco_custo: alvo.custo,
        fornecedor_id: fornecedor?.id || null,
        justificativa: tipo === 'Descarte' ? justificativa : null,
        modalidade_negociacao: tipo === 'Negociação' ? modalidade : null,
        novo_custo: tipo === 'Negociação' && modalidade === 'Rebaixa de Custo' ? novoCustoNum : null,
        valor_negociado: tipo === 'Negociação' ? paraNumero(valorNegociado) : null,
        observacao
      },
      { registrarAvaria: tipo === 'Descarte' && registrarAvaria }
    );
  };

  const Icone = ICONE_ACAO[tipo];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 select-none">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-3 max-h-[90vh]"
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
          <h3 className="text-[#09797a] font-black text-sm uppercase flex items-center gap-2">
            <Icone className="w-4 h-4" /> {ROTULO_ACAO[tipo]}
          </h3>
          <button type="button" onClick={onCancelar} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-3 pr-1 flex-1">
          {/* Produto */}
          <div className="bg-slate-50 border border-gray-200 rounded-2xl p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded uppercase">{alvo.codigo}</span>
              <span className="text-[10px] font-mono font-bold text-gray-400">Cód: {prod?.codprod || 'N/A'}</span>
            </div>
            <h4 className="font-black text-xs text-gray-800 uppercase mt-1">{prod?.descricao || 'PRODUTO'}</h4>
            <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase mt-1 flex-wrap">
              <span>Lote: <strong className="text-gray-800">{alvo.lote}</strong></span>
              <span>Qtd: <strong className="text-gray-800">{numeroBR(alvo.quantidade)} {unidade}</strong></span>
              {tipo !== 'Oferta' && qtdDestinada > 0 && (
                <span>Saldo s/ destino: <strong className="text-gray-800">{numeroBR(saldo)} {unidade}</strong></span>
              )}
            </div>
          </div>

          {/* Indicadores de preço */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white border border-gray-200 rounded-xl p-2">
              <div className="text-[9px] font-bold text-gray-400 uppercase">Preço de Custo</div>
              <div className="text-xs font-black text-gray-800">{moeda(alvo.custo)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-2">
              <div className="text-[9px] font-bold text-gray-400 uppercase">Preço de Venda</div>
              <div className="text-xs font-black text-gray-800">{moeda(alvo.venda)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-2">
              <div className="text-[9px] font-bold text-gray-400 uppercase">Margem Atual</div>
              <div className="text-xs font-black text-[#09797a]">{percentual(margemAtual)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-2">
              <div className="text-[9px] font-bold text-gray-400 uppercase">Vencimento</div>
              <div className="text-xs font-black text-gray-800">{formatarDataBR(alvo.data_validade)}</div>
              <div className={`text-[9px] font-black ${corDias(dias)}`}>{textoDias(dias)}</div>
            </div>
          </div>

          {/* ---------- OFERTA ---------- */}
          {tipo === 'Oferta' && (
            <>
              {ultimaOferta && (
                <div className="text-[10px] font-bold text-gray-500 bg-teal-50/60 border border-teal-100 rounded-xl px-3 py-2">
                  {ofertasAnteriores.length}ª oferta já aplicada: <strong className="text-gray-800">{moeda(ultimaOferta.preco_oferta)}</strong>
                  {' '}até {formatarDataBR(ultimaOferta.validade_oferta)} (margem {percentual(ultimaOferta.margem_oferta_pct)})
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className={classeRotulo}>Margem desejada (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    max={99.99}
                    inputMode="decimal"
                    placeholder="Ex.: 25"
                    value={margemDesejada}
                    disabled={alvo.custo <= 0}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => handleMargemDesejada(e.target.value)}
                    className={`${classeCampo} text-center disabled:opacity-50`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={classeRotulo}>Preço da Oferta (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    inputMode="decimal"
                    placeholder="0,00"
                    value={precoOferta}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      setPrecoOferta(e.target.value);
                      setMargemDesejada('');
                      setConfirmaAbaixoCusto(false);
                    }}
                    className={`${classeCampo} text-center`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-gray-200 rounded-xl p-2 text-center">
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Margem na Oferta</div>
                  <div className={`text-sm font-black ${margemOferta !== null && margemOferta < 0 ? 'text-red-600' : 'text-[#09797a]'}`}>
                    {percentual(margemOferta)}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-2 text-center">
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Desconto ao Cliente</div>
                  <div className="text-sm font-black text-gray-800">{percentual(descontoOferta)}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={classeRotulo}>Validade da Oferta *</label>
                <input
                  type="date"
                  value={validadeOferta}
                  min={hoje}
                  max={alvo.data_validade}
                  onChange={(e) => setValidadeOferta(e.target.value)}
                  className={classeCampo}
                />
              </div>

              {abaixoDoCusto && (
                <label className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11px] font-bold text-red-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmaAbaixoCusto}
                    onChange={(e) => setConfirmaAbaixoCusto(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-red-600"
                  />
                  <span>
                    <TriangleAlert className="w-3.5 h-3.5 inline mr-1" />
                    Preço abaixo do custo (prejuízo de {moeda(alvo.custo - (precoOfertaNum || 0))} por {unidade}). Confirmo a oferta.
                  </span>
                </label>
              )}
            </>
          )}

          {/* ---------- TROCA / DESCARTE / NEGOCIAÇÃO ---------- */}
          {tipo !== 'Oferta' && (
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Quantidade ({unidade}) *</label>
              <input
                type="number"
                step="any"
                min={0.01}
                inputMode="decimal"
                value={quantidade}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => setQuantidade(e.target.value)}
                className={`${classeCampo} text-center`}
              />
              {qtdNum !== null && qtdNum > 0 && alvo.custo > 0 && (
                <span className="text-[10px] font-bold text-gray-500 px-1">
                  Valor a custo: <strong className="text-gray-800">{moeda(qtdNum * alvo.custo)}</strong>
                </span>
              )}
            </div>
          )}

          {(tipo === 'Troca' || tipo === 'Negociação') && (
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Fornecedor *</label>
              <SeletorFornecedor selecionado={fornecedor} onSelecionar={setFornecedor} />
            </div>
          )}

          {tipo === 'Negociação' && (
            <>
              <div className="flex flex-col gap-1">
                <label className={classeRotulo}>Modalidade *</label>
                <div className="flex gap-1.5 flex-wrap">
                  {MODALIDADES_NEGOCIACAO.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModalidade(m);
                        setValorEditadoManual(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                        modalidade === m ? 'bg-[#09797a] text-white border-[#09797a]' : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {modalidade === 'Rebaixa de Custo' && (
                  <div className="flex flex-col gap-1">
                    <label className={classeRotulo}>Novo custo (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      inputMode="decimal"
                      value={novoCusto}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setNovoCusto(e.target.value)}
                      className={`${classeCampo} text-center`}
                    />
                  </div>
                )}
                <div className={`flex flex-col gap-1 ${modalidade === 'Rebaixa de Custo' ? '' : 'col-span-2'}`}>
                  <label className={classeRotulo}>Valor negociado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    value={valorNegociado}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      setValorNegociado(e.target.value);
                      setValorEditadoManual(true);
                    }}
                    className={`${classeCampo} text-center`}
                  />
                </div>
              </div>
            </>
          )}

          {tipo === 'Descarte' && (
            <>
              <div className="flex flex-col gap-1">
                <label className={classeRotulo}>Justificativa *</label>
                <div className="flex gap-1.5 flex-wrap">
                  {MOTIVOS_DESCARTE.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setJustificativa(m)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        justificativa === m ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={justificativa}
                  placeholder="Descreva o motivo do descarte..."
                  onChange={(e) => setJustificativa(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl font-bold text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#09797a]/30"
                />
              </div>
              {permitirAvaria && (
                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-600 cursor-pointer px-1">
                  <input
                    type="checkbox"
                    checked={registrarAvaria}
                    onChange={(e) => setRegistrarAvaria(e.target.checked)}
                    className="w-4 h-4 accent-[#09797a]"
                  />
                  Registrar também em Avarias após salvar
                </label>
              )}
            </>
          )}

          <div className="flex flex-col gap-1">
            <label className={classeRotulo}>Observação</label>
            <textarea
              rows={2}
              value={observacao}
              placeholder="Opcional"
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl font-bold text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#09797a]/30"
            />
          </div>

          {erro && (precoOferta || tipo !== 'Oferta') && (
            <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{erro}</div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando || !!erro}
            className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
