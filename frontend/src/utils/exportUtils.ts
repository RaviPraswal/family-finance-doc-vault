/**
 * Client-side CSV exporter.
 */
export function exportToCSV(data: any[], headers: string[], filename: string) {
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...data.map(row => 
      row.map((val: any) => {
        if (val === null || val === undefined) return '';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Client-side HTML Print / PDF generator.
 */
export function exportToPDF(title: string, headers: string[], data: any[][], filename: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup blocked! Please allow popups to export PDF/Print.');
    return;
  }

  const html = `
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            padding: 24px;
            margin: 0;
          }
          h1 {
            font-size: 20px;
            margin-bottom: 4px;
            color: #0f172a;
          }
          .date {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 24px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 10px;
            text-align: left;
            font-size: 11px;
          }
          th {
            background-color: #f8fafc;
            font-weight: 600;
            color: #475569;
          }
          .amount {
            text-align: right;
            font-family: monospace;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="date">Report generated on: ${new Date().toLocaleString()}</div>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${row.map((val) => {
                  const isAmount = typeof val === 'string' && (val.includes('₹') || /^\d+(\.\d+)?$/.test(val.replace(/[₹,\s\-+]/g, '')));
                  return `<td class="${isAmount ? 'amount' : ''}">${val}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
