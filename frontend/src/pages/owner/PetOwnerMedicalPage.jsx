import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ownerApi from '../../api/ownerApi';
import { useDialog } from '../../context/DialogContext';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import PrintableMedicalDocument from '../../components/common/PrintableMedicalDocument';
import '../../styles/vetTheme.css';

const formatVnd = (val) => Number(val || 0).toLocaleString('vi-VN') + ' ₫';

const formatPaymentMethod = (method) => {
  switch ((method || '').toUpperCase()) {
    case 'CASH':
      return 'Tiền mặt';
    case 'CARD':
      return 'Thẻ ngân hàng';
    case 'BANK_TRANSFER':
      return 'Chuyển khoản';
    default:
      return method || '—';
  }
};

export default function PetOwnerMedicalPage() {
  const dialog = useDialog();
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loadingPets, setLoadingPets] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [printRecord, setPrintRecord] = useState(null);

  const selectPet = async (pet) => {
    setSelectedPet(pet);
    setLoadingHistory(true);
    try {
      const res = await ownerApi.getMyPetMedicalHistory(pet.petId);
      setHistoryData(res);
    } catch (err) {
      console.error('Lỗi tải lịch sử khám:', err);
      setHistoryData(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadMyPets = async () => {
    setLoadingPets(true);
    try {
      const data = await ownerApi.getMyPets();
      setPets(data || []);
      if (data && data.length > 0) {
        selectPet(data[0]);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách thú cưng:', err);
    } finally {
      setLoadingPets(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadMyPets);
  }, []);

  const handlePrint = async (recordId) => {
    try {
      const fullRecord = await ownerApi.getMyMedicalRecordPrintView(recordId);
      setPrintRecord(fullRecord);
    } catch {
      dialog.alert({
        title: 'Lỗi in ấn',
        message: 'Không thể tải chi tiết phiếu khám & biên lai để in',
        type: 'error',
      });
    }
  };

  const visits = historyData?.visits || [];

  return (
    <div className="pcms-page">
      <PageHeader
        title="Sổ khám bệnh & Lịch sử Hóa đơn"
        subtitle="Hồ sơ y tế, kết quả chẩn đoán, đơn thuốc và biên lai viện phí của thú cưng dành cho chủ nuôi"
        actions={
          <Link to="/owner/booking" className="pcms-btn pcms-btn-primary">
            Đặt lịch khám mới
          </Link>
        }
      />

      <div>
        <div className="pcms-card" style={{ padding: '18px 22px', marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Chọn thú cưng của bạn
          </div>

          {loadingPets ? (
            <p style={{ color: '#6320ee', margin: 0, fontSize: 13.5 }}>Đang tải danh sách thú cưng...</p>
          ) : pets.length === 0 ? (
            <p style={{ margin: 0, color: '#64748b', fontSize: 13.5 }}>
              Bạn chưa có hồ sơ thú cưng nào được liên kết với tài khoản này.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {pets.map((p) => {
                const isSelected = selectedPet?.petId === p.petId;
                return (
                  <button
                    key={p.petId}
                    type="button"
                    onClick={() => selectPet(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid #6320ee' : '1px solid #e5e7eb',
                      background: isSelected ? '#f5f3ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: isSelected ? '#6320ee' : '#ede9fe',
                        color: isSelected ? '#ffffff' : '#6320ee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      {(p.petName || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: isSelected ? '#6320ee' : '#0f172a' }}>
                        {p.petName}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {p.species} • {p.breed} • <strong>{p.weight} kg</strong>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedPet && (
          <div>
            <div
              className="pcms-card"
              style={{
                background: 'linear-gradient(90deg, #611eee 0%, #5719d9 52%, #4a15bc 100%)',
                color: '#ffffff',
                padding: '22px 26px',
                marginBottom: 24,
                border: 'none',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {(selectedPet.petName || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                      Sổ Khám Sức Khỏe: {selectedPet.petName}
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>
                      {selectedPet.species} • Giống {selectedPet.breed || '—'}
                      {selectedPet.color ? ` • Màu lông ${selectedPet.color}` : ''} • Giới tính {selectedPet.gender} • Cân nặng:{' '}
                      <strong>{selectedPet.weight} kg</strong>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.14)', padding: '10px 18px', borderRadius: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{visits.length}</div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>Lần đến khám</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.14)', padding: '10px 18px', borderRadius: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedPet.weight || '0'} kg</div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>Trọng lượng hiện tại</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Lịch Sử Các Lần Khám, Đơn Thuốc & Hóa Đơn Viện Phí
                </h3>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>Hiển thị từ lần khám gần nhất</span>
              </div>

              {loadingHistory ? (
                <div className="pcms-card pcms-state-box">
                  <h4>Đang tải bệnh sử của bé...</h4>
                  <p>Vui lòng chờ trong giây lát.</p>
                </div>
              ) : visits.length === 0 ? (
                <div className="pcms-card pcms-state-box">
                  <h4>Chưa có lịch sử khám bệnh nào</h4>
                  <p>Bé {selectedPet.petName} chưa từng có ca khám nào tại PCMS Clinic.</p>
                </div>
              ) : (
                <div className="vet-timeline" style={{ paddingLeft: 28 }}>
                  {visits.map((v) => {
                    const inv = v.invoice || null;
                    return (
                      <div key={v.recordId} className="vet-timeline-item" style={{ marginBottom: 24 }}>
                        <div className="vet-timeline-dot" />
                        <div className="vet-timeline-content" style={{ padding: 22 }}>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 10,
                              borderBottom: '1px solid #e5e7eb',
                              paddingBottom: 12,
                              marginBottom: 14,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                Ngày khám: {v.visitDate}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                Bác sĩ phụ trách: <strong>{v.veterinarianName}</strong> • Mã bệnh án:{' '}
                                <strong style={{ color: '#6320ee' }}>#MR-{v.recordId}</strong>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                              <StatusBadge status={v.status} />
                              <button
                                type="button"
                                className="vet-btn vet-btn-outline vet-btn-sm"
                                onClick={() => handlePrint(v.recordId)}
                              >
                                In phiếu khám & biên lai
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ color: '#64748b' }}>Triệu chứng lúc đến: </span>
                              <strong>{v.symptoms}</strong>
                            </div>
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ color: '#64748b' }}>Chẩn đoán xác định: </span>
                              <strong style={{ color: '#5218cc', fontSize: 14 }}>{v.diagnosis}</strong>
                            </div>
                            {v.treatmentPlan && (
                              <div>
                                <span style={{ color: '#64748b' }}>Phác đồ & Hướng dẫn: </span>
                                <div
                                  style={{
                                    background: '#f8fafc',
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    marginTop: 4,
                                    whiteSpace: 'pre-wrap',
                                    border: '1px solid #e5e7eb',
                                  }}
                                >
                                  {v.treatmentPlan}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* P5.4: Owner Invoice & Receipt Info (SRS 5.1.1) */}
                          {inv && (
                            <div
                              style={{
                                background: '#f5f3ff',
                                border: '1px solid #ddd6fe',
                                borderRadius: 10,
                                padding: '12px 16px',
                                marginBottom: 14,
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span>Hóa đơn viện phí: {inv.invoiceCode || `HD-${inv.invoiceId}`}</span>
                                  <StatusBadge status={inv.status} />
                                </div>
                                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                                  Tổng tiền: <strong>{formatVnd(inv.totalAmount)}</strong>
                                  {Number(inv.discountAmount || 0) > 0 && (
                                    <> • Giảm giá: <strong>-{formatVnd(inv.discountAmount)}</strong></>
                                  )}
                                  {' • '}Thực thu: <strong style={{ color: '#6320ee' }}>{formatVnd(inv.netAmount)}</strong>
                                  {inv.paymentMethod && (
                                    <> • Thanh toán: <strong>{formatPaymentMethod(inv.paymentMethod)}</strong> ({inv.paymentDate})</>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                className="vet-btn vet-btn-outline vet-btn-sm"
                                onClick={() => handlePrint(v.recordId)}
                              >
                                {inv.status === 'PAID' ? 'In biên lai PAID' : 'Xem hóa đơn'}
                              </button>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="vet-btn vet-btn-primary vet-btn-sm"
                              onClick={() => handlePrint(v.recordId)}
                            >
                              Xem chi tiết đơn thuốc, xét nghiệm & biên lai
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {printRecord && (
        <PrintableMedicalDocument
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
    </div>
  );
}
