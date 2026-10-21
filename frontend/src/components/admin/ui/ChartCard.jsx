/**
 * ChartCard: Khung chứa biểu đồ kèm tiêu đề, mô tả phụ, nút thao tác và chú thích (legend) bên dưới.
 */
export default function ChartCard({ title, subtitle, actions, legend = [], children }) {
  return (
    <section className="pcms-card">
      {(title || subtitle || actions) ? (
        <div className="pcms-card-header">
          <div>
            {title ? <h3 className="pcms-card-title">{title}</h3> : null}
            {subtitle ? <p className="pcms-card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="pcms-page-actions">{actions}</div> : null}
        </div>
      ) : null}

      <div>{children}</div>

      {legend.length > 0 ? (
        <div className="pcms-chart-legend">
          {legend.map((item) => (
            <span key={item.label} className="pcms-legend-item">
              <span className="pcms-legend-dot" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
