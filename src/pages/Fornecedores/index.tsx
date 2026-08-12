// Adicione as importações no topo do arquivo src/pages/Fornecedores/index.tsx:
import { useState, useEffect } from 'react';
import { fornecedoresService, type FornecedorDTO } from './services/fornecedoresService';
import { ImportarFornecedoresModal } from './components/ImportarFornecedoresModal';

// No componente Fornecedores:
export default function Fornecedores({ onVoltarParaHome }: { onVoltarParaHome: () => void }) {
  const [fornecedores, setFornecedores] = useState<FornecedorDTO[]>([]);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  const carregarFornecedores = async () => {
    try {
      setLoading(true);
      const dados = await fornecedoresService.listarFornecedores();
      setFornecedores(dados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER DA PÁGINA */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Cadastro de Fornecedores</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1">Gestão de Parceiros Comerciais e CNPJs</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalImportarAberto(true)}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all flex items-center gap-2"
          >
            📥 Importar em Massa
          </button>
        </div>

        {/* TABELA DE FORNECEDORES */}
        <div className="flex-1 overflow-x-auto border border-gray-200 rounded-3xl bg-gray-50/50">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-black uppercase bg-gray-100/80">
                <th className="py-3 px-3">Razão Social</th>
                <th className="py-3 px-3">Nome Fantasia</th>
                <th className="py-3 px-3">CNPJ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium text-gray-600 uppercase">
              {loading ? (
                <tr><td colSpan={3} className="text-center py-10 text-gray-400 font-bold">Carregando Fornecedores...</td></tr>
              ) : fornecedores.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-gray-400 font-bold">Nenhum fornecedor cadastrado.</td></tr>
              ) : (
                fornecedores.map((f, i) => (
                  <tr key={f.id || i} className="hover:bg-white transition-colors">
                    <td className="py-2.5 px-3 font-bold text-gray-800">{f.razao_social}</td>
                    <td className="py-2.5 px-3 text-gray-600">{f.nome_fantasia}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#09797a]">{f.cnpj}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {modalImportarAberto && (
        <ImportarFornecedoresModal
          onSucesso={carregarFornecedores}
          onFechar={() => setModalImportarAberto(false)}
        />
      )}
    </div>
  );
}