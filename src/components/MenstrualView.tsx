import React, { useState, useMemo } from 'react';
import {
  Heart,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Info,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { MenstrualRecord, MenstrualSettings } from '../types/workbench';
import { isoDate } from '../data/initialData';

interface MenstrualViewProps {
  menstrual: MenstrualSettings;
  onUpdateMenstrual: (menstrual: Partial<MenstrualSettings>) => Promise<void>;
}

export const MenstrualView: React.FC<MenstrualViewProps> = ({
  menstrual,
  onUpdateMenstrual,
}) => {
  const today = isoDate();
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MenstrualRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Form states
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [flow, setFlow] = useState<'light' | 'medium' | 'heavy' | 'very-heavy'>('medium');
  const [painLevel, setPainLevel] = useState<number>(1);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');

  // Settings state
  const [cycleLength, setCycleLength] = useState<number>(menstrual.cycleLength || 28);
  const [periodDuration, setPeriodDuration] = useState<number>(menstrual.periodDuration || 5);
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  // Sort records descending
  const sortedRecords = useMemo(() => {
    return [...menstrual.records].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }, [menstrual.records]);

  const latestRecord = sortedRecords[0];

  // Prediction calculations
  const cycleAnalysis = useMemo(() => {
    if (!latestRecord) {
      return {
        currentCycleDay: 1,
        phase: 'follicular' as const,
        phaseName: '卵泡期',
        phaseDesc: '精力充沛，适合学习与轻量运动',
        daysUntilNext: 28,
        nextStartDate: '',
        isAdvanceNotice: false,
        isInPeriod: false,
        daysInPeriod: 0,
      };
    }

    const startTs = new Date(latestRecord.startDate + 'T00:00:00').getTime();
    const todayTs = new Date(today + 'T00:00:00').getTime();
    const daysSinceStart = Math.max(0, Math.floor((todayTs - startTs) / (86400 * 1000))) + 1;

    const avgCycle = menstrual.cycleLength || 28;
    const avgDuration = menstrual.periodDuration || 5;

    // Next period prediction
    const nextStartTs = startTs + avgCycle * 86400 * 1000;
    const nextDateObj = new Date(nextStartTs);
    const nextStartDate = nextDateObj.toISOString().slice(0, 10);
    const daysUntilNext = Math.ceil((nextStartTs - todayTs) / (86400 * 1000));

    // In period check
    let isInPeriod = false;
    let daysInPeriod = 0;
    if (latestRecord.endDate) {
      const endTs = new Date(latestRecord.endDate + 'T23:59:59').getTime();
      if (todayTs >= startTs && todayTs <= endTs) {
        isInPeriod = true;
        daysInPeriod = daysSinceStart;
      }
    } else if (daysSinceStart <= avgDuration) {
      isInPeriod = true;
      daysInPeriod = daysSinceStart;
    }

    // Phase identification
    let phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' = 'follicular';
    let phaseName = '卵泡期';
    let phaseDesc = '雌激素平稳回升，皮肤通透，精力充沛';

    if (isInPeriod) {
      phase = 'menstrual';
      phaseName = '月经期';
      phaseDesc = '身体较敏感，注意腹部与脚踝防寒，多喝温水，适度拉伸';
    } else if (daysSinceStart <= Math.max(6, avgCycle - 16)) {
      phase = 'follicular';
      phaseName = '卵泡期';
      phaseDesc = '状态极佳，代谢旺盛，适合挑战复杂工作与运动';
    } else if (daysSinceStart <= Math.max(10, avgCycle - 12)) {
      phase = 'ovulatory';
      phaseName = '排卵期 / 易孕期';
      phaseDesc = '体温略升，注意多补水与规律作息';
    } else {
      phase = 'luteal';
      phaseName = '黄体期';
      phaseDesc = '临近经期，孕酮升高，少食生冷高糖，保持心情平和';
    }

    // Critical Requirement: Advance notice 1 day prior
    const isAdvanceNotice = daysUntilNext === 1;

    return {
      currentCycleDay: daysSinceStart,
      phase,
      phaseName,
      phaseDesc,
      daysUntilNext,
      nextStartDate,
      isAdvanceNotice,
      isInPeriod,
      daysInPeriod,
    };
  }, [latestRecord, today, menstrual.cycleLength, menstrual.periodDuration]);

  // Available common symptoms
  const commonSymptoms = [
    '痛经',
    '疲劳嗜睡',
    '腰酸下坠',
    '胸部胀痛',
    '水肿',
    '畏寒怕冷',
    '情绪敏感',
    '偏头痛',
    '下巴爆痘',
  ];

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setStartDate(today);
    setEndDate('');
    setFlow('medium');
    setPainLevel(1);
    setSymptoms([]);
    setNote('');
    setShowModal(true);
  };

  const handleOpenEditModal = (rec: MenstrualRecord) => {
    setEditingRecord(rec);
    setStartDate(rec.startDate);
    setEndDate(rec.endDate || '');
    setFlow(rec.flow || 'medium');
    setPainLevel(rec.painLevel ?? 1);
    setSymptoms(rec.symptoms || []);
    setNote(rec.note || '');
    setShowModal(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

    let updatedRecords: MenstrualRecord[];
    if (editingRecord) {
      updatedRecords = menstrual.records.map((r) =>
        r.id === editingRecord.id
          ? {
              ...r,
              startDate,
              endDate: endDate || undefined,
              flow,
              painLevel,
              symptoms,
              note: note.trim() || undefined,
            }
          : r
      );
    } else {
      const newRec: MenstrualRecord = {
        id: `menstrual-${Date.now()}`,
        startDate,
        endDate: endDate || undefined,
        flow,
        painLevel,
        symptoms,
        note: note.trim() || undefined,
        createdAt: Date.now(),
      };
      updatedRecords = [newRec, ...menstrual.records];
    }

    await onUpdateMenstrual({ records: updatedRecords });
    setShowModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    const updated = menstrual.records.filter((r) => r.id !== recordToDelete);
    await onUpdateMenstrual({ records: updated });
    setRecordToDelete(null);
  };

  const handleSaveSettings = async () => {
    await onUpdateMenstrual({
      cycleLength: Number(cycleLength) || 28,
      periodDuration: Number(periodDuration) || 5,
    });
    setIsEditingSettings(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Advance Alert Banner (高优先级提前一天提醒) */}
      {cycleAnalysis.isAdvanceNotice && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-300 p-5 rounded-[var(--radius)] shadow-sm flex items-start gap-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider bg-rose-200/70 px-2 py-0.5 rounded-md">
                提前 1 天特别预警
              </span>
              <h3 className="text-base font-bold text-rose-950 font-serif-sc">
                明天可能是生理期首日（预计 {cycleAnalysis.nextStartDate} 来潮）
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-rose-900/90 mt-1.5 leading-relaxed font-medium">
              根据您的生理周期规律推算，明天大概率将迎来月经首日。请在包内备齐卫生巾、随身携带保温杯并装好温水；今晚注意保暖，避免吹穿堂风或吃冷饮生冷，晚上尽早入睡。
            </p>
          </div>
        </div>
      )}

      {/* If currently in period */}
      {cycleAnalysis.isInPeriod && (
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-300 p-4 rounded-[var(--radius)] flex items-center gap-3">
          <Droplet className="w-5 h-5 text-rose-600 fill-rose-500 shrink-0" />
          <p className="text-xs sm:text-sm text-rose-950 font-medium">
            <strong>生理期第 {cycleAnalysis.daysInPeriod} 天</strong> · 多喝红糖姜茶或温水，注意小腹与后腰保暖，今日避免剧烈跑跳，可进行轻柔呼吸与舒缓拉伸。
          </p>
        </div>
      )}

      {/* 2. Top Summary Card: Cycle Ring & Today's Phase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Cycle Status Box */}
        <div className="lg:col-span-8 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#ded5c8]/60 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                    经期与身体节律
                  </h2>
                  <p className="text-xs text-[#746d63]">
                    根据历史周期智能推算下次来潮，提前一天关怀提醒
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingSettings(!isEditingSettings)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#544b42] bg-[#faf7f2] border border-[#ded5c8] hover:bg-[#ede6dc] transition-colors"
                >
                  {isEditingSettings ? '收起设置' : '周期参数'}
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>记录经期</span>
                </button>
              </div>
            </div>

            {/* Editable Settings Drawer */}
            {isEditingSettings && (
              <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#ded5c8] mb-5 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-[#29251f]">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>个人周期推算基准</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#746d63] block mb-1">
                      平均月经周期天数（通常 26 ~ 32 天）
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="45"
                      value={cycleLength}
                      onChange={(e) => setCycleLength(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-[#ded5c8] rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#746d63] block mb-1">
                      平均经期持续天数（通常 4 ~ 7 天）
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={periodDuration}
                      onChange={(e) => setPeriodDuration(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-[#ded5c8] rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveSettings}
                    className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
                  >
                    保存周期参数
                  </button>
                </div>
              </div>
            )}

            {/* Cycle Visual Hero */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {/* Day in cycle */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#faf4f2] to-[#f4ebe9] border border-[#ebd8d4]">
                <span className="text-xs text-[#8a7f72] font-medium block mb-1">当前周期</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-serif-sc font-bold text-rose-900">
                    第 {cycleAnalysis.currentCycleDay}
                  </span>
                  <span className="text-xs text-[#746d63]">天</span>
                </div>
                <div className="mt-2 text-xs font-bold text-rose-700 flex items-center gap-1">
                  <span>● {cycleAnalysis.phaseName}</span>
                </div>
              </div>

              {/* Countdown to next */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#f8f5fa] to-[#ede7f2] border border-[#ded5e6]">
                <span className="text-xs text-[#8a7f72] font-medium block mb-1">距下次来潮</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-serif-sc font-bold text-[#4d3045]">
                    {cycleAnalysis.daysUntilNext <= 0 ? '随时' : cycleAnalysis.daysUntilNext}
                  </span>
                  <span className="text-xs text-[#746d63]">
                    {cycleAnalysis.daysUntilNext <= 0 ? '来潮' : '天'}
                  </span>
                </div>
                <span className="mt-2 text-xs text-[#746d63] block truncate">
                  预计 {cycleAnalysis.nextStartDate || '计算中'}
                </span>
              </div>

              {/* Advance alert reminder status */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#f2f7f4] to-[#e4ede6] border border-[#d2dfd6]">
                <span className="text-xs text-[#8a7f72] font-medium block mb-1">前一天提醒</span>
                <span className="text-sm font-bold text-emerald-900 block mt-1">
                  已开启自动推算
                </span>
                <small className="text-[11px] text-[#607164] block mt-1 leading-tight">
                  来潮前 24 小时在首页总览与通知中心自动弹出贴心提示
                </small>
              </div>
            </div>

            {/* 4 Phases Track */}
            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#ded5c8] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#29251f]">
                <span>四阶段身体状态指示</span>
                <span className="text-rose-700 font-normal">{cycleAnalysis.phaseDesc}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                <div
                  className={`py-2 px-1 rounded-xl font-medium transition-all ${
                    cycleAnalysis.phase === 'menstrual'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'bg-[#ede6dc] text-[#554b42]'
                  }`}
                >
                  月经期 (1-5天)
                </div>
                <div
                  className={`py-2 px-1 rounded-xl font-medium transition-all ${
                    cycleAnalysis.phase === 'follicular'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'bg-[#ede6dc] text-[#554b42]'
                  }`}
                >
                  卵泡期 (6-13天)
                </div>
                <div
                  className={`py-2 px-1 rounded-xl font-medium transition-all ${
                    cycleAnalysis.phase === 'ovulatory'
                      ? 'bg-purple-600 text-white shadow-xs font-bold'
                      : 'bg-[#ede6dc] text-[#554b42]'
                  }`}
                >
                  排卵期 (14-17天)
                </div>
                <div
                  className={`py-2 px-1 rounded-xl font-medium transition-all ${
                    cycleAnalysis.phase === 'luteal'
                      ? 'bg-rose-800 text-white shadow-xs font-bold'
                      : 'bg-[#ede6dc] text-[#554b42]'
                  }`}
                >
                  黄体期 (18-28天)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mindful Care Card */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#faf4f2] to-[#f4e8e5] border border-[#e8d5d1] p-6 rounded-[var(--radius)] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>当前阶段生活温养建议</span>
            </div>
            <h3 className="text-base font-serif-sc font-bold text-rose-950 mb-3">
              {cycleAnalysis.phaseName} · 身心养护
            </h3>
            <ul className="text-xs text-rose-900/80 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span><strong>饮食调理：</strong>{cycleAnalysis.phase === 'menstrual' ? '温热滋润，宜姜枣茶、龙眼红豆汤，忌寒凉生冷与咖啡因。' : cycleAnalysis.phase === 'luteal' ? '少盐少糖，多补充维生素B族与香蕉，平抑水肿与情绪波动。' : '高蛋白与新鲜蔬果，此时吸收利用率高，营养均衡。'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span><strong>运动起居：</strong>{cycleAnalysis.phase === 'menstrual' ? '以散步、猫牛式、束角式为主，切忌倒立或高强度卷腹。' : cycleAnalysis.phase === 'follicular' ? '体能巅峰期，可安排力量训练或HIIT燃脂。' : '适合中等强度有氧运动，早睡早起不熬夜。'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span><strong>心情自洽：</strong>听从身体的节律，感到疲惫时允许自己停下歇息，无需自责。</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-[#e8d5d1]/70 flex items-center justify-between text-xs text-[#8a7f72]">
            <span>规律推算算法已生效</span>
            <span className="font-serif-sc font-medium text-rose-700">日常集 · 身体节律</span>
          </div>
        </div>
      </div>

      {/* 3. Menstrual Records History Table */}
      <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold font-serif-sc text-[#29251f]">
              历史经期档案
            </h3>
            <p className="text-xs text-[#746d63] mt-0.5">
              精确记录每次开始与结束，算法根据实际情况自动调优预测
            </p>
          </div>
          <span className="text-xs text-[#746d63]">
            共记录 {menstrual.records.length} 个周期
          </span>
        </div>

        {sortedRecords.length === 0 ? (
          <div className="py-12 text-center text-[#8a7f72] bg-[#faf7f2] rounded-2xl border border-dashed border-[#ded5c8] space-y-2">
            <Heart className="w-8 h-8 text-rose-300 mx-auto" />
            <p className="font-medium text-[#29251f]">暂无月经周期记录</p>
            <p className="text-xs text-[#746d63]">
              点击右上角「记录经期」，记下上一次或当前的月经开始时间
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRecords.map((rec) => {
              const start = rec.startDate;
              const end = rec.endDate;
              let days = 0;
              if (end) {
                days =
                  Math.floor(
                    (new Date(end).getTime() - new Date(start).getTime()) / (86400 * 1000)
                  ) + 1;
              }

              const flowMap: Record<string, string> = {
                light: '经量较少',
                medium: '经量适中',
                heavy: '经量较多',
                'very-heavy': '经量偏大',
              };

              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-[#faf7f2] border border-[#ded5c8] hover:border-rose-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold font-serif-sc text-[#29251f]">
                        {start} {end ? `至 ${end}` : '（进行中）'}
                      </span>
                      {days > 0 && (
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-semibold">
                          历时 {days} 天
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 bg-[#ede6dc] text-[#554b42] rounded-md font-medium">
                        {flowMap[rec.flow] || '适中'}
                      </span>
                      {rec.painLevel !== undefined && (
                        <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                          痛感 {rec.painLevel}/5
                        </span>
                      )}
                    </div>

                    {rec.symptoms && rec.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rec.symptoms.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#746d63] border border-[#ded5c8]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {rec.note && (
                      <p className="text-xs text-[#746d63] mt-2 italic bg-white/70 p-2 rounded-xl border border-[#ded5c8]/50">
                        "{rec.note}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(rec)}
                      className="p-2 text-[#746d63] hover:text-[#29251f] hover:bg-[#ede6dc] rounded-xl transition-colors"
                      title="编辑记录"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRecordToDelete(rec.id)}
                      className="p-2 text-[#746d63] hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                      title="删除记录"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Record Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fffdfa] border border-[#ded5c8] rounded-[var(--radius)] w-full max-w-lg shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
              <h3 className="text-base font-bold font-serif-sc text-[#29251f]">
                {editingRecord ? '修改月经记录' : '新增月经记录'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#29251f] block mb-1">
                    开始日期 *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#29251f] block mb-1">
                    结束日期 (若已结束)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1.5">
                  经量状况
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { id: 'light', label: '轻微' },
                    { id: 'medium', label: '适中' },
                    { id: 'heavy', label: '较多' },
                    { id: 'very-heavy', label: '大量' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setFlow(item.id as any)}
                      className={`py-2 rounded-xl border text-center font-medium transition-all ${
                        flow === item.id
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : 'bg-[#faf7f2] border-[#ded5c8] text-[#554b42]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1">
                  疼痛程度 (0 无痛 ~ 5 剧烈痛感)：{painLevel} 级
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1.5">
                  身体伴随症状 (可多选)
                </label>
                <div className="flex flex-wrap gap-2">
                  {commonSymptoms.map((sym) => {
                    const selected = symptoms.includes(sym);
                    return (
                      <button
                        type="button"
                        key={sym}
                        onClick={() => {
                          if (selected) {
                            setSymptoms(symptoms.filter((s) => s !== sym));
                          } else {
                            setSymptoms([...symptoms, sym]);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-xl border transition-all ${
                          selected
                            ? 'bg-rose-100 text-rose-800 border-rose-300 font-semibold'
                            : 'bg-[#faf7f2] text-[#746d63] border-[#ded5c8]'
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1">
                  备注备忘 (如情绪、饮食、服药情况)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="如：喝了红糖姜茶略有缓解、有些乏力..."
                  className="w-full p-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#ded5c8]/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#faf7f2] text-[#554b42] border border-[#ded5c8]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-2xs"
                >
                  保存记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (In-app, iframe safe) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fffdfa] border border-[#ded5c8] rounded-[var(--radius)] w-full max-w-sm shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold font-serif-sc text-[#29251f]">
              确认删除该周期记录？
            </h3>
            <p className="text-xs text-[#746d63] leading-relaxed">
              删除后将从线上资料库永久清除，周期推算算法将自动重新校准。
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#faf7f2] text-[#554b42] border border-[#ded5c8]"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
