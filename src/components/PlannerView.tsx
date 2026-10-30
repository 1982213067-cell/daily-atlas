import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Check,
  Clock,
  Bell,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { PlannerData, RecordItem } from '../types/workbench';
import { PLANNER_LISTS, isoDate, shiftDate } from '../data/initialData';

interface PlannerViewProps {
  records: RecordItem[];
  onAddRecord: (record: Partial<RecordItem>) => Promise<void>;
  onToggleTask: (record: RecordItem) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  records,
  onAddRecord,
  onToggleTask,
  onDeleteRecord,
}) => {
  const today = isoDate();

  // Form State
  const [title, setTitle] = useState<string>('');
  const [time, setTime] = useState<string>('10:00');
  const [list, setList] = useState<string>('生活');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [targetDate, setTargetDate] = useState<string>(today);
  const [note, setNote] = useState<string>('');
  const [remind, setRemind] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter State
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'pending' | 'done'>('today');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(today);

  // Next 7 days list for the top calendar strip
  const next7Days = useMemo(() => {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = isoDate(d);
      const count = records.filter(
        (r) => r.type === 'planner' && r.date === dateStr && !(r.data as PlannerData).done
      ).length;
      days.push({
        dateStr,
        dayNum: d.getDate(),
        weekday: `周${weekdays[d.getDay()]}`,
        isToday: i === 0,
        count,
      });
    }
    return days;
  }, [records]);

  // Submit task
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddRecord({
        type: 'planner',
        date: targetDate,
        createdAt: Date.now(),
        data: {
          title: title.trim(),
          time,
          list,
          priority,
          note: note.trim(),
          remind,
          done: false,
        },
      });
      setTitle('');
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered task items
  const filteredTasks = useMemo(() => {
    let listItems = records.filter((r) => r.type === 'planner');

    if (selectedCalendarDate) {
      listItems = listItems.filter((r) => r.date === selectedCalendarDate);
    } else if (activeFilter === 'today') {
      listItems = listItems.filter((r) => r.date === today);
    }

    if (activeFilter === 'pending') {
      listItems = listItems.filter((r) => !(r.data as PlannerData).done);
    } else if (activeFilter === 'done') {
      listItems = listItems.filter((r) => (r.data as PlannerData).done);
    }

    return listItems.sort((a, b) => {
      const aDone = (a.data as PlannerData).done ? 1 : 0;
      const bDone = (b.data as PlannerData).done ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const aP = (a.data as PlannerData).priority === 'high' ? 0 : (a.data as PlannerData).priority === 'normal' ? 1 : 2;
      const bP = (b.data as PlannerData).priority === 'high' ? 0 : (b.data as PlannerData).priority === 'normal' ? 1 : 2;
      return aP - bP;
    });
  }, [records, activeFilter, selectedCalendarDate, today]);

  return (
    <div className="space-y-6">
      {/* 7-Day Calendar Strip */}
      <div className="bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
              一周日历
            </p>
            <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
              接下来七天安排
            </h2>
          </div>
          <button
            onClick={() => setSelectedCalendarDate(null)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
              selectedCalendarDate === null
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'text-[#746d63] border-[#ded5c8] hover:bg-[#ede6dc]'
            }`}
          >
            显示全部日期
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {next7Days.map((d) => {
            const isSelected = selectedCalendarDate === d.dateStr;
            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => setSelectedCalendarDate(d.dateStr)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-h-[78px] ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs scale-102'
                    : d.isToday
                    ? 'bg-[#faf5f0] border-[var(--accent)]/50 text-[#29251f]'
                    : 'bg-[#faf7f2] border-[#ded5c8] text-[#544b42] hover:border-[#ded5c8]/80 hover:bg-white'
                }`}
              >
                <span className="text-[11px] font-medium opacity-80">{d.weekday}</span>
                <strong className="text-lg font-bold font-serif-sc">{d.dayNum}</strong>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : d.count > 0
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-transparent'
                  }`}
                >
                  {d.count > 0 ? `${d.count}待办` : '·'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form Left, Task List Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs h-fit space-y-4">
          <div className="border-b border-[#ded5c8]/60 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                提醒事项
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                添加新待办
              </h2>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              数据表即刻写回
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#746d63] mb-1">
                要做什么 *
              </label>
              <input
                type="text"
                required
                placeholder="写下一件具体的事，如：预约牙医检查"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  日期
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  时间点
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  清单归属
                </label>
                <select
                  value={list}
                  onChange={(e) => setList(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium"
                >
                  {PLANNER_LISTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  优先级
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium"
                >
                  <option value="high">🔴 高优先级 (重要紧急)</option>
                  <option value="normal">⚪ 普通优先级</option>
                  <option value="low">🟢 低优先级 (有空再做)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#746d63] mb-1">
                备忘与地点补充
              </label>
              <input
                type="text"
                placeholder="地点、材料准备或步骤提示"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm text-[#29251f] placeholder:text-[#a09588]"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-[#544b42] cursor-pointer">
              <input
                type="checkbox"
                checked={remind}
                onChange={(e) => setRemind(e.target.checked)}
                className="rounded text-[var(--accent)]"
              />
              <span className="flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-[#8a7f72]" />
                到时间设为置顶提醒
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? '保存中...' : '加入日程'}</span>
            </button>
          </form>
        </div>

        {/* Task List Panel (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ded5c8]/60 pb-3">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                智能清单
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                待办事项 ({filteredTasks.length})
              </h2>
            </div>

            {/* Filter tags */}
            <div className="flex items-center bg-[#faf7f2] border border-[#ded5c8] rounded-xl p-1 text-xs font-semibold text-[#544b42]">
              {[
                { id: 'today', label: '今天' },
                { id: 'pending', label: '待完成' },
                { id: 'done', label: '已完成' },
                { id: 'all', label: '全部' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeFilter === f.id ? 'bg-[var(--accent)] text-white' : 'hover:text-[#29251f]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-[#8e8578] text-sm">
              当前视图下暂无事项，享受属于自己的片刻留白
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task) => {
                const p = task.data as PlannerData;
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 group ${
                      p.done
                        ? 'bg-[#f7f5f2] border-[#e2d8cb] text-[#8a8075]'
                        : 'bg-[#fffdfa] border-[#ded5c8] hover:border-[#4d3045]/40 text-[#29251f] shadow-2xs'
                    }`}
                  >
                    <div
                      onClick={() => onToggleTask(task)}
                      className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          p.done
                            ? 'bg-[#4d3045] border-[#4d3045] text-white'
                            : 'border-[#9e9386] bg-white'
                        }`}
                      >
                        {p.done && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong
                            className={`text-sm font-bold truncate ${
                              p.done ? 'line-through text-[#8e8479]' : ''
                            }`}
                          >
                            {p.title}
                          </strong>

                          {p.priority === 'high' && (
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-bold">
                              高优先级
                            </span>
                          )}

                          <span className="text-[10px] bg-[#ede6dc] text-[#554b42] px-2 py-0.5 rounded-md font-medium">
                            {p.list}
                          </span>
                        </div>

                        {p.note && (
                          <p className="text-xs text-[#746d63] mt-1 line-clamp-2">
                            {p.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {p.time && (
                        <span className="text-xs text-[#746d63] font-mono flex items-center gap-1 bg-[#ede6dc]/70 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3 h-3" />
                          {p.time}
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteRecord(task.id)}
                        className="opacity-60 group-hover:opacity-100 text-[#a09187] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="删除该事项"
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
      </div>
    </div>
  );
};
