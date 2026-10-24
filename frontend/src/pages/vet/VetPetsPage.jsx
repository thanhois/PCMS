import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Dog,
  Eye,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  User,
} from 'lucide-react';
import vetApi from '../../api/vetApi';
import PetHistoryModal from '../../components/vet/PetHistoryModal';
import '../../styles/vetTheme.css';

export default function VetPetsPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState([]);
  const [selectedPetHistory, setSelectedPetHistory] = useState(null);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    setLoading(true);
    try {
      const data = await vetApi.searchPets(query);
      setPets(data || []);
    } catch (err) {
      console.error('Lỗi tìm thú cưng:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadPets();
  };

  const handleStartExamForPet = async (pet) => {
    try {
      const created = await vetApi.createMedicalRecord({
        petId: pet.petId,
        symptoms: 'Khám theo yêu cầu chủ nuôi',
        diagnosis: 'Khám lâm sàng',
        treatmentPlan: '',
        status: 'IN_PROGRESS',
      });
      navigate(`/vet/examination/${created.recordId}`);
    } catch (err) {
      alert(err?.response?.data?.message || 'Lỗi khi tạo ca khám');
    }
  };

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Dog size={22} color="#0d9488" /> Tra Cứu Thú Cưng & Bệnh Sử Trọn Đời
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          Tra cứu nhanh hồ sơ thú cưng, xem tiền sử bệnh án, lịch tiêm phòng & cân nặng theo dõi
        </p>
      </div>

      {/* Search Input */}
      <div className="vet-card" style={{ marginBottom: 24 }}>
        <div className="vet-card-body" style={{ padding: '16px 20px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="vet-input"
                style={{ paddingLeft: 38, fontSize: 14 }}
                placeholder="Nhập tên thú cưng (Milo, Bông...), giống loài, tên chủ nuôi hoặc số điện thoại..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="vet-btn vet-btn-primary">
              <Search size={16} /> Tìm kiếm
            </button>
            <button
              type="button"
              className="vet-btn vet-btn-outline"
              onClick={() => {
                setQuery('');
                vetApi.searchPets('').then((data) => setPets(data || []));
              }}
            >
              <RefreshCw size={14} /> Tất cả
            </button>
          </form>
        </div>
      </div>

      {/* Pet Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#0d9488' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🐾</div>
          <p style={{ fontWeight: 600 }}>Đang tìm kiếm hồ sơ thú cưng...</p>
        </div>
      ) : pets.length === 0 ? (
        <div className="vet-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🐶🐱</div>
          <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
            Không tìm thấy thú cưng nào phù hợp
          </h4>
          <p style={{ fontSize: 13, margin: 0 }}>
            Hãy thử tìm bằng từ khóa khác hoặc số điện thoại chủ nuôi.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {pets.map((p) => (
            <div key={p.petId} className="vet-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="vet-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 26,
                    }}
                  >
                    {p.species === 'Mèo' ? '🐱' : '🐶'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {p.petName}
                    </h3>
                    <div style={{ fontSize: 12.5, color: '#0d9488', fontWeight: 600 }}>
                      {p.species} • {p.breed}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                      {p.gender} • Ngày sinh: {p.dateOfBirth || 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Cân nặng hiện tại:</span>
                    <strong style={{ color: '#0f766e' }}>{p.weight ? `${p.weight} kg` : 'Chưa cân'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Chủ nuôi:</span>
                    <strong style={{ color: '#0f172a' }}>{p.ownerName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Số điện thoại:</span>
                    <span style={{ color: '#0284c7', fontWeight: 600 }}>{p.ownerPhone}</span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="vet-btn vet-btn-outline vet-btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setSelectedPetHistory(p)}
                  >
                    <Clock size={14} color="#0d9488" /> Bệnh Sử Bé
                  </button>
                  <button
                    type="button"
                    className="vet-btn vet-btn-primary vet-btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => handleStartExamForPet(p)}
                  >
                    <Stethoscope size={14} /> Khám Ca Này
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Xem Bệnh Sử */}
      {selectedPetHistory && (
        <PetHistoryModal
          petId={selectedPetHistory.petId}
          petName={selectedPetHistory.petName}
          onClose={() => setSelectedPetHistory(null)}
        />
      )}
    </div>
  );
}
