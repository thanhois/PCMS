import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Dog,
  FileText,
  Heart,
  Home,
  LogOut,
  Pill,
  Printer,
  Scale,
  Sparkles,
  Stethoscope,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ownerApi from '../../api/ownerApi';
import PrintableMedicalDocument from '../../components/common/PrintableMedicalDocument';
import '../../styles/vetTheme.css';

export default function PetOwnerMedicalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loadingPets, setLoadingPets] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [printRecord, setPrintRecord] = useState(null);

  useEffect(() => {
    loadMyPets();
  }, []);

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

  const handlePrint = async (recordId) => {
    try {
      const fullRecord = await ownerApi.getMyMedicalRecordPrintView(recordId);
      setPrintRecord(fullRecord);
    } catch (err) {
      alert('Không thể tải chi tiết phiếu khám để in');
    }
  };

  const visits = historyData?.visits || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          background: 'linear-gradient(90deg, #0d9488 0%, #047857 100%)',
          color: '#ffffff',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={20} color="#ffffff" fill="currentColor" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: 0.5 }}>
              Veterian • Sổ Khám Bệnh Điện Tử
            </h1>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>
              HỒ SƠ Y TẾ & ĐƠN THUỐC DÀNH CHO CHỦ NUÔI (PET OWNER)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
              {user?.fullName ? user.fullName.charAt(0) : 'U'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.fullName || 'Chủ nuôi'}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Khách hàng thân thiết</div>
            </div>
          </div>

          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <Home size={15} /> Trang chủ
          </Link>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <LogOut size={15} /> Thoát
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1200, margin: '28px auto', padding: '0 20px' }}>
        {/* Pets Selection Bar */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            🐾 Chọn bé thú cưng của bạn:
          </h2>

          {loadingPets ? (
            <p style={{ color: '#0d9488' }}>Đang tải danh sách thú cưng...</p>
          ) : pets.length === 0 ? (
            <div className="vet-card" style={{ padding: 30, textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#64748b' }}>Bạn chưa có bé thú cưng nào được liên kết với tài khoản này.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
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
                      padding: '12px 18px',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                      background: isSelected ? 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)' : '#ffffff',
                      boxShadow: isSelected ? '0 4px 12px rgba(13, 148, 136, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: isSelected ? '#0d9488' : '#e0f2fe',
                        color: isSelected ? '#ffffff' : '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {p.species === 'Mèo' ? '🐱' : '🐶'}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
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

        {/* Selected Pet Banner & Medical History */}
        {selectedPet && (
          <div>
            {/* Pet Quick Info Banner */}
            <div
              className="vet-card"
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                color: '#ffffff',
                padding: '24px 28px',
                marginBottom: 28,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                    {selectedPet.species === 'Mèo' ? '🐱' : '🐶'}
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>
                      Sổ Khám Sức Khỏe: {selectedPet.petName}
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
                      {selectedPet.species} • Giống {selectedPet.breed} • Giới tính {selectedPet.gender} • Cân nặng: <strong>{selectedPet.weight} kg</strong>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', padding: '10px 18px', borderRadius: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{visits.length}</div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>Lần đến khám</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', padding: '10px 18px', borderRadius: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedPet.weight || '0'} kg</div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>Trọng lượng hiện tại</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Timeline */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={20} color="#0d9488" /> Lịch Sử Các Lần Khám & Đơn Thuốc
                </h3>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  Hiển thị từ lần khám gần nhất
                </span>
              </div>

              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#0d9488' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🩺</div>
                  <p>Đang tải bệnh sử của bé...</p>
                </div>
              ) : visits.length === 0 ? (
                <div className="vet-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
                    Chưa có lịch sử khám bệnh nào
                  </h4>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    Bé {selectedPet.petName} chưa từng có ca khám nào tại Veterian Clinic.
                  </p>
                </div>
              ) : (
                <div className="vet-timeline" style={{ paddingLeft: 28 }}>
                  {visits.map((v) => (
                    <div key={v.recordId} className="vet-timeline-item" style={{ marginBottom: 28 }}>
                      <div className="vet-timeline-dot"></div>
                      <div className="vet-timeline-content" style={{ padding: 22 }}>
                        {/* Record Header */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Stethoscope size={18} color="#0d9488" />
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                Ngày khám: {v.visitDate}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>
                                Bác sĩ phụ trách: <strong>{v.veterinarianName}</strong> • Mã bệnh án: #MR-{v.recordId}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span className={`vet-badge ${v.status === 'COMPLETED' ? 'vet-badge-completed' : 'vet-badge-in-progress'}`}>
                              {v.status === 'COMPLETED' ? 'Đã hoàn tất khám' : 'Đang điều trị'}
                            </span>
                            <button
                              type="button"
                              className="vet-btn vet-btn-outline vet-btn-sm"
                              onClick={() => handlePrint(v.recordId)}
                            >
                              <Printer size={14} /> In Phiếu Khám & Đơn Thuốc
                            </button>
                          </div>
                        </div>

                        {/* Medical Details */}
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
                          <div style={{ marginBottom: 6 }}>
                            <span style={{ color: '#64748b' }}>Triệu chứng lúc đến: </span>
                            <strong>{v.symptoms}</strong>
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            <span style={{ color: '#64748b' }}>Chẩn đoán xác định: </span>
                            <strong style={{ color: '#0f766e', fontSize: 14 }}>{v.diagnosis}</strong>
                          </div>
                          {v.treatmentPlan && (
                            <div>
                              <span style={{ color: '#64748b' }}>Phác đồ & Hướng dẫn: </span>
                              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, marginTop: 4, whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0' }}>
                                {v.treatmentPlan}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* View full details button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="vet-btn vet-btn-primary vet-btn-sm"
                            onClick={() => handlePrint(v.recordId)}
                          >
                            <FileText size={14} /> Xem Chi Tiết Đơn Thuốc & Kết Quả Xét Nghiệm
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal In Bệnh Án */}
      {printRecord && (
        <PrintableMedicalDocument
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
    </div>
  );
}
