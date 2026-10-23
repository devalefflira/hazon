// src/pages/AuditoriaPrecificacao/components/AbaAuditar.tsx
import { useEffect, useMemo, useState } from 'react';
import { SeletorProdutoScanner } from '../../../components/SeletorProdutoScanner';
import type { ProdutoBusca } from '../../../components/SeletorProdutoScanner';
import { BarraPaginacao, paginar } from '../../../components/ui/BarraPaginacao';
import { auditoriaService, hojeIso } from '../services/auditoriaService';
import {
  OPCAO_OUTRO,
  ROTULO_CLASSIFICACAO,
  ROTULO_SITUACAO,
  SECOES_AUDITORIA,
  resumirItens,
  rotuloSecao
} from '../types/auditoria.types';
import type {
  AuditoriaItemRegistro,
  AuditoriaRegistro,
  ConfigMargem,
  ParametroMargem,
  SituacaoItem
} from '../types/auditoria.types';
import { CLASSE_CLASSIFICACAO_MARGEM, CONFIG_MARGEM_PADRAO, avaliarMargem } from '../utils/margem';
import type { ChaveProduto, ResultadoMargem } from '../utils/margem';

interface AbaAuditarProps {
  usuarioId: string;
  onFinalizada: () => void;
}

interface Mensagem {
  tipo: 'ok' | 'erro';
  texto: string;
}

const moeda = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const percentual = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : `${valor.toFixed(1).replace('.', ',')}%`;

const dataHoraIso = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const chaveDoProduto = (p: ProdutoBusca): ChaveProduto => ({
  departamento: p.departamento ?? null,
  secao: p.secao ?? null,
  categoria: p.categoria ?? null
});

const CLASSE_SITUACAO: Record<SituacaoItem, string> = {
  CORRETO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INCORRETO: 'bg-amber-100 text-amber-800 border-amber-200',
  SEM_PRECO: 'bg-sky-100 text-sky-700 border-sky-200'
};

const BORDA_SITUACAO: Record<SituacaoItem, string> = {
  CORRETO: 'border-l-emerald-500',
  INCORRETO: 'border-l-amber-400',
  SEM_PRECO: 'border-l-sky-400'
};

function Indicador({ rotulo, valor, classe = 'text-slate-800' }: { rotulo: string; valor: number | string; classe?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2 min-w-[92px]">
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">{rotulo}</span>
      <span className={`block text-lg font-black font-mono ${classe}`}>{valor}</span>
    </div>
  );
}

