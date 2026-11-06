import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import vetApi from '../../api/vetApi';
import PageHeader from '../../components/admin/ui/PageHeader';
import PrintableMedicalDocument from '../../components/common/PrintableMedicalDocument';
import '../../styles/vetTheme.css';

export default function VetRecordsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [printRecord, setPrintRecord] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newTreatmentPlan, setNewTreatmentPlan] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [page, status]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await vetApi.getMedicalRecords({
        search,
        status,
        fromDate,
        toDate,
        page,
        pageSize: 10,
      });
      setRecords(res.records || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Lỗi tải bệnh án:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadRecords();
  };

  const openCreateModal = async () => {
    try {
      const petList = await vetApi.searchPets('');
      setPets(petList || []);
      if (petList?.length > 0) setSelectedPetId(petList[0].petId);
      setShowCreateModal(true);
    } catch {
      alert('Không thể tải danh sách thú cưng');
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!selectedPetId) {
      alert('Vui lòng chọn thú cưng');
      return;
    }
    setCreating(true);
    try {
      const created = await vetApi.createMedicalRecord({
        petId: selectedPetId,
        symptoms: newSymptoms || 'Khám lâm sàng',
        diagnosis: newDiagnosis || 'Đang tiến hành chẩn đoán lâm sàng',
        treatmentPlan: newTreatmentPlan || '',
        status: 'IN_PROGRESS',
      });
      setShowCreateModal(false);
      navigate(`/vet/examination/${created.recordId}`);
    } catch (err) {
      alert(err?.response?.data?.message || 'Lỗi khi tạo bệnh án');
    } finally {
      setCreating(false);
    }
  };

  const handleQuickPrint = async (rId) => {
    try {
      const fullRecord = await vetApi.getMedicalRecordDetail(rId);
      setPrintRecord(fullRecord);
    } catch {
      alert('Không thể tải chi tiết bệnh án để in');
    }
  };

  return (
    <div className="pcms-page">
      <PageHeader
        title="Quản lý Hồ sơ Bệnh án Điện tử"
        subtitle="Lưu trữ, tra cứu và theo dõi kết quả khám chữa bệnh của toàn bộ thú cưng"
        actions={
          <button type="button" className="pcms-btn pcms-btn-primary" onClick={openCreateModal}>
            Lập bệnh án mới
          </button>
        }
      />

      <div className="vet-card">
        <div className="vet-card-body" style={{ padding: '16px 20px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <input
              type="text"
              className="vet-input"
              style={{ flex: 1, minWidth: 220 }}
              placeholder="Tìm tên thú cưng, chủ nuôi, chẩn đoán, mã #MR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b' }}>Từ ngày:</span>
              <input
                type="date"
                className="vet-input"
                style={{ width: 145 }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b' }}>Đến ngày:</span>
              <input
                type="date"
                className="vet-input"
                style={{ width: 145 }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <select
              className="vet-select"
              style={{ width: 160 }}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="IN_PROGRESS">Đang khám</option>
              <option value="COMPLETED">Đã hoàn tất</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            <button type="submit" className="vet-btn vet-btn-primary vet-btn-sm">
              Lọc kết quả
            </button>
            <button
              type="button"
              className="vet-btn vet-btn-outline vet-btn-sm"
              onClick={() => {
                setSearch('');
                setFromDate('');
                setToDate('');
                setStatus('ALL');
                setPage(1);
                loadRecords();
              }}
            >
              Đặt lại
            </button>
          </form>
        </div>
      </div>

      <div className="vet-card">
        <div className="vet-card-header">
          <h3 className="vet-card-title">Danh Sách Bệnh Án ({total} hồ sơ)</h3>
          <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={loadRecords}>
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="pcms-state-box">
            <h4>Đang tải danh sách hồ sơ bệnh án...</h4>
            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        ) : records.length === 0 ? (
          <div className="pcms-state-box">
            <h4>Không tìm thấy hồ sơ bệnh án nào</h4>
            <p>Hãy thử thay đổi điều kiện tìm kiếm hoặc bấm Lập bệnh án mới.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="vet-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Mã Hồ Sơ</th>
                  <th style={{ width: 140 }}>Thời gian khám</th>
                  <th>Thú cưng (Pet)</th>
                  <th>Chủ nuôi</th>
                  <th>Chẩn đoán bệnh</th>
                  <th>Bác sĩ phụ trách</th>
                  <th style={{ width: 130 }}>Trạng thái</th>
                  <th style={{ width: 170, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.recordId}>
                    <td>
                      <strong style={{ color: '#6320ee' }}>#MR-{r.recordId}</strong>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.visitDate}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.petName}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{r.petBreed}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.ownerName}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{r.ownerPhone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#5218cc', maxWidth: 260 }}>
                        {r.diagnosis}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                        Triệu chứng: {r.symptoms}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.veterinarianName}</div>
                    </td>
                    <td>
                      {r.status === 'COMPLETED' ? (
                        <span className="vet-badge vet-badge-completed">Hoàn tất</span>
                      ) : r.status === 'CANCELLED' ? (
                        <span className="vet-badge vet-badge-cancelled">Đã hủy</span>
                      ) : (
                        <span className="vet-badge vet-badge-in-progress">
                          <span className="vet-pulse-dot" /> Đang khám
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="vet-btn vet-btn-primary vet-btn-sm"
                          onClick={() => navigate(`/vet/examination/${r.recordId}`)}
                        >
                          Mở ca
                        </button>
                        <button
                          type="button"
                          className="vet-btn vet-btn-outline vet-btn-sm"
                          onClick={() => handleQuickPrint(r.recordId)}
                        >
                          In phiếu
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Trang <strong>{page}</strong> / {totalPages} (Tổng {total} ca bệnh)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="vet-btn vet-btn-outline vet-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trang trước
              </button>
              <button
                type="button"
                className="vet-btn vet-btn-outline vet-btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 540 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Tạo Bệnh Án Điện Tử Mới
              </h3>
              <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={() => setShowCreateModal(false)}>
                Đóng
              </button>
            </div>
            <form onSubmit={handleCreateRecord}>
              <div className="vet-modal-body">
                <div className="vet-form-group">
                  <label className="vet-form-label">Chọn thú cưng đến khám: <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    className="vet-select"
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    required
                  >
                    {pets.map((p) => (
                      <option key={p.petId} value={p.petId}>
                        {p.petName} ({p.species} - {p.breed}) • Chủ nuôi: {p.ownerName} ({p.ownerPhone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Triệu chứng lâm sàng ban đầu:</label>
                  <textarea
                    className="vet-textarea"
                    rows={3}
                    placeholder="Nhập triệu chứng chủ nuôi mô tả hoặc bác sĩ khám sơ bộ..."
                    value={newSymptoms}
                    onChange={(e) => setNewSymptoms(e.target.value)}
                    required
                  />
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Chẩn đoán sơ bộ ban đầu:</label>
                  <input
                    type="text"
                    className="vet-input"
                    placeholder="Ví dụ: Khám sức khỏe định kỳ / Viêm da dị ứng..."
                    value={newDiagnosis}
                    onChange={(e) => setNewDiagnosis(e.target.value)}
                    required
                  />
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Phác đồ dự kiến:</label>
                  <textarea
                    className="vet-textarea"
                    rows={2}
                    placeholder="Chỉ định xét nghiệm, phác đồ dùng thuốc..."
                    value={newTreatmentPlan}
                    onChange={(e) => setNewTreatmentPlan(e.target.value)}
                  />
                </div>
              </div>

              <div className="vet-modal-footer">
                <button type="button" className="vet-btn vet-btn-outline" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="vet-btn vet-btn-primary" disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Tạo Bệnh Án & Mở Phòng Khám'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printRecord && (
        <PrintableMedicalDocument
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
    </div>
  );
}
