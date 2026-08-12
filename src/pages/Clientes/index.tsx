// Arquivo: src/pages/Clientes/index.tsx
import { useState, useEffect } from 'react';
import { clientesService, PASTAS_CLIENTES } from './services/clientesService';
import CadastroClienteModal from './components/CadastroClienteModal';

interface ClientesProps {
  onVoltarParaHome: () => void;
}

export default function Clientes({ onVoltarParaHome }: ClientesProps) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'ATIVOS' | 'INATIVOS' | 'POR_PASTA'>('ATIVOS');
  const [pastaFiltro, setPastaFiltro] = useState(PASTAS_CLIENTES[0]);

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEdicao, setClienteEdicao] = useState<any | null>(null);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const dados = await clientesService.listarClientes();
      setClientes(dados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const handleSalvarCliente = async (payload: any) => {
    if (clienteEdicao) {
      await clientesService.atualizarCliente(clienteEdicao.id, payload);
      alert('Cliente atualizado com sucesso!');
    } else {
      await clientesService.criarCliente(payload);
      alert('Cliente cadastrado com sucesso!');
    }
    setModalAberto(false);
    setClienteEdicao(null);
    carregarClientes();
  };

  const handleAlternarStatus = async (cli: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const acao = cli.ativo ? 'inativar' : 'ativar';
    if (confirm(`Deseja ${acao} o cliente ${cli.nome}?`)) {
      try {
        await clientesService.alternarStatusCliente(cli.id, cli.ativo);
        carregarClientes();
      } catch (err) {
        alert('Erro ao alterar status do cliente.');
      }
    }
  };

  // Filtragem conforme a aba
  const clientesAtivos = clientes.filter((c) => c.ativo);
  const clientesInativos = clientes.filter((c) => !c.ativo);

  let listaExibida: any[] = [];
  if (abaAtiva === 'ATIVOS') listaExibida = clientesAtivos;
  else if (abaAtiva === 'INATIVOS') listaExibida = clientesInativos;
  else listaExibida = clientes.filter((c) => c.pasta === pastaFiltro);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-3xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">CLIENTES</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Cadastro e Carteira de Clientes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setClienteEdicao(null);
              setModalAberto(true);
            }}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Novo Cadastro
          </button>
        </div>

        {/* ABAS */}
        <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('ATIVOS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaAtiva === 'ATIVOS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            ATIVOS ({clientesAtivos.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('INATIVOS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaAtiva === 'INATIVOS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            INATIVOS ({clientesInativos.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('POR_PASTA')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaAtiva === 'POR_PASTA' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            POR PASTA
          </button>
        </div>

        {/* FILTRO POR PASTA QUANDO NA ABA "POR PASTA" */}
        {abaAtiva === 'POR_PASTA' && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PASTAS_CLIENTES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPastaFiltro(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${
                  pastaFiltro === p ? 'bg-emerald-100 text-[#09797a] border border-emerald-300' : 'bg-gray-50 text-gray-500'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* LISTAGEM DE CLIENTES */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando clientes...</div>
          ) : listaExibida.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhum cliente cadastrado nesta aba.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {listaExibida.map((cli) => (
                <div
                  key={cli.id}
                  className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-xs text-gray-800 uppercase">{cli.nome}</h4>
                      <span className="text-[9px] font-bold text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded-md uppercase">
                        {cli.pasta}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                      {cli.contato_whatsapp} | {cli.cidade}/{cli.estado}
                    </p>
                    {cli.endereco && (
                      <p className="text-[9px] text-gray-400 truncate max-w-[320px]">
                        End: {cli.endereco}, Nº {cli.numero || 'S/N'} {cli.bairro ? `- ${cli.bairro}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setClienteEdicao(cli);
                        setModalAberto(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-black uppercase"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleAlternarStatus(cli, e)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${
                        cli.ativo ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {cli.ativo ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {modalAberto && (
        <CadastroClienteModal
          clienteEdicao={clienteEdicao}
          onSalvar={handleSalvarCliente}
          onCancelar={() => {
            setModalAberto(false);
            setClienteEdicao(null);
          }}
        />
      )}
    </div>
  );
}