import StatusBadge from './StatusBadge';

export default function StatCard({ label, value, unit, badge }) {
  return (
    <div className="pcms-kpi-card">
      <div>
        <div className="pcms-kpi-label">{label}</div>
        <div className="pcms-kpi-value">
          {value} {unit ? <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--pcms-text-muted)' }}>{unit}</span> : null}
        </div>
        {badge ? (
          <div style={{ marginTop: 6 }}>
            <StatusBadge variant={badge.variant} label={badge.text} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
