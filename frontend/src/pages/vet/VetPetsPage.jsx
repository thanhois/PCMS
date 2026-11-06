import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import vetApi from '../../api/vetApi';
import PageHeader from '../../components/admin/ui/PageHeader';
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
    <div className="pcms-page">
      <PageHeader
        title="Tra cứu Thú cưng & Bệnh sử trọn đời"
        subtitle="Tra cứu hồ sơ thú cưng, tiền sử bệnh án, lịch tiêm phòng và cân nặng theo dõi"
      />

      <div className="vet-card">
        <div className="vet-card-body" style={{ padding: '16px 20px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="vet-input"
              style={{ flex: 1, minWidth: 240 }}
              placeholder="Nhập tên thú cưng (Milo, Bông...), giống loài, tên chủ nuôi hoặc số điện thoại..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="vet-btn vet-btn-primary">
              Tìm kiếm
            </button>
            <button
              type="button"
              className="vet-btn vet-btn-outline"
              onClick={() => {
                setQuery('');
                vetApi.searchPets('').then((data) => setPets(data || []));
              }}
            >
              Tất cả
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="pcms-card pcms-state-box">
          <h4>Đang tìm kiếm hồ sơ thú cưng...</h4>
          <p>Vui lòng chờ trong giây lát.</p>
        </div>
      ) : pets.length === 0 ? (
        <div className="pcms-card pcms-state-box">
          <h4>Không tìm thấy thú cưng nào phù hợp</h4>
          <p>Hãy thử tìm bằng từ khóa khác hoặc số điện thoại chủ nuôi.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {pets.map((p) => (
            <div key={p.petId} className="vet-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="vet-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div className="vet-pet-avatar" style={{ width: 46, height: 46, fontSize: 16 }}>
                    {(p.petName || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {p.petName}
                    </h3>
                    <div style={{ fontSize: 12.5, color: '#6320ee', fontWeight: 600 }}>
                      {p.species} • {p.breed}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                      {p.gender} • Ngày sinh: {p.dateOfBirth || 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Cân nặng hiện tại:</span>
                    <strong style={{ color: '#5218cc' }}>{p.weight ? `${p.weight} kg` : 'Chưa cân'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Chủ nuôi:</span>
                    <strong style={{ color: '#0f172a' }}>{p.ownerName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Số điện thoại:</span>
                    <span style={{ color: '#6320ee', fontWeight: 600 }}>{p.ownerPhone}</span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="vet-btn vet-btn-outline vet-btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setSelectedPetHistory(p)}
                  >
                    Bệnh sử
                  </button>
                  <button
                    type="button"
                    className="vet-btn vet-btn-primary vet-btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => handleStartExamForPet(p)}
                  >
                    Khám ca này
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
