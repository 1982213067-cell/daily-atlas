import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  Tag,
  DollarSign,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import { RecordItem, ShoppingData } from '../types/workbench';
import { SHOPPING_CATEGORIES, isoDate } from '../data/initialData';
import { formatMoney } from '../utils/helpers';

interface ShoppingViewProps {
  records: RecordItem[];
  onAddRecord: (record: Partial<RecordItem>) => Promise<void>;
  onToggleBought: (record: RecordItem) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
}

export const ShoppingView: React.FC<ShoppingViewProps> = ({
  records,
  onAddRecord,
  onToggleBought,
  onDeleteRecord,
}) => {
  const today = isoDate();

  // Form State
  const [name, setName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1 件');
  const [category, setCategory] = useState<string>('食品');
  const [price, setPrice] = useState<string>('');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter State
  const [activeFilter, setActiveFilter] = useState<'pending' | 'bought' | 'all'>('pending');

  // Filter shopping records
  const shoppingRecords = useMemo(() => {
    return records
      .filter((r) => r.type === 'home')
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [records]);

  // Metrics
  const stats = useMemo(() => {
    let pendingCount = 0;
    let pendingCost = 0;
    let boughtCount = 0;
    let boughtCost = 0;

    shoppingRecords.forEach((r) => {
      const d = r.data as ShoppingData;
      const p = d.price || 0;
      if (d.bought) {
        boughtCount++;
        boughtCost += p;
      } else {
        pendingCount++;
        pendingCost += p;
      }
    });

    return { pendingCount, pendingCost, boughtCount, boughtCost };
  }, [shoppingRecords]);

  // Submit item
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddRecord({
        type: 'home',
        date: today,
        createdAt: Date.now(),
        data: {
          name: name.trim(),
          quantity: quantity.trim() || '1 件',
          category,
          price: price ? parseFloat(price) : undefined,
          priority,
          note: note.trim(),
          bought: false,
        },
      });
      setName('');
      setPrice('');
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return shoppingRecords.filter((r) => {
      const d = r.data as ShoppingData;
      if (activeFilter === 'pending') return !d.bought;
      if (activeFilter === 'bought') return d.bought;
      return true;
    });
  }, [shoppingRecords, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs text-[#746d63] block mb-1">待买物品</span>
          <strong className="text-xl font-bold font-serif-sc text-[#29251f] block">
            {stats.pendingCount} 件
          </strong>
        </div>

        <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs text-[#746d63] block mb-1">预计花费</span>
          <strong className="text-xl font-bold font-serif-sc text-[#b65f42] block">
            {formatMoney(stats.pendingCost)}
          </strong>
        </div>

        <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs text-[#746d63] block mb-1">已买入</span>
          <strong className="text-xl font-bold font-serif-sc text-emerald-700 block">
            {stats.boughtCount} 件
          </strong>
        </div>

        <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs text-[#746d63] block mb-1">已买支出</span>
          <strong className="text-xl font-bold font-serif-sc text-[#746d63] block">
            {formatMoney(stats.boughtCost)}
          </strong>
        </div>
      </div>

      {/* Main Grid: Form Left, List Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs h-fit space-y-4">
          <div className="border-b border-[#ded5c8]/60 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                想买先记下
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                添加待买物品
              </h2>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              数据表即刻写回
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#746d63] mb-1">
                物品名称 *
              </label>
              <input
                type="text"
                required
                placeholder="如：无糖燕麦奶、原木衣架、防晒霜"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  数量或规格
                </label>
                <input
                  type="text"
                  placeholder="如：2 盒、1 瓶"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm text-[#29251f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  分类
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium"
                >
                  {SHOPPING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  预计单价/总价 (¥)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  必要程度
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium"
                >
                  <option value="high">🔴 刚需急用</option>
                  <option value="normal">⚪ 日常消耗</option>
                  <option value="low">🟢 种草观望</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#746d63] mb-1">
                备注 (型号、购买渠道或凑单需求)
              </label>
              <input
                type="text"
                placeholder="如：等大促活动降价、凑满减购买"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm text-[#29251f] placeholder:text-[#a09588]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? '保存中...' : '加入待买清单'}</span>
            </button>
          </form>
        </div>

        {/* Shopping List Panel (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ded5c8]/60 pb-3">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                物品列表
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                待买清单 ({filteredList.length})
              </h2>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center bg-[#faf7f2] border border-[#ded5c8] rounded-xl p-1 text-xs font-semibold text-[#544b42]">
              {[
                { id: 'pending', label: '待买' },
                { id: 'bought', label: '已买' },
                { id: 'all', label: '全部' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-3.5 py-1 rounded-lg transition-all ${
                    activeFilter === f.id ? 'bg-[var(--accent)] text-white' : 'hover:text-[#29251f]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-[#8e8578] text-sm">
              待买清单已清空，理智消费，轻装生活
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredList.map((item) => {
                const d = item.data as ShoppingData;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                      d.bought
                        ? 'bg-[#f7f5f2] border-[#e2d8cb] text-[#8a8075]'
                        : 'bg-[#fffdfa] border-[#ded5c8] hover:border-[#a57c45]/40 text-[#29251f] shadow-2xs'
                    }`}
                  >
                    <div
                      onClick={() => onToggleBought(item)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          d.bought
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-[#9e9386] bg-white'
                        }`}
                      >
                        {d.bought && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong
                            className={`text-sm font-bold truncate ${
                              d.bought ? 'line-through text-[#8e8479]' : ''
                            }`}
                          >
                            {d.name}
                          </strong>

                          <span className="text-[11px] text-[#746d63] bg-[#ede6dc] px-2 py-0.5 rounded-md font-medium shrink-0">
                            {d.quantity}
                          </span>

                          <span className="text-[10px] bg-[#faf5ed] text-[#a57c45] border border-[#eee2ce] px-2 py-0.5 rounded-md font-semibold shrink-0">
                            {d.category}
                          </span>
                        </div>

                        {d.note && (
                          <p className="text-xs text-[#746d63] mt-1 truncate">
                            {d.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {d.price !== undefined && (
                        <span className="text-sm font-bold text-[#b65f42]">
                          {formatMoney(d.price)}
                        </span>
                      )}

                      <button
                        onClick={() => onDeleteRecord(item.id)}
                        className="opacity-60 group-hover:opacity-100 text-[#a09187] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="删除该条待买"
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
