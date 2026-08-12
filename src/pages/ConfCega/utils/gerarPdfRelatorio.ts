// Arquivo: src/pages/ConfCega/utils/gerarPdfRelatorio.ts
export function gerarPdfRelatorioConferencia(mestre: any, itens: any[]) {
  const janela = window.open('', '_blank');
  if (!janela) {
    alert('Permita pop-ups no seu navegador para visualizar o relatório.');
    return;
  }

  const dataImpressao = new Date().toLocaleDateString('pt-BR');
  const horaImpressao = new Date().toLocaleTimeString('pt-BR');

  const dataEmissaoNota = mestre.data_emissao_nota 
    ? new Date(mestre.data_emissao_nota + 'T00:00:00').toLocaleDateString('pt-BR') 
    : 'N/A';

  const nomeFornecedor = mestre.fornecedores 
    ? (mestre.fornecedores.nome_fantasia || mestre.fornecedores.razao_social) 
    : 'NÃO INFORMADO';

  const nomeUsuario = mestre.usuarios?.nome || 'SISTEMA';

  const htmlConteudo = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Conferência - ${mestre.codigo_customizado}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 20px; }
        .header { display: flex; justify-content: space-between; border-b: 2px solid #09797a; padding-bottom: 10px; margin-bottom: 15px; }
        .title { font-size: 18px; font-weight: bold; color: #09797a; text-transform: uppercase; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #eee; }
        .meta-item { display: flex; flex-col; }
        .meta-label { font-size: 9px; font-weight: bold; color: #888; text-transform: uppercase; }
        .meta-val { font-size: 12px; font-weight: bold; color: #222; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #09797a; color: white; text-transform: uppercase; font-size: 10px; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .actions { margin-bottom: 20px; text-align: right; }
        .btn-print { background-color: #09797a; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 5px; cursor: pointer; }
        @media print {
          .actions { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="actions">
        <button class="btn-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
      </div>

      <div class="header">
        <div>
          <div class="title">RELATÓRIO DE CONFERÊNCIA CEGA</div>
          <div>Manifesto: <strong>${mestre.codigo_customizado}</strong></div>
        </div>
        <div style="text-align: right;">
          <div>Data Emissão do Relatório: <strong>${dataImpressao}</strong></div>
          <div>Hora Emissão do Relatório: <strong>${horaImpressao}</strong></div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Conferente / Usuário</span>
          <span class="meta-val">${nomeUsuario}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Número da Nota Fiscal</span>
          <span class="meta-val">${mestre.numero_nota_fiscal || 'SEM NF'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Data Emissão da NF</span>
          <span class="meta-val">${dataEmissaoNota}</span>
        </div>
        <div class="meta-item" style="grid-column: span 2;">
          <span class="meta-label">Fornecedor Emissor</span>
          <span class="meta-val">${nomeFornecedor}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Status do Lote</span>
          <span class="meta-val">${mestre.status}</span>
        </div>
        <div class="meta-item" style="grid-column: span 3;">
          <span class="meta-label">Observação</span>
          <span class="meta-val">${mestre.observacao || 'Nenhuma observação informada.'}</span>
        </div>
      </div>

      <h3>Itens Conferidos (${itens.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Cód. Prod</th>
            <th>EAN / Código de Barras</th>
            <th>Descrição do Produto</th>
            <th>Qtd Contada</th>
            <th>Unidade</th>
            <th>Observação Item</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map((item) => {
            const prod = item.produtos || {};
            return `
              <tr>
                <td><strong>${prod.codprod || 'N/A'}</strong></td>
                <td>${prod.codbarra || 'N/A'}</td>
                <td>${prod.descricao || 'N/A'}</td>
                <td><strong>${item.quantidade_contada || item.quantidade_conferida || 0}</strong></td>
                <td>${item.unidade_medida || prod.unidade || 'UN'}</td>
                <td>${item.observacao || '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  janela.document.write(htmlConteudo);
  janela.document.close();
}