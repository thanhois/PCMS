
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ownerApi from '../../api/ownerApi';
import '../../styles/petOwnerHome.css';

export default function PetOwnerHomePage() {
  const navigate = useNavigate();

  const [pets, setPets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load pets and invoices from backend
  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [petData, invoiceData] = await Promise.all([
          ownerApi.getMyPets(),
          ownerApi.getMyInvoices(),
        ]);

        setPets(Array.isArray(petData) ? petData : []);
        setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
      } catch (err) {
        console.error('Lỗi tải trang chủ Pet Owner:', err);
        setError(
          err?.message ||
            'Không thể tải dữ liệu. Vui lòng thử lại.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // Invoice statistics
  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === 'PAID'
  ).length;

  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === 'PENDING'
  ).length;

  // Get latest invoices
  const recentInvoices = [...invoices]
    .sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() -
        new Date(a.invoiceDate).getTime()
    )
    .slice(0, 5);

  // Format currency
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(amount || 0));
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '—';
    }

    return parsedDate.toLocaleDateString('vi-VN');
  };

  // Invoice status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID':
        return 'Đã thanh toán';
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'VOID':
        return 'Đã hủy';
      default:
        return 'Không xác định';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PAID':
        return 'paid';
      case 'PENDING':
        return 'pending';
      case 'VOID':
        return 'void';
      default:
        return 'unknown';
    }
  };

  return (
    <div className="pet-owner-home">
      {/* Welcome */}
      <section className="pet-owner-welcome">
        <p className="pet-owner-welcome-label">
          VETERIAN CLINIC
        </p>

        <h1>
          Chào mừng bạn đến với Veterian!
        </h1>

        <p className="pet-owner-welcome-description">
          Theo dõi sức khỏe thú cưng và quản lý hóa đơn
          của bạn tại đây.
        </p>
      </section>

      {/* Loading */}
      {loading && (
        <div className="pet-owner-loading">
          Đang tải thông tin...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="pet-owner-error">
          <p>{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Statistics */}
          <section className="pet-owner-stats">
            <div className="pet-owner-stat-card">
              <div className="pet-owner-stat-icon">🐾</div>
              <p>Thú cưng của tôi</p>
              <h2>{pets.length}</h2>
            </div>

            <div className="pet-owner-stat-card">
              <div className="pet-owner-stat-icon">📋</div>
              <p>Tổng số hóa đơn</p>
              <h2>{invoices.length}</h2>
            </div>

            <div className="pet-owner-stat-card">
              <div className="pet-owner-stat-icon">⏳</div>
              <p>Chờ thanh toán</p>
              <h2>{pendingInvoices}</h2>
            </div>

            <div className="pet-owner-stat-card">
              <div className="pet-owner-stat-icon">✓</div>
              <p>Đã thanh toán</p>
              <h2>{paidInvoices}</h2>
            </div>
          </section>

          {/* Pets */}
          <section className="pet-owner-section">
            <div className="pet-owner-section-header">
              <div>
                <h2>Thú cưng của tôi</h2>
                <p>
                  Danh sách thú cưng thuộc tài khoản của bạn.
                </p>
              </div>

              <button
                type="button"
                className="pet-owner-primary-btn"
                onClick={() => navigate('/owner/medical-history')}
              >
                Xem sổ khám bệnh
              </button>
            </div>

            {pets.length === 0 ? (
              <div className="pet-owner-empty">
                Bạn chưa có thú cưng nào trong hệ thống.
              </div>
            ) : (
              <div className="pet-owner-pet-grid">
                {pets.map((pet) => (
                  <article
                    key={pet.petId}
                    className="pet-owner-pet-card"
                  >
                    <div className="pet-owner-pet-heading">
                      <div className="pet-owner-pet-icon">
                        🐶
                      </div>

                      <div>
                        <h3>
                          {pet.petName || 'Chưa có tên'}
                        </h3>

                        <span>
                          {pet.species || 'Chưa xác định'}
                        </span>
                      </div>
                    </div>

                    <div className="pet-owner-pet-info">
                      <span>Giống:</span>
                      <strong>{pet.breed || '—'}</strong>
                    </div>

                    <div className="pet-owner-pet-info">
                      <span>Giới tính:</span>
                      <strong>{pet.gender || '—'}</strong>
                    </div>

                    <div className="pet-owner-pet-info">
                      <span>Cân nặng:</span>
                      <strong>
                        {pet.weight != null
                          ? `${pet.weight} kg`
                          : '—'}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="pet-owner-outline-btn"
                      onClick={() =>
                        navigate('/owner/medical-history')
                      }
                    >
                      Xem lịch sử khám
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Recent invoices */}
          <section className="pet-owner-section">
            <div className="pet-owner-section-header">
              <div>
                <h2>Hóa đơn gần đây</h2>
                <p>
                  Theo dõi các hóa đơn và trạng thái thanh toán.
                </p>
              </div>

              <button
                type="button"
                className="pet-owner-primary-btn"
                onClick={() => navigate('/owner/invoices')}
              >
                Xem tất cả
              </button>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="pet-owner-empty">
                Bạn chưa có hóa đơn nào.
              </div>
            ) : (
              <div className="pet-owner-table-wrapper">
                <table className="pet-owner-invoice-table">
                  <thead>
                    <tr>
                      <th>Mã hóa đơn</th>
                      <th>Thú cưng</th>
                      <th>Ngày lập</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentInvoices.map((invoice) => (
                      <tr key={invoice.invoiceId}>
                        <td>
                          <button
                            type="button"
                            className="pet-owner-invoice-link"
                            onClick={() =>
                              navigate(
                                `/owner/invoices/${invoice.invoiceId}`
                              )
                            }
                          >
                            #{invoice.invoiceId}
                          </button>
                        </td>

                        <td>{invoice.petName || '—'}</td>

                        <td>
                          {formatDate(invoice.invoiceDate)}
                        </td>

                        <td>
                          {formatMoney(invoice.totalAmount)}
                        </td>

                        <td>
                          <span
                            className={`pet-owner-invoice-status ${getStatusClass(
                              invoice.status
                            )}`}
                          >
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
