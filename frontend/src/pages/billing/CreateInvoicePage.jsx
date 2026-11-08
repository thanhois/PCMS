import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search,
    Eye,
    ArrowLeft,
    CheckCircle,
} from 'lucide-react';

import billingApi from '../../api/billingApi';

const formatMoney = (value) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(Number(value || 0));

const formatDate = (value) => {
    if (!value) return '—';

    return new Date(value).toLocaleString('vi-VN');
};

export default function CreateInvoicePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const billingPrefix = location.pathname.startsWith('/admin') ? '/admin/billing' : '/billing';

    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [preview, setPreview] = useState(null);

    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(true);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [error, setError] = useState('');

    const loadRecords = async () => {
        try {
            setLoading(true);
            setError('');

            const response =
                await billingApi.getCompletedMedicalRecords();

            setRecords(
                Array.isArray(response?.data) ? response.data : []
            );
        } catch (err) {
            setError(
                err?.message || 'Không thể tải danh sách bệnh án.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(loadRecords);
    }, []);

    const filteredRecords = useMemo(() => {
        const search = keyword.trim().toLowerCase();

        if (!search) return records;

        return records.filter((record) =>
            [
                record.recordId,
                record.petName,
                record.ownerName,
                record.ownerPhone,
            ].some((value) =>
                String(value || '').toLowerCase().includes(search)
            )
        );
    }, [records, keyword]);

    const handlePreview = async (record) => {
        try {
            setSelectedRecord(record);
            setPreview(null);
            setPreviewLoading(true);
            setError('');

            const response =
                await billingApi.createInvoicePreview(record.recordId);

            if (!response?.data) {
                throw new Error('Không nhận được dữ liệu hóa đơn.');
            }

            setPreview(response.data);
        } catch (err) {
            setError(
                err?.message || 'Không thể tạo bản xem trước hóa đơn.'
            );
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleContinue = () => {
        if (!preview?.invoiceId) return;

        navigate(`${billingPrefix}/queue`);
    };

    return (
        <div>
            {/* PAGE HEADER */}
            <div className="pcms-page-header">
                <div>
                    <h2 className="pcms-page-title">
                        Tạo hóa đơn
                    </h2>
                    <p className="pcms-page-subtitle">
                        Chọn bệnh án đã hoàn tất để tạo hóa đơn thanh toán.
                    </p>
                </div>
            </div>

            {error && (
                <div className="pcms-alert pcms-alert-error"
                    style={{ marginBottom: 16 }}>
                    {error}
                </div>
            )}

            {/* MEDICAL RECORD LIST */}
            <section className="pcms-card">
                <div className="pcms-card-header">
                    <div>
                        <h3 className="pcms-card-title">
                            Bệnh án đã hoàn tất
                        </h3>
                        <p className="pcms-card-subtitle">
                            Chỉ hiển thị bệnh án đủ điều kiện lập hóa đơn.
                        </p>
                    </div>
                </div>

                <div className="billing-invoice-toolbar">
                    <div className="billing-invoice-search">
                        <Search size={17} />
                        <input
                            className="pcms-input"
                            value={keyword}
                            onChange={(event) =>
                                setKeyword(event.target.value)
                            }
                            placeholder="Tìm mã bệnh án, thú cưng, chủ nuôi..."
                        />
                    </div>

                    <span className="billing-result-count">
                        {filteredRecords.length} bệnh án
                    </span>
                </div>

                {loading ? (
                    <div className="pcms-state-box">
                        Đang tải danh sách bệnh án...
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="pcms-state-box">
                        <h4>Không có bệnh án phù hợp</h4>
                        <p>
                            Hiện không có bệnh án đã hoàn tất đủ điều kiện
                            tạo hóa đơn.
                        </p>
                    </div>
                ) : (
                    <div className="pcms-table-wrap">
                        <table className="pcms-table">
                            <thead>
                                <tr>
                                    <th>Mã bệnh án</th>
                                    <th>Thú cưng</th>
                                    <th>Chủ nuôi</th>
                                    <th>Số điện thoại</th>
                                    <th>Ngày khám</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRecords.map((record) => (
                                    <tr key={record.recordId}>
                                        <td>#{record.recordId}</td>
                                        <td>{record.petName || '—'}</td>
                                        <td>{record.ownerName || '—'}</td>
                                        <td>{record.ownerPhone || '—'}</td>
                                        <td>{formatDate(record.visitDate)}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="pcms-btn pcms-btn-primary pcms-btn-xs"
                                                disabled={previewLoading}
                                                onClick={() =>
                                                    handlePreview(record)
                                                }
                                            >
                                                <Eye size={14} />
                                                Xem trước
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* INVOICE PREVIEW */}
            {selectedRecord && (
                <section
                    className="pcms-card"
                    style={{ marginTop: 20 }}
                >
                    <div className="pcms-card-header">
                        <div>
                            <h3 className="pcms-card-title">
                                Xem trước hóa đơn
                            </h3>
                            <p className="pcms-card-subtitle">
                                Bệnh án #{selectedRecord.recordId}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="pcms-btn pcms-btn-outline"
                            onClick={() => {
                                setSelectedRecord(null);
                                setPreview(null);
                                setError('');
                            }}
                        >
                            <ArrowLeft size={15} />
                            Đóng
                        </button>
                    </div>

                    {previewLoading ? (
                        <div className="pcms-state-box">
                            Đang tạo bản xem trước hóa đơn...
                        </div>
                    ) : preview ? (
                        <>
                            <div className="pcms-form-grid">
                                <div className="pcms-field">
                                    <span className="pcms-label">
                                        Mã hóa đơn
                                    </span>
                                    <strong>#{preview.invoiceId}</strong>
                                </div>

                                <div className="pcms-field">
                                    <span className="pcms-label">
                                        Trạng thái
                                    </span>
                                    <span className="pcms-badge pcms-badge-warning">
                                        {preview.invoiceStatus}
                                    </span>
                                </div>

                                <div className="pcms-field">
                                    <span className="pcms-label">
                                        Thú cưng
                                    </span>
                                    <strong>{preview.petName || '—'}</strong>
                                </div>

                                <div className="pcms-field">
                                    <span className="pcms-label">
                                        Chủ nuôi
                                    </span>
                                    <strong>{preview.ownerName || '—'}</strong>
                                </div>

                                <div className="pcms-field">
                                    <span className="pcms-label">
                                        Số điện thoại
                                    </span>
                                    <strong>{preview.ownerPhone || '—'}</strong>
                                </div>

                                <div className="pcms-field">
                                    <span className="pcms-label">
                                        Ngày khám
                                    </span>
                                    <strong>{formatDate(preview.visitDate)}</strong>
                                </div>
                            </div>

                            <div style={{ marginTop: 24 }}>
                                <h4 className="pcms-card-title">
                                    Chi tiết dịch vụ và thuốc
                                </h4>

                                <div className="pcms-table-wrap"
                                    style={{ marginTop: 12 }}>
                                    <table className="pcms-table">
                                        <thead>
                                            <tr>
                                                <th>Loại</th>
                                                <th>Tên</th>
                                                <th>Liều dùng</th>
                                                <th>Số lượng</th>
                                                <th>Đơn giá</th>
                                                <th>Thành tiền</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(preview.items || []).map(
                                                (item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.itemType}</td>
                                                        <td>{item.itemName}</td>
                                                        <td>{item.dosage || '—'}</td>
                                                        <td>
                                                            {item.quantity} {item.unit || ''}
                                                        </td>
                                                        <td>{formatMoney(item.unitPrice)}</td>
                                                        <td>
                                                            <strong>
                                                                {formatMoney(item.lineTotal)}
                                                            </strong>
                                                        </td>
                                                    </tr>
                                                )
                                            )}

                                            {(!preview.items ||
                                                preview.items.length === 0) && (
                                                <tr>
                                                    <td colSpan="6"
                                                        style={{ textAlign: 'center' }}>
                                                        Không có chi tiết hóa đơn.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{
                                maxWidth: 360,
                                marginLeft: 'auto',
                                marginTop: 20,
                            }}>
                                <div className="pcms-pagination">
                                    <span>Tổng tiền</span>
                                    <strong>
                                        {formatMoney(preview.totalAmount)}
                                    </strong>
                                </div>

                                <div className="pcms-pagination">
                                    <span>Giảm giá</span>
                                    <strong>
                                        {formatMoney(preview.discountAmount)}
                                    </strong>
                                </div>

                                <div className="pcms-pagination">
                                    <strong>Cần thanh toán</strong>
                                    <strong style={{
                                        color: '#0f766e',
                                        fontSize: 18,
                                    }}>
                                        {formatMoney(preview.amountDue)}
                                    </strong>
                                </div>
                            </div>

                            {preview.existingInvoice && (
                                <div className="pcms-alert pcms-alert-info"
                                    style={{ marginTop: 16 }}>
                                    Bệnh án này đã có hóa đơn PENDING.
                                    Hệ thống đang sử dụng lại hóa đơn hiện có.
                                </div>
                            )}

                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                marginTop: 20,
                            }}>
                                <button
                                    type="button"
                                    className="pcms-btn pcms-btn-primary"
                                    onClick={handleContinue}
                                >
                                    <CheckCircle size={16} />
                                    Xác nhận và chuyển hàng chờ
                                </button>
                            </div>
                        </>
                    ) : null}
                </section>
            )}
        </div>
    );
}