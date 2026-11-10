import * as XLSX from 'xlsx';

/**
 * Xuất mảng dữ liệu ra file Excel (.xlsx) chuẩn Microsoft Excel.
 *
 * @param {string} filename Tên file (ví dụ: 'bao-cao-doanh-thu.xlsx')
 * @param {Array<{ header: string, accessor: (row: any) => any }>} columns Định nghĩa cột xuất
 * @param {Array<any>} rows Dữ liệu dòng
 * @param {string} [sheetName] Tên sheet trong file Excel
 */
export function exportToExcel(filename, columns, rows, sheetName = 'Báo cáo') {
  if (!Array.isArray(rows) || rows.length === 0) {
    alert('Không có dữ liệu để xuất file Excel.');
    return;
  }

  const data = rows.map((row) => {
    const rowObj = {};
    columns.forEach((col) => {
      rowObj[col.header] = col.accessor(row);
    });
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Tự động căn chỉnh độ rộng cột tối ưu khi mở trong Excel
  const colWidths = columns.map((col) => {
    const headerLen = (col.header || '').toString().length;
    const maxDataLen = rows.reduce((max, r) => {
      const val = col.accessor(r);
      const str = val !== null && val !== undefined ? String(val) : '';
      return Math.max(max, str.length);
    }, 0);
    return { wch: Math.max(headerLen, maxDataLen, 12) + 3 };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanName = filename.replace(/\.(csv|xlsx)$/i, '');
  XLSX.writeFile(workbook, `${cleanName}.xlsx`);
}

/**
 * Xuất mảng dữ liệu mặc định sang file Excel (.xlsx)
 */
export function exportToCsv(filename, columns, rows, sheetName) {
  return exportToExcel(filename, columns, rows, sheetName);
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
