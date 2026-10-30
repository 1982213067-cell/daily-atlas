import React, { useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Minus,
  Check,
  Flame,
  Trash2,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import { HabitItem, HabitType, ToneType } from '../types/workbench';
import { calculateHabitStreak, isHabitDone } from '../utils/helpers';
import { isoDate, shiftDate } from '../data/initialData';

interface HabitsViewProps {
  habits: HabitItem[];
  onCheckinHabit: (habitId: string, date: string, value: number | string) => Promise<void>;
  onCreateHabit: (habit: Partial<HabitItem>) => Promise<void>;
  onDeleteHabit: (id: string) => Promise<void>;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits,
  onCheckinHabit,
  onCreateHabit,
  onDeleteHabit,
}) => {
  const today = isoDate();

  // Helper: human-readable type label
  const typeLabel = (t: HabitType) =>
    t === 'check' ? '勾选' : t === 'counter' ? '计数' : t === 'time' ? '时间点' : '词语';

  // Helper: display string for a habit's current value
  const displayValue = (habit: HabitItem) => {
    const v = habit.entries?.[today];
    if (habit.type === 'time') return typeof v === 'string' && v ? v : '--:--';
    if (habit.type === 'word') return typeof v === 'string' && v ? v : '未填写';
    return String(v || 0);
  };

  // Add Habit Dialog State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [habitToDelete, setHabitToDelete] = useState<HabitItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<HabitType>('check');
  const [target, setTarget] = useState<number>(1);
  const [unit, setUnit] = useState<string>('次');
  const [tone, setTone] = useState<ToneType>('sage');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Overall Statistics
  const overallStats = React.useMemo(() => {
    let completedToday = 0;
    let maxStreak = 0;
    let sumRate30 = 0;

    habits.forEach((h) => {
      const { currentStreak, bestStreak, rate30 } = calculateHabitStreak(h, today);
      const todayVal = h.entries?.[today] || 0;
      if (isHabitDone(h, todayVal)) {
        completedToday++;
      }
      if (bestStreak > maxStreak) maxStreak = bestStreak;
      sumRate30 += rate30;
    });

    const avgRate30 = habits.length > 0 ? Math.round(sumRate30 / habits.length) : 0;
    return {
      completedToday,
      totalHabits: habits.length,
      maxStreak,
      avgRate30,
    };
  }, [habits, today]);

  // Create Habit Handler
  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setIsSubmitting(true);
      await onCreateHabit({
        name: name.trim(),
        type,
        target: type === 'check' || type === 'time' || type === 'word' ? 1 : target > 0 ? target : 1,
        unit: unit.trim() || (type === 'time' ? '时间点' : type === 'word' ? '词语' : '次'),
        tone,
        entries: {},
      });
      setName('');
      setType('check');
      setTarget(1);
      setUnit('次');
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate 30 days list for the heatmap
  const last30Days = React.useMemo(() => {
    const list: string[] = [];
    for (let i = 29; i >= 0; i--) {
      list.push(shiftDate(-i));
    }
    return list;
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner Stats & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs">
        <div className="grid grid-cols-3 gap-6 sm:gap-10">
          <div>
            <span className="text-xs text-[#746d63] block mb-1">今日完成</span>
            <strong className="text-xl font-bold font-serif-sc text-[#29251f]">
              {overallStats.completedToday} / {overallStats.totalHabits}
            </strong>
          </div>
          <div>
            <span className="text-xs text-[#746d63] block mb-1">最佳连续打卡</span>
            <strong className="text-xl font-bold font-serif-sc text-[#b65f42] flex items-center gap-1">
              <Flame className="w-4 h-4 fill-[#b65f42]" />
              {overallStats.maxStreak} 天
            </strong>
          </div>
          <div>
            <span className="text-xs text-[#746d63] block mb-1">近30天完成率</span>
            <strong className="text-xl font-bold font-serif-sc text-emerald-700">
              {overallStats.avgRate30}%
            </strong>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-xs shadow-xs transition-opacity cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>新增习惯</span>
        </button>
      </div>

      {/* Habits Today Checkin Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
              今日打卡
            </p>
            <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
              完成一点，就算前进
            </h2>
          </div>
          <span className="text-xs text-[#746d63]">点击或计数直接同步线上数据表</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {habits.map((habit) => {
            const rawVal = habit.entries?.[today];
            const isDone = isHabitDone(habit, rawVal);
            const streakInfo = calculateHabitStreak(habit, today);
            const isTime = habit.type === 'time';
            const isWord = habit.type === 'word';

            return (
              <div
                key={habit.id}
                className={`p-5 rounded-[var(--radius)] border transition-all flex flex-col justify-between ${
                  isDone
                    ? 'bg-[#f4f8f4] border-[#cfded0] shadow-2xs'
                    : 'bg-[#fffdfa] border-[#ded5c8] shadow-2xs hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-base font-bold text-[#29251f] truncate">
                          {habit.name}
                        </strong>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[#ede6dc] text-[#554b42] font-medium shrink-0">
                          {typeLabel(habit.type)}
                        </span>
                      </div>
                      <span className="text-xs text-[#746d63] mt-1 block">
                        {isTime || isWord ? '记录：' : '目标：每日 '}{habit.target} {habit.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200"
                        title="连续打卡天数"
                      >
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {streakInfo.currentStreak} 天
                      </span>
                      <button
                        onClick={() => setHabitToDelete(habit)}
                        className="text-[#a09187] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="删除此习惯"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar (hidden for time/word types) */}
                  {!isTime && !isWord && (
                    <div className="w-full bg-[#ded5c8]/50 h-2 rounded-full overflow-hidden mb-4">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isDone ? 'bg-emerald-600' : 'bg-[var(--accent)]'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((((rawVal as number) || 0) / habit.target) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                  {(isTime || isWord) && <div className="h-2 mb-4" />}
                </div>

                {/* Card Bottom: Check-in controllers */}
                <div className="pt-2 flex items-center justify-between border-t border-[#ded5c8]/40">
                  <span className="text-xs font-medium text-[#746d63]">
                    今日：
                    <b className="text-[#29251f]">
                      {isTime ? (typeof rawVal === 'string' && rawVal ? rawVal : '--:--') : isWord ? (typeof rawVal === 'string' && rawVal ? rawVal : '未填写') : String(rawVal || 0)}
                    </b>
                    {!isTime && !isWord && <> / {habit.target} {habit.unit}</>}
                  </span>

                  {habit.type === 'check' ? (
                    <button
                      onClick={() => onCheckinHabit(habit.id, today, isDone ? 0 : 1)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[#faf7f2] border border-[#ded5c8] text-[#544b42] hover:border-emerald-600 hover:text-emerald-700'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isDone ? '已完成' : '打卡'}</span>
                    </button>
                  ) : habit.type === 'counter' ? (
                    <div className="flex items-center gap-1 bg-[#faf7f2] border border-[#ded5c8] rounded-xl p-0.5">
                      <button
                        onClick={() => onCheckinHabit(habit.id, today, Math.max(0, ((rawVal as number) || 0) - 1))}
                        className="w-7 h-7 rounded-lg hover:bg-[#ede6dc] text-[#554b42] flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-[#29251f]">
                        {(rawVal as number) || 0}
                      </span>
                      <button
                        onClick={() => onCheckinHabit(habit.id, today, ((rawVal as number) || 0) + 1)}
                        className="w-7 h-7 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : habit.type === 'time' ? (
                    <input
                      type="time"
                      defaultValue={typeof rawVal === 'string' ? rawVal : ''}
                      onChange={(e) => onCheckinHabit(habit.id, today, e.target.value)}
                      className="h-7 px-2 text-center text-xs font-bold bg-[#faf7f2] border border-[#ded5c8] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                    />
                  ) : habit.type === 'word' ? (
                    <input
                      type="text"
                      defaultValue={typeof rawVal === 'string' ? rawVal : ''}
                      placeholder="输入词语"
                      onChange={(e) => onCheckinHabit(habit.id, today, e.target.value)}
                      className="h-7 w-28 px-2 text-center text-xs font-bold bg-[#faf7f2] border border-[#ded5c8] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={(rawVal as number) || ''}
                        placeholder="0"
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onCheckinHabit(habit.id, today, val);
                        }}
                        className="w-14 h-7 text-center text-xs font-bold bg-[#faf7f2] border border-[#ded5c8] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                      />
                      <span className="text-xs text-[#746d63]">{habit.unit}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 30-Day Heatmap Section */}
      <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ded5c8]/60 pb-3">
          <div>
            <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
              坚持，是有形状的
            </p>
            <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
              30 天打卡热力图 (30-Day Heatmap)
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#746d63]">
            <span>颜色越深代表完成度越高</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-[#faf7f2] border border-[#ded5c8]" />
              <span className="w-3 h-3 rounded-xs bg-[#cfded0]" />
              <span className="w-3 h-3 rounded-xs bg-[#78a57e]" />
              <span className="w-3 h-3 rounded-xs bg-[#477358]" />
            </div>
          </div>
        </div>

        <div className="space-y-5 overflow-x-auto pb-2">
          {habits.map((habit) => {
            const streakInfo = calculateHabitStreak(habit, today);
            return (
              <div key={habit.id} className="min-w-[620px] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <strong className="font-bold text-[#29251f] text-sm">{habit.name}</strong>
                    <span className="text-[#8a7f72]">
                      {habit.type === 'time' || habit.type === 'word' ? '记录打卡' : `目标 ${habit.target} ${habit.unit}`}
                    </span>
                  </div>
                  <span className="text-[#746d63]">
                    近30天完成率：<b className="text-emerald-700">{streakInfo.rate30}%</b> · 最佳连续：<b className="text-[#b65f42]">{streakInfo.bestStreak}天</b>
                  </span>
                </div>

                {/* 30 day heat blocks row */}
                <div className="grid grid-cols-30 gap-1.5">
                  {last30Days.map((dStr) => {
                    const val = habit.entries?.[dStr];
                    const done = isHabitDone(habit, val);
                    const numVal = typeof val === 'number' ? val : 0;
                    const ratio = numVal / habit.target;
                    const isToday = dStr === today;

                    let bg = 'bg-[#faf7f2] border border-[#ded5c8]';
                    if (done) bg = 'bg-[#477358] border border-[#3b6149] text-white';
                    else if (ratio >= 0.5) bg = 'bg-[#78a57e] border border-[#67916c] text-white';
                    else if (ratio > 0) bg = 'bg-[#cfded0] border border-[#bed0bf]';

                    return (
                      <div
                        key={dStr}
                        onClick={() => {
                          if (habit.type === 'check') {
                            onCheckinHabit(habit.id, dStr, done ? 0 : 1);
                          } else if (habit.type === 'time' || habit.type === 'word') {
                            onCheckinHabit(habit.id, dStr, done ? '' : (habit.type === 'time' ? '00:00' : '已记录'));
                          } else {
                            onCheckinHabit(habit.id, dStr, done ? 0 : habit.target);
                          }
                        }}
                        className={`h-7 rounded-sm flex items-center justify-center text-[9px] font-mono cursor-pointer transition-all hover:scale-110 ${bg} ${
                          isToday ? 'ring-2 ring-[var(--accent)] ring-offset-1' : ''
                        }`}
                        title={`${dStr}：${habit.type === 'check' ? (done ? '已打卡' : '未打卡') : `${val ?? 0} ${habit.unit}`} (点击切换)`}
                      >
                        {done ? (habit.type === 'check' ? '✓' : '●') : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded5c8] w-full max-w-md rounded-[var(--radius)] p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
              <h3 className="font-serif-sc font-bold text-lg text-[#29251f]">
                新增生活微习惯
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#ede6dc] text-[#746d63] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  习惯名称
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：晨间拉伸、喝温水、阅读30分钟"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  打卡类型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'check', label: '勾选打卡', desc: '如：早起、冥想' },
                    { id: 'counter', label: '计数打卡', desc: '如：喝8杯水' },
                    { id: 'time', label: '时间点打卡', desc: '如：12:45' },
                    { id: 'word', label: '词语打卡', desc: '不限数量自定义' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setType(item.id as HabitType);
                        if (item.id === 'check') {
                          setTarget(1);
                          setUnit('次');
                        } else if (item.id === 'counter') {
                          setTarget(8);
                          setUnit('杯');
                        } else if (item.id === 'time') {
                          setTarget(1);
                          setUnit('时间点');
                        } else {
                          setTarget(1);
                          setUnit('词语');
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        type === item.id
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                          : 'bg-[#faf7f2] border-[#ded5c8] text-[#554b42]'
                      }`}
                    >
                      <strong className="block text-xs font-bold">{item.label}</strong>
                      <span className="text-[10px] opacity-75">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">
                    每日目标量
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={target}
                    disabled={type === 'time' || type === 'word'}
                    onChange={(e) => setTarget(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-bold text-[#29251f] focus:outline-none focus:border-[var(--accent)] disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#746d63] mb-1">
                    计量单位
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：次、杯、小时、页"
                    value={unit}
                    disabled={type === 'time' || type === 'word'}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] focus:outline-none focus:border-[var(--accent)] disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#746d63] hover:bg-[#ede6dc]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? '添加中...' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Habit Delete Confirmation Modal */}
      {habitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded5c8] w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#29251f]">
                  删除生活习惯
                </h3>
                <p className="text-xs text-[#746d63]">
                  将从线上数据库和热力图中永久移除
                </p>
              </div>
            </div>

            <p className="text-xs text-[#554b42] leading-relaxed bg-[#faf7f2] p-3 rounded-xl border border-[#ded5c8]">
              确定要删除习惯“<strong className="text-[#29251f]">{habitToDelete.name}</strong>”吗？所有的历史打卡记录将同步清空。
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setHabitToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#746d63] hover:bg-[#ede6dc] transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await onDeleteHabit(habitToDelete.id);
                    setHabitToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? '正在删除...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
