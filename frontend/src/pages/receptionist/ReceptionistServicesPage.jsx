import { useCallback, useEffect, useMemo, useState } from 'react';
import receptionistApi from '../../api/receptionistApi';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';

export default function ReceptionistServicesPage() {
  const [services, setServices] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await receptionistApi.getCatalogLookup();
      setServices(res?.services || []);
      setVeterinarians(res?.veterinarians || []);
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Không thể tải danh mục dịch vụ phòng khám.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        (s.serviceName || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    );
  }, [services, search]);

  const formatVnd = (amount) => {
    const num = Number(amount || 0);
    return `${num.toLocaleString('vi-VN')} ₫`;
  };

  return (
    <div>
      <PageHeader
        title="Tra cứu Bảng giá Dịch vụ & Bác sĩ trực"
        subtitle="Danh mục dịch vụ đang hoạt động và danh sách bác sĩ thú y tại phòng khám để tư vấn nhanh cho khách hàng tại quầy lễ tân."
        actions={
          <button type="button" className="pcms-btn pcms-btn-outline" onClick={loadCatalog} disabled={loading}>
            Làm mới danh mục
          </button>
        }
      />

      {error ? (
        <div className="pcms-alert pcms-alert-error" style={{ marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="pcms-card" style={{ marginBottom: 20 }}>
        <div className="pcms-card-header">
          <div>
            <h2 className="pcms-card-title">Bảng giá dịch vụ khám & điều trị ({filteredServices.length})</h2>
            <p className="pcms-card-subtitle">
              Chế độ xem bảng giá niêm yết dành cho Lễ tân phục vụ tư vấn trực tiếp tại quầy.
            </p>
          </div>
          <div style={{ minWidth: 280 }}>
            <input
              type="search"
              className="pcms-input"
              placeholder="Tìm theo tên dịch vụ hoặc mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="pcms-table-wrap">
          <table className="pcms-table">
            <thead>
              <tr>
                <th>Mã DV</th>
                <th>Tên dịch vụ</th>
                <th>Mô tả chi tiết</th>
                <th>Đơn giá niêm yết</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="pcms-empty-cell">
                    Đang tải danh mục dịch vụ...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pcms-empty-cell">
                    Không tìm thấy dịch vụ nào khớp với từ khóa.
                  </td>
                </tr>
              ) : (
                filteredServices.map((s) => (
                  <tr key={s.serviceId}>
                    <td>
                      <strong>SVC-{String(s.serviceId).padStart(3, '0')}</strong>
                    </td>
                    <td>
                      <strong>{s.serviceName}</strong>
                    </td>
                    <td>{s.description || '—'}</td>
                    <td>
                      <strong style={{ color: 'var(--pcms-primary)' }}>{formatVnd(s.basePrice)}</strong>
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danh sách Bác sĩ thú y đang hoạt động để Lễ tân tiện phân công */}
      <div className="pcms-card">
        <div className="pcms-card-header">
          <div>
            <h2 className="pcms-card-title">Danh sách Bác sĩ thú y đang hoạt động ({veterinarians.length})</h2>
            <p className="pcms-card-subtitle">
              Thông tin liên hệ bác sĩ để Lễ tân điều phối lịch hẹn và ca khám Walk-in.
            </p>
          </div>
        </div>

        <div className="pcms-table-wrap">
          <table className="pcms-table">
            <thead>
              <tr>
                <th>Mã BS</th>
                <th>Họ và tên Bác sĩ</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="pcms-empty-cell">
                    Đang tải danh sách bác sĩ...
                  </td>
                </tr>
              ) : veterinarians.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pcms-empty-cell">
                    Hiện chưa có tài khoản Bác sĩ thú y nào đang hoạt động.
                  </td>
                </tr>
              ) : (
                veterinarians.map((v) => (
                  <tr key={v.userId}>
                    <td>
                      <strong>VET-{String(v.userId).padStart(3, '0')}</strong>
                    </td>
                    <td>
                      <strong>{v.fullName}</strong>
                    </td>
                    <td>{v.email || '—'}</td>
                    <td>{v.phoneNumber || '—'}</td>
                    <td>
                      <StatusBadge status="ACTIVE" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
