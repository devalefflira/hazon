import { useState, useEffect } from 'react';
import { vendedoresService } from './services/vendedoresService';
import CadastroVendedor from './components/CadastroVendedor';

interface Vendedor {
    id: string;
    nome: string;
    telefone: string;
    fornecedor_nome: string; // Mudamos aqui para refletir o serviço
    setores: { setor: string; subsetor: string }[];
}

interface VendedoresProps {
    onVoltarParaHome: () => void;
}

export default function Vendedores({ onVoltarParaHome }: VendedoresProps) {
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    const [busca, setBusca] = useState('');
    const [exibindoCadastro, setExibindoCadastro] = useState(false);

    const carregarVendedores = async () => {
        try {
            setLoading(true);
            setErro('');
            const dados = await vendedoresService.listarVendedores();
            setVendedores(dados as unknown as Vendedor[] || []);
        } catch (err: any) {
            setErro('Erro ao carregar a listagem de representantes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarVendedores();
    }, []);

    // Busca em tempo real por nome do vendedor ou da empresa parceira com tratamento de nulos
    const vendedoresFiltrados = vendedores.filter(v => {
    const nomeVendedor = v.nome?.toLowerCase() || '';
    // Agora acessamos o campo string 'fornecedor_nome' que vem do serviço
    const nomeEmpresa = v.fornecedor_nome?.toLowerCase() || '';
    const termoBusca = busca.toLowerCase();

    return nomeVendedor.includes(termoBusca) || nomeEmpresa.includes(termoBusca);
});

    const handleSucessoCadastro = () => {
        setExibindoCadastro(false);
        carregarVendedores();
    };

    // Auxiliar para formatar telefone na exibição do card
    const formatarTelefoneExibicao = (raw: string) => {
        const num = raw.replace(/\D/g, '');
        if (num.length === 11) {
            return num.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        }
        return num.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    };

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
            <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-150 relative">

                {/* CABEÇALHO */}
                <div className="flex items-center w-full mb-5 border-b border-gray-100 pb-4">
                    <button
                        onClick={exibindoCadastro ? () => setExibindoCadastro(false) : onVoltarParaHome}
                        className="p-2 hover:bg-gray-100 rounded-full active:scale-90 transition-all mr-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#09797a" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7m-7.5 7h16.5" />
                        </svg>
                    </button>
                    <h1 className="text-[#09797a] font-bold text-xl tracking-tight select-none">
                        {exibindoCadastro ? 'Novo Representante' : 'Vendedores'}
                    </h1>
                </div>

                {erro && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 text-center font-medium">{erro}</div>}

                {exibindoCadastro ? (
                    <CadastroVendedor onSucesso={handleSucessoCadastro} onCancelar={() => setExibindoCadastro(false)} />
                ) : (
                    <div className="flex flex-col flex-1 animate-fadeIn">
                        {/* Barra de Pesquisa */}
                        <div className="w-full relative mb-4">
                            <input
                                type="text"
                                placeholder="🔎 Buscar por vendedor ou empresa..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-10 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all shadow-inner text-gray-700"
                            />
                            {busca && (
                                <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Lista em Cards */}
                        <div className="w-full flex flex-col gap-2.5 overflow-y-auto max-h-102.5 pr-0.5 flex-1">
                            {loading ? (
                                <div className="flex justify-center items-center py-12 w-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09797a]"></div>
                                </div>
                            ) : vendedoresFiltrados.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-12 italic">Nenhum representante comercial localizado.</p>
                            ) : (
                                vendedoresFiltrados.map((v) => (
                                    <div
                                        key={v.id}
                                        className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 shadow-sm border-l-4 border-l-[#e07a5f]"
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <span className="font-extrabold text-sm text-gray-800 tracking-wide">{v.nome}</span>
                                            <div className="flex flex-col gap-1 items-end">
                                                {v.setores.map((s, idx) => (
                                                    <span key={idx} className="bg-[#09797a]/10 text-[#09797a] text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-[#09797a]/20 text-right">
                                                        {s.setor} {s.subsetor !== 'Geral' ? `/ ${s.subsetor}` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-tight">
                                            🏢 {v.fornecedor_nome}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium">
                                            📱 WhatsApp: <strong className="text-gray-600 font-mono">{formatarTelefoneExibicao(v.telefone)}</strong>
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* BOTÃO FLUTUANTE (+) */}
                        {!loading && (
                            <button
                                onClick={() => setExibindoCadastro(true)}
                                className="absolute bottom-6 right-6 w-14 h-14 bg-[#09797a] text-white rounded-full flex justify-center items-center text-3xl shadow-lg active:scale-90 transition-all select-none z-10 font-light"
                            >
                                +
                            </button>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}