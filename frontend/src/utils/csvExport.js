/**
 * Xuất mảng dữ liệu ra file CSV có BOM UTF-8 (hiển thị đúng tiếng Việt trong Excel).
 *
 * @param {string} filename Tên file (ví dụ: 'bao-cao-doanh-thu.csv')
 * @param {Array<{ header: string, accessor: (row: any) => any }>} columns Định nghĩa cột xuất
 * @param {Array<any>} rows Dữ liệu dòng
 */
export function exportToCsv(filename, columns, rows) {
  if (!Array.isArray(rows)) return;

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = columns.map((col) => escapeCell(col.header)).join(',');
  const dataLines = rows.map((row) =>
    columns.map((col) => escapeCell(col.accessor(row))).join(',')
  );

  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Định dạng tiền tệ VNĐ.
 */
export function formatVnd(amount) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}
