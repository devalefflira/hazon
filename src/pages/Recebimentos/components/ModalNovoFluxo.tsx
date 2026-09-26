// src/pages/Recebimentos/components/ModalNovoFluxo.tsx
import { useState } from 'react';
import { recebimentoService } from '../services/recebimentoService';
import type { TipoDocumentoRecebimento } from '../types/recebimento.types';

interface ModalNovoFluxoProps {
  usuarioId: string;
  onFechar: () => void;
  onCriadoSucesso: (fluxoId: string) => void;
}

export default function ModalNovoFluxo({
  usuarioId,
  onFechar,
  onCriadoSucesso
}: ModalNovoFluxoProps) {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoRecebimento>('Nota Fiscal');

  // Campos Nota Fiscal / Não Fiscal
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [semNumero, setSemNumero] = useState(false);

  // Busca de Fornecedor
  const [termoFornecedor, setTermoFornecedor] = useState('');
  const [fornecedoresEncontrados, setFornecedoresEncontrados] = useState<any[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<any | null>(null);
  const [fornecedorManual, setFornecedorManual] = useState('');

  // Campos Caminhão da Casa
  const [corVeiculo, setCorVeiculo] = useState('');
  const [nomeMotorista, setNomeMotorista] = useState('Josenildo');

  const [salvando, setSalvando] = useState(false);

  // Manipulação de Fornecedor
  const handleBuscarFornecedor = async (termo: string) => {
    setTermoFornecedor(termo);
    if (!termo.trim()) {
      setFornecedoresEncontrados([]);
      return;
    }
    try {
      const res = await recebimentoService.buscarFornecedores(termo);
      setFornecedoresEncontrados(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelecionarFornecedor = (f: any) => {
    setFornecedorSelecionado(f);
    setTermoFornecedor(`${f.nome_fantasia || f.razao_social} (${f.cnpj})`);
    setFornecedoresEncontrados([]);
  };

  const handleLimparFornecedor = () => {
    setFornecedorSelecionado(null);
    setTermoFornecedor('');
    setFornecedoresEncontrados([]);
  };

  const handleIniciar = async () => {
    if (tipoDocumento === 'Nota Fiscal') {
      if (!numeroDocumento.trim()) {
        alert('Por favor, informe o número da Nota Fiscal.');
        return;
      }
      if (!fornecedorSelecionado && !fornecedorManual.trim()) {
        alert('Selecione ou informe o fornecedor da mercadoria.');
        return;
      }
    }

    if (tipoDocumento === 'Não Fiscal / Manual') {
      if (!semNumero && !numeroDocumento.trim()) {
        alert('Informe a numeração do pedido/cupom ou marque "Sem Número".');
        return;
      }
      if (!fornecedorSelecionado && !fornecedorManual.trim()) {
        alert('Selecione ou informe o fornecedor da mercadoria.');
        return;
      }
    }

    if (tipoDocumento === 'Caminhão da Casa') {
      if (!corVeiculo.trim()) {
        alert('Por favor, informe a cor do caminhão.');
        return;
      }
    }

    try {
      setSalvando(true);
      const novoId = await recebimentoService.iniciarNovoFluxo({
        tipo_documento: tipoDocumento,
        numero_documento: semNumero ? undefined : numeroDocumento.trim(),
        is_numero_gerado: semNumero || tipoDocumento === 'Caminhão da Casa',
        fornecedor_id: fornecedorSelecionado?.id,
        fornecedor_nome_manual: fornecedorManual.trim() || undefined,
        cor_veiculo: corVeiculo.trim() || undefined,
        nome_motorista: nomeMotorista.trim() || undefined,
        usuario_id: usuarioId
      });

      onCriadoSucesso(novoId);
    } catch (err: any) {
      alert(`Erro ao iniciar recebimento: ${err.message}`);
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
        className="w-full max-w-lg bg-white rounded-3xl sm:rounded-4xl p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col gap-5 max-h-[92vh] overflow-y-auto animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Iniciar Novo Recebimento
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Abertura de esteira e ciclo da mercadoria
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 3 Toggles de Tipo de Documento */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase text-slate-500">
            Tipo de Documento / Carga
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            {(['Nota Fiscal', 'Não Fiscal / Manual', 'Caminhão da Casa'] as TipoDocumentoRecebimento[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTipoDocumento(t);
                  setNumeroDocumento('');
                  setSemNumero(false);
                }}
                className={`py-2 px-1 text-[11px] font-black uppercase rounded-xl transition-all cursor-pointer text-center ${
                  tipoDocumento === t
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t === 'Nota Fiscal' ? '📄 NF' : t === 'Não Fiscal / Manual' ? '📝 Manual' : '🚚 Caminhão'}
              </button>
            ))}
          </div>
        </div>

        {/* Formulário Condicional */}
        <div className="flex flex-col gap-4">
          
          {/* FLUXO 1: NOTA FISCAL */}
          {tipoDocumento === 'Nota Fiscal' && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  * Número da Nota Fiscal
                </label>
                <input
                  type="text"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  placeholder="Ex: 00123456"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                />
              </div>

              {/* Busca Fornecedor */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">
                    * Fornecedor
                  </label>
                  {fornecedorSelecionado && (
                    <button
                      type="button"
                      onClick={handleLimparFornecedor}
                      className="text-[10px] font-black text-rose-600 uppercase hover:underline"
                    >
                      Trocar
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={termoFornecedor}
                  onChange={(e) => handleBuscarFornecedor(e.target.value)}
                  placeholder="Pesquise por Razão Social, Fantasia ou CNPJ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                />

                {fornecedoresEncontrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-20 flex flex-col">
                    {fornecedoresEncontrados.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelecionarFornecedor(f)}
                        className="p-2.5 text-left border-b border-slate-100 hover:bg-teal-50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="font-bold text-slate-800 uppercase">{f.nome_fantasia || f.razao_social}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{f.cnpj}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!fornecedorSelecionado && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Ou informe o nome manualmente (se não estiver na lista)
                  </label>
                  <input
                    type="text"
                    value={fornecedorManual}
                    onChange={(e) => setFornecedorManual(e.target.value)}
                    placeholder="Nome do Fornecedor Avulso..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                  />
                </div>
              )}
            </>
          )}

          {/* FLUXO 2: NÃO FISCAL / MANUAL */}
          {tipoDocumento === 'Não Fiscal / Manual' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">
                    Número do Pedido / Orçamento / Cupom
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={semNumero}
                      onChange={(e) => {
                        setSemNumero(e.target.checked);
                        if (e.target.checked) setNumeroDocumento('');
                      }}
                      className="rounded border-slate-300 text-[#09797a]"
                    />
                    <span className="text-[11px] font-bold text-slate-600">Sem número</span>
                  </label>
                </div>

                <input
                  type="text"
                  disabled={semNumero}
                  value={semNumero ? 'Numeração aleatória gerada na criação' : numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  placeholder="Informe o número do documento..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-60 focus:outline-none focus:border-[#09797a]"
                />
              </div>

              {/* Busca Fornecedor */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">
                    * Fornecedor
                  </label>
                  {fornecedorSelecionado && (
                    <button
                      type="button"
                      onClick={handleLimparFornecedor}
                      className="text-[10px] font-black text-rose-600 uppercase hover:underline"
                    >
                      Trocar
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={termoFornecedor}
                  onChange={(e) => handleBuscarFornecedor(e.target.value)}
                  placeholder="Pesquise por Razão Social, Fantasia ou CNPJ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                />

                {fornecedoresEncontrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-20 flex flex-col">
                    {fornecedoresEncontrados.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelecionarFornecedor(f)}
                        className="p-2.5 text-left border-b border-slate-100 hover:bg-teal-50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="font-bold text-slate-800 uppercase">{f.nome_fantasia || f.razao_social}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{f.cnpj}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!fornecedorSelecionado && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Ou informe o nome manualmente (se não estiver na lista)
                  </label>
                  <input
                    type="text"
                    value={fornecedorManual}
                    onChange={(e) => setFornecedorManual(e.target.value)}
                    placeholder="Nome do Fornecedor Avulso..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                  />
                </div>
              )}
            </>
          )}

          {/* FLUXO 3: CAMINHÃO DA CASA */}
          {tipoDocumento === 'Caminhão da Casa' && (
            <>
              <div className="bg-teal-50/50 border border-teal-200/60 p-3 rounded-2xl text-[11px] text-teal-900 font-medium">
                ℹ️ Uma numeração de rastreio de até 6 dígitos será gerada automaticamente pelo sistema.
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  * Cor do Veículo
                </label>
                <input
                  type="text"
                  value={corVeiculo}
                  onChange={(e) => setCorVeiculo(e.target.value)}
                  placeholder="Ex: Vermelho, Branco, Azul..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Motorista
                </label>
                <input
                  type="text"
                  value={nomeMotorista}
                  onChange={(e) => setNomeMotorista(e.target.value)}
                  placeholder="Nome do motorista..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                />
              </div>
            </>
          )}

        </div>

        {/* Rodapé / Ações */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase cursor-pointer hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={handleIniciar}
            className="px-5 py-2.5 rounded-xl bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white font-black text-xs uppercase shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {salvando ? 'Iniciando...' : 'Iniciar Recebimento'}
          </button>
        </div>

      </div>
    </div>
  );
}