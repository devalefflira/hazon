// Arquivo: src/pages/Orcamentos/utils/gerarPdfOrcamento.ts
export function gerarPdfOrcamento(mestre: any, itens: any[]) {
  const janela = window.open('', '_blank');
  if (!janela) {
    alert('Permita pop-ups no seu navegador para visualizar o orçamento.');
    return;
  }

  const dataImpressao = new Date().toLocaleDateString('pt-BR');
  const horaImpressao = new Date().toLocaleTimeString('pt-BR');

  const dataRegistro = mestre.data_registro 
    ? new Date(mestre.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')
    : new Date(mestre.created_at).toLocaleDateString('pt-BR');

  const valorTotalGeral = (mestre.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const htmlConteudo = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Orçamento - ${mestre.codigo_customizado}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 20px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #09797a; padding-bottom: 10px; margin-bottom: 15px; }
        .title { font-size: 18px; font-weight: bold; color: #09797a; text-transform: uppercase; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #eee; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-label { font-size: 9px; font-weight: bold; color: #888; text-transform: uppercase; }
        .meta-val { font-size: 12px; font-weight: bold; color: #222; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #09797a; color: white; text-transform: uppercase; font-size: 10px; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .total-box { text-align: right; margin-top: 15px; font-size: 16px; font-weight: bold; color: #09797a; }
        .actions { margin-bottom: 20px; text-align: right; }
        .btn-print { background-color: #09797a; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 5px; cursor: pointer; }
        @media print { .actions { display: none; } }
      </style>
    </head>
    <body>
      <div class="actions">
        <button class="btn-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
      </div>

      <div class="header">
        <div>
          <div class="title">ORÇAMENTO DE VENDA</div>
          <div>Código: <strong>${mestre.codigo_customizado}</strong></div>
        </div>
        <div style="text-align: right;">
          <div>Emissão: <strong>${dataImpressao} às ${horaImpressao}</strong></div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Cliente</span>
          <span class="meta-val">${mestre.cliente_nome}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Contato / WhatsApp</span>
          <span class="meta-val">${mestre.contato_whatsapp || 'NÃO INFORMADO'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Data/Hora Orçamento</span>
          <span class="meta-val">${dataRegistro} às ${mestre.hora_registro || ''}</span>
        </div>
        <div class="meta-item" style="grid-column: span 2;">
          <span class="meta-label">Endereço Completo</span>
          <span class="meta-val">${mestre.endereco || ''}, Nº ${mestre.numero || 'S/N'}, ${mestre.bairro || ''} - ${mestre.cidade}/${mestre.estado}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Atendente / Vendedor</span>
          <span class="meta-val">${mestre.usuarios?.nome || 'SISTEMA'}</span>
        </div>
      </div>

      <h3>Itens do Orçamento (${itens.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Cód. Prod</th>
            <th>Descrição do Produto</th>
            <th>Qtd</th>
            <th>Unid</th>
            <th>Preço Unit. Final</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map((item) => {
            const prod = item.produtos || {};
            const pUnit = (item.preco_final_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const subtotal = (item.valor_total_item || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            return `
              <tr>
                <td><strong>${prod.codprod || 'N/A'}</strong></td>
                <td>${prod.descricao || 'N/A'}</td>
                <td><strong>${item.quantidade}</strong></td>
                <td>${item.unidade_medida || 'UN'}</td>
                <td>${pUnit}</td>
                <td><strong>${subtotal}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="total-box">
        VALOR TOTAL DO ORÇAMENTO: ${valorTotalGeral}
      </div>
    </body>
    </html>
  `;

  janela.document.write(htmlConteudo);
  janela.document.close();
}