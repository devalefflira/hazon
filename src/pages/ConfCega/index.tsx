import React, { useState, useEffect, useRef } from "react";
import { conferenciasService } from "./services/conferenciasService";
import type { ConferenciaRegistro } from "./types/conferencias.types";
import { parsearXMLNotaFiscal } from "./utils/xmlNfeParser";
import { ModalConferencia } from "./components/ModalConferencia";
import { ModalDetalhesConferida } from "./components/ModalDetalhesConferida";
import { gerarPdfRelatorioConferencia } from "./utils/gerarPdfRelatorio";

interface ConfCegaProps {
  usuarioLogadoId?: string;
  onVoltarParaHome?: () => void;
}

const ConfCega: React.FC<ConfCegaProps> = ({ usuarioLogadoId, onVoltarParaHome }) => {
  const [abaAtiva, setAbaAtiva] = useState<"pendentes" | "conferidas">("pendentes");
  const [conferencias, setConferencias] = useState<ConferenciaRegistro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [conferenciaSelecionada, setConferenciaSelecionada] = useState<ConferenciaRegistro | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState<ConferenciaRegistro | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregarLista = async () => {
    try {
      setCarregando(true);
      const data: any = await conferenciasService.listarConferencias();
      setConferencias(data);
    } catch (err: any) {
      alert("Erro ao carregar conferências: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLista();
  }, []);

  const handleUploadXML = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCarregando(true);
      const xmlText = await file.text();
      const notaParseada = parsearXMLNotaFiscal(xmlText);

      const usuarioId = usuarioLogadoId || "00000000-0000-0000-0000-000000000000";

      await conferenciasService.criarConferenciaImportada(notaParseada, usuarioId);
      await carregarLista();
      setAbaAtiva("pendentes");
    } catch (err: any) {
      alert("Falha ao importar XML da Nota: " + err.message);
    } finally {
      setCarregando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSalvarConferencia = async (confId: string, itens: any[], status: "Em Andamento" | "Finalizada") => {
    // Ao salvar/finalizar, vincula o conferente como o usuário logado que executou a contagem
    await conferenciasService.salvarProgressoItens(confId, itens, status, usuarioLogadoId);
    await carregarLista();
    if (status === "Finalizada") {
      setAbaAtiva("conferidas");
    }
  };

  const pendentes = conferencias.filter((c) => c.status !== "Finalizada");
  const conferidas = conferencias.filter((c) => c.status === "Finalizada");

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onVoltarParaHome || (() => window.history.back())}
              className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-teal-800 transition shadow-sm"
              title="Voltar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-teal-950 uppercase tracking-tight">Conferência Cega</h1>
              <p className="text-xs text-slate-500 font-medium">Auditoria de Recebimento via XML de NF-e</p>
            </div>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xml"
              onChange={handleUploadXML}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={carregando}
              className="bg-teal-800 hover:bg-teal-900 active:scale-95 text-white font-bold px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-md transition flex items-center gap-2 text-xs sm:text-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span>Importar XML</span>
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 mb-6 gap-6 sm:gap-8">
          <button
            onClick={() => setAbaAtiva("pendentes")}
            className={`pb-3 font-black text-xs sm:text-sm tracking-wider uppercase transition border-b-2 flex items-center gap-2 ${
              abaAtiva === "pendentes" ? "border-teal-800 text-teal-900" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Pendentes
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-black">{pendentes.length}</span>
          </button>
          <button
            onClick={() => setAbaAtiva("conferidas")}
            className={`pb-3 font-black text-xs sm:text-sm tracking-wider uppercase transition border-b-2 flex items-center gap-2 ${
              abaAtiva === "conferidas" ? "border-teal-800 text-teal-900" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Conferidas
            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full text-xs font-black">{conferidas.length}</span>
          </button>
        </div>

        {/* Listagem */}
        {carregando ? (
          <div className="text-center py-20 text-slate-400 font-medium">Carregando conferências...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(abaAtiva === "pendentes" ? pendentes : conferidas).map((conf) => (
              <div key={conf.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-black text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
                      NF #{conf.numero_nota_fiscal}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      conf.status === "Finalizada" ? "bg-teal-100 text-teal-800" : conf.status === "Em Andamento" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {conf.status}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-2 mb-2">
                    {conf.fornecedor?.razao_social || "Fornecedor Não Identificado"}
                  </h3>

                  <div className="text-[11px] text-slate-500 space-y-0.5 mb-4">
                    <div><strong>CNPJ:</strong> {conf.fornecedor?.cnpj || "-"}</div>
                    <div><strong>Emissão:</strong> {new Date(conf.data_emissao_nota).toLocaleDateString("pt-BR")}</div>
                    <div><strong>Itens na Nota:</strong> {conf.conferencia_itens?.length || 0} produtos</div>
                  </div>
                </div>

                {abaAtiva === "pendentes" ? (
                  <button
                    onClick={() => setConferenciaSelecionada(conf)}
                    className="w-full bg-teal-800 hover:bg-teal-900 text-white font-bold py-2.5 rounded-xl transition text-xs sm:text-sm flex items-center justify-center gap-2 shadow"
                  >
                    {conf.status === "Em Andamento" ? "Continuar Conferência" : "Iniciar Conferência"}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModalDetalhes(conf)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-xl transition text-xs text-center"
                    >
                      Ver Detalhes
                    </button>
                    <button
                      onClick={() => gerarPdfRelatorioConferencia(conf)}
                      className="px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold py-2 rounded-xl transition text-xs"
                      title="Imprimir PDF"
                    >
                      PDF
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {conferenciaSelecionada && (
        <ModalConferencia
          conferencia={conferenciaSelecionada}
          onClose={() => setConferenciaSelecionada(null)}
          onSalvar={handleSalvarConferencia}
        />
      )}

      {modalDetalhes && (
        <ModalDetalhesConferida
          conferencia={modalDetalhes}
          onClose={() => setModalDetalhes(null)}
        />
      )}
    </div>
  );
};

export default ConfCega;