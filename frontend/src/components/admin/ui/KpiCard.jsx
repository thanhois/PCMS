/**
 * KpiCard: Thẻ chỉ số thống kê nhanh (Overview / Reports) không sử dụng icon.
 */
export default function KpiCard({
  label,
  value,
  trendText,
  trendDirection = 'neutral',
}) {
  const trendColorMap = {
    up: 'var(--pcms-success-text)',
    down: 'var(--pcms-danger-text)',
    warning: 'var(--pcms-warning-text)',
    neutral: 'var(--pcms-text-muted)',
  };

  return (
    <div className="pcms-kpi-card">
      <div>
        <div className="pcms-kpi-label">{label}</div>
        <div className="pcms-kpi-value">{value}</div>
        {trendText ? (
          <div className="pcms-kpi-trend" style={{ color: trendColorMap[trendDirection] }}>
            {trendText}
          </div>
        ) : null}
      </div>
    </div>
  );
}
