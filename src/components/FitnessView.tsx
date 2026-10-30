import React, { useState, useMemo } from 'react';
import {
  Activity,
  Plus,
  Trash2,
  Check,
  Calendar,
  Bike,
  Dumbbell,
  Waves,
  Footprints,
  PersonStanding,
  Dribbble,
  CircleHelp,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { FitnessData, PlanItem, RecordItem, Settings, SportTypeItem } from '../types/workbench';
import { isoDate } from '../data/initialData';

interface FitnessViewProps {
  records: RecordItem[];
  settings: Settings;
  onAddRecord: (record: Partial<RecordItem>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onUpdateSportTypes: (sportTypes: SportTypeItem[]) => Promise<void>;
  onAddPlan: (plan: Partial<PlanItem>) => Promise<void>;
  onTogglePlan: (id: string) => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
}

// 运动类型名 -> lucide 图标映射（仅作默认展示，emoji 才是用户可改的图标）
const SPORT_META: Record<string, React.ComponentType<{ className?: string }>> = {
  跑步: Footprints,
  骑行: Bike,
  游泳: Waves,
  健身: Dumbbell,
  瑜伽: PersonStanding,
  步行: Activity,
  篮球: Dribbble,
  其他: CircleHelp,
};

// emoji 选择池（用户可从中挑选图标）
const SPORT_EMOJI_POOL = [
  '🏃', '🚴', '🏊', '💪', '🧘', '🚶', '🏀', '🎯',
  '⚽', '🎾', '🏸', '🏓', '⛷️', '🏂', '🧗', '🥊',
  '🤸', '🏋️', '🛼', '⛸️', '🏌️', '🚣', '🏄', '🤺',
  '🎣', '🥋', '🏹', '⛹️', '🤾', '🧗', '🕺', '💃',
];

const FEELINGS = [
  { id: '超棒', label: '超棒', emoji: '🔥' },
  { id: '不错', label: '不错', emoji: '🙂' },
  { id: '一般', label: '一般', emoji: '😐' },
  { id: '疲惫', label: '疲惫', emoji: '😫' },
];

// 根据运动类型名称取 lucide 图标（未知类型回退到通用）
function getSportIcon(name: string): React.ComponentType<{ className?: string }> {
  return SPORT_META[name] || CircleHelp;
}

export const FitnessView: React.FC<FitnessViewProps> = ({
  records,
  settings,
  onAddRecord,
  onDeleteRecord,
  onUpdateSportTypes,
  onAddPlan,
  onTogglePlan,
  onDeletePlan,
}) => {
  const today = isoDate();

  // ===== 运动类型（可编辑，存于 settings.sportTypes）=====
  const sportTypes: SportTypeItem[] = Array.isArray(settings.sportTypes) && settings.sportTypes.length > 0
    ? settings.sportTypes.map((s) => (typeof s === 'string' ? { name: s, emoji: '🎯' } : s))
    : [
        { name: '跑步', emoji: '🏃' },
        { name: '骑行', emoji: '🚴' },
        { name: '游泳', emoji: '🏊' },
        { name: '健身', emoji: '💪' },
        { name: '瑜伽', emoji: '🧘' },
        { name: '步行', emoji: '🚶' },
        { name: '篮球', emoji: '🏀' },
        { name: '其他', emoji: '🎯' },
      ];
  const [sportType, setSportType] = useState<string>(sportTypes[0]?.name || '跑步');
  const [editingSportType, setEditingSportType] = useState<boolean>(false);
  const [newSportTypeName, setNewSportTypeName] = useState<string>('');
  const [newSportTypeEmoji, setNewSportTypeEmoji] = useState<string>('🎯');
  // 编辑中的临时副本（改文字/emoji 用）
  const [draftSportTypes, setDraftSportTypes] = useState<SportTypeItem[]>(sportTypes);
  // emoji 选择器：记录正在为哪个类型选 emoji（存 name 作为 key）
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);

  // ===== 运动详情打卡表单 =====
  const [workoutDate, setWorkoutDate] = useState<string>(today);
  const [workoutTime, setWorkoutTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [duration, setDuration] = useState<string>('30');
  const [distance, setDistance] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [feeling, setFeeling] = useState<string>('不错');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ===== 周计划 =====
  const [showAddPlanModal, setShowAddPlanModal] = useState<boolean>(false);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [planNote, setPlanNote] = useState<string>('');

  // 运动打卡记录（有 sportType 的）
  const workoutRecords = useMemo(() => {
    return records
      .filter((r) => r.type === 'fitness' && (r.data as FitnessData).sportType)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [records]);

  // 提交运动打卡
  const handleWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onAddRecord({
        type: 'fitness',
        date: workoutDate || today,
        createdAt: Date.now(),
        data: {
          sportType,
          time: workoutTime,
          duration: duration ? parseInt(duration, 10) : undefined,
          distance: distance ? Number(parseFloat(distance).toFixed(1)) : undefined,
          calories: calories ? parseInt(calories, 10) : undefined,
          feeling,
          note: note.trim() || '',
        },
      });
      setDuration('30');
      setDistance('');
      setCalories('');
      setNote('');
      setFeeling('不错');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 进入/退出编辑模式
  const toggleEditMode = () => {
    if (editingSportType) {
      // 保存并退出
      saveDraft();
      setEmojiPickerFor(null);
    } else {
      // 进入编辑：同步最新 sportTypes 到草稿
      setDraftSportTypes(sportTypes.map((s) => ({ ...s })));
    }
    setEditingSportType(!editingSportType);
  };

  // 保存草稿到 settings
  const saveDraft = async () => {
    const valid = draftSportTypes.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), emoji: s.emoji || '🎯' }));
    if (valid.length === 0) return;
    await onUpdateSportTypes(valid);
  };

  // 新增运动类型
  const handleAddSportType = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSportTypeName.trim();
    if (!name) return;
    if (draftSportTypes.some((s) => s.name === name)) {
      setNewSportTypeName('');
      return;
    }
    setDraftSportTypes((prev) => [...prev, { name, emoji: newSportTypeEmoji || '🎯' }]);
    setNewSportTypeName('');
    setNewSportTypeEmoji('🎯');
  };

  // 删除运动类型
  const handleDeleteSportType = (name: string) => {
    if (draftSportTypes.length <= 1) return;
    setDraftSportTypes((prev) => prev.filter((s) => s.name !== name));
  };

  // 编辑名称
  const handleEditName = (oldName: string, newName: string) => {
    setDraftSportTypes((prev) => prev.map((s) => (s.name === oldName ? { ...s, name: newName } : s)));
  };

  // 选择 emoji
  const handlePickEmoji = (name: string, emoji: string) => {
    setDraftSportTypes((prev) => prev.map((s) => (s.name === name ? { ...s, emoji } : s)));
    setEmojiPickerFor(null);
  };

  // 保存周计划
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) return;
    await onAddPlan({
      group: '运动',
      title: planTitle.trim(),
      note: planNote.trim(),
      done: false,
    });
    setPlanTitle('');
    setPlanNote('');
    setShowAddPlanModal(false);
  };

  const filteredPlans = useMemo(() => {
    // 只保留「运动」类计划（旧数据中饮食/恢复已不再展示）
    const list = settings.weeklyPlan || [];
    return list.filter((p) => p.group === '运动' || !p.group);
  }, [settings.weeklyPlan]);

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#746d63]">
          <Calendar className="w-3.5 h-3.5" />
          <span>记录每一次挥汗，动起来就是胜利</span>
        </div>
      </div>

      {/* 板块一：选择运动类型（可编辑） */}
      <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-4">
        <div className="border-b border-[#ded5c8]/60 pb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
              运动类型
            </p>
            <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
              选择运动类型
            </h2>
          </div>
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              editingSportType
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[#faf7f2] border-[#ded5c8] text-[#554b42] hover:bg-[#ede6dc]'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{editingSportType ? '保存并退出' : '编辑类型'}</span>
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {(editingSportType ? draftSportTypes : sportTypes).map((item) => {
            const name = item.name;
            const active = sportType === name;
            const Icon = getSportIcon(name);
            return (
              <div
                key={name}
                className={`relative flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all ${
                  active
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                    : 'bg-[#faf7f2] border-[#ded5c8] text-[#554b42] hover:border-[var(--accent)]/40'
                }`}
                onClick={() => !editingSportType && setSportType(name)}
              >
                {editingSportType && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSportType(name);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs hover:bg-rose-600 transition-colors z-10"
                    title="删除此运动类型"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                {/* emoji 图标（编辑模式可点击更换） */}
                <button
                  onClick={(e) => {
                    if (!editingSportType) return;
                    e.stopPropagation();
                    setEmojiPickerFor(emojiPickerFor === name ? null : name);
                  }}
                  className={`text-2xl leading-none ${editingSportType ? 'hover:scale-110 transition-transform cursor-pointer' : 'cursor-default'}`}
                  title={editingSportType ? '点击更换图标' : name}
                >
                  {item.emoji || '🎯'}
                </button>

                {/* emoji 选择面板 */}
                {editingSportType && emojiPickerFor === name && (
                  <div
                    className="absolute left-1/2 top-full -translate-x-1/2 mt-1 z-20 w-44 p-2 rounded-xl bg-white border border-[#ded5c8] shadow-lg grid grid-cols-6 gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {SPORT_EMOJI_POOL.map((em) => (
                      <button
                        key={em}
                        onClick={() => handlePickEmoji(name, em)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md text-lg hover:bg-[#ede6dc] transition-colors ${
                          item.emoji === em ? 'bg-[var(--accent)]/20 ring-1 ring-[var(--accent)]' : ''
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-[#8a7f72]'}`} />

                {/* 名称（编辑模式可改文字） */}
                {editingSportType ? (
                  <input
                    type="text"
                    value={name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleEditName(name, e.target.value)}
                    className="w-16 text-center text-xs font-semibold bg-transparent border-b border-[#ded5c8] focus:outline-none focus:border-[var(--accent)] text-[#29251f]"
                  />
                ) : (
                  <span className="text-xs font-semibold">{name}</span>
                )}
              </div>
            );
          })}

          {/* 新增运动类型入口 */}
          {editingSportType && (
            <form
              onSubmit={handleAddSportType}
              className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-[#9e9386] text-[#8a7f72] hover:border-[var(--accent)] transition-colors"
            >
              <button
                type="button"
                onClick={() => setEmojiPickerFor(emojiPickerFor === '__new__' ? null : '__new__')}
                className="text-2xl leading-none hover:scale-110 transition-transform"
                title="选择图标"
              >
                {newSportTypeEmoji}
              </button>
              {emojiPickerFor === '__new__' && (
                <div className="relative w-44">
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 z-20 w-44 p-2 rounded-xl bg-white border border-[#ded5c8] shadow-lg grid grid-cols-6 gap-1">
                    {SPORT_EMOJI_POOL.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          setNewSportTypeEmoji(em);
                          setEmojiPickerFor(null);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-lg hover:bg-[#ede6dc] transition-colors"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input
                type="text"
                value={newSportTypeName}
                onChange={(e) => setNewSportTypeName(e.target.value)}
                placeholder="新类型"
                className="w-20 text-center text-xs font-semibold bg-transparent border-b border-[#ded5c8] focus:outline-none focus:border-[var(--accent)] text-[#29251f] placeholder:text-[#a09588]"
              />
              <button
                type="submit"
                className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
              >
                + 添加
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 板块二：运动详情打卡 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs h-fit space-y-4">
          <div className="border-b border-[#ded5c8]/60 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                运动详情
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                记录本次运动
              </h2>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              数据即刻写回
            </span>
          </div>

          <form onSubmit={handleWorkoutSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">日期</label>
                <input
                  type="date"
                  required
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">时间</label>
                <input
                  type="time"
                  required
                  value={workoutTime}
                  onChange={(e) => setWorkoutTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">时长（分钟）</label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  placeholder="如：30"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">距离（公里，可选）</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="如：5.0"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">消耗卡路里（kcal）</label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  placeholder="如：300"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">运动感受</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FEELINGS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFeeling(f.id)}
                      title={f.label}
                      className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                        feeling === f.id
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'bg-[#faf7f2] border-[#ded5c8] text-[#746d63]'
                      }`}
                    >
                      <span className="text-base leading-none">{f.emoji}</span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#746d63] mb-1">备注（可选）</label>
              <textarea
                rows={2}
                placeholder="记录一下今天的运动感受..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4d3045] to-[var(--accent)] hover:opacity-90 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? '打卡中...' : '完成打卡'}</span>
            </button>
          </form>
        </div>

        {/* 板块二右侧：最近运动记录 + 身体数据 */}
        <div className="lg:col-span-7 space-y-6">
          {/* 最近运动记录 */}
          <div className="bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                  最近运动
                </p>
                <h3 className="font-serif-sc font-bold text-base text-[#29251f]">
                  挥汗足迹
                </h3>
              </div>
              <span className="text-xs text-[#746d63]">共 {workoutRecords.length} 次</span>
            </div>

            {workoutRecords.length === 0 ? (
              <p className="text-sm text-[#8e8578] text-center py-6">
                还没有运动记录，从左侧选择类型并完成一次打卡吧
              </p>
            ) : (
              <div className="divide-y divide-[#ded5c8]/50">
                {workoutRecords.slice(0, 8).map((rec) => {
                  const d = rec.data as FitnessData;
                  return (
                    <div key={rec.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">
                          {sportTypes.find((s) => s.name === d.sportType)?.emoji || '🏃'}
                        </span>
                        <div className="min-w-0">
                          <strong className="text-sm font-bold text-[#29251f]">{d.sportType}</strong>
                          <p className="text-xs text-[#746d63] truncate">
                            {rec.date} {d.time || ''}
                            {d.duration ? ` · ${d.duration}分钟` : ''}
                            {d.distance ? ` · ${d.distance}km` : ''}
                            {d.calories ? ` · ${d.calories}kcal` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {d.feeling && (
                          <span className="text-xs font-semibold text-[#746d63]">
                            {FEELINGS.find((f) => f.id === d.feeling)?.emoji} {d.feeling}
                          </span>
                        )}
                        <button
                          onClick={() => onDeleteRecord(rec.id)}
                          className="text-[#a09187] hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                          title="删除该记录"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 板块三：本周计划 */}
      <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ded5c8]/60 pb-3">
          <div>
            <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
              本周计划 (Weekly Plan)
            </p>
            <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
              本周运动计划
            </h2>
          </div>

          <button
            onClick={() => setShowAddPlanModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增计划</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                plan.done
                  ? 'bg-[#f4f7f4] border-[#cfded0] text-[#746d63]'
                  : 'bg-[#faf7f2] border-[#ded5c8] text-[#29251f] hover:border-[#627a67]/40'
              }`}
            >
              <div
                onClick={() => onTogglePlan(plan.id)}
                className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
              >
                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    plan.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-[#9e9386] bg-white'
                  }`}
                >
                  {plan.done && <Check className="w-3.5 h-3.5" />}
                </div>

                <div className="min-w-0">
                  <strong
                    className={`text-sm font-bold truncate ${
                      plan.done ? 'line-through text-[#8e8578]' : ''
                    }`}
                  >
                    {plan.title}
                  </strong>
                  {plan.note && (
                    <p className="text-xs text-[#746d63] mt-1 line-clamp-2">
                      {plan.note}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => onDeletePlan(plan.id)}
                className="text-[#a09187] hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                title="删除该计划"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 新增周计划弹窗 */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded5c8] w-full max-w-md rounded-[var(--radius)] p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
              <h3 className="font-serif-sc font-bold text-lg text-[#29251f]">
                新增周计划项
              </h3>
              <button
                onClick={() => setShowAddPlanModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#ede6dc] text-[#746d63] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">计划名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="如：力量训练2次、中低强度有氧3次"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">补充说明或要求</label>
                <input
                  type="text"
                  placeholder="如：每次30-40分钟"
                  value={planNote}
                  onChange={(e) => setPlanNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm text-[#29251f]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#746d63] hover:bg-[#ede6dc]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold text-xs shadow-xs"
                >
                  加入计划
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
