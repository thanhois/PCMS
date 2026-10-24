import { useEffect, useState } from 'react';
import { Activity, Calendar, Clock, FileText, Pill, Stethoscope, X } from 'lucide-react';
import vetApi from '../../api/vetApi';
import '../../styles/vetTheme.css';

export default function PetHistoryModal({ petId, petName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!petId) return;
    loadHistory();
  }, [petId]);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await vetApi.getPetMedicalHistory(petId);
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải lịch sử bệnh án của thú cưng');
    } finally {
      setLoading(false);
    }
  };

  const visits = data?.visits || [];
  const pet = data?.pet || {};

  return (
    <div className="vet-modal-backdrop">
      <div className="vet-modal" style={{ maxWidth: 760 }}>
        {/* Header */}
        <div className="vet-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stethoscope size={20} color="#0d9488" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Hồ Sơ Bệnh Sử • {petName || pet.petName || 'Thú cưng'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                {pet.species} • {pet.breed} • {pet.gender} • Cân nặng hiện tại: {pet.weight} kg
              </p>
            </div>
          </div>
          <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="vet-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#0d9488' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              <p>Đang tải bệnh sử thú cưng...</p>
            </div>
          ) : error ? (
            <div style={{ padding: 16, background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          ) : visits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <p style={{ fontWeight: 600 }}>Chưa có lịch sử khám bệnh trước đây</p>
              <p style={{ fontSize: 12 }}>Đây là lần đầu tiên bé đến khám tại Veterian Clinic.</p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 8, fontSize: 13, color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Tổng số lần đến khám: <strong>{data.totalVisits || visits.length} lần</strong></span>
                <span>Chủ nuôi: <strong>{pet.ownerName}</strong> ({pet.ownerPhone})</span>
              </div>

              {/* Timeline of past visits */}
              <div className="vet-timeline">
                {visits.map((v, idx) => (
                  <div key={v.recordId || idx} className="vet-timeline-item">
                    <div className="vet-timeline-dot"></div>
                    <div className="vet-timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#0d9488' }}>
                          <Calendar size={14} />
                          <span>{v.visitDate}</span>
                          <span style={{ color: '#94a3b8' }}>•</span>
                          <span style={{ color: '#475569' }}>Mã: #MR-{v.recordId}</span>
                        </div>
                        <span className={`vet-badge ${v.status === 'COMPLETED' ? 'vet-badge-completed' : 'vet-badge-in-progress'}`}>
                          {v.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Đang điều trị'}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
                        <div><strong>Triệu chứng:</strong> {v.symptoms}</div>
                        <div style={{ marginTop: 3 }}>
                          <strong>Chẩn đoán:</strong> <span style={{ color: '#0f766e', fontWeight: 600 }}>{v.diagnosis}</span>
                        </div>
                        {v.treatmentPlan && (
                          <div style={{ marginTop: 3, color: '#475569', fontSize: 12.5 }}>
                            <strong>Phác đồ:</strong> {v.treatmentPlan}
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: 11.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                        <Stethoscope size={13} /> Bác sĩ phụ trách: <strong>{v.veterinarianName}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="vet-modal-footer">
          <button type="button" className="vet-btn vet-btn-outline" onClick={onClose}>
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}
