import { Printer, X } from 'lucide-react';
import '../../styles/vetTheme.css';

export default function PrintableMedicalDocument({ record, onClose }) {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    if (!val) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const pet = record.pet || {};
  const owner = record.owner || (pet.petOwner) || {};
  const vet = record.veterinarian || {};
  const services = record.services || [];
  const prescription = record.prescription || {};
  const medicines = prescription.medicines || [];
  const followUps = record.followUps || [];

  return (
    <div className="vet-modal-backdrop no-print">
      <div className="vet-modal" style={{ maxWidth: 850 }}>
        {/* Modal Controls (Hidden in Print) */}
        <div className="vet-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={20} color="#0d9488" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Xem trước Phiếu Khám & Đơn Thuốc Điện Tử
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="vet-btn vet-btn-primary vet-btn-sm"
              onClick={handlePrint}
            >
              <Printer size={15} /> In ngay (Print / PDF)
            </button>
            <button
              type="button"
              className="vet-btn vet-btn-outline vet-btn-sm"
              onClick={onClose}
            >
              <X size={15} /> Đóng
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="vet-modal-body printable-area" style={{ background: '#ffffff', color: '#1e293b', padding: '36px 44px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0d9488', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0d9488', letterSpacing: 0.5 }}>
                BỆNH VIỆN THÚ Y VETERIAN CLINIC
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                Địa chỉ: 123 Nguyễn Văn Linh, P. Tân Phong, Quận 7, TP. Hồ Chí Minh
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Hotline 24/7: <strong>028.1234.5678</strong> • Cấp cứu thú y: <strong>0900.000.000</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                MÃ BỆNH ÁN: <span style={{ color: '#0d9488' }}>#MR-{String(record.recordId).padStart(5, '0')}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Ngày khám: <strong>{record.visitDate || new Date().toLocaleString('vi-VN')}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Bác sĩ điều trị: <strong>{vet.fullName || 'BS. Nguyễn Văn Minh'}</strong>
              </div>
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', margin: '0 0 4px', letterSpacing: 0.5 }}>
              PHIẾU KHÁM BỆNH & ĐƠN THUỐC ĐIỆN TỬ
            </h2>
            <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
              (Lưu hành và đối chiếu nội bộ phòng khám & hướng dẫn chăm sóc tại nhà cho chủ nuôi)
            </div>
          </div>

          {/* Information Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#0d9488', marginBottom: 8, textTransform: 'uppercase', fontSize: 12 }}>
                🐾 THÔNG TIN THÚ CƯNG
              </div>
              <div>Tên thú cưng: <strong>{pet.petName || 'N/A'}</strong></div>
              <div>Loài / Giống: <strong>{pet.species || 'Chó'} - {pet.breed || 'N/A'}</strong></div>
              <div>Giới tính / Cân nặng: <strong>{pet.gender || 'Đực'} • {pet.weight ? `${pet.weight} kg` : 'N/A'}</strong></div>
              <div>Ngày sinh: <strong>{pet.dateOfBirth || 'N/A'}</strong></div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0d9488', marginBottom: 8, textTransform: 'uppercase', fontSize: 12 }}>
                👤 THÔNG TIN CHỦ NUÔI
              </div>
              <div>Họ và tên: <strong>{owner.fullName || 'N/A'}</strong></div>
              <div>Số điện thoại: <strong>{owner.phoneNumber || 'N/A'}</strong></div>
              <div>Email: <strong>{owner.email || 'N/A'}</strong></div>
              <div>Địa chỉ: <strong>{owner.address || 'TP. Hồ Chí Minh'}</strong></div>
            </div>
          </div>

          {/* Clinical Findings */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: 4, marginBottom: 8 }}>
              I. KẾT QUẢ KHÁM LÂM SÀNG & CHẨN ĐOÁN
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div><strong>Triệu chứng lâm sàng:</strong> {record.symptoms || 'Khám sức khỏe tổng quát.'}</div>
              <div style={{ marginTop: 4 }}>
                <strong>Chẩn đoán xác định:</strong> <span style={{ color: '#0f766e', fontWeight: 700 }}>{record.diagnosis || 'Chưa có chẩn đoán xác định.'}</span>
              </div>
              {record.treatmentPlan && (
                <div style={{ marginTop: 4 }}>
                  <strong>Phác đồ điều trị:</strong>
                  <div style={{ whiteSpace: 'pre-wrap', background: '#f1f5f9', padding: '8px 12px', borderRadius: 6, marginTop: 4 }}>
                    {record.treatmentPlan}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Services Ordered */}
          {services.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: 4, marginBottom: 8 }}>
                II. CÁC DỊCH VỤ & XÉT NGHIỆM ĐÃ THỰC HIỆN
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>STT</th>
                    <th style={{ padding: '6px 8px' }}>Tên Dịch Vụ / Xét Nghiệm</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Số Lượng</th>
                    <th style={{ padding: '6px 8px' }}>Kết Quả / Ghi Chú Kỹ Thuật</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{s.serviceName}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{s.quantity}</td>
                      <td style={{ padding: '6px 8px', color: '#475569' }}>{s.notes || 'Bình thường'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Prescription */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: 4, marginBottom: 8 }}>
              III. ĐƠN THUỐC ĐIỆN TỬ & HƯỚNG DẪN SỬ DỤNG
            </div>
            {medicines.length === 0 ? (
              <div style={{ fontSize: 12.5, fontStyle: 'italic', color: '#64748b' }}>
                Ca khám này không kê thuốc mang về.
              </div>
            ) : (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, marginBottom: 8 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>STT</th>
                      <th style={{ padding: '6px 8px' }}>Tên Thuốc & Quy Cách</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Số Lượng</th>
                      <th style={{ padding: '6px 8px' }}>Liều Dùng & Hướng Dẫn Uống</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px' }}>{idx + 1}</td>
                        <td style={{ padding: '8px', fontWeight: 700 }}>
                          {m.medicineName}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <strong>{m.quantity}</strong> {m.unit || 'viên'}
                        </td>
                        <td style={{ padding: '8px', color: '#0f766e', fontWeight: 600 }}>
                          👉 {m.dosage}
                          {m.notes && <span style={{ display: 'block', fontSize: 11.5, color: '#64748b', fontWeight: 400 }}>Ghi chú: {m.notes}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {prescription.instructions && (
                  <div style={{ background: '#fef3c7', padding: '8px 12px', borderRadius: 6, fontSize: 12.5, color: '#92400e', marginTop: 8 }}>
                    <strong>Lời dặn chung của bác sĩ:</strong> {prescription.instructions}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Follow-up Appointments */}
          {followUps.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: 4, marginBottom: 8 }}>
                IV. LỊCH HẸN TÁI KHÁM & THEO DÕI
              </div>
              {followUps.map((f, idx) => (
                <div key={idx} style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '8px 12px', borderRadius: 6, fontSize: 12.5, color: '#065f46', marginBottom: 6 }}>
                  📅 Hẹn tái khám ngày: <strong>{f.followUpDate}</strong> • Loại: <strong>{f.followUpType}</strong>
                  {f.notes && <div>Ghi chú: {f.notes}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', marginTop: 36, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 600, color: '#475569' }}>CHỦ NUÔI XÁC NHẬN</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: 60 }}></div>
              <div style={{ fontWeight: 600 }}>{owner.fullName || ''}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#475569' }}>BÁC SĨ ĐIỀU TRỊ</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>(Ký tên & đóng dấu)</div>
              <div style={{ height: 60 }}></div>
              <div style={{ fontWeight: 700, color: '#0d9488' }}>{vet.fullName || 'BS. CKI Nguyễn Văn Minh'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
