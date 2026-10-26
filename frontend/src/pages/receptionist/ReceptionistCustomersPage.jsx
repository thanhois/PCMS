import { useCallback, useEffect, useState } from 'react';
import receptionistApi from '../../api/receptionistApi';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import ModalDialog from '../../components/admin/ui/ModalDialog';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import ToastMessage from '../../components/admin/ui/ToastMessage';

export default function ReceptionistCustomersPage() {
  const [activeTab, setActiveTab] = useState('OWNERS'); // 'OWNERS' | 'PETS'

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('');

  // Dữ liệu
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: 'info', message: '' });

  // Modal Tạo/Cập nhật Chủ nuôi (UC16, UC17)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [ownerForm, setOwnerForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
  });

  // Modal Tạo/Cập nhật Thú cưng (UC13, UC14)
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [petForm, setPetForm] = useState({
    ownerId: '',
    petName: '',
    species: 'Chó',
    breed: '',
    gender: 'Đực',
    age: '',
    weight: '',
  });

  // Modal Xem lịch sử khám & lịch hẹn của thú cưng
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Confirm đổi trạng thái Chủ nuôi (UC19, BR-07) hoặc Thú cưng (UC15)
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: 'OWNER', // 'OWNER' | 'PET'
    target: null,
    nextStatus: 'INACTIVE',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ownersRes, petsRes] = await Promise.all([
        receptionistApi.getOwners({
          search: activeTab === 'OWNERS' ? search.trim() : '',
          status: activeTab === 'OWNERS' ? statusFilter : 'ALL',
        }),
        receptionistApi.getPets({
          search: activeTab === 'PETS' ? search.trim() : '',
          ownerId: ownerFilter ? Number(ownerFilter) : undefined,
          status: activeTab === 'PETS' ? statusFilter : 'ALL',
        }),
      ]);
      setOwners(Array.isArray(ownersRes) ? ownersRes : []);
      setPets(Array.isArray(petsRes) ? petsRes : []);
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể tải dữ liệu hồ sơ khách hàng & thú cưng.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, statusFilter, ownerFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== HANDLERS CHỦ NUÔI (UC16, UC17, UC19) ====================
  const openCreateOwner = () => {
    setEditingOwner(null);
    setOwnerForm({ fullName: '', phoneNumber: '', email: '', address: '' });
    setOwnerModalOpen(true);
  };

  const openEditOwner = (owner) => {
    setEditingOwner(owner);
    setOwnerForm({
      fullName: owner.fullName || '',
      phoneNumber: owner.phoneNumber || '',
      email: owner.email || '',
      address: owner.address || '',
    });
    setOwnerModalOpen(true);
  };

  const handleOwnerSubmit = async (e) => {
    e.preventDefault();
    if (!ownerForm.fullName.trim()) {
      setToast({ type: 'error', message: 'Họ tên chủ nuôi không được để trống.' });
      return;
    }
    if (!/^[0-9+()\-\s]{9,15}$/.test(ownerForm.phoneNumber.trim())) {
      setToast({ type: 'error', message: 'Số điện thoại không hợp lệ (9–15 chữ số).' });
      return;
    }
    if (ownerForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerForm.email.trim())) {
      setToast({ type: 'error', message: 'Định dạng Email không hợp lệ.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: ownerForm.fullName.trim(),
        phoneNumber: ownerForm.phoneNumber.trim(),
        email: ownerForm.email.trim() || null,
        address: ownerForm.address.trim() || null,
      };
      if (editingOwner) {
        await receptionistApi.updateOwner(editingOwner.ownerId, payload);
        setToast({
          type: 'success',
          message: `Đã cập nhật hồ sơ chủ nuôi ${payload.fullName}.`,
        });
      } else {
        await receptionistApi.createOwner(payload);
        setToast({
          type: 'success',
          message: `Đã tạo hồ sơ chủ nuôi mới: ${payload.fullName}.`,
        });
      }
      setOwnerModalOpen(false);
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể lưu hồ sơ chủ nuôi.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== HANDLERS THÚ CƯNG (UC13, UC14, UC15) ====================
  const openCreatePet = (preselectedOwnerId = '') => {
    const activeOwners = owners.filter((o) => o.status === 'ACTIVE');
    setEditingPet(null);
    setPetForm({
      ownerId: preselectedOwnerId ? String(preselectedOwnerId) : activeOwners[0]?.ownerId ? String(activeOwners[0].ownerId) : '',
      petName: '',
      species: 'Chó',
      breed: '',
      gender: 'Đực',
      age: '',
      weight: '',
    });
    setPetModalOpen(true);
  };

  const openEditPet = (pet) => {
    setEditingPet(pet);
    setPetForm({
      ownerId: pet.ownerId ? String(pet.ownerId) : '',
      petName: pet.petName || '',
      species: pet.species || 'Chó',
      breed: pet.breed || '',
      gender: pet.gender || 'Đực',
      age: pet.age != null ? String(pet.age) : '',
      weight: pet.weight != null ? String(pet.weight) : '',
    });
    setPetModalOpen(true);
  };

  const handlePetSubmit = async (e) => {
    e.preventDefault();
    if (!petForm.ownerId) {
      setToast({ type: 'error', message: 'Vui lòng chọn chủ nuôi đang hoạt động.' });
      return;
    }
    if (!petForm.petName.trim()) {
      setToast({ type: 'error', message: 'Tên thú cưng không được để trống.' });
      return;
    }
    if (petForm.age !== '' && (Number(petForm.age) < 0 || Number(petForm.age) > 50)) {
      setToast({ type: 'error', message: 'Tuổi thú cưng phải từ 0 đến 50.' });
      return;
    }
    if (petForm.weight !== '' && (Number(petForm.weight) <= 0 || Number(petForm.weight) > 250)) {
      setToast({ type: 'error', message: 'Cân nặng thú cưng phải từ 0.1 đến 250 kg.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ownerId: Number(petForm.ownerId),
        petName: petForm.petName.trim(),
        species: petForm.species,
        breed: petForm.breed.trim() || null,
        gender: petForm.gender,
        age: petForm.age !== '' ? Number(petForm.age) : null,
        weight: petForm.weight !== '' ? Number(petForm.weight) : null,
      };
      if (editingPet) {
        await receptionistApi.updatePet(editingPet.petId, payload);
        setToast({
          type: 'success',
          message: `Đã cập nhật hồ sơ thú cưng ${payload.petName}.`,
        });
      } else {
        await receptionistApi.createPet(payload);
        setToast({
          type: 'success',
          message: `Đã thêm thú cưng ${payload.petName} thành công.`,
        });
      }
      setPetModalOpen(false);
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể lưu hồ sơ thú cưng.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    const { type, target, nextStatus } = confirmState;
    if (!target) return;
    setSubmitting(true);
    try {
      if (type === 'OWNER') {
        await receptionistApi.toggleOwnerStatus(target.ownerId, nextStatus);
        setToast({
          type: 'success',
          message:
            nextStatus === 'INACTIVE'
              ? `Đã vô hiệu hóa chủ nuôi ${target.fullName} và ẩn các thú cưng liên quan khỏi danh sách hoạt động.`
              : `Đã kích hoạt lại chủ nuôi ${target.fullName}.`,
        });
      } else {
        await receptionistApi.togglePetStatus(target.petId, nextStatus);
        setToast({
          type: 'success',
          message:
            nextStatus === 'INACTIVE'
              ? `Đã ngưng hoạt động hồ sơ thú cưng ${target.petName} (vẫn bảo toàn lịch sử bệnh án cũ).`
              : `Đã kích hoạt lại hồ sơ thú cưng ${target.petName}.`,
        });
      }
      setConfirmState({ open: false, type: 'OWNER', target: null, nextStatus: 'INACTIVE' });
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể thay đổi trạng thái hồ sơ.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openPetHistory = async (pet) => {
    setHistoryLoading(true);
    setHistoryData({ pet, medicalRecords: [], appointments: [] });
    try {
      const res = await receptionistApi.getPetHistory(pet.petId);
      setHistoryData(res);
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể tải lịch sử bệnh án của thú cưng.',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const activeOwnersList = owners.filter((o) => o.status === 'ACTIVE');

  return (
    <div>
      <PageHeader
        title="Quản lý Hồ sơ Chủ nuôi & Thú cưng"
        subtitle="Tạo mới, cập nhật thông tin liên hệ chủ nuôi, quản lý danh sách thú cưng và tra cứu lịch sử khám."
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={openCreateOwner}>
              + Thêm Chủ nuôi
            </button>
            <button type="button" className="pcms-btn pcms-btn-primary" onClick={() => openCreatePet()}>
              + Thêm Thú cưng
            </button>
          </div>
        }
      />

      <ToastMessage
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ type: 'info', message: '' })}
      />

      {/* Thanh chuyển Tab + Bộ lọc */}
      <div className="pcms-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`pcms-btn ${activeTab === 'OWNERS' ? 'pcms-btn-primary' : 'pcms-btn-outline'}`}
              onClick={() => setActiveTab('OWNERS')}
            >
              Danh sách Chủ nuôi ({owners.length})
            </button>
            <button
              type="button"
              className={`pcms-btn ${activeTab === 'PETS' ? 'pcms-btn-primary' : 'pcms-btn-outline'}`}
              onClick={() => setActiveTab('PETS')}
            >
              Danh sách Thú cưng ({pets.length})
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label className="pcms-label">Tìm kiếm</label>
            <input
              type="search"
              className="pcms-input"
              placeholder={
                activeTab === 'OWNERS'
                  ? 'Tìm theo tên chủ nuôi, số điện thoại, email...'
                  : 'Tìm theo tên thú cưng, loài, giống, tên/SĐT chủ nuôi...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {activeTab === 'PETS' ? (
            <div>
              <label className="pcms-label">Lọc theo Chủ nuôi</label>
              <select
                className="pcms-select"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              >
                <option value="">Tất cả chủ nuôi</option>
                {owners.map((o) => (
                  <option key={o.ownerId} value={o.ownerId}>
                    {o.fullName} ({o.phoneNumber})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="pcms-label">Trạng thái hoạt động</label>
            <select
              className="pcms-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Đã vô hiệu hóa (INACTIVE)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH CHỦ NUÔI */}
      {activeTab === 'OWNERS' ? (
        <div className="pcms-card">
          <div className="pcms-card-header">
            <div>
              <h2 className="pcms-card-title">Hồ sơ Chủ nuôi ({owners.length})</h2>
              <p className="pcms-card-subtitle">
                Khi vô hiệu hóa hồ sơ chủ nuôi, các thú cưng trực thuộc sẽ tự động ẩn khỏi danh sách hoạt động.
              </p>
            </div>
          </div>

          <div className="pcms-table-wrap">
            <table className="pcms-table">
              <thead>
                <tr>
                  <th>Mã KH</th>
                  <th>Họ và tên Chủ nuôi</th>
                  <th>Số điện thoại & Email</th>
                  <th>Địa chỉ</th>
                  <th>Thú cưng đang nuôi</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="pcms-empty-cell">
                      Đang tải danh sách chủ nuôi...
                    </td>
                  </tr>
                ) : owners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="pcms-empty-cell">
                      Chưa có hồ sơ chủ nuôi nào khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  owners.map((o) => (
                    <tr key={o.ownerId}>
                      <td>
                        <strong>{o.ownerCode}</strong>
                      </td>
                      <td>
                        <strong>{o.fullName}</strong>
                        <div style={{ fontSize: 11, color: 'var(--pcms-text-muted)' }}>
                          {o.hasOnlineAccount ? 'Tài khoản Online' : 'Hồ sơ tạo tại quầy'}
                        </div>
                      </td>
                      <td>
                        <div>{o.phoneNumber}</div>
                        <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>{o.email || 'Chưa có email'}</div>
                      </td>
                      <td style={{ maxWidth: 220 }}>{o.address || '—'}</td>
                      <td>
                        <strong>{o.petCount}</strong> thú cưng hoạt động
                        {o.pets && o.pets.length > 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>
                            {o.pets.map((p) => p.petName).join(', ')}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {o.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            className="pcms-btn pcms-btn-primary pcms-btn-sm"
                            style={{ marginRight: 6 }}
                            onClick={() => openCreatePet(o.ownerId)}
                          >
                            + Thú cưng
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="pcms-btn pcms-btn-outline pcms-btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => openEditOwner(o)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className={`pcms-btn pcms-btn-sm ${
                            o.status === 'ACTIVE' ? 'pcms-btn-danger' : 'pcms-btn-outline'
                          }`}
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              type: 'OWNER',
                              target: o,
                              nextStatus: o.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                            })
                          }
                        >
                          {o.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: DANH SÁCH THÚ CƯNG */
        <div className="pcms-card">
          <div className="pcms-card-header">
            <div>
              <h2 className="pcms-card-title">Hồ sơ Thú cưng ({pets.length})</h2>
              <p className="pcms-card-subtitle">
                Mỗi thú cưng bắt buộc gắn với 1 chủ nuôi đang hoạt động. Hỗ trợ xem toàn bộ lịch sử bệnh án.
              </p>
            </div>
          </div>

          <div className="pcms-table-wrap">
            <table className="pcms-table">
              <thead>
                <tr>
                  <th>Mã Pet</th>
                  <th>Tên thú cưng</th>
                  <th>Loài / Giống / Giới tính</th>
                  <th>Tuổi & Cân nặng</th>
                  <th>Chủ nuôi & SĐT</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="pcms-empty-cell">
                      Đang tải danh sách thú cưng...
                    </td>
                  </tr>
                ) : pets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="pcms-empty-cell">
                      Chưa có hồ sơ thú cưng nào khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  pets.map((p) => (
                    <tr key={p.petId}>
                      <td>
                        <strong>{p.petCode}</strong>
                      </td>
                      <td>
                        <strong>{p.petName}</strong>
                      </td>
                      <td>
                        {p.species} {p.breed ? `• ${p.breed}` : ''} {p.gender ? `(${p.gender})` : ''}
                      </td>
                      <td>
                        <div>Tuổi: {p.age != null ? `${p.age} năm` : '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>
                          Cân nặng: {p.weight != null ? `${p.weight} kg` : '—'}
                        </div>
                      </td>
                      <td>
                        <div>{p.ownerName}</div>
                        <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>{p.ownerPhone}</div>
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="pcms-btn pcms-btn-outline pcms-btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => openPetHistory(p)}
                        >
                          Lịch sử khám
                        </button>
                        <button
                          type="button"
                          className="pcms-btn pcms-btn-outline pcms-btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => openEditPet(p)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className={`pcms-btn pcms-btn-sm ${
                            p.status === 'ACTIVE' ? 'pcms-btn-danger' : 'pcms-btn-outline'
                          }`}
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              type: 'PET',
                              target: p,
                              nextStatus: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                            })
                          }
                        >
                          {p.status === 'ACTIVE' ? 'Ngưng HĐ' : 'Kích hoạt'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tạo / Cập nhật Chủ nuôi */}
      <ModalDialog
        open={ownerModalOpen}
        title={editingOwner ? `Cập nhật Chủ nuôi ${editingOwner.ownerCode}` : 'Tạo hồ sơ Chủ nuôi mới'}
        onClose={() => setOwnerModalOpen(false)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setOwnerModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="owner-form" className="pcms-btn pcms-btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : editingOwner ? 'Lưu cập nhật' : 'Tạo hồ sơ Chủ nuôi'}
            </button>
          </>
        }
      >
        <form id="owner-form" onSubmit={handleOwnerSubmit} className="pcms-form-grid">
          <div className="pcms-form-group">
            <label className="pcms-label">
              Họ và tên Chủ nuôi <span className="pcms-required">*</span>
            </label>
            <input
              type="text"
              className="pcms-input"
              required
              value={ownerForm.fullName}
              onChange={(e) => setOwnerForm((prev) => ({ ...prev, fullName: e.target.value }))}
            />
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">
              Số điện thoại <span className="pcms-required">*</span>
            </label>
            <input
              type="tel"
              className="pcms-input"
              required
              placeholder="0901234567"
              value={ownerForm.phoneNumber}
              onChange={(e) => setOwnerForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
            />
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">Email</label>
            <input
              type="email"
              className="pcms-input"
              placeholder="khachhang@email.com"
              value={ownerForm.email}
              onChange={(e) => setOwnerForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">Địa chỉ</label>
            <input
              type="text"
              className="pcms-input"
              placeholder="Số nhà, đường, quận/huyện..."
              value={ownerForm.address}
              onChange={(e) => setOwnerForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
        </form>
      </ModalDialog>

      {/* Modal Tạo / Cập nhật Thú cưng */}
      <ModalDialog
        open={petModalOpen}
        title={editingPet ? `Cập nhật Thú cưng ${editingPet.petCode}` : 'Thêm hồ sơ Thú cưng mới'}
        onClose={() => setPetModalOpen(false)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setPetModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="pet-form" className="pcms-btn pcms-btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : editingPet ? 'Lưu cập nhật' : 'Thêm Thú cưng'}
            </button>
          </>
        }
      >
        <form id="pet-form" onSubmit={handlePetSubmit} className="pcms-form-grid">
          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">
              Chủ nuôi sở hữu <span className="pcms-required">*</span>
            </label>
            <select
              className="pcms-select"
              required
              value={petForm.ownerId}
              onChange={(e) => setPetForm((prev) => ({ ...prev, ownerId: e.target.value }))}
            >
              <option value="">-- Chọn chủ nuôi đang hoạt động --</option>
              {activeOwnersList.map((o) => (
                <option key={o.ownerId} value={o.ownerId}>
                  {o.fullName} — SĐT: {o.phoneNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">
              Tên thú cưng <span className="pcms-required">*</span>
            </label>
            <input
              type="text"
              className="pcms-input"
              required
              value={petForm.petName}
              onChange={(e) => setPetForm((prev) => ({ ...prev, petName: e.target.value }))}
            />
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">
              Loài <span className="pcms-required">*</span>
            </label>
            <select
              className="pcms-select"
              value={petForm.species}
              onChange={(e) => setPetForm((prev) => ({ ...prev, species: e.target.value }))}
            >
              <option value="Chó">Chó</option>
              <option value="Mèo">Mèo</option>
              <option value="Thỏ">Thỏ</option>
              <option value="Hamster">Hamster</option>
              <option value="Chim">Chim</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">Giống (Breed)</label>
            <input
              type="text"
              className="pcms-input"
              placeholder="Poodle, Corgi, Mèo Anh..."
              value={petForm.breed}
              onChange={(e) => setPetForm((prev) => ({ ...prev, breed: e.target.value }))}
            />
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">Giới tính</label>
            <select
              className="pcms-select"
              value={petForm.gender}
              onChange={(e) => setPetForm((prev) => ({ ...prev, gender: e.target.value }))}
            >
              <option value="Đực">Đực</option>
              <option value="Cái">Cái</option>
              <option value="Chưa rõ">Chưa rõ</option>
            </select>
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">Tuổi (năm)</label>
            <input
              type="number"
              min="0"
              max="50"
              className="pcms-input"
              value={petForm.age}
              onChange={(e) => setPetForm((prev) => ({ ...prev, age: e.target.value }))}
            />
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">Cân nặng (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="250"
              className="pcms-input"
              value={petForm.weight}
              onChange={(e) => setPetForm((prev) => ({ ...prev, weight: e.target.value }))}
            />
          </div>
        </form>
      </ModalDialog>

      {/* Modal Lịch sử bệnh án & lịch hẹn của thú cưng */}
      <ModalDialog
        open={Boolean(historyData)}
        title={`Lịch sử khám & Lịch hẹn — ${historyData?.pet?.petName || ''}`}
        onClose={() => setHistoryData(null)}
        footer={
          <button type="button" className="pcms-btn pcms-btn-primary" onClick={() => setHistoryData(null)}>
            Đóng
          </button>
        }
      >
        {historyLoading ? (
          <p>Đang tải hồ sơ bệnh án...</p>
        ) : (
          <div>
            <div style={{ marginBottom: 14, fontSize: 14 }}>
              <strong>{historyData?.pet?.petName}</strong> ({historyData?.pet?.species}) • Chủ nuôi:{' '}
              <strong>{historyData?.pet?.ownerName}</strong> ({historyData?.pet?.ownerPhone})
            </div>

            <h4 style={{ margin: '12px 0 8px' }}>
              1. Lịch sử Bệnh án ({historyData?.medicalRecords?.length || 0})
            </h4>
            {!historyData?.medicalRecords || historyData.medicalRecords.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--pcms-text-muted)' }}>Chưa có hồ sơ bệnh án nào.</p>
            ) : (
              <div className="pcms-table-wrap" style={{ marginBottom: 16 }}>
                <table className="pcms-table">
                  <thead>
                    <tr>
                      <th>Ngày khám</th>
                      <th>Bác sĩ</th>
                      <th>Triệu chứng</th>
                      <th>Chẩn đoán & Phác đồ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.medicalRecords.map((r) => (
                      <tr key={r.recordId}>
                        <td>{r.visitDate}</td>
                        <td>{r.veterinarianName}</td>
                        <td>{r.symptoms}</td>
                        <td>
                          <strong>{r.diagnosis}</strong>
                          {r.treatmentPlan ? <div>{r.treatmentPlan}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h4 style={{ margin: '12px 0 8px' }}>
              2. Lịch sử Đặt hẹn ({historyData?.appointments?.length || 0})
            </h4>
            {!historyData?.appointments || historyData.appointments.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--pcms-text-muted)' }}>Chưa có lịch hẹn nào.</p>
            ) : (
              <div className="pcms-table-wrap">
                <table className="pcms-table">
                  <thead>
                    <tr>
                      <th>Mã hẹn</th>
                      <th>Thời gian</th>
                      <th>Bác sĩ</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.appointments.map((a) => (
                      <tr key={a.appointmentId}>
                        <td>{a.appointmentCode}</td>
                        <td>{a.appointmentDateTimeDisplay}</td>
                        <td>{a.veterinarianName}</td>
                        <td>
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </ModalDialog>

      {/* Confirm Dialog vô hiệu hóa / kích hoạt */}
      <ConfirmDialog
        open={confirmState.open}
        title={
          confirmState.type === 'OWNER'
            ? confirmState.nextStatus === 'INACTIVE'
              ? 'Vô hiệu hóa hồ sơ Chủ nuôi'
              : 'Kích hoạt lại hồ sơ Chủ nuôi'
            : confirmState.nextStatus === 'INACTIVE'
            ? 'Ngưng hoạt động hồ sơ Thú cưng'
            : 'Kích hoạt lại hồ sơ Thú cưng'
        }
        message={
          confirmState.type === 'OWNER'
            ? confirmState.nextStatus === 'INACTIVE'
              ? `Bạn có chắc chắn muốn vô hiệu hóa hồ sơ chủ nuôi "${confirmState.target?.fullName}"? Toàn bộ thú cưng của chủ nuôi này cũng sẽ được ẩn khỏi danh sách hoạt động.`
              : `Kích hoạt lại hồ sơ chủ nuôi "${confirmState.target?.fullName}"?`
            : confirmState.nextStatus === 'INACTIVE'
            ? `Bạn có chắc chắn muốn ngưng hoạt động thú cưng "${confirmState.target?.petName}"? Toàn bộ lịch sử bệnh án cũ vẫn được bảo toàn.`
            : `Kích hoạt lại hồ sơ thú cưng "${confirmState.target?.petName}"?`
        }
        confirmLabel={confirmState.nextStatus === 'INACTIVE' ? 'Xác nhận vô hiệu hóa' : 'Kích hoạt lại'}
        variant={confirmState.nextStatus === 'INACTIVE' ? 'danger' : 'primary'}
        onCancel={() => setConfirmState({ open: false, type: 'OWNER', target: null, nextStatus: 'INACTIVE' })}
        onConfirm={handleConfirmToggleStatus}
      />
    </div>
  );
}
