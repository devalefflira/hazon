// src/pages/AuditoriaPrecificacao/components/margeamento/ParametrosMargeamento.tsx
import { useEffect, useMemo, useState } from 'react';
import { auditoriaService } from '../../services/auditoriaService';
import type { HierarquiaProduto } from '../../services/auditoriaService';
import type { ConfigMargem, ParametroMargem } from '../../types/auditoria.types';

interface Mensagem {
  tipo: 'ok' | 'erro';
  texto: string;
}

const FORM_VAZIO = { departamento: '', secao: '', categoria: '', margem: '' };

const textoOuQualquer = (valor: string): string => (valor.trim() === '' ? 'Qualquer' : valor);

const unicos = (lista: string[]): string[] =>
  Array.from(new Set(lista.filter((v) => v.trim() !== ''))).sort((a, b) => a.localeCompare(b, 'pt-BR'));

/** Garante que um valor já salvo apareça na lista, mesmo que não esteja mais no cadastro. */
const comValorAtual = (lista: string[], valorAtual: string): string[] =>
  valorAtual && !lista.includes(valorAtual) ? unicos([...lista, valorAtual]) : lista;

export function ParametrosMargeamento() {
  const [parametros, setParametros] = useState<ParametroMargem[]>([]);
  const [hierarquia, setHierarquia] = useState<HierarquiaProduto[]>([]);
  const [config, setConfig] = useState<ConfigMargem | null>(null);
  const [configForm, setConfigForm] = useState({ ideal: '', tolerancia: '', muito: '' });
  const [form, setForm] = useState(FORM_VAZIO);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const carregar = async () => {
    try {
      setCarregando(true);
      const [params, cfg] = await Promise.all([auditoriaService.listarParametrosMargem(), auditoriaService.obterConfigMargem()]);
      setParametros(params);
      setConfig(cfg);
      setConfigForm({
        ideal: String(cfg.faixa_ideal_pp).replace('.', ','),
        tolerancia: String(cfg.faixa_tolerancia_pp).replace('.', ','),
        muito: String(cfg.faixa_muito_pp).replace('.', ',')
      });
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar os parâmetros de margem.' });
    } finally {
      setCarregando(false);
    }
  };

  const carregarHierarquia = async () => {
    try {
      setHierarquia(await auditoriaService.listarHierarquiaProdutos());
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar departamentos, seções e categorias do cadastro de produtos.' });
    }
  };

  useEffect(() => {
    void carregar();
    void carregarHierarquia();
  }, []);

  // Opções em cascata: departamento -> seção -> categoria, todas vindas do cadastro de produtos.
  const opcoes = useMemo(() => {
    const doDepartamento = (h: HierarquiaProduto) => !form.departamento || h.departamento === form.departamento;
    const daSecao = (h: HierarquiaProduto) => !form.secao || h.secao === form.secao;

    return {
      departamentos: comValorAtual(unicos(hierarquia.map((h) => h.departamento)), form.departamento),
      secoes: comValorAtual(unicos(hierarquia.filter(doDepartamento).map((h) => h.secao)), form.secao),
      categorias: comValorAtual(
        unicos(hierarquia.filter((h) => doDepartamento(h) && daSecao(h)).map((h) => h.categoria)),
        form.categoria
      )
    };
  }, [hierarquia, form.departamento, form.secao, form.categoria]);

  const lerNumero = (texto: string): number => Number(texto.trim().replace(',', '.'));

  const salvarParametro = async () => {
    const margem = lerNumero(form.margem);
    if (!form.margem.trim() || !Number.isFinite(margem) || margem < 0 || margem >= 100) {
      setMensagem({ tipo: 'erro', texto: 'Informe a margem alvo em percentual, entre 0 e 99,99.' });
      return;
    }
    try {
      setSalvando(true);
      await auditoriaService.salvarParametroMargem({
        departamento: form.departamento,
        secao: form.secao,
        categoria: form.categoria,
        margem_alvo_pct: margem
      });
      setForm(FORM_VAZIO);
      setMensagem({ tipo: 'ok', texto: 'Parâmetro de margem salvo.' });
      await carregar();
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar o parâmetro.' });
    } finally {
      setSalvando(false);
    }
  };

  const editarParametro = (p: ParametroMargem) => {
    setForm({
      departamento: p.departamento,
      secao: p.secao,
      categoria: p.categoria,
      margem: String(p.margem_alvo_pct).replace('.', ',')
    });
    setMensagem(null);
  };

  const removerParametro = async (p: ParametroMargem) => {
    if (!p.id) return;
    if (!window.confirm(`Remover a meta de ${textoOuQualquer(p.departamento)} › ${textoOuQualquer(p.secao)} › ${textoOuQualquer(p.categoria)}?`)) return;
    try {
      await auditoriaService.removerParametroMargem(p.id);
      setMensagem({ tipo: 'ok', texto: 'Parâmetro removido.' });
      await carregar();
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível remover o parâmetro.' });
    }
  };

  const salvarFaixas = async () => {
    const ideal = lerNumero(configForm.ideal);
    const tolerancia = lerNumero(configForm.tolerancia);
    const muito = lerNumero(configForm.muito);
    if (![ideal, tolerancia, muito].every((v) => Number.isFinite(v) && v >= 0)) {
      setMensagem({ tipo: 'erro', texto: 'As faixas devem ser números maiores ou iguais a zero.' });
      return;
    }
    if (!(ideal <= tolerancia && tolerancia <= muito)) {
      setMensagem({ tipo: 'erro', texto: 'A ordem das faixas deve ser: ideal ≤ tolerância ≤ muito.' });
      return;
    }
    try {
      setSalvando(true);
      await auditoriaService.salvarConfigMargem({ faixa_ideal_pp: ideal, faixa_tolerancia_pp: tolerancia, faixa_muito_pp: muito });
      setMensagem({ tipo: 'ok', texto: 'Faixas de tolerância salvas.' });
      await carregar();
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar as faixas de tolerância.' });
    } finally {
      setSalvando(false);
    }
  };

  const seletorClasse = 'p-3 rounded-2xl border border-slate-200 text-sm bg-white';

  return (
    <div className="flex flex-col gap-4">
      {mensagem && (
        <div className={`rounded-2xl p-3 text-xs font-bold border ${mensagem.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {mensagem.texto}
        </div>
      )}

      {/* FAIXAS DE TOLERÂNCIA */}
      <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase">Faixas de tolerância</h2>
          <p className="text-xs text-slate-500 mt-1">
            Distância da margem real até a meta, em pontos percentuais. Ideal: até ± ideal. Tolerável: acima da meta, até + tolerância. Abaixo da meta, além do
            ideal, é "Abaixo"; além de "Muito", é "Muito abaixo". Acima da tolerância, "Muito acima".
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Ideal (± pp)</span>
            <input
              type="text"
              inputMode="decimal"
              value={configForm.ideal}
              onChange={(e) => setConfigForm({ ...configForm, ideal: e.target.value })}
              className="p-3 rounded-2xl border border-slate-200 text-sm font-mono font-black"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Tolerância (pp acima)</span>
            <input
              type="text"
              inputMode="decimal"
              value={configForm.tolerancia}
              onChange={(e) => setConfigForm({ ...configForm, tolerancia: e.target.value })}
              className="p-3 rounded-2xl border border-slate-200 text-sm font-mono font-black"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Muito (pp)</span>
            <input
              type="text"
              inputMode="decimal"
              value={configForm.muito}
              onChange={(e) => setConfigForm({ ...configForm, muito: e.target.value })}
              className="p-3 rounded-2xl border border-slate-200 text-sm font-mono font-black"
            />
          </label>
          <button
            type="button"
            disabled={salvando || !config}
            onClick={salvarFaixas}
            className="px-4 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            Salvar faixas
          </button>
        </div>
      </section>

      {/* CADASTRO DE META */}
      <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase">Margem alvo por departamento, seção e categoria</h2>
          <p className="text-xs text-slate-500 mt-1">
            Os valores são os mesmos do cadastro de produtos. Escolha "Qualquer" para valer para todos. Quando mais de uma meta combina com o produto, prevalece a
            mais específica.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Departamento</span>
            <select
              value={form.departamento}
              onChange={(e) => setForm({ ...form, departamento: e.target.value, secao: '', categoria: '' })}
              className={seletorClasse}
            >
              <option value="">Qualquer</option>
              {opcoes.departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Seção</span>
            <select value={form.secao} onChange={(e) => setForm({ ...form, secao: e.target.value, categoria: '' })} className={seletorClasse}>
              <option value="">Qualquer</option>
              {opcoes.secoes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Categoria</span>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={seletorClasse}>
              <option value="">Qualquer</option>
              {opcoes.categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Margem alvo (%)</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.margem}
                onChange={(e) => setForm({ ...form, margem: e.target.value })}
                placeholder="Ex.: 35"
                className="p-3 rounded-2xl border border-slate-200 text-sm font-mono font-black"
              />
            </label>
            <button
              type="button"
              disabled={salvando}
              onClick={salvarParametro}
              className="self-end px-4 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      </section>

      {/* LISTA DE METAS */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black text-slate-700 uppercase px-1">Metas cadastradas ({parametros.length})</h2>

        {!carregando && parametros.length === 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-bold text-slate-400">
            Nenhuma meta cadastrada. Os itens auditados ficarão como "Sem parâmetro".
          </div>
        )}

        {parametros.length > 0 && (
          <div className="overflow-x-auto whitespace-nowrap bg-white rounded-3xl shadow-sm border border-slate-100">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-black">Departamento</th>
                  <th className="px-3 py-2.5 font-black">Seção</th>
                  <th className="px-3 py-2.5 font-black">Categoria</th>
                  <th className="px-3 py-2.5 font-black text-right">Margem alvo</th>
                  <th className="px-3 py-2.5 font-black text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parametros.map((p) => (
                  <tr key={p.id ?? `${p.departamento}|${p.secao}|${p.categoria}`} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-bold text-slate-800">{textoOuQualquer(p.departamento)}</td>
                    <td className="px-3 py-2.5 text-slate-700">{textoOuQualquer(p.secao)}</td>
                    <td className="px-3 py-2.5 text-slate-700">{textoOuQualquer(p.categoria)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-black text-[#09797a]">
                      {Number(p.margem_alvo_pct).toFixed(2).replace('.', ',')}%
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => editarParametro(p)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-teal-50 text-[#09797a] border border-teal-200 active:scale-95 transition-all"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removerParametro(p)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100 active:scale-95 transition-all"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
