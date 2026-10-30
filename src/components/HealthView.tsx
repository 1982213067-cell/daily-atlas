import React, { useState, useRef } from 'react';
import {
  HeartPulse,
  FileText,
  Pill,
  Plus,
  Trash2,
  X,
  Loader2,
  ScanLine,
  UserRound,
  Clock,
} from 'lucide-react';
import {
  HealthState,
  HealthProfile,
  HealthReport,
  MedicalRecord,
  MedicalStage,
} from '../types/workbench';
import { isoDate, uid } from '../data/initialData';
import Tesseract from 'tesseract.js';

interface HealthViewProps {
  health: HealthState;
  onUpdateHealth: (health: Partial<HealthState>) => Promise<void>;
}

const REPORT_CATEGORIES = ['体检报告', '检验报告', '检查报告'];
// 病程分期快捷选项
const STAGE_PRESETS = ['初期', '中期', '后期', '康复期'];

// 常见体检指标参考范围（用于 OCR 解析后自动判定）
const COMMON_ITEMS: { key: string; name: string; unit: string; reference: string; match: RegExp }[] = [
  { key: 'weight', name: '体重', unit: 'kg', reference: '依身高体重', match: /体重|weight/i },
  { key: 'height', name: '身高', unit: 'cm', reference: '—', match: /身高|height/i },
  { key: 'bmi', name: '体质指数BMI', unit: '', reference: '18.5-23.9', match: /BMI|体质指数/i },
  { key: 'sbp', name: '收缩压', unit: 'mmHg', reference: '90-140', match: /收缩压|高压/i },
  { key: 'dbp', name: '舒张压', unit: 'mmHg', reference: '60-90', match: /舒张压|低压/i },
  { key: 'hr', name: '心率', unit: '次/分', reference: '60-100', match: /心率|脉搏/i },
  { key: 'fpg', name: '空腹血糖', unit: 'mmol/L', reference: '3.9-6.1', match: /空腹血糖|GLU|葡萄糖/i },
  { key: 'tc', name: '总胆固醇', unit: 'mmol/L', reference: '2.8-5.2', match: /总胆固醇|TC|胆固醇/i },
  { key: 'tg', name: '甘油三酯', unit: 'mmol/L', reference: '0.45-1.7', match: /甘油三酯|TG/i },
  { key: 'alt', name: '谷丙转氨酶', unit: 'U/L', reference: '0-40', match: /谷丙转氨酶|ALT/i },
  { key: 'ast', name: '谷草转氨酶', unit: 'U/L', reference: '0-40', match: /谷草转氨酶|AST/i },
  { key: 'hb', name: '血红蛋白', unit: 'g/L', reference: '115-150', match: /血红蛋白|HGB/i },
  { key: 'wbc', name: '白细胞', unit: '×10⁹/L', reference: '3.5-9.5', match: /白细胞|WBC/i },
];

