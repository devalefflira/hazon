import { useState, useEffect, useRef } from 'react';
import { notaFaltaService } from './services/notaFaltaService';
import type { MotivoFalta, ProdutoFalta, NotaFaltaRegistro } from './services/notaFaltaService';

interface UsuarioLogado {
    id: string;
    nome: string;
    perfil: string;
}

interface NotaFaltaProps {
    onVoltarParaHome: () => void;
    usuarioLogado: UsuarioLogado | null;
}

type SubTela = 'dashboard' | 'registrar';

export default function NotaFalta({ onVoltarParaHome, usuarioLogado }: NotaFaltaProps) {
    // Controle de Fluxo de Telas
    const [subTela, setSubTela] = useState<SubTela>('dashboard');
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    const [salvando, setSalvando] = useState(false);

    // Repositórios de Dados do Banco
    const [historicoFaltas, setHistoricoFaltas] = useState<NotaFaltaRegistro[]>([]);
    const [motivos, setMotivos] = useState<MotivoFalta[]>([]);

    // Estados dos Filtros da Tela Principal (Dashboard)
    const [inputStatus, setInputStatus] = useState('');
    const [filtroStatusAplicado, setFiltroStatusAplicado] = useState('');

    // Estados do Formulário de Registro
    const [buscaTermo, setBuscaTermo] = useState('');
    const [produtosSugestoes, setProdutosSugestoes] = useState<ProdutoFalta[]>([]);
    const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoFalta | null>(null);
    const [motivoSelecionadoId, setMotivoSelecionadoId] = useState('');
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

    const inputBuscaRef = useRef<HTMLInputElement>(null);

    // Carga das informações do Dashboard e tabelas auxiliares
    const carregarModulo = async () => {
        try {
            setLoading(true);
            setErro('');
            const historico = await notaFaltaService.listarHistoricoFaltas();
            const listaMotivos = await notaFaltaService.listarMotivosFalta();
            setHistoricoFaltas(historico);
            setMotivos(listaMotivos);
        } catch (err) {
            setErro('Falha ao conectar com o motor de rupturas do Supabase.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (usuarioLogado?.id) {
            carregarDashboardEAuxiliares();
        }
    }, [usuarioLogado]);

    const carregarDashboardEAuxiliares = () => {
        carregarModulo();
    };

    // Debounce para Busca Híbrida de Produtos (EAN / Descrição)
    useEffect(() => {
        if (!buscaTermo.trim() || produtoSelecionado) {
            setProdutosSugestoes([]);
            setMostrarSugestoes(false);
            return;
        }

        const buscarProdutos = setTimeout(async () => {
            try {
                const resultados = await notaFaltaService.pesquisarProdutosHibrido(buscaTermo);
                setProdutosSugestoes(resultados);

                // Se houver apenas 1 resultado exato por código de barras, já seleciona direto
                if (resultados.length === 1 && resultados[0].codigo_barras === buscaTermo.trim()) {
                    handleSelecionarProduto(resultados[0]);
                } else {
                    setMostrarSugestoes(resultados.length > 0);
                }
            } catch (err) {
                console.error(err);
            }
        }, 350);

        return () => clearTimeout(buscarProdutos);
    }, [buscaTermo, produtoSelecionado]);

    const handleSelecionarProduto = (prod: ProdutoFalta) => {
        setProdutoSelecionado(prod);
        setBuscaTermo(prod.descricao);
        setMostrarSugestoes(false);
    };

    const handleLimparProduto = () => {
        setProdutoSelecionado(null);
        setBuscaTermo('');
        setProdutosSugestoes([]);
        setTimeout(() => inputBuscaRef.current?.focus(), 50);
    };

    const handleRegistrarFalta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuarioLogado || !produtoSelecionado || !motivoSelecionadoId) return;

        try {
            setSalvando(true);
            setErro('');

            await notaFaltaService.registrarNotaFalta({
                usuario_id: usuarioLogado.id,
                produto_id: produtoSelecionado.id,
                setor_id: produtoSelecionado.setor_id,
                subsetor_id: produtoSelecionado.subsetor_id,
                motivo_falta_id: motivoSelecionadoId
            });

            // Reset inteligente para próxima bipada em sequência
            setProdutoSelecionado(null);
            setBuscaTermo('');
            setMotivoSelecionadoId('');

            // Feedback visual rápido e retorno do foco
            inputBuscaRef.current?.focus();
            carregarModulo();

        } catch (err) {
            setErro('Erro ao registrar a ruptura no banco.');
        } finally {
            setSalvando(false);
        }
    };

    const handleSetaVoltar = () => {
        if (subTela === 'registrar') {
            setSubTela('dashboard');
            carregarModulo();
        } else {
            onVoltarParaHome();
        }
    };

    // Helpers de Formatação e fuso horário (-3h Brasília)
    const formatarData = (d: string) => d.split('-').reverse().join('/');

    const formatarHoraComAjuste = (timeStr: string) => {
        if (!timeStr) return '00:00';
        const [horas, minutos] = timeStr.split(':').map(Number);
        let horasAjustadas = horas - 3;
        if (horasAjustadas < 0) horasAjustadas += 24;
        return `${String(horasAjustadas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    };

    // Filtragem controlada pelos botões de ação do Dashboard
    const faltasFiltradas = historicoFaltas.filter(item => {
        return filtroStatusAplicado ? item.status_cotacao === filtroStatusAplicado : true;
    });

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
            <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-150 relative">

                {/* HEADER UNIFICADO */}
                <div className="flex items-center w-full mb-4 border-b border-gray-100 pb-3 select-none">
                    <button onClick={handleSetaVoltar} className="p-2 hover:bg-gray-100 rounded-full mr-1.5 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#09797a" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7m-7.5 7h16.5" />
                        </svg>
                    </button>
                    <h1 className="text-[#09797a] font-black text-lg tracking-tight">Nota de Falta</h1>
                </div>

                {erro && (
                    <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-xl text-center font-bold mb-3 animate-fadeIn">
                        {erro}
                    </div>
                )}

                {loading && subTela === 'dashboard' ? (
                    <div className="flex flex-col flex-1 justify-center items-center py-12 gap-2">
                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#09797a]"></div>
                        <span className="text-[11px] text-gray-400 italic">Buscando rupturas na gôndola...</span>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1">

                        {/* VISTA A: DASHBOARD PRINCIPAL */}
                        {subTela === 'dashboard' && (
                            <div className="flex flex-col flex-1 animate-fadeIn">
                                <button
                                    onClick={() => setSubTela('registrar')}
                                    className="w-full h-11 bg-[#09797a] text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex justify-center items-center gap-1.5 mb-4"
                                >
                                    📝 Registrar Nova Falta
                                </button>

                                {/* Filtro por Status Controlado por Ações */}
                                <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl flex flex-col gap-2 mb-4">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-0.5">Filtros de Pesquisa</span>
                                    <select
                                        value={inputStatus}
                                        onChange={(e) => setInputStatus(e.target.value)}
                                        className="w-full bg-white border text-[11px] font-semibold rounded-lg px-2 h-8 outline-none text-gray-600"
                                    >
                                        <option value="">Todos os Status de Cotação</option>
                                        <option value="Pendente">Pendente</option>
                                        <option value="Em Cotação">Em Cotação</option>
                                        <option value="Finalizado">Finalizado</option>
                                    </select>
                                    <div className="grid grid-cols-2 gap-2 mt-0.5">
                                        <button
                                            onClick={() => { setInputStatus(''); setFiltroStatusAplicado(''); }}
                                            className="h-7 bg-white border border-gray-300 text-gray-600 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-all"
                                        >
                                            🧹 Limpar
                                        </button>
                                        <button
                                            onClick={() => setFiltroStatusAplicado(inputStatus)}
                                            className="h-7 bg-[#09797a] text-white rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-all shadow-xs"
                                        >
                                            🔍 Filtrar
                                        </button>
                                    </div>
                                </div>

                                {/* Grid de Itens Registrados */}
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider pl-1 mb-2 block">Produtos em Falta ({faltasFiltradas.length})</span>
                                <div className="flex flex-col gap-2.5 max-h-72.5 overflow-y-auto pr-1">
                                    {faltasFiltradas.length === 0 ? (
                                        <div className="text-center py-10 text-xs text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">Nenhuma ruptura pendente de cotação.</div>
                                    ) : (
                                        faltasFiltradas.map((item) => (
                                            <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-col gap-1.5 shadow-xs relative">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-extrabold text-gray-800 text-xs truncate max-w-52.5">{item.produtos?.descricao}</span>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${item.status_cotacao === 'Pendente' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            item.status_cotacao === 'Em Cotação' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        }`}>
                                                        {item.status_cotacao}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-bold flex flex-col gap-0.5 border-t border-gray-50 pt-1.5">
                                                    <p>📍 Setor: {item.categorias_setores?.nome} / {item.categorias_subsetores?.nome}</p>
                                                    <p>⚠️ Motivo: <span className="text-red-600 font-extrabold">{item.motivos_falta?.descricao}</span></p>
                                                    <p className="text-[9px] font-mono text-gray-400 mt-0.5">👤 {item.usuarios?.nome} em {formatarData(item.data_registro)} às {formatarHoraComAjuste(item.hora_registro)}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VISTA B: FORMULÁRIO DE LANÇAMENTO COMPACTO */}
                        {subTela === 'registrar' && (
                            <form onSubmit={handleRegistrarFalta} className="flex flex-col gap-3.5 animate-fadeIn">
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-2.5 text-[10px] font-bold text-gray-400 select-none flex justify-between">
                                    <span>Operador: <span className="text-gray-600 uppercase">{usuarioLogado?.nome}</span></span>
                                    <span>📅 Fluxo Ativo</span>
                                </div>

                                {/* Input de Busca Unificado com Dropdown Suspenso */}
                                <div className="flex flex-col gap-1 relative">
                                    <label className="text-[11px] font-bold text-gray-500 pl-1">Buscar Produto (EAN ou Nome)</label>
                                    <div className="relative">
                                        <input
                                            ref={inputBuscaRef}
                                            type="text"
                                            placeholder="Bipe o EAN ou digite o termo..."
                                            value={buscaTermo}
                                            onChange={(e) => {
                                                setBuscaTermo(e.target.value);
                                                if (produtoSelecionado) setProdutoSelecionado(null);
                                            }}
                                            className="w-full bg-white border border-gray-300 rounded-xl px-3 h-11 text-xs outline-none focus:border-[#09797a] font-bold pr-9"
                                            required
                                        />
                                        {produtoSelecionado && (
                                            <button type="button" onClick={handleLimparProduto} className="absolute right-3 top-3.5 hover:bg-gray-100 rounded-full p-0.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#e07a5f" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Dropdown de Sugestões Flutuantes com Alta Z-Index */}
                                    {mostrarSugestoes && produtosSugestoes.length > 0 && (
                                        <div className="absolute left-0 right-0 top-14 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-42.5 overflow-y-auto p-1 flex flex-col gap-0.5 animate-fadeIn">
                                            {produtosSugestoes.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleSelecionarProduto(p)}
                                                    className="w-full text-left px-2.5 py-2 hover:bg-gray-50 rounded-lg transition-all flex flex-col border-b border-gray-50 last:border-0"
                                                >
                                                    <span className="text-xs font-black text-gray-700 truncate">{p.descricao}</span>
                                                    <span className="text-[9px] font-mono font-bold text-gray-400">EAN: {p.codigo_barras}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Preenchimento Automático do Vínculo de Categorias (Trava de Segurança) */}
                                <div className="grid grid-cols-2 gap-2 bg-gray-50/50 p-3 rounded-2xl border border-gray-100 border-dashed">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Setor Vinculado</span>
                                        <span className="text-xs font-black text-gray-700 truncate mt-0.5">
                                            {produtoSelecionado ? `📍 ${produtoSelecionado.categorias_setores?.nome}` : 'Aguardando EAN...'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Subsetor</span>
                                        <span className="text-xs font-black text-gray-600 truncate mt-0.5">
                                            {produtoSelecionado ? `${produtoSelecionado.categorias_subsetores?.nome}` : 'Aguardando EAN...'}
                                        </span>
                                    </div>
                                </div>

                                {/* Seleção do Motivo da Falta */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-gray-500 pl-1">Motivo da Ruptura</label>
                                    <select
                                        value={motivoSelecionadoId}
                                        onChange={(e) => setMotivoSelecionadoId(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded-xl px-3 h-11 text-xs font-bold outline-none focus:border-[#09797a] cursor-pointer text-gray-700"
                                        required
                                        disabled={!produtoSelecionado}
                                    >
                                        <option value="">Selecione o motivo comercial...</option>
                                        {motivos.map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <button
                                        type="button"
                                        onClick={() => { setSubTela('dashboard'); carregarModulo(); }}
                                        className="h-11 bg-white border border-gray-300 text-gray-600 text-xs font-bold rounded-xl active:scale-95 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={salvando || !produtoSelecionado || !motivoSelecionadoId}
                                        className="h-11 bg-[#09797a] text-white text-xs font-bold rounded-xl active:scale-95 disabled:opacity-40 transition-all shadow-sm"
                                    >
                                        {salvando ? 'Registrando...' : 'Confirmar & Registrar'}
                                    </button>
                                </div>
                            </form>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}