/**
 * DataTable: Bảng dữ liệu dùng chung hỗ trợ header xám nhạt, nút xuất CSV, trạng thái loading / error / empty.
 */
export default function DataTable({
  title,
  subtitle,
  columns = [],
  data = [],
  rowKey = 'id',
  loading = false,
  error = '',
  emptyTitle = 'Chưa có dữ liệu',
  emptyMessage = 'Không tìm thấy bản ghi nào khớp với bộ lọc hiện tại.',
  onRetry,
  onExportCsv,
  actions,
}) {
  return (
    <section className="pcms-card">
      {(title || subtitle || onExportCsv || actions) ? (
        <div className="pcms-card-header">
          <div>
            {title ? <h3 className="pcms-card-title">{title}</h3> : null}
            {subtitle ? <p className="pcms-card-subtitle">{subtitle}</p> : null}
          </div>
          <div className="pcms-page-actions">
            {actions}
            {onExportCsv ? (
              <button type="button" className="pcms-btn pcms-btn-csv" onClick={onExportCsv}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>CSV</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="pcms-state-box" role="status">
          <h4>Đang tải dữ liệu...</h4>
          <p>Vui lòng chờ trong giây lát.</p>
        </div>
      ) : error ? (
        <div className="pcms-state-box" role="alert">
          <h4 style={{ color: 'var(--pcms-danger-text)' }}>Không thể tải dữ liệu</h4>
          <p>{error}</p>
          {onRetry ? (
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={onRetry}>
              Thử lại
            </button>
          ) : null}
        </div>
      ) : data.length === 0 ? (
        <div className="pcms-state-box">
          <h4>{emptyTitle}</h4>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="pcms-table-wrap">
          <table className="pcms-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} style={{ width: col.width, textAlign: col.align || 'left' }}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const keyVal = typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? idx;
                return (
                  <tr key={keyVal}>
                    {columns.map((col) => (
                      <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                        {col.render ? col.render(row, idx) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