export const HealthView: React.FC<HealthViewProps> = ({ health, onUpdateHealth }) => {
  const today = isoDate();
  const profile = health.profile || ({} as HealthProfile);
  const reports = health.reports || [];
  const medicalRecords = health.medicalRecords || [];

  const [tab, setTab] = useState<'reports' | 'medical'>('medical');

  // ===== 体检报告录入 =====
  const [showReportModal, setShowReportModal] = useState(false);
  const [rTitle, setRTitle] = useState('');
  const [rDate, setRDate] = useState(today);
  const [rHospital, setRHospital] = useState('');
  const [rCategory, setRCategory] = useState('体检报告');
  const [rItems, setRItems] = useState<HealthReport['items']>([]);
  const [rItemName, setRItemName] = useState('');
  const [rItemValue, setRItemValue] = useState('');
  const [rItemUnit, setRItemUnit] = useState('');
  const [rItemRef, setRItemRef] = useState('');
  const [rNote, setRNote] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== 就诊记录录入（病名制） =====
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [mdDisease, setMdDisease] = useState('');
  const [mdDate, setMdDate] = useState(today);
  const [mdHospital, setMdHospital] = useState('');
  const [mdDoctor, setMdDoctor] = useState('');
  // 病程分期（初期/中期/后期…，可自定义名称；每期自带用药明细）
  const [mdStages, setMdStages] = useState<MedicalStage[]>([]);
  const [mdStageMedInputs, setMdStageMedInputs] = useState<Record<number, string>>({});

  // ===== 基本信息编辑 =====
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pName, setPName] = useState(profile.name || '');
  const [pSex, setPSex] = useState<'male' | 'female'>(profile.sex || 'female');
  const [pBirth, setPBirth] = useState(profile.birthDate || '');
  const [pHeight, setPHeight] = useState(profile.height ? String(profile.height) : '');
  const [pBlood, setPBlood] = useState(profile.bloodType || '');
  const [pAllergies, setPAllergies] = useState<string>(profile.allergies?.join('、') || '');
  const [pDiseases, setPDiseases] = useState<string>(profile.diseases?.join('、') || '');
  const [pSurgeries, setPSurgeries] = useState<string>(profile.surgeries?.join('、') || '');
  const [pFamily, setPFamily] = useState<string>(profile.familyHistory?.join('、') || '');
  const [pMeds, setPMeds] = useState<string>(profile.medications?.join('、') || '');
  const [pHabits, setPHabits] = useState<string>(profile.habits?.join('、') || '');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== 保存体检报告 =====
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rTitle.trim()) return;
    const report: HealthReport = {
      id: uid(),
      date: rDate,
      title: rTitle.trim(),
      hospital: rHospital.trim() || undefined,
      category: rCategory,
      items: rItems,
      note: rNote.trim() || undefined,
      createdAt: Date.now(),
    };
    setIsSubmitting(true);
    await onUpdateHealth({ reports: [report, ...reports] });
    setIsSubmitting(false);
    setShowReportModal(false);
    resetReportForm();
  };

  const resetReportForm = () => {
    setRTitle('');
    setRDate(today);
    setRHospital('');
    setRCategory('体检报告');
    setRItems([]);
    setRItemName('');
    setRItemValue('');
    setRItemUnit('');
    setRItemRef('');
    setRNote('');
  };

  const handleDeleteReport = async (id: string) => {
    await onUpdateHealth({ reports: reports.filter((r) => r.id !== id) });
  };

  const addReportItem = () => {
    if (!rItemName.trim() || !rItemValue.trim()) return;
    setRItems((prev) => [
      ...prev,
      {
        name: rItemName.trim(),
        value: rItemValue.trim(),
        unit: rItemUnit.trim(),
        reference: rItemRef.trim(),
        flag: 'normal',
      },
    ]);
    setRItemName('');
    setRItemValue('');
    setRItemUnit('');
    setRItemRef('');
  };

  // ===== OCR 解析体检报告 =====
  const handleOcrUpload = async (file: File) => {
    setOcrBusy(true);
    try {
      const result = await Tesseract.recognize(file, 'chi_sim+eng', {
        logger: () => {},
      });
      const text = result.data.text || '';
      // 逐行解析，匹配常见指标
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const parsed: HealthReport['items'] = [];
      for (const line of lines) {
        for (const item of COMMON_ITEMS) {
          if (item.match.test(line)) {
            // 提取数值
            const numMatch = line.match(/(\d+(?:\.\d+)?)/g);
            const value = numMatch && numMatch.length > 0 ? numMatch[0] : '';
            if (value && !parsed.some((p) => p.name === item.name)) {
              parsed.push({
                name: item.name,
                value,
                unit: item.unit,
                reference: item.reference,
                flag: 'normal',
              });
            }
            break;
          }
        }
      }
      if (parsed.length > 0) {
        setRItems(parsed);
        // 自动尝试填充标题/日期
        if (!rTitle) setRTitle('体检报告（OCR解析）');
      }
    } catch (err) {
      alert('OCR 识别失败，请手动录入或重新上传更清晰的图片');
    } finally {
      setOcrBusy(false);
    }
  };

  // ===== 就诊记录：分期 / 每期用药操作 =====
  const addMedicalStage = (name: string) => {
    setMdStages((prev) => [...prev, { name, date: today, detail: '', medications: [] }]);
  };

  const updateMedicalStage = (idx: number, patch: Partial<MedicalStage>) => {
    setMdStages((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeMedicalStage = (idx: number) => {
    setMdStages((prev) => prev.filter((_, i) => i !== idx));
    setMdStageMedInputs((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k);
        if (i < idx) next[i] = v;
        else if (i > idx) next[i - 1] = v;
      });
      return next;
    });
  };

  const addStageMed = (idx: number) => {
    const val = (mdStageMedInputs[idx] || '').trim();
    if (!val) return;
    setMdStages((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, medications: [...(s.medications || []), val] } : s,
      ),
    );
    setMdStageMedInputs((prev) => ({ ...prev, [idx]: '' }));
  };

  const removeStageMed = (idx: number, medIdx: number) => {
    setMdStages((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, medications: (s.medications || []).filter((_, j) => j !== medIdx) } : s,
      ),
    );
  };

  // ===== 保存就诊记录 =====
  const handleSaveMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mdDisease.trim()) return;
    const rec: MedicalRecord = {
      id: uid(),
      date: mdDate,
      disease: mdDisease.trim(),
      hospital: mdHospital.trim() || undefined,
      doctor: mdDoctor.trim() || undefined,
      stages: mdStages
        .map((s, i) => ({
          name: s.name.trim() || `第${i + 1}阶段`,
          date: s.date || undefined,
          detail: s.detail?.trim() || undefined,
          medications: (s.medications || []).filter(Boolean),
        }))
        .filter((s) => s.name || s.detail || (s.medications && s.medications.length > 0)),
      createdAt: Date.now(),
    };
    setIsSubmitting(true);
    await onUpdateHealth({ medicalRecords: [rec, ...medicalRecords] });
    setIsSubmitting(false);
    setShowMedicalModal(false);
    setMdDisease('');
    setMdDate(today);
    setMdHospital('');
    setMdDoctor('');
    setMdStages([]);
    setMdStageMedInputs({});
  };

  const handleDeleteMedical = async (id: string) => {
    await onUpdateHealth({ medicalRecords: medicalRecords.filter((r) => r.id !== id) });
  };

  // ===== 保存基本信息 =====
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const split = (s: string) => s.split(/[、,，;；]/).map((x) => x.trim()).filter(Boolean);
    const next: HealthProfile = {
      name: pName.trim(),
      sex: pSex,
      birthDate: pBirth,
      height: pHeight ? parseFloat(pHeight) : 0,
      bloodType: pBlood,
      allergies: split(pAllergies),
      diseases: split(pDiseases),
      surgeries: split(pSurgeries),
      familyHistory: split(pFamily),
      medications: split(pMeds),
      habits: split(pHabits),
    };
    setIsSubmitting(true);
    await onUpdateHealth({ profile: next });
    setIsSubmitting(false);
    setShowProfileModal(false);
  };

  // ===== 顶部操作按钮通用 =====
  const tabs = [
    { id: 'reports' as const, label: '体检报告', icon: <FileText className="w-4 h-4" /> },
    { id: 'medical' as const, label: '就诊用药', icon: <Pill className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部标题 + 编辑基本信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
              健康管理档案
            </h2>
            <p className="text-xs text-[#746d63]">
              记录一生、服务一生 · 病况、体检报告与用药一体化管理
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setPName(profile.name || '');
            setPSex(profile.sex || 'female');
            setPBirth(profile.birthDate || '');
            setPHeight(profile.height ? String(profile.height) : '');
            setPBlood(profile.bloodType || '');
            setPAllergies(profile.allergies?.join('、') || '');
            setPDiseases(profile.diseases?.join('、') || '');
            setPSurgeries(profile.surgeries?.join('、') || '');
            setPFamily(profile.familyHistory?.join('、') || '');
            setPMeds(profile.medications?.join('、') || '');
            setPHabits(profile.habits?.join('、') || '');
            setShowProfileModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#fffdfa] border border-[#ded5c8] hover:bg-[#ede6dc] text-[#443c34] transition-colors shadow-2xs"
        >
          <UserRound className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>基本信息档案</span>
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-1 bg-[#faf7f2] border border-[#ded5c8] rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[#544b42] hover:text-[#29251f]'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ============ 体检报告 Tab ============ */}
      {tab === 'reports' && (
        <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
            <div>
              <h3 className="text-base font-bold font-serif-sc text-[#29251f]">体检报告记录</h3>
              <p className="text-xs text-[#746d63]">上传报告图片自动识别，或手动录入，对比历年指标变化</p>
            </div>
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> 新增报告
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#a09588]">
              还没有体检报告，点击「新增报告」上传或手动录入
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl border border-[#ded5c8] bg-[#faf7f2]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#ede6dc] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#6d573b]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-sm font-bold text-[#29251f]">{r.title}</strong>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ede6dc] text-[#554b42]">{r.category}</span>
                        </div>
                        <p className="text-xs text-[#746d63] mt-0.5">
                          {r.date}{r.hospital ? ` · ${r.hospital}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteReport(r.id)}
                      className="text-[#a09187] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {r.items.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {r.items.map((it, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-white border border-[#ded5c8]/60 flex items-center justify-between">
                          <span className="text-xs text-[#746d63]">{it.name}</span>
                          <span className="text-xs font-bold text-[#29251f]">
                            {it.value} <span className="text-[10px] text-[#8a7f72] font-normal">{it.unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.note && <p className="text-xs text-[#746d63] mt-2 leading-relaxed">{r.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ 就诊用药 Tab ============ */}
      {tab === 'medical' && (
        <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
            <div>
              <h3 className="text-base font-bold font-serif-sc text-[#29251f]">就诊与用药记录</h3>
              <p className="text-xs text-[#746d63]">按病名记录病况，病程分期（初期/中期/后期）逐期记录病情与用药</p>
            </div>
            <button
              onClick={() => setShowMedicalModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> 新增病况
            </button>
          </div>

          {medicalRecords.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#a09588]">
              还没有病况记录，点击「新增病况」开始记录
            </div>
          ) : (
            <div className="space-y-3">
              {medicalRecords.map((r) => {
                // 兼容旧数据：type/title → 病名
                const disease = r.disease || (r as any).title || '未命名病况';
                const stages: MedicalStage[] = Array.isArray(r.stages) ? r.stages : [];
                return (
                  <div key={r.id} className="p-4 rounded-2xl border border-[#ded5c8] bg-[#faf7f2] space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/12 flex items-center justify-center shrink-0">
                          <Pill className="w-4 h-4 text-[var(--accent)]" />
                        </div>
                        <div className="min-w-0">
                          <strong className="text-sm font-bold text-[#29251f]">{disease}</strong>
                          <p className="text-xs text-[#746d63] mt-0.5">
                            {r.date}{r.hospital ? ` · ${r.hospital}` : ''}{r.doctor ? ` · ${r.doctor}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMedical(r.id)}
                        className="text-[#a09187] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 病程分期：每期病情说明 + 该期用药 */}
                    {stages.length > 0 && (
                      <div className="space-y-2">
                        {stages.map((s, i) => (
                          <div key={i} className="p-3 rounded-xl bg-white border border-[#ded5c8]/70 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#627a67]/15 text-[#627a67]">{s.name}</span>
                              {s.date && <span className="text-[10px] text-[#a09588]">{s.date}</span>}
                            </div>
                            {s.detail && <p className="text-xs text-[#554b42] leading-relaxed">{s.detail}</p>}
                            {(s.medications || []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {s.medications!.map((m, j) => (
                                  <span key={j} className="text-xs text-[#4d3045] bg-[#4d3045]/8 rounded-lg px-2 py-1">
                                    💊 {m}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ 体检报告录入弹窗 ============ */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded5c8] w-full max-w-lg rounded-[var(--radius)] p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
              <h3 className="font-serif-sc font-bold text-lg text-[#29251f]">新增体检报告</h3>
              <button onClick={() => setShowReportModal(false)} className="w-8 h-8 rounded-lg hover:bg-[#ede6dc] text-[#746d63] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            {/* OCR 上传区 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${
                ocrBusy ? 'border-[var(--accent)] bg-[#f4f8f4]' : 'border-[#9e9386] hover:border-[var(--accent)] bg-[#faf7f2]'
              }`}
            >
              {ocrBusy ? (
                <div className="flex flex-col items-center gap-2 text-sm text-[#627a67]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>正在识别体检报告…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-sm text-[#746d63]">
                  <ScanLine className="w-7 h-7 text-[var(--accent)]" />
                  <span className="font-semibold">拍照 / 上传体检报告，自动识别指标</span>
                  <span className="text-xs text-[#a09588]">支持中文报告，识别后可在下方核对修正</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleOcrUpload(f);
                e.target.value = '';
              }}
            />

            <form onSubmit={handleSaveReport} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">报告标题 *</label>
                  <input type="text" required value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="如：2026年度体检" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">报告日期 *</label>
                  <input type="date" required value={rDate} onChange={(e) => setRDate(e.target.value)} className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">报告分类</label>
                  <select value={rCategory} onChange={(e) => setRCategory(e.target.value)} className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm">
                    {REPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">医院/机构</label>
                  <input type="text" value={rHospital} onChange={(e) => setRHospital(e.target.value)} placeholder="如：市人民医院" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
                </div>
              </div>

              {/* 指标项 */}
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">指标明细</label>
                {rItems.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {rItems.map((it, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-[#faf7f2] border border-[#ded5c8] rounded-lg px-2.5 py-1.5">
                        <span className="text-[#29251f] font-medium flex-1">{it.name}</span>
                        <span className="text-[#746d63]">{it.value} {it.unit}</span>
                        <span className="text-[#a09588]">参考 {it.reference}</span>
                        <button type="button" onClick={() => setRItems(rItems.filter((_, j) => j !== i))} className="text-[#a09187] hover:text-rose-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-12 gap-1.5">
                  <input value={rItemName} onChange={(e) => setRItemName(e.target.value)} placeholder="项目名" className="col-span-4 px-2 py-1.5 bg-[#faf7f2] border border-[#ded5c8] rounded-lg text-xs" />
                  <input value={rItemValue} onChange={(e) => setRItemValue(e.target.value)} placeholder="数值" className="col-span-3 px-2 py-1.5 bg-[#faf7f2] border border-[#ded5c8] rounded-lg text-xs" />
                  <input value={rItemUnit} onChange={(e) => setRItemUnit(e.target.value)} placeholder="单位" className="col-span-2 px-2 py-1.5 bg-[#faf7f2] border border-[#ded5c8] rounded-lg text-xs" />
                  <input value={rItemRef} onChange={(e) => setRItemRef(e.target.value)} placeholder="参考值" className="col-span-3 px-2 py-1.5 bg-[#faf7f2] border border-[#ded5c8] rounded-lg text-xs" />
                </div>
                <button type="button" onClick={addReportItem} className="mt-1.5 text-[11px] font-semibold text-[var(--accent)] hover:underline">+ 添加此指标</button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">备注</label>
                <input type="text" value={rNote} onChange={(e) => setRNote(e.target.value)} placeholder="如：医生建议复查" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 rounded-xl text-xs text-[#746d63] hover:bg-[#ede6dc]">取消</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold text-xs shadow-xs disabled:opacity-60">{isSubmitting ? '保存中…' : '保存报告'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ 就诊记录录入弹窗（病名制） ============ */}
      {showMedicalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded5c8] w-full max-w-lg rounded-[var(--radius)] p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
              <h3 className="font-serif-sc font-bold text-lg text-[#29251f]">新增病况记录</h3>
              <button onClick={() => setShowMedicalModal(false)} className="w-8 h-8 rounded-lg hover:bg-[#ede6dc] text-[#746d63] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveMedical} className="space-y-4">
              {/* 病名 */}
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">病名 *</label>
                <input type="text" required value={mdDisease} onChange={(e) => setMdDisease(e.target.value)} placeholder="如：支气管炎、胃炎、感冒" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">日期 *</label>
                  <input type="date" required value={mdDate} onChange={(e) => setMdDate(e.target.value)} className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">医院</label>
                  <input type="text" value={mdHospital} onChange={(e) => setMdHospital(e.target.value)} placeholder="如：市人民医院" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">医生</label>
                  <input type="text" value={mdDoctor} onChange={(e) => setMdDoctor(e.target.value)} placeholder="如：赵医生" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
                </div>
              </div>

              {/* 病程分期（每期自带用药明细） */}
              <div className="p-3 rounded-2xl bg-[#faf7f2] border border-[#ded5c8]/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#746d63]">病程分期</label>
                  <span className="text-[10px] text-[#a09588]">按初期/中期/后期分段，逐期记录病情与该期用药</span>
                </div>
                {mdStages.length > 0 && (
                  <div className="space-y-2">
                    {mdStages.map((s, i) => (
                      <div key={i} className="bg-white border border-[#ded5c8] rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            value={s.name}
                            onChange={(e) => updateMedicalStage(i, { name: e.target.value })}
                            className="w-20 px-2 py-1 bg-[#faf7f2] border border-[#ded5c8] rounded text-xs font-semibold text-[#627a67]"
                          />
                          <Clock className="w-3 h-3 text-[#a09588]" />
                          <input
                            type="date"
                            value={s.date || ''}
                            onChange={(e) => updateMedicalStage(i, { date: e.target.value })}
                            className="px-2 py-1 bg-[#faf7f2] border border-[#ded5c8] rounded text-xs flex-1"
                          />
                          <button type="button" onClick={() => removeMedicalStage(i)} className="text-[#a09187] hover:text-rose-600 p-0.5"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <input
                          value={s.detail || ''}
                          onChange={(e) => updateMedicalStage(i, { detail: e.target.value })}
                          placeholder="此阶段的病情/治疗说明"
                          className="w-full px-2 py-1.5 bg-[#faf7f2] border border-[#ded5c8] rounded text-xs"
                        />
                        {/* 本期用药明细 */}
                        <div className="rounded-lg bg-[#f6f2ea] border border-[#ded5c8]/50 p-2 space-y-1.5">
                          <div className="flex items-center gap-1">
                            <Pill className="w-3 h-3 text-[#4d3045]" />
                            <span className="text-[10px] font-semibold text-[#746d63]">本期用药</span>
                          </div>
                          {(s.medications || []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {s.medications!.map((m, j) => (
                                <span key={j} className="inline-flex items-center gap-1.5 text-xs text-[#4d3045] bg-[#4d3045]/8 rounded-lg px-2 py-1">
                                  💊 {m}
                                  <button type="button" onClick={() => removeStageMed(i, j)} className="text-[#a09187] hover:text-rose-600"><X className="w-3 h-3" /></button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <input
                              value={mdStageMedInputs[i] || ''}
                              onChange={(e) => setMdStageMedInputs((prev) => ({ ...prev, [i]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStageMed(i); } }}
                              placeholder="如：阿莫西林 0.5g 每日3次，回车或点添加"
                              className="flex-1 px-2 py-1.5 bg-white border border-[#ded5c8] rounded-lg text-xs"
                            />
                            <button type="button" onClick={() => addStageMed(i)} className="px-3 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold">添加</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {STAGE_PRESETS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addMedicalStage(s)}
                      className="px-2.5 py-1 rounded-lg border border-[#ded5c8] bg-white text-xs font-semibold text-[#554b42] hover:bg-[#ede6dc]"
                    >
                      + {s}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => addMedicalStage('自定义阶段')}
                    className="px-2.5 py-1 rounded-lg border border-dashed border-[#9e9386] bg-white text-xs font-semibold text-[#746d63] hover:bg-[#ede6dc]"
                  >
                    + 自定义
                  </button>
                </div>
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <button type="button" onClick={() => setShowMedicalModal(false)} className="px-4 py-2 rounded-xl text-xs text-[#746d63] hover:bg-[#ede6dc]">取消</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold text-xs shadow-xs disabled:opacity-60">{isSubmitting ? '保存中…' : '保存病况'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ 基本信息编辑弹窗 ============ */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded5c8] w-full max-w-md rounded-[var(--radius)] p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
              <h3 className="font-serif-sc font-bold text-lg text-[#29251f]">基本信息档案</h3>
              <button onClick={() => setShowProfileModal(false)} className="w-8 h-8 rounded-lg hover:bg-[#ede6dc] text-[#746d63] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">姓名</label>
                  <input type="text" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="你的姓名" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">性别</label>
                  <select value={pSex} onChange={(e) => setPSex(e.target.value as any)} className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm">
                    <option value="female">女</option>
                    <option value="male">男</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">出生日期</label>
                  <input type="date" value={pBirth} onChange={(e) => setPBirth(e.target.value)} className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">身高 (cm)</label>
                  <input type="number" value={pHeight} onChange={(e) => setPHeight(e.target.value)} placeholder="165" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">血型</label>
                <div className="flex gap-2 flex-wrap">
                  {['A型', 'B型', 'AB型', 'O型'].map((b) => (
                    <button key={b} type="button" onClick={() => setPBlood((prev) => (prev === b ? '' : b))} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${pBlood === b ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[#faf7f2] border-[#ded5c8] text-[#554b42]'}`}>{b}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">过敏史（顿号分隔）</label>
                <input type="text" value={pAllergies} onChange={(e) => setPAllergies(e.target.value)} placeholder="如：青霉素、磺胺" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">既往病史（顿号分隔）</label>
                <input type="text" value={pDiseases} onChange={(e) => setPDiseases(e.target.value)} placeholder="如：急性胃炎" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">手术史（顿号分隔）</label>
                <input type="text" value={pSurgeries} onChange={(e) => setPSurgeries(e.target.value)} placeholder="如：无" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">家族史（顿号分隔）</label>
                <input type="text" value={pFamily} onChange={(e) => setPFamily(e.target.value)} placeholder="如：父亲高血压" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">长期用药（顿号分隔）</label>
                <input type="text" value={pMeds} onChange={(e) => setPMeds(e.target.value)} placeholder="如：无" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">生活习惯（顿号分隔）</label>
                <input type="text" value={pHabits} onChange={(e) => setPHabits(e.target.value)} placeholder="如：不吸烟、偶尔饮酒、规律运动" className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowProfileModal(false)} className="px-4 py-2 rounded-xl text-xs text-[#746d63] hover:bg-[#ede6dc]">取消</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold text-xs shadow-xs disabled:opacity-60">{isSubmitting ? '保存中…' : '保存档案'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
