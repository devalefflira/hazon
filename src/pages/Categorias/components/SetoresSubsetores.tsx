import { useState, useEffect } from 'react';
import { categoriasService } from '../services/categoriasService';

// Tipagem das estruturas que vêm do serviço do Supabase
interface Subsetor {
    id: string;
    nome: string;
}

interface Setor {
    id: string;
    nome: string;
    categorias_subsetores: Subsetor[];
}

export default function SetoresSubsetores() {
    const [setores, setSetores] = useState<Setor[]>([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    // Estados para os formulários de cadastro
    const [novoSetor, setNovoSetor] = useState('');
    const [novoSubsetor, setNovoSubsetor] = useState('');
    const [setorPaiId, setSetorPaiId] = useState('');
    const [salvando, setSalvando] = useState(false);

    // Estado para controlar quais setores estão expandidos (guarda os IDs abertos)
    const [setoresAbertos, setSetoresAbertos] = useState<string[]>([]);

    // Carrega os dados do banco ao abrir a tela
    const carregarDados = async () => {
        try {
            setLoading(true);
            const dados = await categoriasService.listarSetoresComSubsetores();
            // O Supabase retorna um objeto ou array de objetos. Forçamos a tipagem correta.
            setSetores(dados as unknown as Setor[] || []);
        } catch (err) {
            setErro('Erro ao carregar setores do banco de dados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    // Alterna o estado de aberto/fechado do Accordion
    const toggleSetor = (id: string) => {
        if (setoresAbertos.includes(id)) {
            setSetoresAbertos(setoresAbertos.filter(setorId => setorId !== id));
        } else {
            setSetoresAbertos([...setoresAbertos, id]);
        }
    };

    // Envio do formulário de novo Setor Pai
    const handleCadastrarSetor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!novoSetor.trim()) return;

        try {
            setSalvando(true);
            setErro('');
            await categoriasService.salvarSetor(novoSetor.trim());
            setNovoSetor('');
            await carregarDados(); // Atualiza a lista automaticamente
        } catch (err: any) {
            setErro(err.message?.includes('duplicate') ? 'Este setor já está cadastrado.' : 'Erro ao salvar o setor.');
        } finally {
            setSalvando(false);
        }
    };

    // Envio do formulário de novo Subsetor
    const handleCadastrarSubsetor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!novoSubsetor.trim() || !setorPaiId) return;

        try {
            setSalvando(true);
            setErro('');
            await categoriasService.salvarSubsetor(setorPaiId, novoSubsetor.trim());
            setNovoSubsetor('');
            await carregarDados(); // Atualiza a lista automaticamente
        } catch (err: any) {
            setErro(err.message?.includes('duplicate') ? 'Este subsetor já existe neste setor.' : 'Erro ao salvar o subsetor.');
        } finally {
            setSalvando(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-12 w-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09797a]"></div>
                <span className="text-sm text-gray-500 mt-3 font-medium">Buscando catálogos...</span>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col animate-fadeIn">
            {/* EXIBIÇÃO DE ERROS */}
            {erro && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 font-medium text-center">
                    {erro}
                </div>
            )}

            {/* ÁREA DE CADASTROS RÁPIDOS (MOBILE-FIRST ACCORDION DE FORMULÁRIOS) */}
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 mb-6 flex flex-col gap-4">

                {/* Formulário Setor Pai */}
                <form onSubmit={handleCadastrarSetor} className="w-full flex gap-2">
                    <input
                        type="text"
                        placeholder="Novo Setor Pai (Ex: Mercearia)"
                        value={novoSetor}
                        onChange={(e) => setNovoSetor(e.target.value)}
                        disabled={salvando}
                        className="flex-1 bg-white border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a]"
                        required
                    />
                    <button
                        type="submit"
                        disabled={salvando}
                        className="bg-[#09797a] text-white font-bold px-4 rounded-xl text-sm h-11 active:scale-95 transition-all disabled:bg-gray-300"
                    >
                        + Setor
                    </button>
                </form>

                <div className="border-b border-gray-200 my-0.5"></div>

                {/* Formulário Subsetor */}
                <form onSubmit={handleCadastrarSubsetor} className="w-full flex flex-col gap-2">
                    <div className="w-full flex gap-2">
                        <select
                            value={setorPaiId}
                            onChange={(e) => setSetorPaiId(e.target.value)} // <--- Corrigido aqui!
                            disabled={salvando}
                            className="w-[45%] bg-white border border-gray-300 rounded-xl px-2 h-11 text-xs outline-none focus:border-[#09797a] text-gray-700"
                            required
                        >
                            <option value="">Selecione o Setor...</option>
                            {setores.map(s => (
                                <option key={s.id} value={s.id}>{s.nome}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Novo Subsetor (Ex: Açougue)"
                            value={novoSubsetor}
                            onChange={(e) => setNovoSubsetor(e.target.value)}
                            disabled={salvando}
                            className="flex-1 bg-white border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a]"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={salvando}
                        className="w-full bg-[#e07a5f] text-white font-bold rounded-xl text-sm h-11 active:scale-[0.98] transition-all disabled:bg-gray-300"
                    >
                        + Adicionar Subsetor Vinculado
                    </button>
                </form>
            </div>

            {/* LISTAGEM DE SETORES EM FORMATO ACCORDION */}
            <div className="w-full flex flex-col gap-2 max-h-100 overflow-y-auto pr-0.5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Setores Ativos</h3>

                {setores.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum setor encontrado.</p>
                ) : (
                    setores.map((setor) => {
                        const aberto = setoresAbertos.includes(setor.id);
                        return (
                            <div key={setor.id} className="w-full border border-gray-100 rounded-xl overflow-hidden shadow-sm">

                                {/* BARRA DO SETOR (GATILHO) */}
                                <button
                                    onClick={() => toggleSetor(setor.id)}
                                    className={`w-full flex justify-between items-center p-4 text-left font-bold text-sm transition-colors ${aberto ? 'bg-[#09797a]/10 text-[#09797a]' : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                                        }`}
                                >
                                    <span>{setor.nome}</span>
                                    <span className={`text-xs transform transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}>
                                        ▼
                                    </span>
                                </button>

                                {/* CONTEÚDO (SUBSETORES) */}
                                {aberto && (
                                    <div className="bg-white px-4 py-2 border-t border-gray-50 animate-slideDown">
                                        {setor.categorias_subsetores && setor.categorias_subsetores.length > 0 ? (
                                            <ul className="divide-y divide-gray-100">
                                                {setor.categorias_subsetores.map((sub) => (
                                                    <li key={sub.id} className="py-2.5 text-xs text-gray-600 font-medium flex items-center">
                                                        <span className="text-[#e07a5f] mr-2">▪</span> {sub.nome}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic py-2">Nenhum subsetor atrelado a este setor.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}