function CaixaMargem({ titulo, resultado }: { titulo: string; resultado: ResultadoMargem }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase">{titulo}</span>
        <span className="block text-sm font-black font-mono text-slate-800">
          Margem {percentual(resultado.margem_real_pct)}{' '}
          <span className="text-[11px] font-bold text-slate-500">(meta {percentual(resultado.margem_meta_pct)})</span>
        </span>
      </div>
      {resultado.margem_classificacao && (
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${CLASSE_CLASSIFICACAO_MARGEM[resultado.margem_classificacao]}`}>
          {ROTULO_CLASSIFICACAO[resultado.margem_classificacao]}
        </span>
      )}
    </div>
  );
}

export function AbaAuditar({ usuarioId, onFinalizada }: AbaAuditarProps) {
  const [emAndamento, setEmAndamento] = useState<AuditoriaRegistro[]>([]);
  const [ativa, setAtiva] = useState<AuditoriaRegistro | null>(null);
  const [itens, setItens] = useState<AuditoriaItemRegistro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const [secaoEscolhida, setSecaoEscolhida] = useState('');
  const [outroTexto, setOutroTexto] = useState('');
  const [aguardandoClasse, setAguardandoClasse] = useState(false);
  const [classeTexto, setClasseTexto] = useState('');

  const [parametros, setParametros] = useState<ParametroMargem[]>([]);
  const [config, setConfig] = useState<ConfigMargem>(CONFIG_MARGEM_PADRAO);

  const [produto, setProduto] = useState<ProdutoBusca | null>(null);
  const [chaveScanner, setChaveScanner] = useState(0);
  const [mostrarIncorreto, setMostrarIncorreto] = useState(false);
  const [precoEncontrado, setPrecoEncontrado] = useState('');

  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(20);

  const resumo = useMemo(() => resumirItens(itens), [itens]);
  const pag = paginar(itens, pagina, tamanho);
  const secaoAtual = ativa ? rotuloSecao(ativa.secao, ativa.secao_outro_descricao) : '';
  const jaAuditado = produto ? itens.find((i) => i.produto_id === produto.id) : undefined;

  const precoGondolaNumero = Number(precoEncontrado.replace(',', '.'));
  const previsaoSistema = produto
    ? avaliarMargem({
        situacao: 'CORRETO',
        precoSistema: Number(produto.pvenda ?? 0),
        precoEncontrado: null,
        custo: Number(produto.custoreal ?? 0),
        produto: chaveDoProduto(produto),
        parametros,
        config
      })
    : null;
  const previsaoGondola =
    produto && mostrarIncorreto && precoEncontrado.trim() && Number.isFinite(precoGondolaNumero) && precoGondolaNumero > 0
      ? avaliarMargem({
          situacao: 'INCORRETO',
          precoSistema: Number(produto.pvenda ?? 0),
          precoEncontrado: precoGondolaNumero,
          custo: Number(produto.custoreal ?? 0),
          produto: chaveDoProduto(produto),
          parametros,
          config
        })
      : null;

  const carregarEmAndamento = async () => {
    try {
      setEmAndamento(await auditoriaService.listarEmAndamento());
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar as auditorias em andamento.' });
    }
  };

  useEffect(() => {
    void carregarEmAndamento();
  }, []);

  useEffect(() => {
    const carregarMargem = async () => {
      try {
        const [params, cfg] = await Promise.all([
          auditoriaService.listarParametrosMargem(),
          auditoriaService.obterConfigMargem()
        ]);
        setParametros(params);
        setConfig(cfg);
      } catch (err) {
        console.error(err);
        setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar os parâmetros de margem. Os itens ficarão sem classificação.' });
      }
    };
    void carregarMargem();
  }, []);

  const abrirAuditoria = async (auditoria: AuditoriaRegistro) => {
    try {
      setCarregando(true);
      setAtiva(auditoria);
      setItens(await auditoriaService.listarItens(auditoria.id));
      setPagina(1);
      setProduto(null);
      setMostrarIncorreto(false);
      setPrecoEncontrado('');
      setMensagem(null);
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível abrir a auditoria.' });
    } finally {
      setCarregando(false);
    }
  };

  /** Primeiro passo: valida a seção e pede a classe antes de liberar a bipagem. */
  const avancarParaClasse = () => {
    if (!secaoEscolhida) {
      setMensagem({ tipo: 'erro', texto: 'Escolha a seção ou corredor antes de continuar.' });
      return;
    }
    if (secaoEscolhida === OPCAO_OUTRO && !outroTexto.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Especifique o local quando escolher "Outro".' });
      return;
    }
    setMensagem(null);
    setAguardandoClasse(true);
  };

  const cancelarClasse = () => {
    setAguardandoClasse(false);
    setClasseTexto('');
  };

  /** Segundo passo: cria a auditoria com a classe informada e abre a bipagem. */
  const iniciarAuditoria = async () => {
    if (!classeTexto.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe a classe que será auditada (ex.: AMACIANTES).' });
      return;
    }
    try {
      setSalvando(true);
      const nova = await auditoriaService.criarAuditoria({
        usuario_id: usuarioId,
        secao: secaoEscolhida,
        secao_outro_descricao: secaoEscolhida === OPCAO_OUTRO ? outroTexto.trim() : null,
        classe: classeTexto.trim()
      });
      setSecaoEscolhida('');
      setOutroTexto('');
      setClasseTexto('');
      setAguardandoClasse(false);
      await abrirAuditoria(nova);
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao iniciar a auditoria. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  };

  const limparRegistroAtual = () => {
    setProduto(null);
    setMostrarIncorreto(false);
    setPrecoEncontrado('');
    setChaveScanner((c) => c + 1);
  };

  /** Registra a decisão para o produto em foco. Um toque na situação grava na hora. */
  const registrar = async (situacao: SituacaoItem) => {
    if (!ativa || !produto) return;

    let encontrado: number | null = null;
    if (situacao === 'INCORRETO') {
      if (!precoEncontrado.trim()) {
        setMensagem({ tipo: 'erro', texto: 'Informe o preço encontrado na gôndola para marcar como incorreto.' });
        return;
      }
      encontrado = Number(precoEncontrado.replace(',', '.'));
      if (!Number.isFinite(encontrado) || encontrado <= 0) {
        setMensagem({ tipo: 'erro', texto: 'Preço encontrado na gôndola inválido.' });
        return;
      }
    }

    const avaliacao = avaliarMargem({
      situacao,
      precoSistema: Number(produto.pvenda ?? 0),
      precoEncontrado: encontrado,
      custo: Number(produto.custoreal ?? 0),
      produto: chaveDoProduto(produto),
      parametros,
      config
    });

    try {
      setSalvando(true);
      const salvo = await auditoriaService.registrarItem({
        auditoria_id: ativa.id,
        produto_id: produto.id,
        codprod: produto.codprod,
        descricao: produto.descricao,
        codbarra: produto.codbarra ?? null,
        departamento: produto.departamento ?? null,
        secao_produto: produto.secao ?? null,
        categoria: produto.categoria ?? null,
        custo_sistema: Number(produto.custoreal ?? 0),
        preco_sistema: Number(produto.pvenda ?? 0),
        situacao,
        preco_encontrado: encontrado,
        secao_local: secaoAtual,
        data_auditoria: hojeIso(),
        etiqueta_pendente: situacao === 'SEM_PRECO' || situacao === 'INCORRETO',
        usuario_id: usuarioId,
        preco_margem: avaliacao.preco_margem,
        margem_real_pct: avaliacao.margem_real_pct,
        margem_meta_pct: avaliacao.margem_meta_pct,
        margem_classificacao: avaliacao.margem_classificacao,
        correcao_status: avaliacao.correcao_status
      });
      const codigo = produto.codprod;
      const produtoId = produto.id;
      setItens((prev) => [salvo, ...prev.filter((i) => i.produto_id !== produtoId)]);
      setPagina(1);

      let texto = `${codigo} registrado: ${ROTULO_SITUACAO[situacao]}`;
      if (situacao === 'SEM_PRECO') texto += ' — enviado para etiquetas';
      if (situacao === 'INCORRETO') texto += ' — enviado para etiquetas (novo preço)';
      if (avaliacao.correcao_status === 'Pendente') texto += ' — margem fora da faixa, enviado para correção';
      setMensagem({ tipo: 'ok', texto: `${texto}.` });
      limparRegistroAtual();
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar o item. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  };

  const removerItem = async (item: AuditoriaItemRegistro) => {
    if (!window.confirm(`Remover ${item.codprod} desta auditoria?`)) return;
    try {
      await auditoriaService.removerItem(item.id);
      setItens((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível remover o item.' });
    }
  };

  const salvarESair = async () => {
    if (!ativa) return;
    try {
      setSalvando(true);
      await auditoriaService.atualizarResumo(ativa.id, resumo);
      setAtiva(null);
      setItens([]);
      limparRegistroAtual();
      await carregarEmAndamento();
      setMensagem({ tipo: 'ok', texto: 'Auditoria salva. Você pode continuar depois pela lista de andamento.' });
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar a auditoria.' });
    } finally {
      setSalvando(false);
    }
  };

  const finalizar = async () => {
    if (!ativa) return;
    if (itens.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Bipe ao menos um produto antes de finalizar.' });
      return;
    }
    if (!window.confirm(`Finalizar a auditoria com ${resumo.total} item(ns)? Ela seguirá para Análises.`)) return;
    try {
      setSalvando(true);
      await auditoriaService.finalizarAuditoria(ativa.id, resumo);
      setAtiva(null);
      setItens([]);
      limparRegistroAtual();
      onFinalizada();
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao finalizar a auditoria.' });
    } finally {
      setSalvando(false);
    }
  };

  // ----- Tela sem auditoria aberta: início ou continuidade -----
  if (!ativa) {
    return (
      <div className="flex flex-col gap-4">
        {mensagem && (
          <div className={`rounded-2xl p-3 text-xs font-bold border ${mensagem.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {mensagem.texto}
          </div>
        )}

        <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4">
          {!aguardandoClasse ? (
            <>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase">Nova auditoria</h2>
                <p className="text-xs text-slate-500 mt-1">Escolha a seção ou corredor que será auditado.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SECOES_AUDITORIA.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSecaoEscolhida(s)}
                    className={`p-3 rounded-2xl text-xs font-black uppercase border transition-all active:scale-95 ${
                      secaoEscolhida === s
                        ? 'bg-[#09797a] text-white border-[#09797a] shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {s === OPCAO_OUTRO ? 'Outro (especificar)' : s}
                  </button>
                ))}
              </div>

              {secaoEscolhida === OPCAO_OUTRO && (
                <input
                  type="text"
                  value={outroTexto}
                  onChange={(e) => setOutroTexto(e.target.value)}
                  placeholder="Qual o local? Ex.: Hortifruti, Frios, Ponta de gôndola 3"
                  className="p-3 rounded-2xl border border-slate-200 text-sm"
                />
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={salvando || !secaoEscolhida}
                  onClick={avancarParaClasse}
                  className="px-6 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
                >
                  Continuar
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase">Classe a ser auditada</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Seção: <strong className="text-slate-700">{rotuloSecao(secaoEscolhida, outroTexto)}</strong>. Informe a classe antes de começar a bipagem.
                </p>
              </div>

              <input
                type="text"
                autoFocus
                value={classeTexto}
                onChange={(e) => setClasseTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !salvando) void iniciarAuditoria();
                }}
                placeholder="Ex.: AMACIANTES"
                className="p-3 rounded-2xl border border-slate-200 text-sm font-black uppercase"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={cancelarClasse}
                  className="px-4 py-3 rounded-2xl text-xs font-bold bg-slate-100 text-slate-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={salvando || !classeTexto.trim()}
                  onClick={iniciarAuditoria}
                  className="px-6 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
                >
                  {salvando ? 'Iniciando...' : 'Iniciar bipagem'}
                </button>
              </div>
            </>
          )}
        </section>

        <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-3">
          <h2 className="text-sm font-black text-slate-800 uppercase">Em andamento</h2>
          {emAndamento.length === 0 && <p className="text-xs text-slate-400 font-bold">Nenhuma auditoria em andamento.</p>}
          {emAndamento.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 rounded-2xl p-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800">
                  {rotuloSecao(a.secao, a.secao_outro_descricao)}
                  {a.classe && <span className="text-slate-500"> • {a.classe}</span>}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">{a.codigo_customizado}</p>
                <p className="text-[11px] text-slate-500">
                  Responsável: <strong className="text-slate-700">{a.usuarios?.nome ?? '-'}</strong>
                </p>
                <p className="text-[11px] text-slate-500">Iniciada em {dataHoraIso(a.created_at)}</p>
              </div>
              <button
                type="button"
                disabled={carregando}
                onClick={() => abrirAuditoria(a)}
                className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase bg-teal-50 text-[#09797a] border border-teal-200 hover:bg-teal-100 active:scale-95 transition-all disabled:opacity-40"
              >
                Continuar
              </button>
            </div>
          ))}
        </section>
      </div>
    );
  }

  // ----- Auditoria aberta -----
  return (
    <div className="flex flex-col gap-4">
      {mensagem && (
        <div className={`rounded-2xl p-3 text-xs font-bold border ${mensagem.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {mensagem.texto}
        </div>
      )}

      <section className="bg-white rounded-3xl shadow-sm p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{ativa.codigo_customizado}</span>
            <h2 className="text-base font-black text-[#09797a] uppercase">
              {secaoAtual}
              {ativa.classe && <span className="text-slate-500"> • {ativa.classe}</span>}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={salvando}
              onClick={salvarESair}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 text-slate-700 active:scale-95 transition-all disabled:opacity-40"
            >
              Salvar e sair
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={finalizar}
              className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              Finalizar auditoria
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Indicador rotulo="Itens" valor={resumo.total} />
          <Indicador rotulo="Corretos" valor={resumo.corretos} classe="text-emerald-700" />
          <Indicador rotulo="Incorretos" valor={resumo.incorretos} classe="text-amber-700" />
          <Indicador rotulo="Sem preço" valor={resumo.semPreco} classe="text-sky-700" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* COLUNA ESQUERDA: bipagem e decisão */}
        <section className="bg-white rounded-3xl shadow-sm p-4 flex flex-col gap-4 lg:sticky lg:top-3">
          <SeletorProdutoScanner
            key={chaveScanner}
            onSelecionarProduto={(p) => {
              setProduto(p);
              setMostrarIncorreto(false);
              setPrecoEncontrado('');
            }}
            tituloCard="BIPE OU BUSQUE O PRODUTO"
            placeholder="Bipe o código de barras, ou digite código, EAN ou descrição..."
            selecionarAoEnter
            autoFocus
          />

          {!produto && (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center text-xs font-bold text-slate-400">
              Bipe um produto para registrar a situação dele na gôndola.
            </div>
          )}

          {produto && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div>
                <span className="font-mono text-[11px] font-black bg-slate-100 text-slate-700 rounded-lg px-2 py-1">{produto.codprod}</span>
                <h3 className="mt-2 text-sm font-black text-slate-800 leading-snug break-words">{produto.descricao}</h3>
                <p className="text-[11px] text-slate-500 mt-1 break-words">
                  {[produto.departamento, produto.secao, produto.categoria].filter(Boolean).join(' › ') || 'Sem classificação cadastrada'}
                </p>
                {produto.codbarra && <p className="text-[11px] text-slate-400 font-mono">EAN {produto.codbarra}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Custo</span>
                  <span className="block text-sm font-black font-mono text-slate-800">{moeda(Number(produto.custoreal ?? 0))}</span>
                </div>
                <div className="rounded-2xl bg-teal-50 border border-teal-100 p-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Preço no sistema</span>
                  <span className="block text-sm font-black font-mono text-[#09797a]">{moeda(Number(produto.pvenda ?? 0))}</span>
                </div>
              </div>

              {previsaoSistema && <CaixaMargem titulo="Margem no preço do sistema" resultado={previsaoSistema} />}

              {Number(produto.pvenda ?? 0) <= 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-[11px] font-bold text-amber-800">
                  Este produto está sem preço de venda cadastrado no sistema.
                </div>
              )}

              {jaAuditado && (
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 text-[11px] font-bold text-sky-800">
                  Já auditado nesta auditoria como "{ROTULO_SITUACAO[jaAuditado.situacao]}". Registrar de novo atualiza a situação.
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-xs font-black text-slate-700 uppercase">Esta mercadoria está precificada?</p>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => registrar('CORRETO')}
                  className="p-4 rounded-2xl text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
                >
                  ✓ Precificado e correto
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => setMostrarIncorreto(true)}
                  className="p-4 rounded-2xl text-sm font-black bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
                >
                  ✗ Precificado, mas incorreto
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => registrar('SEM_PRECO')}
                  className="p-4 rounded-2xl text-sm font-black bg-sky-600 hover:bg-sky-700 text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
                >
                  🏷 Sem preço — enviar para etiqueta
                </button>
              </div>

              {mostrarIncorreto && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Preço encontrado na gôndola (obrigatório)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={precoEncontrado}
                      onChange={(e) => setPrecoEncontrado(e.target.value)}
                      placeholder="Ex.: 12,90"
                      className="p-3 rounded-2xl border border-amber-200 text-sm font-mono font-black"
                    />
                  </label>
                  {previsaoGondola && <CaixaMargem titulo="Margem no preço da gôndola" resultado={previsaoGondola} />}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarIncorreto(false);
                        setPrecoEncontrado('');
                      }}
                      className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white text-slate-600 border border-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => registrar('INCORRETO')}
                      className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase bg-amber-600 hover:bg-amber-700 text-white active:scale-95 transition-all disabled:opacity-40"
                    >
                      Registrar incorreto
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* COLUNA DIREITA: itens da sessão */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-slate-700 uppercase">Itens desta auditoria ({itens.length})</h3>
            {carregando && <span className="text-[10px] font-bold text-teal-600 animate-pulse">Carregando...</span>}
          </div>

          {itens.length === 0 && (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center text-xs font-bold text-slate-400">
              Nenhum item registrado ainda.
            </div>
          )}

          {pag.itens.map((item) => (
            <article key={item.id} className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${BORDA_SITUACAO[item.situacao]} p-3 flex items-start justify-between gap-3`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] font-black text-slate-700">{item.codprod}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${CLASSE_SITUACAO[item.situacao]}`}>
                    {ROTULO_SITUACAO[item.situacao]}
                  </span>
                  {item.margem_classificacao && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${CLASSE_CLASSIFICACAO_MARGEM[item.margem_classificacao]}`}>
                      {ROTULO_CLASSIFICACAO[item.margem_classificacao]}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-800 mt-1 break-words">{item.descricao}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sistema: <strong className="font-mono">{moeda(Number(item.preco_sistema))}</strong>
                  {item.situacao === 'INCORRETO' && item.preco_encontrado !== null && (
                    <> • Gôndola: <strong className="font-mono text-amber-700">{moeda(Number(item.preco_encontrado))}</strong></>
                  )}
                  {item.margem_real_pct !== null && (
                    <> • Margem: <strong className="font-mono">{percentual(Number(item.margem_real_pct))}</strong></>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removerItem(item)}
                className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-2.5 py-1.5 shrink-0 active:scale-95 transition-all"
              >
                Remover
              </button>
            </article>
          ))}

          {itens.length > 0 && (
            <BarraPaginacao
              total={itens.length}
              pagina={pag.paginaAtual}
              tamanho={tamanho}
              onPagina={setPagina}
              onTamanho={(t) => {
                setTamanho(t);
                setPagina(1);
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}
