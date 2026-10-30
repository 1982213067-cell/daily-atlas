import React, { useState, useMemo } from 'react';
import {
  Archive,
  Wallet,
  Activity,
  Calendar,
  ShoppingCart,
  Filter,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { RecordItem } from '../types/workbench';
import { formatMoney } from '../utils/helpers';
import { isoDate, shiftDate } from '../data/initialData';

interface ArchiveViewProps {
  records: RecordItem[];
  onDeleteRecord: (id: string) => Promise<void>;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ records, onDeleteRecord }) => {
  const today = isoDate();
  const yesterday = shiftDate(-1);

  const [activeFilter, setActiveFilter] = useState<'all' | 'money' | 'fitness' | 'planner' | 'home'>('all');

  // Filter records
  const filtered = useMemo(() => {
    return records
      .filter((r) => activeFilter === 'all' || r.type === activeFilter)
      .sort((a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));
  }, [records, activeFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, RecordItem[]>();
    filtered.forEach((r) => {
      const list = map.get(r.date) || [];
      list.push(r);
      map.set(r.date, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const getDateLabel = (dateStr: string) => {
    if (dateStr === today) return '今天 (Today)';
    if (dateStr === yesterday) return '昨天 (Yesterday)';
    return dateStr;
  };

  return (
    <div className="space-y-6">
      {/* Archive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs">
        <div>
          <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
            所有日常，都有出处
          </p>
          <h2 className="text-xl font-bold font-serif-sc text-[#29251f]">
            按日期折叠的生活记录
          </h2>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: '全部' },
            { id: 'money', label: '财务' },
            { id: 'fitness', label: '健康' },
            { id: 'planner', label: '日程' },
            { id: 'home', label: '待买' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === chip.id
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'bg-[#faf7f2] border border-[#ded5c8] text-[#544b42] hover:bg-white'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date-Grouped Timeline List */}
      {grouped.length === 0 ? (
        <div className="bg-[#fffdfa] border border-[#ded5c8] p-12 rounded-[var(--radius)] text-center text-[#8e8578] text-sm">
          这个筛选条件下还没有记录
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateKey, items]) => (
            <div
              key={dateKey}
              className="bg-[#fffdfa] border border-[#ded5c8] rounded-[var(--radius)] overflow-hidden shadow-2xs"
            >
              {/* Date Header Strip */}
              <div className="bg-[#ede6dc]/70 px-5 py-3 border-b border-[#ded5c8] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                  <strong className="font-serif-sc font-bold text-sm text-[#29251f]">
                    {getDateLabel(dateKey)}
                  </strong>
                  <span className="text-xs text-[#746d63] font-mono">({dateKey})</span>
                </div>
                <span className="text-xs font-semibold text-[#8a7f72]">
                  {items.length} 条记录
                </span>
              </div>

              {/* Items in this date */}
              <div className="divide-y divide-[#ded5c8]/50 px-5">
                {items.map((r) => {
                  let icon = <Archive className="w-4 h-4" />;
                  let typeLabel = '综合';
                  let typeColor = 'bg-stone-100 text-stone-700';
                  let title = '';
                  let detail = '';
                  let rightText = '';

                  if (r.type === 'money') {
                    const d = r.data as any;
                    icon = <Wallet className="w-4 h-4" />;
                    typeLabel = d.flow === 'expense' ? '支出' : '收入';
                    typeColor = d.flow === 'expense' ? 'bg-[#b65f42]/15 text-[#b65f42]' : 'bg-emerald-100 text-emerald-800';
                    title = `${d.category} · ${d.note || '日常收支'}`;
                    detail = `时间戳 ${new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    rightText = `${d.flow === 'expense' ? '-' : '+'}${formatMoney(d.amount)}`;
                  } else if (r.type === 'fitness') {
                    const d = r.data as any;
                    icon = <Activity className="w-4 h-4" />;
                    typeLabel = '减脂健康';
                    typeColor = 'bg-[#627a67]/15 text-[#627a67]';
                    title = `体重 ${d.weight} kg${d.bodyFat ? ` · 体脂 ${d.bodyFat}%` : ''}`;
                    detail = d.note || '身体打卡记录';
                    rightText = d.duration ? `运动 ${d.duration}min` : '已测算';
                  } else if (r.type === 'planner') {
                    const d = r.data as any;
                    icon = <Calendar className="w-4 h-4" />;
                    typeLabel = d.list || '日程';
                    typeColor = 'bg-[#4d3045]/15 text-[#4d3045]';
                    title = d.title;
                    detail = d.note || `${d.time || '全天'} · 优先级 ${d.priority}`;
                    rightText = d.done ? '已完成' : '待处理';
                  } else if (r.type === 'home') {
                    const d = r.data as any;
                    icon = <ShoppingCart className="w-4 h-4" />;
                    typeLabel = '待买清单';
                    typeColor = 'bg-[#a57c45]/15 text-[#a57c45]';
                    title = `${d.name} (${d.quantity || '1件'})`;
                    detail = `${d.category} · ${d.note || '生活采购'}`;
                    rightText = d.bought ? '已购' : d.price ? formatMoney(d.price) : '待购';
                  }

                  return (
                    <div
                      key={r.id}
                      className="py-3 flex items-center justify-between gap-4 group hover:bg-[#faf7f2]/50 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-[#faf7f2] border border-[#ded5c8] text-[#544b42] flex items-center justify-center shrink-0">
                          {icon}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 ${typeColor}`}>
                              {typeLabel}
                            </span>
                            <strong className="text-sm font-bold text-[#29251f] truncate">
                              {title}
                            </strong>
                          </div>
                          <span className="text-xs text-[#746d63] truncate block mt-0.5">
                            {detail}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-[#29251f]">{rightText}</span>
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="opacity-40 group-hover:opacity-100 text-[#a09187] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="从数据库删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
