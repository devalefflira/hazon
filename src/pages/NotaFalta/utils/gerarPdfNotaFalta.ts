// Arquivo: src/pages/NotaFalta/utils/gerarPdfNotaFalta.ts
export function gerarPdfNotaFalta(nota: any, itens: any[]) {
  const janela = window.open('', '_blank');
  if (!janela) {
    alert('Permita pop-ups no seu navegador para visualizar o relatório.');
    return;
  }

  const dataImpressao = new Date().toLocaleDateString('pt-BR');
  const horaImpressao = new Date().toLocaleTimeString('pt-BR');

  const dataNota = nota.data_registro 
    ? new Date(nota.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')
    : new Date(nota.created_at).toLocaleDateString('pt-BR');

  const horaNota = nota.hora_registro || new Date(nota.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const htmlConteudo = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Nota de Falta - ${nota.codigo_customizado || 'Monomestre'}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 20px; }
        .header { display: flex; justify-content: space-between; border-b: 2px solid #09797a; padding-bottom: 10px; margin-bottom: 15px; }
        .title { font-size: 18px; font-weight: bold; color: #09797a; text-transform: uppercase; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #eee; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-label { font-size: 9px; font-weight: bold; color: #888; text-transform: uppercase; }
        .meta-val { font-size: 12px; font-weight: bold; color: #222; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #09797a; color: white; text-transform: uppercase; font-size: 10px; }
        tr:nth-child(even) { background-color: #f2f2f2; }
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
          <div class="title">REGISTRO DE NOTA DE FALTA / RUPTURA</div>
          <div>Identificação: <strong>${nota.codigo_customizado || 'NF-LOTE'}</strong></div>
        </div>
        <div style="text-align: right;">
          <div>Data de Emissão: <strong>${dataImpressao}</strong></div>
          <div>Hora: <strong>${horaImpressao}</strong></div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Responsável</span>
          <span class="meta-val">${nota.responsavel_nome || nota.usuarios?.nome || 'NÃO INFORMADO'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Seção / Setor</span>
          <span class="meta-val">${nota.secao_nome || 'GERAL'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Data/Hora do Registro</span>
          <span class="meta-val">${dataNota} às ${horaNota}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Total de Itens</span>
          <span class="meta-val">${itens.length}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Status</span>
          <span class="meta-val">${nota.status || 'Concluída'}</span>
        </div>
      </div>

      <h3>Itens com Ruptura de Estoque (${itens.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Cód. Prod</th>
            <th>EAN / Código de Barras</th>
            <th>Descrição do Produto</th>
            <th>Motivo da Ruptura</th>
            <th>Qtd Restante</th>
            <th>Unidade</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map((item) => {
            const prod = item.produtos || {};
            const motivo = item.motivos_falta?.descricao || item.motivo_descricao || 'NÃO INFORMADO';
            return `
              <tr>
                <td><strong>${prod.codprod || 'N/A'}</strong></td>
                <td>${prod.codbarra || 'N/A'}</td>
                <td>${prod.descricao || 'N/A'}</td>
                <td>${motivo}</td>
                <td><strong>${item.quantidade_restante || 0}</strong></td>
                <td>${item.unidade_restante || 'UN'}</td>
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