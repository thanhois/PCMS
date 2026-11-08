
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ownerApi from '../../api/ownerApi';

export default function PetOwnerInvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await ownerApi.getMyInvoiceById(invoiceId);
        setInvoice(data);
      } catch (err) {
        console.error('Lỗi tải chi tiết hóa đơn:', err);
        setError(err.message || 'Không thể tải chi tiết hóa đơn.');
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString('vi-VN') + ' ₫';

  const formatDate = (date) =>
    date ? new Date(date).toLocaleString('vi-VN') : '—';

  if (loading) {
    return <p>Đang tải chi tiết hóa đơn...</p>;
  }

  if (error || !invoice) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Chi tiết hóa đơn</h2>
        <p style={{ color: 'red' }}>
          {error || 'Không tìm thấy hóa đơn.'}
        </p>
        <button onClick={() => navigate('/owner/invoices')}>
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const payments = invoice.payments || [];

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => navigate('/owner/invoices')}>
        ← Quay lại danh sách
      </button>

      <h2>Chi tiết hóa đơn #{invoice.invoiceId}</h2>

      <h3>Thông tin hóa đơn</h3>

      <table>
        <tbody>
          <tr>
            <td>Mã hóa đơn</td>
            <td>#{invoice.invoiceId}</td>
          </tr>
          <tr>
            <td>Mã hồ sơ khám</td>
            <td>{invoice.recordId || '—'}</td>
          </tr>
          <tr>
            <td>Tên thú cưng</td>
            <td>{invoice.petName || '—'}</td>
          </tr>
          <tr>
            <td>Chủ thú cưng</td>
            <td>{invoice.ownerName || '—'}</td>
          </tr>
          <tr>
            <td>Ngày lập</td>
            <td>{formatDate(invoice.invoiceDate)}</td>
          </tr>
          <tr>
            <td>Tổng tiền</td>
            <td>{formatMoney(invoice.totalAmount)}</td>
          </tr>
          <tr>
            <td>Giảm giá</td>
            <td>{formatMoney(invoice.discountAmount)}</td>
          </tr>
          <tr>
            <td>Trạng thái</td>
            <td>{invoice.status}</td>
          </tr>
        </tbody>
      </table>

      <h3>Lịch sử thanh toán</h3>

      {payments.length === 0 ? (
        <p>Chưa có giao dịch thanh toán.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Mã thanh toán</th>
              <th>Ngày thanh toán</th>
              <th>Phương thức</th>
              <th>Số tiền</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr key={payment.paymentId}>
                <td>#{payment.paymentId}</td>
                <td>{formatDate(payment.paymentDate)}</td>
                <td>{payment.paymentMethod || '—'}</td>
                <td>{formatMoney(payment.amountPaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
