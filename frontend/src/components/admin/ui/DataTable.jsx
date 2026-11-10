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
  onExportExcel,
  actions,
}) {
  const handleExport = onExportExcel || onExportCsv;

  return (
    <section className="pcms-card">
      {(title || subtitle || handleExport || actions) ? (
        <div className="pcms-card-header">
          <div>
            {title ? <h3 className="pcms-card-title">{title}</h3> : null}
            {subtitle ? <p className="pcms-card-subtitle">{subtitle}</p> : null}
          </div>
          <div className="pcms-page-actions">
            {actions}
            {handleExport ? (
              <button type="button" className="pcms-btn pcms-btn-csv" onClick={handleExport}>
                <span>Xuất Excel</span>
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
