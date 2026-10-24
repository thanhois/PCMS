import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Dog,
  Edit2,
  Eye,
  FileCheck,
  FileText,
  Pill,
  Plus,
  Printer,
  Save,
  Scale,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import vetApi from '../../api/vetApi';
import PetHistoryModal from '../../components/vet/PetHistoryModal';
import PrintableMedicalDocument from '../../components/common/PrintableMedicalDocument';
import '../../styles/vetTheme.css';

export default function VetExaminationPage() {
  const { recordId } = useParams();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (recordId) {
      loadRecord();
      loadCatalogs();
    }
  }, [recordId]);

  const loadCatalogs = async () => {
    try {
      const [services, meds] = await Promise.all([
        vetApi.getAvailableServices(),
        vetApi.getAvailableMedicines(),
      ]);
      setAvailableServices(services || []);
      setAvailableMedicines(meds || []);
      if (services?.length > 0) setSelectedServiceId(services[0].serviceId);
      if (meds?.length > 0) setSelectedMedicineId(meds[0].medicineId);
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
      setError(err?.response?.data?.message || 'Không thể tải chi tiết bệnh án');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

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
      alert(err?.response?.data?.message || 'Lỗi khi lưu bệnh án');
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
      alert(err?.response?.data?.message || 'Lỗi cập nhật cân nặng');
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
      alert(err?.response?.data?.message || 'Lỗi khi thêm dịch vụ');
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
      alert(err?.response?.data?.message || 'Lỗi cập nhật dịch vụ');
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
      alert(err?.response?.data?.message || 'Lỗi xóa dịch vụ');
    }
  };

  // Thêm thuốc vào đơn
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!selectedMedicineId) return;
    try {
      const currentMeds = record?.prescription?.medicines || [];
      const medItem = availableMedicines.find((m) => m.medicineId === Number(selectedMedicineId));

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
      showToast(`Đã thêm thuốc ${medItem?.medicineName || ''} vào đơn`);
    } catch (err) {
      alert(err?.response?.data?.message || 'Lỗi khi kê thuốc');
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
      showToast('Đã xóa thuốc khỏi đơn');
    } catch (err) {
      alert(err?.response?.data?.message || 'Lỗi khi xóa thuốc');
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
      alert(err?.response?.data?.message || 'Lỗi lưu đơn thuốc');
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
      alert(err?.response?.data?.message || 'Lỗi tạo lịch tái khám');
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
      alert(err?.response?.data?.message || 'Lỗi xóa lịch tái khám');
    }
  };

  // Hoàn thành ca khám & Chốt bệnh án
  const handleCompleteRecord = async () => {
    if (!diagnosis || diagnosis.trim().length < 3) {
      alert('Vui lòng nhập chẩn đoán xác định trước khi hoàn tất ca khám.');
      return;
    }

    if (!window.confirm('Xác nhận HOÀN THÀNH ca khám & chốt bệnh án? Dữ liệu chi phí sẽ được chuyển sang bộ phận thu ngân.')) {
      return;
    }

    setSaving(true);
    try {
      const updated = await vetApi.completeMedicalRecord(recordId, {
        diagnosis,
        treatmentPlan,
      });
      setRecord(updated);
      showToast('🎉 Đã hoàn tất ca khám & chốt bệnh án thành công!');
    } catch (err) {
      alert(err?.response?.data?.message || 'Lỗi khi hoàn tất ca khám');
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
      alert(err?.response?.data?.message || 'Lỗi khi hủy ca khám');
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
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#0d9488' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🩺</div>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Đang mở Phòng khám lâm sàng...</h3>
        <p style={{ color: '#64748b' }}>Đang nạp thông tin thú cưng & hồ sơ bệnh án #{recordId}</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="vet-card" style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 12 }} />
        <h3 style={{ color: '#0f172a', fontWeight: 700 }}>{error || 'Không tìm thấy bệnh án'}</h3>
        <Link to="/vet/workbench" className="vet-btn vet-btn-primary" style={{ marginTop: 16 }}>
          <ArrowLeft size={16} /> Quay về Ca khám hôm nay
        </Link>
      </div>
    );
  }

  const pet = record.pet || {};
  const owner = record.owner || {};
  const vet = record.veterinarian || {};
  const isCompleted = record.status === 'COMPLETED';
  const isCancelled = record.status === 'CANCELLED';
  const services = record.services || [];
  const medicines = record.prescription?.medicines || [];
  const followUps = record.followUps || [];

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
            background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
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
          <CheckCircle2 size={20} color="#a7f3d0" />
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
            <ArrowLeft size={16} /> Danh sách ca khám
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            Phòng Khám Lâm Sàng • Ca Bệnh #MR-{record.recordId}
          </h2>
          {isCompleted ? (
            <span className="vet-badge vet-badge-completed">
              <CheckCircle2 size={13} /> Đã hoàn tất & Đóng bệnh án
            </span>
          ) : isCancelled ? (
            <span className="vet-badge vet-badge-cancelled">
              <XCircle size={13} /> Ca đã hủy
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
            <Printer size={15} /> In Phiếu Khám & Đơn Thuốc
          </button>
          {!isCompleted && !isCancelled && (
            <button
              type="button"
              className="vet-btn vet-btn-outline vet-btn-sm"
              style={{ color: '#ef4444' }}
              onClick={() => setShowCancelModal(true)}
            >
              <XCircle size={15} /> Hủy ca
            </button>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="vet-exam-layout">
        {/* =========================================================================
            LEFT COLUMN: THÔNG TIN THÚ CƯNG & CHỦ NUÔI & LỊCH SỬ
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card Thú cưng */}
          <div className="vet-card">
            <div className="vet-card-header">
              <h4 className="vet-card-title">
                <Dog size={16} color="#0d9488" /> Thông Tin Thú Cưng
              </h4>
            </div>
            <div className="vet-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                  }}
                >
                  {pet.species === 'Mèo' ? '🐱' : '🐶'}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    {pet.petName}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>
                    {pet.species} • {pet.breed}
                  </div>
                  <div style={{ fontSize: 12, color: '#0f766e', fontWeight: 600 }}>
                    {pet.gender} • Ngày sinh: {pet.dateOfBirth || 'Không rõ'}
                  </div>
                </div>
              </div>

              {/* Cập nhật cân nặng tức thì */}
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Scale size={14} color="#0d9488" /> Cân nặng hiện tại (kg):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    step="0.05"
                    className="vet-input"
                    style={{ fontWeight: 700, fontSize: 14 }}
                    value={petWeight}
                    onChange={(e) => setPetWeight(e.target.value)}
                    placeholder="VD: 11.5"
                  />
                  <button
                    type="button"
                    className="vet-btn vet-btn-primary vet-btn-sm"
                    onClick={handleUpdateWeight}
                    title="Lưu cân nặng của bé"
                  >
                    Lưu
                  </button>
                </div>
              </div>

              {/* Nút xem bệnh sử cũ */}
              <button
                type="button"
                className="vet-btn vet-btn-outline"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowHistoryModal(true)}
              >
                <Clock size={16} color="#0d9488" /> Xem Bệnh Sử & Đơn Thuốc Cũ
              </button>
            </div>
          </div>

          {/* Card Chủ nuôi */}
          <div className="vet-card">
            <div className="vet-card-header">
              <h4 className="vet-card-title">
                <User size={16} color="#0d9488" /> Thông Tin Chủ Nuôi
              </h4>
            </div>
            <div className="vet-card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div>Họ tên: <strong>{owner.fullName || 'Chưa có thông tin'}</strong></div>
              <div style={{ marginTop: 4 }}>
                SĐT: <strong style={{ color: '#0d9488' }}>{owner.phoneNumber || 'N/A'}</strong>
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
          <div className="vet-card" style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #e6fffa 100%)', border: '1px solid #99f6e4' }}>
            <div className="vet-card-body">
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                💳 TỔNG VIỆN PHÍ TẠM TÍNH
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0d9488', marginBottom: 10 }}>
                {formatCurrency(record.grandTotal)}
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                <div>• Tiền dịch vụ & xét nghiệm: <strong>{formatCurrency(record.totalServicesAmount)}</strong></div>
                <div>• Tiền thuốc điều trị: <strong>{formatCurrency(record.totalMedicineAmount)}</strong></div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}>
                Hóa đơn sẽ tự động tạo và gửi đến quầy thu ngân khi bác sĩ hoàn thành ca khám.
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: KHÁM LÂM SÀNG, Y LỆNH DỊCH VỤ, ĐƠN THUỐC, TÁI KHÁM
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* SECTION 1: KHÁM LÂM SÀNG & CHẨN ĐOÁN (UC-04, UC-05, UC-07) */}
          <div className="vet-card">
            <div className="vet-card-header">
              <h4 className="vet-card-title">
                <Stethoscope size={18} color="#0d9488" />
                1. Khám Lâm Sàng, Chẩn Đoán & Phác Đồ Điều Trị
              </h4>
              <button
                type="button"
                className="vet-btn vet-btn-primary vet-btn-sm"
                disabled={saving}
                onClick={handleSaveRecord}
              >
                <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu Lâm Sàng'}
              </button>
            </div>
            <div className="vet-card-body">
              <div className="vet-form-group">
                <label className="vet-form-label">
                  Triệu chứng lâm sàng ghi nhận (Nhiệt độ, niêm mạc, tình trạng chung):
                </label>
                <textarea
                  className="vet-textarea"
                  rows={3}
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
                  style={{ fontWeight: 700, color: '#0f766e', fontSize: 14 }}
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
                  placeholder="Ví dụ: 1. Truyền bù nước Ringer Lactate 200ml. 2. Kháng sinh và men tiêu hóa 5 ngày..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CHỈ ĐỊNH DỊCH VỤ / Y LỆNH CẬN LÂM SÀNG (UC-09, 10, 11, 12) */}
          <div className="vet-card">
            <div className="vet-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h4 className="vet-card-title">
                  <Activity size={18} color="#0d9488" />
                  2. Y Lệnh Dịch Vụ & Xét Nghiệm Cận Lâm Sàng ({services.length})
                </h4>
                <span style={{ fontSize: 12, color: '#0f766e', background: '#ccfbf1', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                  {formatCurrency(record.totalServicesAmount)}
                </span>
              </div>
              <button
                type="button"
                className="vet-btn vet-btn-primary vet-btn-sm"
                onClick={() => setShowAddServiceModal(true)}
              >
                <Plus size={15} /> Chỉ định Dịch vụ mới
              </button>
            </div>

            {services.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: 13 }}>Chưa có y lệnh dịch vụ cận lâm sàng nào.</p>
                <button
                  type="button"
                  className="vet-btn vet-btn-outline vet-btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => setShowAddServiceModal(true)}
                >
                  <Plus size={14} /> Thêm Siêu âm / Xét nghiệm / X-Quang...
                </button>
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
                      <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.recordDetailId}>
                        <td style={{ fontWeight: 600 }}>{s.serviceName}</td>
                        <td style={{ color: '#475569' }}>{formatCurrency(s.unitPrice)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.quantity}</td>
                        <td style={{ fontWeight: 700, color: '#0d9488' }}>{formatCurrency(s.subTotal)}</td>
                        <td>
                          <div style={{ fontSize: 12.5, color: '#334155' }}>
                            {s.notes || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có ghi chú</span>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="vet-btn vet-btn-outline vet-btn-sm"
                              title="Cập nhật kết quả/ghi chú"
                              onClick={() => setEditingService(s)}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="vet-btn vet-btn-outline vet-btn-sm"
                              style={{ color: '#ef4444' }}
                              title="Hủy y lệnh dịch vụ này"
                              onClick={() => handleDeleteService(s.recordDetailId)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 3: KÊ ĐƠN THUỐC ĐIỆN TỬ (UC-13, UC-14) */}
          <div className="vet-card">
            <div className="vet-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h4 className="vet-card-title">
                  <Pill size={18} color="#0d9488" />
                  3. Đơn Thuốc Điều Trị Điện Tử ({medicines.length} loại)
                </h4>
                <span style={{ fontSize: 12, color: '#0f766e', background: '#ccfbf1', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                  {formatCurrency(record.totalMedicineAmount)}
                </span>
              </div>
              <button
                type="button"
                className="vet-btn vet-btn-primary vet-btn-sm"
                onClick={() => setShowAddMedicineModal(true)}
              >
                <Plus size={15} /> Kê thêm thuốc vào đơn
              </button>
            </div>

            {medicines.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: 13 }}>Đơn thuốc đang trống. Hãy chọn thuốc từ kho dược.</p>
                <button
                  type="button"
                  className="vet-btn vet-btn-outline vet-btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => setShowAddMedicineModal(true)}
                >
                  <Plus size={14} /> Chọn thuốc từ kho
                </button>
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
                      <th style={{ width: 70, textAlign: 'center' }}>Xóa</th>
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
                        <td style={{ fontWeight: 700, color: '#0d9488' }}>{formatCurrency(m.subTotal)}</td>
                        <td>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f766e' }}>
                            👉 {m.dosage}
                          </div>
                          {m.notes && <div style={{ fontSize: 11.5, color: '#64748b' }}>{m.notes}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="vet-btn vet-btn-outline vet-btn-sm"
                            style={{ color: '#ef4444' }}
                            title="Xóa thuốc khỏi đơn"
                            onClick={() => handleDeleteMedicine(m.prescriptionDetailId)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
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
                <button
                  type="button"
                  className="vet-btn vet-btn-outline vet-btn-sm"
                  onClick={handleSavePrescriptionInstructions}
                >
                  <Save size={13} /> Lưu lời dặn
                </button>
              </div>
              <textarea
                className="vet-textarea"
                rows={2}
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
                <Calendar size={18} color="#0d9488" />
                4. Kế Hoạch & Lịch Hẹn Tái Khám ({followUps.length})
              </h4>
              <button
                type="button"
                className="vet-btn vet-btn-primary vet-btn-sm"
                onClick={() => setShowFollowUpModal(true)}
              >
                <Plus size={15} /> Đặt lịch tái khám
              </button>
            </div>
            <div className="vet-card-body">
              {followUps.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Chưa có lịch hẹn tái khám. Bấm <strong>Đặt lịch tái khám</strong> nếu cần theo dõi sau phác đồ.
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
                        background: '#f0fdfa',
                        border: '1px solid #ccfbf1',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#99f6e4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Calendar size={18} color="#0f766e" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                            Hẹn tái khám: <strong>{f.followUpDate}</strong> • {f.followUpType}
                          </div>
                          {f.notes && <div style={{ fontSize: 12, color: '#475569' }}>Ghi chú: {f.notes}</div>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="vet-btn vet-btn-outline vet-btn-sm"
                        style={{ color: '#ef4444' }}
                        title="Hủy lịch hẹn tái khám"
                        onClick={() => handleDeleteFollowUp(f.followUpId)}
                      >
                        <Trash2 size={13} />
                      </button>
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
              border: '2px solid #0d9488',
              boxShadow: '0 10px 25px rgba(13, 148, 136, 0.15)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>
                Tổng Chi Phí Đợt Khám (Viện phí + Dược phẩm):
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0d9488' }}>
                {formatCurrency(record.grandTotal)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="vet-btn vet-btn-outline"
                disabled={saving}
                onClick={handleSaveRecord}
              >
                <Save size={16} /> Lưu cập nhật
              </button>

              <button
                type="button"
                className="vet-btn vet-btn-outline"
                onClick={() => setShowPrintModal(true)}
              >
                <Printer size={16} /> In Phiếu & Đơn
              </button>

              {!isCompleted && !isCancelled && (
                <button
                  type="button"
                  className="vet-btn vet-btn-success"
                  style={{ padding: '10px 22px', fontSize: 14 }}
                  disabled={saving}
                  onClick={handleCompleteRecord}
                >
                  <FileCheck size={18} /> Hoàn tất Khám & Chốt Bệnh Án
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* Modal Xem Bệnh Sử Pet */}
      {showHistoryModal && (
        <PetHistoryModal
          petId={pet.petId}
          petName={pet.petName}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* Modal In Phiếu Khám & Đơn Thuốc */}
      {showPrintModal && (
        <PrintableMedicalDocument
          record={record}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Modal Thêm Dịch Vụ Mới */}
      {showAddServiceModal && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 500 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color="#0d9488" /> Chỉ Định Y Lệnh Dịch Vụ Mới
              </h3>
              <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={() => setShowAddServiceModal(false)}>
                <X size={15} />
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
      {editingService && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 480 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Cập Nhật Kết Quả: {editingService.serviceName}
              </h3>
              <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={() => setEditingService(null)}>
                <X size={15} />
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
      {showAddMedicineModal && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 520 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={18} color="#0d9488" /> Kê Thuốc Vào Đơn Điện Tử
              </h3>
              <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={() => setShowAddMedicineModal(false)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddMedicine}>
              <div className="vet-modal-body">
                <div className="vet-form-group">
                  <label className="vet-form-label">Chọn Thuốc Từ Kho Dược:</label>
                  <select
                    className="vet-select"
                    value={selectedMedicineId}
                    onChange={(e) => setSelectedMedicineId(e.target.value)}
                    required
                  >
                    {availableMedicines.map((m) => (
                      <option key={m.medicineId} value={m.medicineId}>
                        {m.medicineName} ({formatCurrency(m.unitPrice)} / {m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vet-form-group">
                  <label className="vet-form-label">Số lượng kê:</label>
                  <input
                    type="number"
                    min={1}
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
                <button type="submit" className="vet-btn vet-btn-primary">
                  Thêm vào Đơn Thuốc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đặt Lịch Tái Khám */}
      {showFollowUpModal && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 460 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="#0d9488" /> Đặt Lịch Tái Khám Cho Bé
              </h3>
              <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={() => setShowFollowUpModal(false)}>
                <X size={15} />
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
      {showCancelModal && (
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
