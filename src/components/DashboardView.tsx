import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Calendar,
  Activity,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  Minus,
  Check,
  ListTodo,
  Bell,
  CheckSquare,
  Square,
  CalendarCheck,
  Heart,
  Sun,
  Wind,
  Umbrella,
  Droplet,
  ShieldAlert,
} from 'lucide-react';
import { DatabaseState, ModuleType, PlannerData, RecordItem, SedentaryState } from '../types/workbench';
import { formatMoney, isHabitDone } from '../utils/helpers';
import { isoDate } from '../data/initialData';
import { SedentaryReminder } from './SedentaryReminder';

interface DashboardViewProps {
  data: DatabaseState;
  onSelectModule: (mod: ModuleType) => void;
  onToggleTask: (record: RecordItem) => void;
  onCheckinHabit: (habitId: string, date: string, value: number | string) => void;
  onAddRecord?: (record: Partial<RecordItem>) => Promise<void>;
  onUpdateSedentary?: (sedentary: Partial<SedentaryState>) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onSelectModule,
  onToggleTask,
  onCheckinHabit,
  onAddRecord,
  onUpdateSedentary,
}) => {
  const today = isoDate();
  const currentMonth = today.slice(0, 7);

  // Quick inline add today's task state
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskTime, setQuickTaskTime] = useState('');
  const [quickTaskList, setQuickTaskList] = useState('生活');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'done'>('all');

  // Month expense calculation
  const monthExpense = React.useMemo(() => {
    return data.records
      .filter((r) => r.type === 'money' && r.date.startsWith(currentMonth) && (r.data as any).flow === 'expense')
      .reduce((sum, r) => sum + Number((r.data as any).amount || 0), 0);
  }, [data.records, currentMonth]);

  const budget = data.settings.budget || 5000;
  const budgetRatio = budget > 0 ? Math.round((monthExpense / budget) * 100) : 0;

  // Habits progress today
  const habitStats = React.useMemo(() => {
    let completed = 0;
    const total = data.habits.length;
    data.habits.forEach((h) => {
      const val = h.entries?.[today];
      if (isHabitDone(h, val)) {
        completed++;
      }
    });
    return { completed, total };
  }, [data.habits, today]);

  // Tasks extracted from Planner module with due date == today
  const todayTasks = React.useMemo(() => {
    return data.records.filter((r) => r.type === 'planner' && r.date === today);
  }, [data.records, today]);

  const tasksDoneCount = todayTasks.filter((t) => (t.data as PlannerData).done).length;
  const tasksPendingCount = todayTasks.length - tasksDoneCount;
  const taskCompletionRate = todayTasks.length > 0 ? Math.round((tasksDoneCount / todayTasks.length) * 100) : 100;

  // Filtered today's tasks
  const filteredTodayTasks = React.useMemo(() => {
    return todayTasks.filter((t) => {
      const isDone = (t.data as PlannerData).done;
      if (taskFilter === 'pending') return !isDone;
      if (taskFilter === 'done') return isDone;
      return true;
    }).sort((a, b) => {
      const aDone = (a.data as PlannerData).done ? 1 : 0;
      const bDone = (b.data as PlannerData).done ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const aP = (a.data as PlannerData).priority === 'high' ? 0 : 1;
      const bP = (b.data as PlannerData).priority === 'high' ? 0 : 1;
      return aP - bP;
    });
  }, [todayTasks, taskFilter]);

  // Has fitness record today?
  const hasFitnessToday = data.records.some((r) => r.type === 'fitness' && r.date === today);

  // Dynamic life score calculation
  const lifeScore = React.useMemo(() => {
    let score = 50;
    if (habitStats.total > 0) {
      score += Math.round((habitStats.completed / habitStats.total) * 30);
    }
    if (todayTasks.length > 0) {
      score += Math.round((tasksDoneCount / todayTasks.length) * 15);
    } else {
      score += 10;
    }
    if (hasFitnessToday) score += 5;
    if (budgetRatio <= 100) score += 5;
    return Math.min(100, Math.max(30, score));
  }, [habitStats, todayTasks, tasksDoneCount, hasFitnessToday, budgetRatio]);

  // Recent timeline records
  const recentRecords = React.useMemo(() => {
    return [...data.records]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6);
  }, [data.records]);

  // Handle quick inline task add
  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !onAddRecord) return;
    try {
      setIsAddingTask(true);
      await onAddRecord({
        type: 'planner',
        date: today,
        createdAt: Date.now(),
        data: {
          title: quickTaskTitle.trim(),
          time: quickTaskTime || undefined,
          list: quickTaskList,
          priority: quickTaskPriority,
          remind: true,
          done: false,
        },
      });
      setQuickTaskTitle('');
      setQuickTaskTime('');
    } finally {
      setIsAddingTask(false);
    }
  };

  // Menstrual cycle calculation for Dashboard
  const menstrualStatus = useMemo(() => {
    const records = data.menstrual?.records || [];
    if (records.length === 0) return null;
    const sorted = [...records].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    const latest = sorted[0];
    const startTs = new Date(latest.startDate + 'T00:00:00').getTime();
    const todayTs = new Date(today + 'T00:00:00').getTime();
    const daysSince = Math.max(0, Math.floor((todayTs - startTs) / (86400 * 1000))) + 1;

    const cycleLen = data.menstrual?.cycleLength || 28;
    const periodDays = data.menstrual?.periodDuration || 5;

    const nextTs = startTs + cycleLen * 86400 * 1000;
    const nextDateStr = new Date(nextTs).toISOString().slice(0, 10);
    const daysUntilNext = Math.ceil((nextTs - todayTs) / (86400 * 1000));

    let inPeriod = false;
    let daysInPeriod = 0;
    if (latest.endDate) {
      const endTs = new Date(latest.endDate + 'T23:59:59').getTime();
      if (todayTs >= startTs && todayTs <= endTs) {
        inPeriod = true;
        daysInPeriod = daysSince;
      }
    } else if (daysSince <= periodDays) {
      inPeriod = true;
      daysInPeriod = daysSince;
    }

    return {
      daysUntilNext,
      nextDateStr,
      isAdvanceNotice: daysUntilNext === 1,
      inPeriod,
      daysInPeriod,
    };
  }, [data.menstrual, today]);

  return (
    <div className="space-y-6">
      {/* 1. Advance Menstrual Alert Banner (提前一天经期关怀) */}
      {menstrualStatus?.isAdvanceNotice && (
        <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100 border-2 border-rose-300 p-4 sm:p-5 rounded-[var(--radius)] shadow-xs flex items-start gap-4 animate-in fade-in">
          <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-rose-900 bg-rose-200/80 px-2 py-0.5 rounded-md uppercase">
                经期提前 1 天关怀预警
              </span>
              <strong className="text-sm sm:text-base font-bold text-rose-950 font-serif-sc">
                明天可能是生理期首日（预计 {menstrualStatus.nextDateStr} 来潮）
              </strong>
            </div>
            <p className="text-xs sm:text-sm text-rose-900/90 mt-1 leading-relaxed">
              请在随身包里备好卫生巾、保温水杯装好温水；今晚注意防风保暖，避免贪凉与剧烈运动，温养好自己的身体。
            </p>
          </div>
          <button
            onClick={() => onSelectModule('menstrual')}
            className="self-center px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors shrink-0 hidden sm:flex items-center gap-1"
          >
            <span>经期档案</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* If Currently in period */}
      {menstrualStatus?.inPeriod && (
        <div className="bg-pink-50/90 border border-pink-200 p-3.5 rounded-[var(--radius)] flex items-center justify-between gap-3 text-xs sm:text-sm text-rose-950">
          <div className="flex items-center gap-2.5">
            <Droplet className="w-4 h-4 text-rose-600 fill-rose-500 shrink-0" />
            <span>
              <strong>生理期第 {menstrualStatus.daysInPeriod} 天</strong> · 多喝温水，腰腹注意保暖，今日适度轻柔拉伸。
            </span>
          </div>
          <button
            onClick={() => onSelectModule('menstrual')}
            className="text-xs text-rose-700 font-semibold hover:underline shrink-0"
          >
            记录状态 →
          </button>
        </div>
      )}

      {/* 2. Weather Commute Alert Banner (大风降温添衣 / 降雨带伞 / 烈日防晒) */}
      {data.weather && (data.weather.tempDropWarning || data.weather.windWarning || data.weather.rainWarning || data.weather.uvWarning) && (
        <div
          onClick={() => onSelectModule('weather')}
          className="cursor-pointer bg-[#fffdfa] border border-[#ded5c8] hover:border-[var(--accent)] p-4 rounded-[var(--radius)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              {data.weather.rainWarning ? (
                <Umbrella className="w-5 h-5 text-teal-600" />
              ) : data.weather.windWarning || data.weather.tempDropWarning ? (
                <Wind className="w-5 h-5 text-sky-600" />
              ) : (
                <Sun className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#29251f]">
                  {data.weather.city} · 出门从容天气提醒
                </span>
                <span className="text-xs font-mono text-[#746d63]">
                  {data.weather.temp}℃ {data.weather.condition}
                </span>
              </div>
              <p className="text-xs text-[#746d63] mt-0.5">
                {data.weather.tempDropWarning || data.weather.windWarning
                  ? `换季伴随 ${data.weather.windDirection} ${data.weather.windScale} 级大风降温，出门务必添穿防风外套保暖！`
                  : data.weather.rainWarning
                  ? `今日降水概率 ${data.weather.rainProbability}%，外出请务必随身携带折叠晴雨伞！`
                  : `紫外线指数高达 ${data.weather.uvIndex} 级，出门请做好防晒遮阳防护！`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--accent)] font-semibold self-end sm:self-center">
            <span>出行指南</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Top Grid: Hero Card + Quick Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Hero Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#4d3045] to-[#3a2234] text-white p-7 rounded-[var(--radius)] shadow-md relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          {/* Subtle background circles */}
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full border border-white/10 pointer-events-none" />
          <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full border border-white/15 pointer-events-none" />
          <div className="absolute right-8 top-12 w-20 h-20 rounded-full bg-white/5 pointer-events-none blur-xl" />

          <div>
            <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>今日生活指数</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-bold font-serif-sc tracking-tight text-white">
                {lifeScore}
              </span>
              <span className="text-white/60 text-lg font-light">/ 100</span>
            </div>
          </div>

          <div className="relative z-10 pt-4">
            <p className="text-white/90 text-sm font-medium leading-relaxed">
              三件要事，一点运动，留一笔清楚账。生活有迹可循。
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
              <span>● 习惯完成 {habitStats.completed}/{habitStats.total}</span>
              <span>● 待办完成 {tasksDoneCount}/{todayTasks.length}</span>
            </div>
          </div>
        </div>

        {/* Quick Action Grid */}
        <div className="lg:col-span-7 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                快速开始
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                记下一件小事
              </h2>
            </div>
            <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              双向即时写入
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Money */}
            <button
              onClick={() => onSelectModule('money')}
              className="group p-3.5 rounded-2xl bg-[#fdf5f2] border border-[#f3dfd6] hover:border-[#b65f42]/40 hover:shadow-xs transition-all text-left flex flex-col justify-between h-28"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-[#b65f42]/15 text-[#b65f42] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </span>
                <Plus className="w-4 h-4 text-[#b65f42] opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <strong className="block text-sm font-bold text-[#29251f]">记一笔</strong>
                <small className="text-[11px] text-[#746d63]">支出或收入</small>
              </div>
            </button>

            {/* Planner */}
            <button
              onClick={() => onSelectModule('planner')}
              className="group p-3.5 rounded-2xl bg-[#f7f2f5] border border-[#e8dfe5] hover:border-[#4d3045]/40 hover:shadow-xs transition-all text-left flex flex-col justify-between h-28"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-[#4d3045]/15 text-[#4d3045] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </span>
                <Plus className="w-4 h-4 text-[#4d3045] opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <strong className="block text-sm font-bold text-[#29251f]">排日程</strong>
                <small className="text-[11px] text-[#746d63]">待办与提醒</small>
              </div>
            </button>

            {/* Fitness */}
            <button
              onClick={() => onSelectModule('fitness')}
              className="group p-3.5 rounded-2xl bg-[#f2f6f3] border border-[#dfe8df] hover:border-[#627a67]/40 hover:shadow-xs transition-all text-left flex flex-col justify-between h-28"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-[#627a67]/15 text-[#627a67] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </span>
                <Plus className="w-4 h-4 text-[#627a67] opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <strong className="block text-sm font-bold text-[#29251f]">记体重</strong>
                <small className="text-[11px] text-[#746d63]">减脂趋势</small>
              </div>
            </button>

            {/* Shopping */}
            <button
              onClick={() => onSelectModule('home')}
              className="group p-3.5 rounded-2xl bg-[#faf5ed] border border-[#eee2ce] hover:border-[#a57c45]/40 hover:shadow-xs transition-all text-left flex flex-col justify-between h-28"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-[#a57c45]/15 text-[#a57c45] flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </span>
                <Plus className="w-4 h-4 text-[#a57c45] opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <strong className="block text-sm font-bold text-[#29251f]">待买清单</strong>
                <small className="text-[11px] text-[#746d63]">采购物品</small>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Month expense card */}
        <div
          onClick={() => onSelectModule('money')}
          className="bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#b65f42]/15 text-[#b65f42] flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-[#746d63] font-medium block">本月支出</span>
            <strong className="text-xl font-bold text-[#29251f] tracking-tight block">
              {formatMoney(monthExpense)}
            </strong>
            <small className="text-[11px] text-[#8a7f72] truncate block mt-0.5">
              预算剩余 {formatMoney(Math.max(0, budget - monthExpense))} (已用 {budgetRatio}%)
            </small>
          </div>
        </div>

        {/* Habits card */}
        <div
          onClick={() => onSelectModule('habits')}
          className="bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#627a67]/15 text-[#627a67] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-[#746d63] font-medium block">今日习惯</span>
            <strong className="text-xl font-bold text-[#29251f] tracking-tight block">
              {habitStats.completed} / {habitStats.total}
            </strong>
            <small className="text-[11px] text-[#8a7f72] truncate block mt-0.5">
              {habitStats.completed === habitStats.total
                ? '今日习惯全部达成！'
                : '从喝水或动一动开始'}
            </small>
          </div>
        </div>

        {/* Tasks card */}
        <div
          onClick={() => onSelectModule('planner')}
          className="bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#4d3045]/15 text-[#4d3045] flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-[#746d63] font-medium block">今日待办概况</span>
            <strong className="text-xl font-bold text-[#29251f] tracking-tight block">
              {todayTasks.length} 件 ({tasksDoneCount} 已完成)
            </strong>
            <small className="text-[11px] text-[#8a7f72] truncate block mt-0.5">
              {tasksPendingCount === 0 && todayTasks.length > 0
                ? '今日待办已全部清空！'
                : `${tasksPendingCount} 件待处理 · 节奏刚刚好`}
            </small>
          </div>
        </div>
      </div>

      {/* Sedentary Activity Reminder (08:00 - 19:00 每40分钟起身打卡) */}
      {data.sedentary && onUpdateSedentary && (
        <SedentaryReminder
          sedentary={data.sedentary}
          onUpdateSedentary={onUpdateSedentary}
        />
      )}

      {/* DEDICATED TODAY'S TASKS CARD (今日待办卡片 - 提取日程统筹模块中截止日期为当天的任务) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Dedicated "今日待办" Card (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-xs flex flex-col justify-between relative overflow-hidden">
          {/* Top Header of the Dedicated Card */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ded5c8]/70 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4d3045] text-white flex items-center justify-center shadow-xs shrink-0">
                  <CalendarCheck className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold font-serif-sc text-[#29251f]">
                      今日待办
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f4eff3] text-[#4d3045] border border-[#e5dce3]">
                      日程统筹联动
                    </span>
                  </div>
                  <p className="text-xs text-[#746d63] mt-0.5">
                    提取自日程统筹模块 · 截止日期为今天 ({today})
                  </p>
                </div>
              </div>

              {/* Status / Link button */}
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-[#29251f] block">
                    {tasksDoneCount}/{todayTasks.length} 完成
                  </span>
                  <span className="text-[10px] text-[#8a7f72] block">
                    达成率 {taskCompletionRate}%
                  </span>
                </div>
                <button
                  onClick={() => onSelectModule('planner')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--accent)] bg-[#faf7f2] border border-[#ded5c8] hover:bg-[#ede6dc] transition-all flex items-center gap-1 shrink-0"
                  title="前往日程统筹完整视图"
                >
                  <span>日程统筹</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Completion Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-[#746d63] mb-1.5">
                <div className="flex items-center gap-2 font-medium">
                  <span>今日任务进度</span>
                  <span className="text-[11px] font-mono text-[#29251f]">
                    (待办 {tasksPendingCount} 件 / 已完 {tasksDoneCount} 件)
                  </span>
                </div>
                <span className="font-bold text-[#4d3045]">{taskCompletionRate}%</span>
              </div>
              <div className="w-full bg-[#ede6dc] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7d5b75] to-[#4d3045] transition-all duration-300 rounded-full"
                  style={{ width: `${taskCompletionRate}%` }}
                />
              </div>
            </div>

            {/* Task Filter Chips */}
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center bg-[#faf7f2] border border-[#ded5c8] rounded-xl p-0.5 text-xs font-semibold text-[#544b42]">
                {[
                  { id: 'all', label: `全部 (${todayTasks.length})` },
                  { id: 'pending', label: `待处理 (${tasksPendingCount})` },
                  { id: 'done', label: `已完成 (${tasksDoneCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTaskFilter(f.id as any)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      taskFilter === f.id
                        ? 'bg-[#4d3045] text-white shadow-2xs'
                        : 'hover:text-[#29251f]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                勾选即时双向保存
              </span>
            </div>

            {/* Task List */}
            {filteredTodayTasks.length === 0 ? (
              <div className="py-10 px-4 text-center text-[#8e8578] text-sm bg-[#faf7f2] rounded-2xl border border-dashed border-[#ded5c8] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#627a67] mx-auto opacity-70" />
                <p className="font-medium text-[#29251f]">
                  {taskFilter === 'pending' && todayTasks.length > 0
                    ? '🎉 今日所有到期待办已全部处理完毕，干得漂亮！'
                    : '今天没有到期的待办事项，尽情享受从容生活'}
                </p>
                <p className="text-xs text-[#746d63]">
                  可在下方直接输入快速添加，或去日程统筹安排事项
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredTodayTasks.map((t) => {
                  const pData = t.data as PlannerData;
                  return (
                    <div
                      key={t.id}
                      onClick={() => onToggleTask(t)}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                        pData.done
                          ? 'bg-[#f7f5f2] border-[#e2d8cb] text-[#8a8075]'
                          : 'bg-[#fffdfa] border-[#ded5c8] hover:border-[#4d3045]/60 hover:shadow-xs text-[#29251f]'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        aria-label={pData.done ? '标记为未完成' : '标记为已完成'}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          pData.done
                            ? 'bg-[#4d3045] border-[#4d3045] text-white shadow-2xs'
                            : 'border-[#a3988b] bg-white group-hover:border-[#4d3045]'
                        }`}
                      >
                        {pData.done && <Check className="w-3.5 h-3.5" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold truncate ${
                              pData.done ? 'line-through text-[#8e8479]' : 'text-[#29251f]'
                            }`}
                          >
                            {pData.title}
                          </span>

                          {pData.priority === 'high' && (
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-bold">
                              重要紧急
                            </span>
                          )}

                          <span className="text-[10px] bg-[#ede6dc] text-[#554b42] px-2 py-0.5 rounded-md font-medium">
                            {pData.list}
                          </span>

                          {pData.remind && (
                            <span className="text-[#8a7f72]" title="已设置到时提醒">
                              <Bell className="w-3 h-3 inline" />
                            </span>
                          )}
                        </div>

                        {pData.note && (
                          <p className="text-xs text-[#746d63] truncate mt-1">
                            {pData.note}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      {pData.time && (
                        <span className="text-xs font-mono text-[#544b42] bg-[#ede6dc]/80 px-2.5 py-1 rounded-xl shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#746d63]" />
                          {pData.time}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick inline Add Today Task Input */}
          {onAddRecord && (
            <form
              onSubmit={handleQuickAddTask}
              className="mt-4 pt-3 border-t border-[#ded5c8]/70 flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="快速添加今日待办，按回车加入..."
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[#4d3045]"
                />
              </div>

              <input
                type="time"
                value={quickTaskTime}
                onChange={(e) => setQuickTaskTime(e.target.value)}
                className="w-24 px-2 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-mono text-[#29251f] focus:outline-none focus:border-[#4d3045]"
                title="设置今日执行时间点"
              />

              <select
                value={quickTaskList}
                onChange={(e) => setQuickTaskList(e.target.value)}
                className="px-2.5 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium text-[#29251f] focus:outline-none focus:border-[#4d3045]"
              >
                <option value="生活">生活</option>
                <option value="工作">工作</option>
                <option value="家庭">家庭</option>
                <option value="个人">个人</option>
              </select>

              <button
                type="submit"
                disabled={isAddingTask || !quickTaskTitle.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#4d3045] hover:opacity-90 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1 shrink-0 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </form>
          )}
        </div>

        {/* Today's Habits Interactive Stack (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                  连续发生
                </p>
                <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                  今日习惯打卡
                </h2>
              </div>
              <button
                onClick={() => onSelectModule('habits')}
                className="text-xs text-[var(--accent)] font-semibold flex items-center gap-1 hover:underline"
              >
                <span>管理习惯</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {data.habits.slice(0, 5).map((habit) => {
                const rawVal = habit.entries?.[today];
                const isDone = isHabitDone(habit, rawVal);
                const currentVal = typeof rawVal === 'number' ? rawVal : 0;
                const isTime = habit.type === 'time';
                const isWord = habit.type === 'word';

                return (
                  <div
                    key={habit.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isDone
                        ? 'bg-[#f4f7f4] border-[#cfded0]'
                        : 'bg-[#faf7f2] border-[#ded5c8]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#29251f]">
                          {habit.name}
                        </span>
                        <span className="text-xs text-[#746d63]">
                          {isTime ? (typeof rawVal === 'string' && rawVal ? rawVal : '--:--') : isWord ? (typeof rawVal === 'string' && rawVal ? rawVal : '未填写') : `(${currentVal}/${habit.target} ${habit.unit})`}
                        </span>
                      </div>
                      {!isTime && !isWord && (
                        <div className="w-full bg-[#ded5c8]/50 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent)] transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.round((currentVal / habit.target) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Interactive controls based on type */}
                    {habit.type === 'check' ? (
                      <button
                        onClick={() => onCheckinHabit(habit.id, today, isDone ? 0 : 1)}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-[#ded5c8] text-[#746d63] hover:border-emerald-600 hover:text-emerald-600'
                        }`}
                        title={isDone ? '取消今日打卡' : '完成今日打卡'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : habit.type === 'counter' ? (
                      <div className="flex items-center gap-1 bg-white border border-[#ded5c8] rounded-xl p-1 shadow-2xs">
                        <button
                          onClick={() => onCheckinHabit(habit.id, today, Math.max(0, currentVal - 1))}
                          className="w-7 h-7 rounded-lg hover:bg-[#ede6dc] text-[#554b42] flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#29251f]">
                          {currentVal}
                        </span>
                        <button
                          onClick={() => onCheckinHabit(habit.id, today, currentVal + 1)}
                          className="w-7 h-7 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : habit.type === 'time' ? (
                      <input
                        type="time"
                        defaultValue={typeof rawVal === 'string' ? rawVal : ''}
                        onChange={(e) => onCheckinHabit(habit.id, today, e.target.value)}
                        className="w-20 h-8 text-center text-xs font-bold bg-white border border-[#ded5c8] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                      />
                    ) : habit.type === 'word' ? (
                      <input
                        type="text"
                        defaultValue={typeof rawVal === 'string' ? rawVal : ''}
                        placeholder="输入词语"
                        onChange={(e) => onCheckinHabit(habit.id, today, e.target.value)}
                        className="w-24 h-8 text-center text-xs font-bold bg-white border border-[#ded5c8] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          defaultValue={currentVal || ''}
                          placeholder="0"
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onCheckinHabit(habit.id, today, val);
                          }}
                          className="w-16 h-8 text-center text-xs font-bold bg-white border border-[#ded5c8] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                        />
                        <span className="text-xs text-[#746d63]">{habit.unit}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Timeline + Mindful Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent timeline (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                生活脉络
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                最近记录
              </h2>
            </div>
          </div>

          <div className="divide-y divide-[#ded5c8]/50">
            {recentRecords.map((rec) => {
              const dateStr = rec.date;
              let title = '';
              let badge = '';
              let badgeColor = '';
              let extra = '';

              if (rec.type === 'money') {
                const m = rec.data as any;
                title = `${m.category}: ${m.note || '日常收支'}`;
                badge = m.flow === 'expense' ? '支出' : '收入';
                badgeColor = m.flow === 'expense' ? 'bg-[#b65f42]/15 text-[#b65f42]' : 'bg-emerald-100 text-emerald-800';
                extra = `${m.flow === 'expense' ? '-' : '+'}${formatMoney(m.amount)}`;
              } else if (rec.type === 'fitness') {
                const f = rec.data as any;
                title = `体重测量 ${f.weight} kg${f.bodyFat ? ` · 体脂 ${f.bodyFat}%` : ''}`;
                badge = '健康';
                badgeColor = 'bg-[#627a67]/15 text-[#627a67]';
                extra = f.note || '记录身体';
              } else if (rec.type === 'planner') {
                const p = rec.data as any;
                title = p.title;
                badge = p.list || '日程';
                badgeColor = 'bg-[#4d3045]/15 text-[#4d3045]';
                extra = p.done ? '已完成' : '待处理';
              } else if (rec.type === 'home') {
                const h = rec.data as any;
                title = `待买: ${h.name} (${h.quantity || '1件'})`;
                badge = '清单';
                badgeColor = 'bg-[#a57c45]/15 text-[#a57c45]';
                extra = h.bought ? '已购' : h.price ? formatMoney(h.price) : '待采购';
              }

              return (
                <div key={rec.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono text-[#8a7f72] shrink-0">{dateStr}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 ${badgeColor}`}>
                      {badge}
                    </span>
                    <span className="font-medium text-[#29251f] truncate">{title}</span>
                  </div>
                  <span className="text-xs font-semibold text-[#544b42] shrink-0">{extra}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mindful Insight Card (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#faf6f0] to-[#f2ede4] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#8a7f72] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>轻提醒</span>
            </div>
            <h3 className="font-serif-sc font-bold text-base text-[#29251f] mb-3 leading-snug">
              规律不是把每天塞满，而是知道什么值得留下。
            </h3>
            <p className="text-xs text-[#746d63] leading-relaxed">
              把注意力集中在今天能做好的两三件事上。所有的改变，都是在细微而持续的打卡中慢慢显现的。
            </p>
          </div>

          <div className="pt-4 border-t border-[#ded5c8]/60 flex items-center justify-between text-xs text-[#8a7f72]">
            <span>根据日常节奏生成</span>
            <span className="font-serif-sc font-medium text-[var(--accent)]">
              {data.settings.brand?.name || '日常集'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
