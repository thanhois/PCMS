/**
 * PageHeader: Tiêu đề trang chuẩn trong Admin Dashboard.
 */
export default function PageHeader({ title, subtitle, actions, icon }) {
  return (
    <div className="pcms-page-header">
      <div>
        <div className="pcms-page-header-left">
          {icon ? <span className="pcms-nav-icon">{icon}</span> : null}
          <h1 className="pcms-page-title">{title}</h1>
        </div>
        {subtitle ? <p className="pcms-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="pcms-page-actions">{actions}</div> : null}
    </div>
  );
}
