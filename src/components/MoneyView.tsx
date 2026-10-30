import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  PieChart as PieIcon,
  Download,
  Filter,
  Calendar,
} from 'lucide-react';
import { RecordItem, Settings, MoneyData } from '../types/workbench';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, isoDate } from '../data/initialData';
import { formatMoney } from '../utils/helpers';

interface MoneyViewProps {
  records: RecordItem[];
  settings: Settings;
  onAddRecord: (record: Partial<RecordItem>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onUpdateSettings: (settings: Partial<Settings>) => Promise<void>;
}

export const MoneyView: React.FC<MoneyViewProps> = ({
  records,
  settings,
  onAddRecord,
  onDeleteRecord,
  onUpdateSettings,
}) => {
  const today = isoDate();
  const currentMonth = today.slice(0, 7);

  // Form State
  const [flow, setFlow] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('吃饭');
  const [date, setDate] = useState<string>(today);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filters
  const [filterFlow, setFilterFlow] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [budgetInput, setBudgetInput] = useState<string>(String(settings.budget || 5000));

  // Sync category default when flow changes
  const handleFlowChange = (newFlow: 'expense' | 'income') => {
    setFlow(newFlow);
    setCategory(newFlow === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  };

  // Submit new transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    try {
      setIsSubmitting(true);
      await onAddRecord({
        type: 'money',
        date,
        createdAt: Date.now(),
        data: {
          flow,
          amount: Number(num.toFixed(2)),
          category,
          note: note.trim() || (flow === 'expense' ? '日常支出' : '日常收入'),
        },
      });
      setAmount('');
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Money records list
  const moneyRecords = useMemo(() => {
    return records
      .filter((r) => r.type === 'money')
      .sort((a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));
  }, [records]);

  // Current Month Stats
  const currentMonthStats = useMemo(() => {
    const list = moneyRecords.filter((r) => r.date.startsWith(currentMonth));
    let income = 0;
    let expense = 0;
    list.forEach((r) => {
      const d = r.data as MoneyData;
      if (d.flow === 'income') income += d.amount;
      else expense += d.amount;
    });
    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [moneyRecords, currentMonth]);

  // Previous Month Stats for Comparison
  const prevMonthCompare = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const prevMonth = d.toISOString().slice(0, 7);

    const prevList = moneyRecords.filter((r) => r.date.startsWith(prevMonth));
    const prevExpense = prevList
      .filter((r) => (r.data as MoneyData).flow === 'expense')
      .reduce((sum, r) => sum + (r.data as MoneyData).amount, 0);

    if (prevExpense === 0) {
      return { diff: 0, percent: 0, text: '上月无支出对比数据' };
    }

    const diff = currentMonthStats.expense - prevExpense;
    const percent = Math.round((Math.abs(diff) / prevExpense) * 100);

    if (diff > 0) {
      return {
        diff,
        percent,
        text: `比上月同期多花 ${formatMoney(diff)} (↑ ${percent}%)`,
        isHigher: true,
      };
    } else {
      return {
        diff: Math.abs(diff),
        percent,
        text: `比上月节省了 ${formatMoney(Math.abs(diff))} (↓ ${percent}%)`,
        isHigher: false,
      };
    }
  }, [moneyRecords, currentMonthStats.expense]);

  // Spending Breakdown By Category for current month
  const categoryBreakdown = useMemo(() => {
    const expenses = moneyRecords.filter(
      (r) => r.date.startsWith(currentMonth) && (r.data as MoneyData).flow === 'expense'
    );
    const catMap: Record<string, number> = {};
    expenses.forEach((r) => {
      const d = r.data as MoneyData;
      catMap[d.category] = (catMap[d.category] || 0) + d.amount;
    });

    const total = currentMonthStats.expense || 1;
    const sorted = Object.entries(catMap)
      .map(([name, sum]) => ({
        name,
        amount: sum,
        percent: Math.round((sum / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    return sorted;
  }, [moneyRecords, currentMonth, currentMonthStats.expense]);

  // Category color palette
  const COLORS = ['#b65f42', '#627a67', '#7d5b75', '#a57c45', '#5f7188', '#c58d69', '#879a75', '#8e8478'];

  // Filtered records
  const filteredRecords = useMemo(() => {
    return moneyRecords.filter((r) => {
      const d = r.data as MoneyData;
      if (filterFlow !== 'all' && d.flow !== filterFlow) return false;
      if (filterCategory !== 'all' && d.category !== filterCategory) return false;
      return true;
    });
  }, [moneyRecords, filterFlow, filterCategory]);

  // Save budget handler
  const handleSaveBudget = async () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) {
      await onUpdateSettings({ budget: val });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['日期', '收支类型', '分类', '金额', '备注'];
    const rows = moneyRecords.map((r) => {
      const d = r.data as MoneyData;
      return [r.date, d.flow === 'expense' ? '支出' : '收入', d.category, d.amount, `"${d.note || ''}"`];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `财务收支流水_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const budget = settings.budget || 5000;
  const budgetUsedPercent = Math.min(100, Math.round((currentMonthStats.expense / (budget || 1)) * 100));

  return (
    <div className="space-y-6">
      {/* Top Banner Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#746d63]">
          <Calendar className="w-3.5 h-3.5" />
          <span>当前统计月份：{currentMonth}</span>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#fffdfa] border border-[#ded5c8] hover:bg-[#ede6dc] text-[#443c34] transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>导出账目表格 (CSV)</span>
        </button>
      </div>

      {/* Main Grid: Form Left, Stats Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs h-fit space-y-5">
          <div className="border-b border-[#ded5c8]/60 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                收支手账
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                记一笔账
              </h2>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              实时写入线上表
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Flow segmented button */}
            <div className="grid grid-cols-2 p-1 bg-[#ede6dc] rounded-xl text-sm font-semibold text-[#544b42]">
              <button
                type="button"
                onClick={() => handleFlowChange('expense')}
                className={`py-2 rounded-lg transition-all ${
                  flow === 'expense'
                    ? 'bg-[#b65f42] text-white shadow-xs'
                    : 'hover:text-[#29251f]'
                }`}
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => handleFlowChange('income')}
                className={`py-2 rounded-lg transition-all ${
                  flow === 'income'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'hover:text-[#29251f]'
                }`}
              >
                收入
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-semibold text-[#746d63] mb-1.5">
                金额
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-[#746d63]">
                  ¥
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xl font-bold text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {/* Category & Date in row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1.5">
                  分类
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] focus:outline-none focus:border-[var(--accent)]"
                >
                  {(flow === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1.5">
                  日期
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-[#746d63] mb-1.5">
                备注说明
              </label>
              <input
                type="text"
                maxLength={60}
                placeholder="这笔钱花在了哪里，如：周末聚餐"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? '保存中...' : '记下这笔'}</span>
            </button>
          </form>
        </div>

        {/* Stats & Breakdown (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Monthly 3 Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
              <span className="text-xs text-[#746d63] block mb-1">本月收入</span>
              <strong className="text-lg sm:text-xl font-bold text-emerald-700 tracking-tight block">
                {formatMoney(currentMonthStats.income)}
              </strong>
            </div>

            <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
              <span className="text-xs text-[#746d63] block mb-1">本月支出</span>
              <strong className="text-lg sm:text-xl font-bold text-[#b65f42] tracking-tight block">
                {formatMoney(currentMonthStats.expense)}
              </strong>
            </div>

            <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
              <span className="text-xs text-[#746d63] block mb-1">本月剩余</span>
              <strong className="text-lg sm:text-xl font-bold text-[#29251f] tracking-tight block">
                {formatMoney(currentMonthStats.balance)}
              </strong>
            </div>
          </div>

          {/* Month Comparison Card */}
          <div className="bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider mb-1">
                月度对比
              </p>
              <h3 className="font-serif-sc font-bold text-base text-[#29251f]">
                {prevMonthCompare.text}
              </h3>
              <p className="text-xs text-[#746d63] mt-0.5">
                数据基于上月完整支出与本月当前支出的综合环比
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#ede6dc] text-[#544b42] flex items-center justify-center shrink-0">
              {prevMonthCompare.isHigher ? (
                <TrendingUp className="w-5 h-5 text-rose-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-emerald-600" />
              )}
            </div>
          </div>

          {/* Budget Bar Card */}
          <div className="bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                  月度预算
                </p>
                <h3 className="font-serif-sc font-bold text-base text-[#29251f]">
                  花得明白，不必紧绷
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span>预算 ¥</span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onBlur={handleSaveBudget}
                  className="w-20 px-2 py-1 bg-[#faf7f2] border border-[#ded5c8] rounded-lg text-center font-bold text-[#29251f] focus:outline-none focus:border-[var(--accent)]"
                  title="输入数值后失去焦点即可更新线上预算"
                />
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#ded5c8]/50 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  budgetUsedPercent > 100
                    ? 'bg-rose-600'
                    : budgetUsedPercent > 80
                    ? 'bg-amber-600'
                    : 'bg-[#627a67]'
                }`}
                style={{ width: `${Math.min(100, budgetUsedPercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#746d63]">
              <span>已使用 {budgetUsedPercent}%</span>
              <span className="font-semibold text-[#29251f]">
                剩余 {formatMoney(Math.max(0, budget - currentMonthStats.expense))}
              </span>
            </div>
          </div>

          {/* Spending Structure Breakdown Chart */}
          <div className="bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                  消费结构
                </p>
                <h3 className="font-serif-sc font-bold text-base text-[#29251f]">
                  钱花在了哪里
                </h3>
              </div>
              <PieIcon className="w-4 h-4 text-[#8a7f72]" />
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-[#8e8578] text-center py-4">
                本月暂无支出记录
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Visual Bars representation */}
                <div className="space-y-2.5">
                  {categoryBreakdown.slice(0, 5).map((cat, idx) => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#29251f] flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          {cat.name}
                        </span>
                        <span className="text-[#746d63]">
                          {formatMoney(cat.amount)} ({cat.percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#ded5c8]/40 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${cat.percent}%`,
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Donut graphic */}
                <div className="flex flex-col items-center justify-center p-3 bg-[#faf7f2] rounded-2xl border border-[#ded5c8]/60">
                  <div className="text-center">
                    <span className="text-xs text-[#746d63] block">本月最高支出类别</span>
                    <strong className="text-base font-bold text-[#29251f] block mt-0.5">
                      {categoryBreakdown[0]?.name}
                    </strong>
                    <span className="text-xs font-semibold text-[#b65f42] block mt-0.5">
                      {formatMoney(categoryBreakdown[0]?.amount)} (
                      {categoryBreakdown[0]?.percent}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Records List */}
      <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ded5c8]/60 pb-3">
          <div>
            <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
              流水账目
            </p>
            <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
              历史记录 ({filteredRecords.length})
            </h2>
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#faf7f2] border border-[#ded5c8] rounded-xl p-1 text-xs font-semibold text-[#544b42]">
              <button
                onClick={() => setFilterFlow('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterFlow === 'all' ? 'bg-[var(--accent)] text-white' : 'hover:text-[#29251f]'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterFlow('expense')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterFlow === 'expense' ? 'bg-[#b65f42] text-white' : 'hover:text-[#29251f]'
                }`}
              >
                支出
              </button>
              <button
                onClick={() => setFilterFlow('income')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterFlow === 'income' ? 'bg-emerald-700 text-white' : 'hover:text-[#29251f]'
                }`}
              >
                收入
              </button>
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs bg-[#faf7f2] border border-[#ded5c8] px-3 py-1.5 rounded-xl font-medium text-[#29251f] focus:outline-none"
            >
              <option value="all">全部分类</option>
              {Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-[#8e8578] text-sm">
            暂无符合条件的流水记录
          </div>
        ) : (
          <div className="divide-y divide-[#ded5c8]/50">
            {filteredRecords.map((rec) => {
              const d = rec.data as MoneyData;
              const isExp = d.flow === 'expense';
              return (
                <div
                  key={rec.id}
                  className="py-3.5 flex items-center justify-between gap-4 group hover:bg-[#faf7f2]/60 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isExp ? 'bg-[#b65f42]/15 text-[#b65f42]' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {d.category.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-[#29251f] truncate">
                          {d.category}
                        </strong>
                        <span className="text-xs text-[#8a7f72] font-mono">{rec.date}</span>
                      </div>
                      <p className="text-xs text-[#746d63] truncate mt-0.5">
                        {d.note || (isExp ? '支出记账' : '收入记账')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-base font-bold tracking-tight ${
                        isExp ? 'text-[#b65f42]' : 'text-emerald-700'
                      }`}
                    >
                      {isExp ? '-' : '+'}
                      {formatMoney(d.amount)}
                    </span>
                    <button
                      onClick={() => onDeleteRecord(rec.id)}
                      className="opacity-60 group-hover:opacity-100 text-[#a09187] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                      title="从线上数据库删除该条记录"
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
  );
};
