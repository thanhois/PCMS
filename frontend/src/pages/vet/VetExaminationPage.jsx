import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import vetApi from '../../api/vetApi';
import { useAuth } from '../../context/AuthContext';
import PetHistoryModal from '../../components/vet/PetHistoryModal';
import PrintableMedicalDocument from '../../components/common/PrintableMedicalDocument';
import '../../styles/vetTheme.css';

export default function VetExaminationPage() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Form chuyên môn
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [petWeight, setPetWeight] = useState('');

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Service Order Modal
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [serviceNotes, setServiceNotes] = useState('');

  // Edit Service Note Modal
  const [editingService, setEditingService] = useState(null);

  // Medicine Prescription Modal
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [medicineQuantity, setMedicineQuantity] = useState(1);
  const [medicineDosage, setMedicineDosage] = useState('Uống 1 viên / lần, ngày 2 lần sau ăn');
  const [medicineNotes, setMedicineNotes] = useState('');
  const [prescriptionInstructions, setPrescriptionInstructions] = useState('');

  // Follow-up Modal
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [followUpType, setFollowUpType] = useState('Tái khám đánh giá đáp ứng thuốc');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const loadCatalogs = async () => {
    try {
      const [services, meds] = await Promise.all([
        vetApi.getAvailableServices(),
        vetApi.getAvailableMedicines(),
      ]);
      const svcList = services || [];
      const medList = meds || [];
      setAvailableServices(svcList);
      setAvailableMedicines(medList);
      if (svcList.length > 0) setSelectedServiceId(svcList[0].serviceId);
      const firstInStock = medList.find((m) => (m.availableStock ?? 0) > 0);
      if (firstInStock) {
        setSelectedMedicineId(firstInStock.medicineId);
      } else if (medList.length > 0) {
        setSelectedMedicineId('');
      }
    } catch (err) {
      console.error('Lỗi tải danh mục:', err);
    }
  };

  const loadRecord = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await vetApi.getMedicalRecordDetail(recordId);
      setRecord(data);
      setSymptoms(data.symptoms || '');
      setDiagnosis(data.diagnosis || '');
      setTreatmentPlan(data.treatmentPlan || '');
      setPetWeight(data.pet?.weight || '');
      if (data.prescription?.instructions) {
        setPrescriptionInstructions(data.prescription.instructions);
      }
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Không thể tải chi tiết bệnh án');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) {
      void Promise.resolve().then(() => {
        loadRecord();
        loadCatalogs();
      });
    }
  }, [recordId]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const extractErr = (err, fallback) =>
    err?.message || err?.response?.data?.message || fallback;

  // Cập nhật thông tin bệnh án (Lâm sàng, Chẩn đoán, Phác đồ)
  const handleSaveRecord = async () => {
    setSaving(true);
    try {
      const updated = await vetApi.updateMedicalRecord(recordId, {
        symptoms,
        diagnosis,
        treatmentPlan,
        weight: petWeight,
      });
      setRecord(updated);
      showToast('Đã lưu thông tin bệnh án thành công!');
    } catch (err) {
      alert(extractErr(err, 'Lỗi khi lưu bệnh án'));
    } finally {
      setSaving(false);
    }
  };

  // Cập nhật cân nặng riêng cho Pet
  const handleUpdateWeight = async () => {
    if (!record?.pet?.petId || !petWeight) return;
    try {
      await vetApi.updatePetVitals(record.pet.petId, { weight: petWeight });
      showToast(`Đã cập nhật cân nặng của bé: ${petWeight} kg`);
    } catch (err) {
      alert(extractErr(err, 'Lỗi cập nhật cân nặng'));
    }
  };

  // Thêm dịch vụ vào y lệnh
  const handleAddService = async (e) => {
    e.preventDefault();
    if (!selectedServiceId) return;
    try {
      const updated = await vetApi.addServiceOrder(recordId, {
        serviceId: selectedServiceId,
        quantity: serviceQuantity,
        notes: serviceNotes,
      });
      setRecord(updated);
      setShowAddServiceModal(false);
      setServiceNotes('');
      setServiceQuantity(1);
      showToast('Đã thêm y lệnh dịch vụ vào bệnh án!');
    } catch (err) {
      alert(extractErr(err, 'Lỗi khi thêm dịch vụ'));
    }
  };

  // Cập nhật kết quả/ghi chú dịch vụ
  const handleUpdateServiceNote = async (e) => {
    e.preventDefault();
    if (!editingService) return;
    try {
      const updated = await vetApi.updateServiceOrder(recordId, editingService.recordDetailId, {
        quantity: editingService.quantity,
        notes: editingService.notes,
      });
      setRecord(updated);
      setEditingService(null);
      showToast('Đã cập nhật kết quả dịch vụ!');
    } catch (err) {
      alert(extractErr(err, 'Lỗi cập nhật dịch vụ'));
    }
  };

  // Xóa dịch vụ khỏi y lệnh
  const handleDeleteService = async (detailId) => {
    if (!window.confirm('Bạn có chắc muốn hủy dịch vụ này khỏi y lệnh?')) return;
    try {
      const updated = await vetApi.deleteServiceOrder(recordId, detailId);
      setRecord(updated);
      showToast('Đã hủy dịch vụ khỏi y lệnh');
    } catch (err) {
      alert(extractErr(err, 'Lỗi xóa dịch vụ'));
    }
  };

  // Thêm thuốc vào đơn
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!selectedMedicineId) {
      alert('Vui lòng chọn thuốc còn tồn kho khả dụng.');
      return;
    }
    try {
      const currentMeds = record?.prescription?.medicines || [];
      const medItem = availableMedicines.find((m) => m.medicineId === Number(selectedMedicineId));
      const available = medItem?.availableStock ?? 0;
      const alreadyPrescribedQty = currentMeds
        .filter((m) => m.medicineId === Number(selectedMedicineId))
        .reduce((sum, m) => sum + Number(m.quantity || 0), 0);

      if (available <= 0) {
        alert(`Thuốc "${medItem?.medicineName || ''}" hiện có tồn kho khả dụng bằng 0, không thể kê đơn.`);
        return;
      }
      if (alreadyPrescribedQty + Number(medicineQuantity) > available) {
        alert(
          `Tổng số lượng kê (${alreadyPrescribedQty + Number(medicineQuantity)}) vượt quá tồn kho khả dụng (${available} ${medItem?.unit || ''}).`
        );
        return;
      }

      const updatedItems = [
        ...currentMeds.map((m) => ({
          medicineId: m.medicineId,
          quantity: m.quantity,
          dosage: m.dosage,
          notes: m.notes,
        })),
        {
          medicineId: Number(selectedMedicineId),
          quantity: Number(medicineQuantity),
          dosage: medicineDosage,
          notes: medicineNotes,
        },
      ];

      const updated = await vetApi.savePrescription(recordId, {
        instructions: prescriptionInstructions,
        items: updatedItems,
      });
      setRecord(updated);
      setShowAddMedicineModal(false);
      setMedicineNotes('');
      setMedicineQuantity(1);
      loadCatalogs();
      showToast(`Đã thêm thuốc ${medItem?.medicineName || ''} vào đơn`);
    } catch (err) {
      alert(extractErr(err, 'Lỗi khi kê thuốc'));
    }
  };

  // Xóa một dòng thuốc khỏi đơn
  const handleDeleteMedicine = async (detailId) => {
    if (!window.confirm('Bạn có chắc muốn xóa loại thuốc này khỏi đơn?')) return;
    try {
      const currentMeds = record?.prescription?.medicines || [];
      const updatedItems = currentMeds
        .filter((m) => m.prescriptionDetailId !== detailId)
        .map((m) => ({
          medicineId: m.medicineId,
          quantity: m.quantity,
          dosage: m.dosage,
          notes: m.notes,
        }));

      const updated = await vetApi.savePrescription(recordId, {
        instructions: prescriptionInstructions,
        items: updatedItems,
      });
      setRecord(updated);
      loadCatalogs();
      showToast('Đã xóa thuốc khỏi đơn');
    } catch (err) {
      alert(extractErr(err, 'Lỗi khi xóa thuốc'));
    }
  };

  // Lưu lời dặn chung đơn thuốc
  const handleSavePrescriptionInstructions = async () => {
    try {
      const currentMeds = record?.prescription?.medicines || [];
      const updatedItems = currentMeds.map((m) => ({
        medicineId: m.medicineId,
        quantity: m.quantity,
        dosage: m.dosage,
        notes: m.notes,
      }));

      const updated = await vetApi.savePrescription(recordId, {
        instructions: prescriptionInstructions,
        items: updatedItems,
      });
      setRecord(updated);
      showToast('Đã lưu lời dặn đơn thuốc!');
    } catch (err) {
      alert(extractErr(err, 'Lỗi lưu đơn thuốc'));
    }
  };

  // Thêm lịch tái khám
  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpDate) return;
    try {
      const updated = await vetApi.createFollowUp(recordId, {
        followUpDate,
        followUpType,
        notes: followUpNotes,
      });
      setRecord(updated);
      setShowFollowUpModal(false);
      setFollowUpNotes('');
      showToast('Đã lên lịch hẹn tái khám thành công!');
    } catch (err) {
      alert(extractErr(err, 'Lỗi tạo lịch tái khám'));
    }
  };

  // Xóa lịch tái khám
  const handleDeleteFollowUp = async (fId) => {
    if (!window.confirm('Bạn có muốn hủy lịch tái khám này?')) return;
    try {
      const updated = await vetApi.deleteFollowUp(fId);
      setRecord(updated);
      showToast('Đã hủy lịch tái khám');
    } catch (err) {
      alert(extractErr(err, 'Lỗi xóa lịch tái khám'));
    }
  };

  // Hoàn thành ca khám & Chốt bệnh án
  const handleCompleteRecord = async () => {
    if (!diagnosis || diagnosis.trim().length < 3) {
      alert('Vui lòng nhập chẩn đoán xác định trước khi hoàn tất ca khám.');
      return;
    }

    if (!window.confirm('Xác nhận HOÀN THÀNH ca khám & chốt bệnh án? Sau khi hoàn tất, bệnh án sẽ khóa chỉ đọc và chuyển sang bộ phận thu ngân.')) {
      return;
    }

    setSaving(true);
    try {
      const updated = await vetApi.completeMedicalRecord(recordId, {
        diagnosis,
        treatmentPlan,
      });
      setRecord(updated);
      showToast('Đã hoàn tất ca khám & chốt bệnh án thành công!');
    } catch (err) {
      alert(extractErr(err, 'Lỗi khi hoàn tất ca khám'));
    } finally {
      setSaving(false);
    }
  };

  // Hủy ca bệnh án
  const handleConfirmCancelRecord = async () => {
    if (!cancelReason) {
      alert('Vui lòng nhập lý do hủy ca khám');
      return;
    }
    setSaving(true);
    try {
      const updated = await vetApi.cancelMedicalRecord(recordId, { reason: cancelReason });
      setRecord(updated);
      setShowCancelModal(false);
      showToast('Đã hủy ca khám thành công');
    } catch (err) {
      alert(extractErr(err, 'Lỗi khi hủy ca khám'));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#6320ee' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Đang mở Phòng khám lâm sàng...</h3>
        <p style={{ color: '#64748b' }}>Đang nạp thông tin thú cưng & hồ sơ bệnh án #{recordId}</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="vet-card" style={{ padding: 40, textAlign: 'center' }}>
        <h3 style={{ color: '#0f172a', fontWeight: 700 }}>{error || 'Không tìm thấy bệnh án'}</h3>
        <Link to="/vet/workbench" className="vet-btn vet-btn-primary" style={{ marginTop: 16 }}>
          Quay về Ca khám hôm nay
        </Link>
      </div>
    );
  }

  const pet = record.pet || {};
  const owner = record.owner || {};
  const isCompleted = record.status === 'COMPLETED';
  const isCancelled = record.status === 'CANCELLED';
  const isVet = user?.role === 'VETERINARIAN';
  const invoiceStatusUpper = (record.invoice?.status || '').toUpperCase();
  const isInvoiceLocked = invoiceStatusUpper === 'PAID' || invoiceStatusUpper === 'VOID' || invoiceStatusUpper === 'VOIDED';
  const isReadOnly = record.status !== 'IN_PROGRESS' || isInvoiceLocked || !isVet;
  const canManageFollowUp = isVet && !isCancelled && !isReadOnly;

  const services = record.services || [];
  const medicines = record.prescription?.medicines || [];
  const followUps = record.followUps || [];
  const selectedMedicineObj = availableMedicines.find((m) => m.medicineId === Number(selectedMedicineId));

  return (
    <div>
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: 'linear-gradient(90deg, #611eee 0%, #4a15bc 100%)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            animation: 'vetModalIn 0.25s ease-out',
          }}
        >
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Breadcrumb & Status Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="vet-btn vet-btn-outline vet-btn-sm"
            onClick={() => navigate('/vet/workbench')}
          >
            Danh sách ca khám
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            Phòng Khám Lâm Sàng • Ca Bệnh #MR-{record.recordId}
          </h2>
          {isCompleted ? (
            <span className="vet-badge vet-badge-completed">
              Đã hoàn tất & Đóng bệnh án
            </span>
          ) : isCancelled ? (
            <span className="vet-badge vet-badge-cancelled">
              Ca đã hủy
            </span>
          ) : (
            <span className="vet-badge vet-badge-in-progress">
              <span className="vet-pulse-dot"></span> Đang khám & chẩn đoán
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="vet-btn vet-btn-outline vet-btn-sm"
            onClick={() => setShowPrintModal(true)}
          >
            In Phiếu Khám & Đơn Thuốc
          </button>
          {!isReadOnly && (
            <button
              type="button"
              className="vet-btn vet-btn-outline vet-btn-sm"
              style={{ color: '#ef4444' }}
              onClick={() => setShowCancelModal(true)}
            >
              Hủy ca
            </button>
          )}
        </div>
      </div>

      {/* Read-only lock banner (BR-13, BR-15, BR-18) */}
      {isReadOnly && (
        <div
          style={{
            marginBottom: 18,
            padding: '12px 16px',
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {!isVet
            ? 'Chế độ chỉ đọc: Quản trị viên không được phép chỉnh sửa nội dung chuyên môn lâm sàng trong bệnh án.'
            : isCompleted
            ? 'Bệnh án đã hoàn tất: Hồ sơ lâm sàng, dịch vụ và đơn thuốc đã khóa chỉ đọc.'
            : isCancelled
            ? 'Bệnh án đã hủy: Hồ sơ lâm sàng đã khóa chỉ đọc.'
            : `Hóa đơn ở trạng thái ${invoiceStatusUpper}: Hồ sơ chi phí và bệnh án đã khóa chỉ đọc.`}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="vet-exam-layout">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card Thú cưng */}
          <div className="vet-card">
            <div className="vet-card-header">
              <h4 className="vet-card-title">Thông Tin Thú Cưng</h4>
            </div>
            <div className="vet-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: '#ede9fe',
                    color: '#6320ee',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  {(pet.petName || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{pet.petName}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>
                    {pet.species} • {pet.breed}
                  </div>
                  <div style={{ fontSize: 12, color: '#5218cc', fontWeight: 600 }}>
                    {pet.gender} • Ngày sinh: {pet.dateOfBirth || 'Không rõ'}
                  </div>
                </div>
              </div>

              {/* Cập nhật cân nặng tức thì */}
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  Cân nặng hiện tại (kg):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    step="0.05"
                    className="vet-input"
                    style={{ fontWeight: 700, fontSize: 14 }}
                    value={petWeight}
                    disabled={isReadOnly}
                    onChange={(e) => setPetWeight(e.target.value)}
                    placeholder="VD: 11.5"
                  />
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="vet-btn vet-btn-primary vet-btn-sm"
                      onClick={handleUpdateWeight}
                      title="Lưu cân nặng của bé"
                    >
                      Lưu
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="vet-btn vet-btn-outline"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowHistoryModal(true)}
              >
                Xem Bệnh Sử & Đơn Thuốc Cũ
              </button>
            </div>
          </div>

          {/* Card Chủ nuôi */}
          <div className="vet-card">
            <div className="vet-card-header">
              <h4 className="vet-card-title">Thông Tin Chủ Nuôi</h4>
            </div>
            <div className="vet-card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div>Họ tên: <strong>{owner.fullName || 'Chưa có thông tin'}</strong></div>
              <div style={{ marginTop: 4 }}>
                SĐT: <strong style={{ color: '#6320ee' }}>{owner.phoneNumber || 'N/A'}</strong>
              </div>
              {owner.email && (
                <div style={{ marginTop: 4 }}>
                  Email: <span>{owner.email}</span>
                </div>
              )}
              {owner.address && (
                <div style={{ marginTop: 4, color: '#64748b' }}>
                  Địa chỉ: <span>{owner.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Viện phí tạm tính Card */}
          <div className="vet-card" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd' }}>
            <div className="vet-card-body">
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5218cc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                TỔNG VIỆN PHÍ TẠM TÍNH
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#6320ee', marginBottom: 10 }}>
                {formatCurrency(record.grandTotal)}
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                <div>• Tiền dịch vụ & xét nghiệm: <strong>{formatCurrency(record.totalServicesAmount)}</strong></div>
                <div>• Tiền thuốc điều trị: <strong>{formatCurrency(record.totalMedicineAmount)}</strong></div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}>
                Hóa đơn tự động đồng bộ sang quầy thu ngân khi có dịch vụ hoặc đơn thuốc phát sinh.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* SECTION 1: KHÁM LÂM SÀNG & CHẨN ĐOÁN */}
          <div className="vet-card">
            <div className="vet-card-header">
              <h4 className="vet-card-title">
                1. Khám Lâm Sàng, Chẩn Đoán & Phác Đồ Điều Trị
              </h4>
              {!isReadOnly && (
                <button
                  type="button"
                  className="vet-btn vet-btn-primary vet-btn-sm"
                  disabled={saving}
                  onClick={handleSaveRecord}
                >
                  {saving ? 'Đang lưu...' : 'Lưu Lâm Sàng'}
                </button>
              )}
            </div>
            <div className="vet-card-body">
              <div className="vet-form-group">
                <label className="vet-form-label">
                  Triệu chứng lâm sàng ghi nhận (Nhiệt độ, niêm mạc, tình trạng chung):
                </label>
                <textarea
                  className="vet-textarea"
                  rows={3}
                  disabled={isReadOnly}
                  placeholder="Ví dụ: Bé sốt nhẹ 39.2°C, nôn dịch vàng, niêm mạc nhợt, ấn đau vùng thượng vị..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              <div className="vet-form-group">
                <label className="vet-form-label">
                  Chẩn đoán xác định bệnh (Diagnosis): <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="vet-input"
                  disabled={isReadOnly}
                  style={{ fontWeight: 700, color: '#5218cc', fontSize: 14 }}
                  placeholder="Ví dụ: Viêm dạ dày ruột cấp tính / Dị vật đường ruột..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <div className="vet-form-group" style={{ marginBottom: 0 }}>
                <label className="vet-form-label">
                  Phác đồ điều trị & Lời dặn chuyên môn:
                </label>
                <textarea
                  className="vet-textarea"
                  rows={3}
                  disabled={isReadOnly}
                  placeholder="Ví dụ: 1. Truyền bù nước Ringer Lactate 200ml. 2. Kháng sinh và men tiêu hóa 5 ngày..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CHỈ ĐỊNH DỊCH VỤ / Y LỆNH CẬN LÂM SÀNG */}
          <div className="vet-card">
            <div className="vet-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h4 className="vet-card-title">
                  2. Y Lệnh Dịch Vụ & Xét Nghiệm Cận Lâm Sàng ({services.length})
                </h4>
                <span style={{ fontSize: 12, color: '#5218cc', background: '#ede9fe', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                  {formatCurrency(record.totalServicesAmount)}
                </span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  className="vet-btn vet-btn-primary vet-btn-sm"
                  onClick={() => setShowAddServiceModal(true)}
                >
                  Chỉ định Dịch vụ mới
                </button>
              )}
            </div>

            {services.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: 13 }}>Chưa có y lệnh dịch vụ cận lâm sàng nào.</p>
                {!isReadOnly && (
                  <button
                    type="button"
                    className="vet-btn vet-btn-outline vet-btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => setShowAddServiceModal(true)}
                  >
                    Thêm Siêu âm / Xét nghiệm / X-Quang...
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="vet-table">
                  <thead>
                    <tr>
                      <th>Tên Dịch Vụ / Thủ Thuật</th>
                      <th style={{ width: 120 }}>Đơn giá</th>
                      <th style={{ width: 80, textAlign: 'center' }}>SL</th>
                      <th style={{ width: 130 }}>Thành tiền</th>
                      <th>Kết quả / Ghi chú kỹ thuật</th>
                      {!isReadOnly && <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.recordDetailId}>
                        <td style={{ fontWeight: 600 }}>{s.serviceName}</td>
                        <td style={{ color: '#475569' }}>{formatCurrency(s.unitPrice)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.quantity}</td>
                        <td style={{ fontWeight: 700, color: '#6320ee' }}>{formatCurrency(s.subTotal)}</td>
                        <td>
                          <div style={{ fontSize: 12.5, color: '#334155' }}>
                            {s.notes || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có ghi chú</span>}
                          </div>
                        </td>
                        {!isReadOnly && (
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="vet-btn vet-btn-outline vet-btn-sm"
                                title="Cập nhật kết quả/ghi chú"
                                onClick={() => setEditingService(s)}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                className="vet-btn vet-btn-outline vet-btn-sm"
                                style={{ color: '#ef4444' }}
                                title="Hủy y lệnh dịch vụ này"
                                onClick={() => handleDeleteService(s.recordDetailId)}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 3: KÊ ĐƠN THUỐC ĐIỆN TỬ */}
          <div className="vet-card">
            <div className="vet-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h4 className="vet-card-title">
                  3. Đơn Thuốc Điều Trị Điện Tử ({medicines.length} loại)
                </h4>
                <span style={{ fontSize: 12, color: '#5218cc', background: '#ede9fe', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                  {formatCurrency(record.totalMedicineAmount)}
                </span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  className="vet-btn vet-btn-primary vet-btn-sm"
                  onClick={() => setShowAddMedicineModal(true)}
                >
                  Kê thêm thuốc vào đơn
                </button>
              )}
            </div>

            {medicines.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: 13 }}>Đơn thuốc đang trống. Hãy chọn thuốc từ kho dược.</p>
                {!isReadOnly && (
                  <button
                    type="button"
                    className="vet-btn vet-btn-outline vet-btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => setShowAddMedicineModal(true)}
                  >
                    Chọn thuốc từ kho
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="vet-table">
                  <thead>
                    <tr>
                      <th>Tên thuốc</th>
                      <th style={{ width: 110 }}>Đơn giá</th>
                      <th style={{ width: 80, textAlign: 'center' }}>SL</th>
                      <th style={{ width: 120 }}>Thành tiền</th>
                      <th>Liều dùng & Hướng dẫn uống</th>
                      {!isReadOnly && <th style={{ width: 70, textAlign: 'center' }}>Xóa</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((m) => (
                      <tr key={m.prescriptionDetailId}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.medicineName}</div>
                          <div style={{ fontSize: 11.5, color: '#64748b' }}>ĐVT: {m.unit}</div>
                        </td>
                        <td>{formatCurrency(m.unitPrice)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.quantity}</td>
                        <td style={{ fontWeight: 700, color: '#6320ee' }}>{formatCurrency(m.subTotal)}</td>
                        <td>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#5218cc' }}>
                            {m.dosage}
                          </div>
                          {m.notes && <div style={{ fontSize: 11.5, color: '#64748b' }}>{m.notes}</div>}
                        </td>
                        {!isReadOnly && (
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="vet-btn vet-btn-outline vet-btn-sm"
                              style={{ color: '#ef4444' }}
                              title="Xóa thuốc khỏi đơn"
                              onClick={() => handleDeleteMedicine(m.prescriptionDetailId)}
                            >
                              Xóa
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Lời dặn chung đơn thuốc */}
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="vet-form-label" style={{ margin: 0 }}>
                  Lời dặn chung của Bác sĩ khi dùng thuốc tại nhà:
                </label>
                {!isReadOnly && (
                  <button
                    type="button"
                    className="vet-btn vet-btn-outline vet-btn-sm"
                    onClick={handleSavePrescriptionInstructions}
                  >
                    Lưu lời dặn
                  </button>
                )}
              </div>
              <textarea
                className="vet-textarea"
                rows={2}
                disabled={isReadOnly}
                placeholder="Ví dụ: Cho uống sau khi ăn 30 phút. Không cho gặm xương cứng trong thời gian uống thuốc..."
                value={prescriptionInstructions}
                onChange={(e) => setPrescriptionInstructions(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 4: HẸN NGÀY TÁI KHÁM (FOLLOW-UP) */}
          <div className="vet-card">
            <div className="vet-card-header">
              <h4 className="vet-card-title">
                4. Kế Hoạch & Lịch Hẹn Tái Khám ({followUps.length})
              </h4>
              {canManageFollowUp && (
                <button
                  type="button"
                  className="vet-btn vet-btn-primary vet-btn-sm"
                  onClick={() => setShowFollowUpModal(true)}
                >
                  Đặt lịch tái khám
                </button>
              )}
            </div>
            <div className="vet-card-body">
              {followUps.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Chưa có lịch hẹn tái khám.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {followUps.map((f) => (
                    <div
                      key={f.followUpId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: '#f5f3ff',
                        border: '1px solid #ede9fe',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                          Hẹn tái khám: <strong>{f.followUpDate}</strong> • {f.followUpType}
                        </div>
                        {f.notes && <div style={{ fontSize: 12, color: '#475569' }}>Ghi chú: {f.notes}</div>}
                      </div>
                      {canManageFollowUp && (
                        <button
                          type="button"
                          className="vet-btn vet-btn-outline vet-btn-sm"
                          style={{ color: '#ef4444' }}
                          title="Hủy lịch hẹn tái khám"
                          onClick={() => handleDeleteFollowUp(f.followUpId)}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: ACTION BAR CUỐI TRANG */}
          <div
            className="vet-card"
            style={{
              padding: '18px 24px',
              background: '#ffffff',
              border: '2px solid #6320ee',
              boxShadow: '0 10px 25px rgba(99, 32, 238, 0.12)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5218cc', textTransform: 'uppercase' }}>
                Tổng Chi Phí Đợt Khám (Viện phí + Dược phẩm):
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#6320ee' }}>
                {formatCurrency(record.grandTotal)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {!isReadOnly && (
                <button
                  type="button"
                  className="vet-btn vet-btn-outline"
                  disabled={saving}
                  onClick={handleSaveRecord}
                >
                  Lưu cập nhật
                </button>
              )}

              <button
                type="button"
                className="vet-btn vet-btn-outline"
                onClick={() => setShowPrintModal(true)}
              >
                In Phiếu & Đơn
              </button>

              {!isReadOnly ? (
                <button
                  type="button"
                  className="vet-btn vet-btn-success"
                  style={{ padding: '10px 22px', fontSize: 14 }}
                  disabled={saving}
                  onClick={handleCompleteRecord}
                >
                  Hoàn tất Khám & Chốt Bệnh Án
                </button>
              ) : (
                <div
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: isCompleted ? '#dcfce7' : '#e0e7ff',
                    color: isCompleted ? '#166534' : '#3730a3',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: isCompleted ? '1px solid #bbf7d0' : '1px solid #c7d2fe',
                  }}
                >
                  {isCompleted
                    ? '✓ Bệnh án đã hoàn tất & đóng ca'
                    : isInvoiceLocked
                    ? `✓ Hóa đơn đã ${invoiceStatusUpper === 'PAID' ? 'thanh toán (PAID)' : invoiceStatusUpper} - Bệnh án đã khóa`
                    : 'Chế độ chỉ đọc'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showHistoryModal && (
        <PetHistoryModal
          petId={pet.petId}
          petName={pet.petName}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {showPrintModal && (
        <PrintableMedicalDocument
          record={record}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Modal Thêm Dịch Vụ Mới */}
      {showAddServiceModal && !isReadOnly && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 500 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Chỉ Định Y Lệnh Dịch Vụ Mới
              </h3>
              <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={() => setShowAddServiceModal(false)}>
                Đóng
              </button>
            </div>
            <form onSubmit={handleAddService}>
              <div className="vet-modal-body">
                <div className="vet-form-group">
                  <label className="vet-form-label">Chọn Dịch Vụ / Xét Nghiệm:</label>
                  <select
                    className="vet-select"
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    required
                  >
                    {availableServices.map((s) => (
                      <option key={s.serviceId} value={s.serviceId}>
                        {s.serviceName} ({formatCurrency(s.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Số lượng thực hiện:</label>
                  <input
                    type="number"
                    min={1}
                    className="vet-input"
                    value={serviceQuantity}
                    onChange={(e) => setServiceQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Ghi chú lâm sàng / Chỉ định kỹ thuật:</label>
                  <textarea
                    className="vet-textarea"
                    rows={3}
                    placeholder="Ví dụ: Siêu âm khảo sát bàng quang và gan; hoặc Khám kiểm tra tai..."
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="vet-modal-footer">
                <button type="button" className="vet-btn vet-btn-outline" onClick={() => setShowAddServiceModal(false)}>
                  Đóng
                </button>
                <button type="submit" className="vet-btn vet-btn-primary">
                  Thêm vào Y Lệnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa Kết Quả / Ghi Chú Dịch Vụ */}
      {editingService && !isReadOnly && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 480 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Cập Nhật Kết Quả: {editingService.serviceName}
              </h3>
              <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={() => setEditingService(null)}>
                Đóng
              </button>
            </div>
            <form onSubmit={handleUpdateServiceNote}>
              <div className="vet-modal-body">
                <div className="vet-form-group">
                  <label className="vet-form-label">Số lượng:</label>
                  <input
                    type="number"
                    min={1}
                    className="vet-input"
                    value={editingService.quantity}
                    onChange={(e) => setEditingService({ ...editingService, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="vet-form-group">
                  <label className="vet-form-label">Kết quả xét nghiệm / Ghi chú kỹ thuật:</label>
                  <textarea
                    className="vet-textarea"
                    rows={4}
                    placeholder="Nhập kết quả xét nghiệm, siêu âm, hoặc ghi chú kỹ thuật..."
                    value={editingService.notes}
                    onChange={(e) => setEditingService({ ...editingService, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="vet-modal-footer">
                <button type="button" className="vet-btn vet-btn-outline" onClick={() => setEditingService(null)}>
                  Hủy
                </button>
                <button type="submit" className="vet-btn vet-btn-primary">
                  Cập nhật kết quả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kê Thuốc Mới */}
      {showAddMedicineModal && !isReadOnly && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 520 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Kê Thuốc Vào Đơn Điện Tử
              </h3>
              <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={() => setShowAddMedicineModal(false)}>
                Đóng
              </button>
            </div>
            <form onSubmit={handleAddMedicine}>
              <div className="vet-modal-body">
                <div className="vet-form-group">
                  <label className="vet-form-label">Chọn Thuốc Từ Kho Dược (Chỉ cho phép thuốc còn tồn kho khả dụng):</label>
                  <select
                    className="vet-select"
                    value={selectedMedicineId}
                    onChange={(e) => setSelectedMedicineId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn thuốc còn tồn kho --</option>
                    {availableMedicines.map((m) => {
                      const stock = m.availableStock ?? 0;
                      return (
                        <option key={m.medicineId} value={m.medicineId} disabled={stock <= 0}>
                          {m.medicineName} ({formatCurrency(m.unitPrice)} / {m.unit}) —{' '}
                          {stock > 0 ? `Tồn khả dụng: ${stock} ${m.unit}` : 'Hết hàng (0)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">
                    Số lượng kê {selectedMedicineObj ? `(Tối đa ${selectedMedicineObj.availableStock ?? 0} ${selectedMedicineObj.unit})` : ''}:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedMedicineObj?.availableStock || undefined}
                    className="vet-input"
                    value={medicineQuantity}
                    onChange={(e) => setMedicineQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Liều dùng & Cách dùng chi tiết:</label>
                  <textarea
                    className="vet-textarea"
                    rows={2}
                    placeholder="Ví dụ: Uống 1 viên / lần, ngày 2 lần (sáng - chiều) sau ăn"
                    value={medicineDosage}
                    onChange={(e) => setMedicineDosage(e.target.value)}
                    required
                  />
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Ghi chú riêng cho loại thuốc này:</label>
                  <input
                    type="text"
                    className="vet-input"
                    placeholder="Ví dụ: Uống đủ 5 ngày, không bỏ cữ..."
                    value={medicineNotes}
                    onChange={(e) => setMedicineNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="vet-modal-footer">
                <button type="button" className="vet-btn vet-btn-outline" onClick={() => setShowAddMedicineModal(false)}>
                  Đóng
                </button>
                <button
                  type="submit"
                  className="vet-btn vet-btn-primary"
                  disabled={!selectedMedicineId || (selectedMedicineObj?.availableStock ?? 0) <= 0}
                >
                  Thêm vào Đơn Thuốc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đặt Lịch Tái Khám */}
      {showFollowUpModal && canManageFollowUp && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 460 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Đặt Lịch Tái Khám Cho Bé
              </h3>
              <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={() => setShowFollowUpModal(false)}>
                Đóng
              </button>
            </div>
            <form onSubmit={handleAddFollowUp}>
              <div className="vet-modal-body">
                <div className="vet-form-group">
                  <label className="vet-form-label">Ngày hẹn tái khám:</label>
                  <input
                    type="date"
                    className="vet-input"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    required
                  />
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Loại tái khám:</label>
                  <select
                    className="vet-select"
                    value={followUpType}
                    onChange={(e) => setFollowUpType(e.target.value)}
                  >
                    <option value="Tái khám đánh giá đáp ứng thuốc">Tái khám đánh giá đáp ứng thuốc</option>
                    <option value="Cắt chỉ sau phẫu thuật">Cắt chỉ sau phẫu thuật</option>
                    <option value="Tiêm nhắc vắc-xin mũi tiếp theo">Tiêm nhắc vắc-xin mũi tiếp theo</option>
                    <option value="Kiểm tra lại sau kháng sinh">Kiểm tra lại sau kháng sinh</option>
                    <option value="Tái khám định kỳ">Tái khám định kỳ</option>
                  </select>
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Ghi chú & Hướng dẫn cho chủ nuôi:</label>
                  <textarea
                    className="vet-textarea"
                    rows={3}
                    placeholder="Ví dụ: Mang theo mẫu phân; Nhịn ăn trước 6 tiếng nếu làm lại siêu âm..."
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="vet-modal-footer">
                <button type="button" className="vet-btn vet-btn-outline" onClick={() => setShowFollowUpModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="vet-btn vet-btn-primary">
                  Lưu Lịch Tái Khám
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hủy Ca Khám */}
      {showCancelModal && !isReadOnly && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 440 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#b91c1c' }}>
                Hủy Ca Khám #{record.recordId}
              </h3>
            </div>
            <div className="vet-modal-body">
              <div className="vet-form-group">
                <label className="vet-form-label">Lý do hủy:</label>
                <textarea
                  className="vet-textarea"
                  rows={3}
                  placeholder="Nhập lý do chuyên môn hoặc yêu cầu từ phía khách hàng..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            <div className="vet-modal-footer">
              <button type="button" className="vet-btn vet-btn-outline" onClick={() => setShowCancelModal(false)}>
                Quay lại
              </button>
              <button type="button" className="vet-btn vet-btn-danger" onClick={handleConfirmCancelRecord}>
                Xác nhận Hủy Ca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
