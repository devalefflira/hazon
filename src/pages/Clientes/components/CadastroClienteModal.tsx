// Arquivo: src/pages/Clientes/components/CadastroClienteModal.tsx
import { useState, useEffect } from 'react';
import { PASTAS_CLIENTES } from '../services/clientesService';

interface CadastroClienteModalProps {
  clienteEdicao?: any;
  onSalvar: (dados: any) => Promise<void>;
  onCancelar: () => void;
}

export default function CadastroClienteModal({
  clienteEdicao,
  onSalvar,
  onCancelar
}: CadastroClienteModalProps) {
  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [whatsapp, setContatoWhatsapp] = useState('');
  const [cidade, setCidade] = useState('Bom Jesus das Selvas');
  const [estado, setEstado] = useState('Maranhão');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [pontoReferencia, setPontoReferencia] = useState('');
  const [pasta, setPasta] = useState(PASTAS_CLIENTES[0]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (clienteEdicao) {
      setNome(clienteEdicao.nome || '');
      setCpfCnpj(clienteEdicao.cpf_cnpj || '');
      setContatoWhatsapp(clienteEdicao.contato_whatsapp || '');
      setCidade(clienteEdicao.cidade || 'Bom Jesus das Selvas');
      setEstado(clienteEdicao.estado || 'Maranhão');
      setEndereco(clienteEdicao.endereco || '');
      setNumero(clienteEdicao.numero || '');
      setPontoReferencia(clienteEdicao.ponto_referencia || '');
      setPasta(clienteEdicao.pasta || PASTAS_CLIENTES[0]);
    }
  }, [clienteEdicao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !whatsapp.trim()) {
      alert('Nome e Contato/WhatsApp são obrigatórios.');
      return;
    }

    try {
      setSalvando(true);
      await onSalvar({
        nome: nome.trim().toUpperCase(),
        cpf_cnpj: cpfCnpj.trim(),
        contato_whatsapp: whatsapp.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
        endereco: endereco.trim(),
        numero: numero.trim(),
        ponto_referencia: pontoReferencia.trim(),
        pasta
      });
      onCancelar();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cliente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
          <h3 className="text-[#09797a] font-black text-base uppercase">
            {clienteEdicao ? 'EDITAR CLIENTE' : 'NOVO CADASTRO DE CLIENTE'}
          </h3>
          <button type="button" onClick={onCancelar} className="text-gray-400 font-bold text-base">✕</button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-3 pr-1 flex-1">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Nome do Cliente *</label>
            <input
              type="text"
              required
              placeholder="DIGITE O NOME COMPLETO OU RAZÃO..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">CPF / CNPJ</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Contato / WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="(99) 99999-9999"
                value={whatsapp}
                onChange={(e) => setContatoWhatsapp(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Estado</label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Endereço</label>
              <input
                type="text"
                placeholder="Rua, Avenida..."
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />
            </div>

            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Número</label>
              <input
                type="text"
                placeholder="Nº"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Ponto de Referência</label>
            <input
              type="text"
              placeholder="Ex: Próximo à Praça Central"
              value={pontoReferencia}
              onChange={(e) => setPontoReferencia(e.target.value)}
              className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Pasta do Cliente</label>
            <select
              value={pasta}
              onChange={(e) => setPasta(e.target.value)}
              className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
            >
              {PASTAS_CLIENTES.map((p) => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>
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
            disabled={salvando}
            className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            {salvando ? 'Salvando...' : 'Salvar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}