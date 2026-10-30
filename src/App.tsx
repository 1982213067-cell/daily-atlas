import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home,
  Wallet,
  CheckCircle2,
  Activity,
  Calendar,
  ShoppingCart,
  Film,
  AlertTriangle,
  RefreshCw,
  X,
  CheckCircle,
  Heart,
  Sun,
  HeartPulse,
  MapPin,
} from 'lucide-react';
import {
  DatabaseState,
  HabitItem,
  HealthState,
  MediaItem,
  MenstrualSettings,
  ModuleType,
  PlanItem,
  RecordItem,
  SedentaryState,
  Settings,
  SportTypeItem,
  WeatherInfo,
  WishlistState,
} from './types/workbench';
import { INITIAL_WISHLIST } from './data/initialData';
import { api, getFallbackData, cacheLocalData, SyncStatus } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { DashboardView } from './components/DashboardView';
import { MoneyView } from './components/MoneyView';
import { HabitsView } from './components/HabitsView';
import { FitnessView } from './components/FitnessView';
import { PlannerView } from './components/PlannerView';
import { ShoppingView } from './components/ShoppingView';
import { MediaView } from './components/MediaView';
import { MenstrualView } from './components/MenstrualView';
import { HealthView } from './components/HealthView';
import { WishlistView } from './components/WishlistView';
import { WeatherView } from './components/WeatherView';
import { BrandModal } from './components/BrandModal';

// 所有合法模块（用于 URL hash 恢复 / 前进后退）
const VALID_MODULES: ModuleType[] = [
  'dashboard', 'money', 'habits', 'fitness', 'planner', 'home', 'media', 'menstrual', 'health', 'weather', 'wishlist',
];

export default function App() {
  // 1. Initial State: Load cached or seed immediately to prevent any white screen
  const [data, setData] = useState<DatabaseState>(getFallbackData);

  // Restore last-viewed module from URL hash or localStorage so edits stay put
  const readInitialModule = (): ModuleType => {
    const fromHash = window.location.hash.replace(/^#\/?/, '') as ModuleType;
    if (VALID_MODULES.includes(fromHash)) return fromHash;
    const fromStore = localStorage.getItem('daily_atlas_last_module') as ModuleType | null;
    if (fromStore && VALID_MODULES.includes(fromStore)) return fromStore;
    return 'dashboard';
  };

  const [currentModule, setCurrentModule] = useState<ModuleType>(readInitialModule);

  // 支持浏览器前进/后退与父页面（手机预览外壳）直接改 hash 切页
  useEffect(() => {
    const onHashChange = () => {
      const mod = window.location.hash.replace(/^#\/?/, '') as ModuleType;
      if (VALID_MODULES.includes(mod)) {
        setCurrentModule(mod);
        localStorage.setItem('daily_atlas_last_module', mod);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Persist current module to hash + localStorage whenever it changes
  const navigateToModule = (mod: ModuleType) => {
    setCurrentModule(mod);
    window.location.hash = `/${mod}`;
    localStorage.setItem('daily_atlas_last_module', mod);
  };

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    online: true,
    syncing: false,
    lastSync: null,
    error: null,
    totalRows: 0,
  });

  // 记录最近一次从线上拿到的数据版本，用于双向同步轮询
  const lastServerUpdatedAt = useRef<number | null>(null);

  // 当前是否正在提交本地写入：写入过程中跳过后台刷新，避免覆盖乐观更新
  const syncingRef = useRef<boolean>(false);
  useEffect(() => {
    syncingRef.current = syncStatus.syncing;
  }, [syncStatus.syncing]);

  // UI Modals
  const [showBrandModal, setShowBrandModal] = useState<boolean>(false);

  // Toast Notifications
  const [toast, setToast] = useState<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    onRetry?: () => void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', onRetry?: () => void) => {
    setToast({ id: `${Date.now()}`, type, message, onRetry });
    if (type !== 'error') {
      setTimeout(() => setToast((prev) => (prev?.message === message ? null : prev)), 3500);
    }
  };

  // Sync theme attribute to root
  useEffect(() => {
    const theme = data.settings?.brand?.theme || 'plum';
    document.documentElement.setAttribute('data-theme', theme);
  }, [data.settings?.brand?.theme]);

  // 2. Fetch full data from online database upon mount
  const fetchOnlineData = useCallback(async () => {
    try {
      setSyncStatus((s) => ({ ...s, syncing: true, error: null }));
      const [onlineData, tableRes] = await Promise.all([
        api.getAllData(),
        api.getTables().catch(() => null),
      ]);
      setData(onlineData);
      cacheLocalData(onlineData);
      lastServerUpdatedAt.current = onlineData.updatedAt;
      setSyncStatus({
        online: true,
        syncing: false,
        lastSync: Date.now(),
        error: null,
        tables: tableRes?.tables,
        totalRows: tableRes?.totalRows || onlineData.records.length,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Online sync warning:', msg);
      setSyncStatus((s) => ({
        ...s,
        syncing: false,
        online: false,
        error: `线上同步异常: ${msg}`,
      }));
      showToast('获取线上资料库失败，已加载离线缓存。可稍后重试', 'error', () => fetchOnlineData());
    }
  }, []);

  useEffect(() => {
    fetchOnlineData();
  }, [fetchOnlineData]);

  // 双向同步 · 通道一（实时）：订阅服务端 SSE，任一设备写入后立即拉取最新数据
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/database/stream');
      es.onmessage = (ev: MessageEvent<string>) => {
        // 本地正在提交写入时不打断，交由写入完成后的状态收敛 / 定时轮询兜底
        if (syncingRef.current) return;
        try {
          const payload = JSON.parse(ev.data) as { updatedAt?: number };
          // 版本号没变说明是本地已同步过的状态，跳过无谓的整库拉取
          if (payload.updatedAt && payload.updatedAt === lastServerUpdatedAt.current) return;
        } catch {
          /* 解析失败也照样拉取，宁可多拉不可漏拉 */
        }
        void fetchOnlineData();
      };
      es.onerror = () => {
        /* 断线由浏览器自动重连；下方定时轮询作为兜底 */
      };
    } catch {
      /* 环境不支持 SSE 时，仅依赖定时轮询 */
    }
    return () => es?.close();
  }, [fetchOnlineData]);

  // 双向同步 · 通道二（兜底 + 兜住手机后台）：定期轻量轮询线上版本；回到前台时立即补拉一次
  useEffect(() => {
    const timer = setInterval(async () => {
      if (syncStatus.syncing) return;
      try {
        const st = await api.getStatus();
        if (st.updatedAt && st.updatedAt !== lastServerUpdatedAt.current) {
          await fetchOnlineData();
        }
      } catch {
        /* 网络波动忽略，下轮重试 */
      }
    }, 10000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchOnlineData();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncStatus.syncing, fetchOnlineData]);

  // Optimistic helper that handles API failures gracefully
  const performMutation = async <T,>(
    optimisticUpdate: () => void,
    apiAction: () => Promise<T>,
    rollback: () => void,
    successMsg?: string
  ) => {
    // 1. Optimistic apply
    optimisticUpdate();
    setSyncStatus((s) => ({ ...s, syncing: true, error: null }));

    try {
      // 2. Online API call
      const res = await apiAction();
      setSyncStatus((s) => ({
        ...s,
        syncing: false,
        online: true,
        lastSync: Date.now(),
        error: null,
      }));
      if (successMsg) showToast(successMsg, 'success');
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Database write error:', msg);
      // Rollback
      rollback();
      setSyncStatus((s) => ({
        ...s,
        syncing: false,
        error: msg,
      }));
      showToast(`数据写回线上失败: ${msg}`, 'error', () => {
        performMutation(optimisticUpdate, apiAction, rollback, successMsg);
      });
      throw err;
    }
  };

  // 3. Mutation Handlers
  // Record CRUD
  const handleAddRecord = async (record: Partial<RecordItem>) => {
    const tempId = `temp-${Date.now()}`;
    const newRecord = { ...record, id: tempId } as RecordItem;
    const prevRecords = [...data.records];

    await performMutation(
      () => setData((d) => ({ ...d, records: [newRecord, ...d.records] })),
      async () => {
        const saved = await api.createRecord(record);
        setData((d) => ({
          ...d,
          records: d.records.map((r) => (r.id === tempId ? saved : r)),
        }));
        return saved;
      },
      () => setData((d) => ({ ...d, records: prevRecords })),
      '已成功存入线上综合流水表'
    );
  };

  const handleUpdateRecord = async (id: string, record: Partial<RecordItem>) => {
    const prevRecords = [...data.records];
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          records: d.records.map((r) => (r.id === id ? { ...r, ...record } : r)),
        })),
      () => api.updateRecord(id, record),
      () => setData((d) => ({ ...d, records: prevRecords })),
      '已更新线上记录'
    );
  };

  const handleDeleteRecord = async (id: string) => {
    const prevRecords = [...data.records];
    await performMutation(
      () => setData((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) })),
      () => api.deleteRecord(id),
      () => setData((d) => ({ ...d, records: prevRecords })),
      '已从线上资料库中移除'
    );
  };

  const handleToggleTask = async (record: RecordItem) => {
    const currentDone = (record.data as any).done;
    const updatedData = { ...record.data, done: !currentDone };
    await handleUpdateRecord(record.id, { data: updatedData });
  };

  const handleToggleBought = async (record: RecordItem) => {
    const currentBought = (record.data as any).bought;
    const updatedData = {
      ...record.data,
      bought: !currentBought,
      boughtDate: !currentBought ? new Date().toISOString().slice(0, 10) : undefined,
    };
    await handleUpdateRecord(record.id, { data: updatedData });
  };

  // Habits Handlers
  const handleCreateHabit = async (habit: Partial<HabitItem>) => {
    const prevHabits = [...data.habits];
    await performMutation(
      () => {},
      async () => {
        const saved = await api.createHabit(habit);
        setData((d) => ({ ...d, habits: [...d.habits, saved] }));
        return saved;
      },
      () => setData((d) => ({ ...d, habits: prevHabits })),
      '新习惯已存入线上习惯数据表'
    );
  };

  const handleDeleteHabit = async (id: string) => {
    const prevHabits = [...data.habits];
    await performMutation(
      () => setData((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id) })),
      () => api.deleteHabit(id),
      () => setData((d) => ({ ...d, habits: prevHabits })),
      '习惯已删除'
    );
  };

  const handleCheckinHabit = async (habitId: string, date: string, value: number | string) => {
    const prevHabits = JSON.parse(JSON.stringify(data.habits));
    const isEmpty = typeof value === 'number' ? value <= 0 : (value ?? '') === '';
    await performMutation(
      () => {
        setData((d) => ({
          ...d,
          habits: d.habits.map((h) => {
            if (h.id === habitId) {
              const entries = { ...(h.entries || {}) };
              if (isEmpty) delete entries[date];
              else entries[date] = value;
              return { ...h, entries };
            }
            return h;
          }),
        }));
      },
      () => api.checkinHabit(habitId, date, value),
      () => setData((d) => ({ ...d, habits: prevHabits })),
      isEmpty ? '打卡已取消' : '打卡记录已同步'
    );
  };

  // Fitness Handlers
  const handleUpdateFitnessProfile = async (profile: Partial<Settings['fitnessProfile']>) => {
    const prevSettings = { ...data.settings };
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          settings: {
            ...d.settings,
            fitnessProfile: { ...d.settings.fitnessProfile, ...profile },
          },
        })),
      () => api.updateFitnessProfile(profile),
      () => setData((d) => ({ ...d, settings: prevSettings })),
      '减脂目标与身体档案已更新'
    );
  };

  const handleUpdateSportTypes = async (sportTypes: SportTypeItem[]) => {
    const prevSettings = { ...data.settings };
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          settings: { ...d.settings, sportTypes },
        })),
      () => api.updateSettings({ sportTypes }),
      () => setData((d) => ({ ...d, settings: prevSettings })),
      '运动类型已更新'
    );
  };

  const handleAddFitnessPlan = async (plan: Partial<PlanItem>) => {
    const prevPlans = [...data.settings.weeklyPlan];
    await performMutation(
      () => {},
      async () => {
        const saved = await api.addFitnessPlan(plan);
        setData((d) => ({
          ...d,
          settings: {
            ...d.settings,
            weeklyPlan: [...d.settings.weeklyPlan, saved],
          },
        }));
        return saved;
      },
      () => setData((d) => ({ ...d, settings: { ...d.settings, weeklyPlan: prevPlans } })),
      '周计划已写入线上数据表'
    );
  };

  const handleToggleFitnessPlan = async (id: string) => {
    const prevPlans = [...data.settings.weeklyPlan];
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          settings: {
            ...d.settings,
            weeklyPlan: d.settings.weeklyPlan.map((p) =>
              p.id === id ? { ...p, done: !p.done } : p
            ),
          },
        })),
      () => api.toggleFitnessPlan(id),
      () => setData((d) => ({ ...d, settings: { ...d.settings, weeklyPlan: prevPlans } }))
    );
  };

  const handleDeleteFitnessPlan = async (id: string) => {
    const prevPlans = [...data.settings.weeklyPlan];
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          settings: {
            ...d.settings,
            weeklyPlan: d.settings.weeklyPlan.filter((p) => p.id !== id),
          },
        })),
      () => api.deleteFitnessPlan(id),
      () => setData((d) => ({ ...d, settings: { ...d.settings, weeklyPlan: prevPlans } })),
      '计划项已删除'
    );
  };

  // Media Handlers
  const handleCreateMedia = async (item: Partial<MediaItem>) => {
    const prevMedia = [...data.mediaItems];
    await performMutation(
      () => {},
      async () => {
        const saved = await api.createMedia(item);
        setData((d) => ({ ...d, mediaItems: [saved, ...d.mediaItems] }));
        return saved;
      },
      () => setData((d) => ({ ...d, mediaItems: prevMedia })),
      '已加入书影音藏品表'
    );
  };

  const handleUpdateMedia = async (id: string, item: Partial<MediaItem>) => {
    const prevMedia = [...data.mediaItems];
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          mediaItems: d.mediaItems.map((m) => (m.id === id ? { ...m, ...item } : m)),
        })),
      () => api.updateMedia(id, item),
      () => setData((d) => ({ ...d, mediaItems: prevMedia })),
      '已更新书影音藏品'
    );
  };

  const handleDeleteMedia = async (id: string) => {
    const prevMedia = [...data.mediaItems];
    await performMutation(
      () => setData((d) => ({ ...d, mediaItems: d.mediaItems.filter((m) => m.id !== id) })),
      () => api.deleteMedia(id),
      () => setData((d) => ({ ...d, mediaItems: prevMedia })),
      '已从书影音清单移除'
    );
  };

  // Settings Handlers
  const handleUpdateSettings = async (settings: Partial<Settings>) => {
    const prevSettings = { ...data.settings };
    await performMutation(
      () => setData((d) => ({ ...d, settings: { ...d.settings, ...settings } })),
      () => api.updateSettings(settings),
      () => setData((d) => ({ ...d, settings: prevSettings })),
      '设置已保存'
    );
  };

  // Menstrual Handlers
  const handleUpdateMenstrual = async (menstrual: Partial<MenstrualSettings>) => {
    const prevMenstrual = { ...data.menstrual };
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          menstrual: { ...d.menstrual, ...menstrual },
        })),
      () => api.updateMenstrual(menstrual),
      () => setData((d) => ({ ...d, menstrual: prevMenstrual })),
      '经期记录已存入线上资料库'
    );
  };

  // Sedentary Handlers
  const handleUpdateSedentary = async (sedentary: Partial<SedentaryState>) => {
    const prevSedentary = { ...data.sedentary };
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          sedentary: { ...d.sedentary, ...sedentary },
        })),
      () => api.updateSedentary(sedentary),
      () => setData((d) => ({ ...d, sedentary: prevSedentary }))
    );
  };

  // Weather Handlers
  const handleUpdateWeather = async (weather: Partial<WeatherInfo>) => {
    const prevWeather = { ...data.weather };
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          weather: { ...d.weather, ...weather },
        })),
      () => api.updateWeather(weather),
      () => setData((d) => ({ ...d, weather: prevWeather }))
    );
  };

  // Health Handlers
  const handleUpdateHealth = async (health: Partial<HealthState>) => {
    const prevHealth = { ...data.health };
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          health: { ...d.health, ...health },
        })),
      () => api.updateHealth(health),
      () => setData((d) => ({ ...d, health: prevHealth })),
      '健康档案已同步'
    );
  };

  // Wishlist Handlers
  const handleUpdateWishlist = async (wishlist: Partial<WishlistState>) => {
    const prevWishlist = { ...(data.wishlist || INITIAL_WISHLIST) };
    await performMutation(
      () =>
        setData((d) => ({
          ...d,
          wishlist: { ...d.wishlist, ...wishlist },
        })),
      () => api.updateWishlist(wishlist),
      () => setData((d) => ({ ...d, wishlist: prevWishlist })),
    );
  };

  // Clear samples
  const handleClearSamples = async () => {
    if (confirm('确认清空所有示例数据吗？您自行添加的记录将全部保留。')) {
      try {
        await api.clearSamples();
        await fetchOnlineData();
        showToast('示例内容已清空', 'success');
      } catch (err: unknown) {
        showToast(`清空失败: ${err instanceof Error ? err.message : String(err)}`, 'error');
      }
    }
  };

  // Export full backup
  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `日常集_生活工作台备份_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('备份已导出，请妥善保存', 'success');
  };

  // Import full backup
  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.records) || !Array.isArray(parsed.habits)) {
        showToast('导入文件格式不正确，缺少核心数据表', 'error');
        return;
      }
      if (confirm(`将导入 ${parsed.records.length} 条记录并覆盖当前数据库，是否继续？`)) {
        await api.importData(parsed);
        await fetchOnlineData();
        showToast('备份导入成功，线上数据已恢复', 'success');
      }
    } catch (err: unknown) {
      showToast(`导入失败: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Language toggle
  const handleToggleLang = () => {
    const newLang = data.settings.lang === 'en' ? 'zh' : 'en';
    handleUpdateSettings({ lang: newLang });
  };

  // Mobile navigation tabs
  const mobileNavTabs: { id: ModuleType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '总览', icon: <Home className="w-4 h-4" /> },
    { id: 'menstrual', label: '经期', icon: <Heart className="w-4 h-4 text-rose-500" /> },
    { id: 'weather', label: '天气', icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { id: 'health', label: '健康', icon: <HeartPulse className="w-4 h-4 text-emerald-600" /> },
    { id: 'habits', label: '习惯', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'money', label: '记账', icon: <Wallet className="w-4 h-4" /> },
    { id: 'fitness', label: '健身', icon: <Activity className="w-4 h-4" /> },
    { id: 'planner', label: '日程', icon: <Calendar className="w-4 h-4" /> },
    { id: 'home', label: '待买', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'media', label: '书影音', icon: <Film className="w-4 h-4" /> },
    { id: 'wishlist', label: '待打卡', icon: <MapPin className="w-4 h-4 text-rose-500" /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col selection:bg-[var(--accent)] selection:text-white">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block">
        <Sidebar
          currentModule={currentModule}
          onSelectModule={navigateToModule}
          settings={data.settings}
          onOpenBrandModal={() => setShowBrandModal(true)}
          syncStatus={syncStatus}
        />
      </div>

      {/* Main Content Area */}
      <div className="md:ml-[var(--sidebar)] flex-1 flex flex-col min-w-0 pb-20 md:pb-12">
        <Topbar
          currentModule={currentModule}
          settings={data.settings}
          syncStatus={syncStatus}
          sedentary={data.sedentary}
          weather={data.weather}
          onUpdateSedentary={handleUpdateSedentary}
          onSelectModule={navigateToModule}
          onClearSamples={handleClearSamples}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onRetrySync={fetchOnlineData}
          onToggleLang={handleToggleLang}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentModule === 'dashboard' && (
            <DashboardView
              data={data}
              onSelectModule={navigateToModule}
              onToggleTask={handleToggleTask}
              onCheckinHabit={handleCheckinHabit}
              onAddRecord={handleAddRecord}
              onUpdateSedentary={handleUpdateSedentary}
            />
          )}

          {currentModule === 'menstrual' && (
            <MenstrualView
              menstrual={data.menstrual}
              onUpdateMenstrual={handleUpdateMenstrual}
            />
          )}

          {currentModule === 'weather' && (
            <WeatherView
              weather={data.weather}
              onUpdateWeather={handleUpdateWeather}
            />
          )}

          {currentModule === 'health' && (
            <HealthView
              health={data.health}
              onUpdateHealth={handleUpdateHealth}
            />
          )}

          {currentModule === 'wishlist' && (
            <WishlistView
              wishlist={data.wishlist || INITIAL_WISHLIST}
              onUpdateWishlist={handleUpdateWishlist}
            />
          )}

          {currentModule === 'money' && (
            <MoneyView
              records={data.records}
              settings={data.settings}
              onAddRecord={handleAddRecord}
              onDeleteRecord={handleDeleteRecord}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {currentModule === 'habits' && (
            <HabitsView
              habits={data.habits}
              onCheckinHabit={handleCheckinHabit}
              onCreateHabit={handleCreateHabit}
              onDeleteHabit={handleDeleteHabit}
            />
          )}

          {currentModule === 'fitness' && (
            <FitnessView
              records={data.records}
              settings={data.settings}
              onAddRecord={handleAddRecord}
              onDeleteRecord={handleDeleteRecord}
              onUpdateSportTypes={handleUpdateSportTypes}
              onAddPlan={handleAddFitnessPlan}
              onTogglePlan={handleToggleFitnessPlan}
              onDeletePlan={handleDeleteFitnessPlan}
            />
          )}

          {currentModule === 'planner' && (
            <PlannerView
              records={data.records}
              onAddRecord={handleAddRecord}
              onToggleTask={handleToggleTask}
              onDeleteRecord={handleDeleteRecord}
            />
          )}

          {currentModule === 'home' && (
            <ShoppingView
              records={data.records}
              onAddRecord={handleAddRecord}
              onToggleBought={handleToggleBought}
              onDeleteRecord={handleDeleteRecord}
            />
          )}

          {currentModule === 'media' && (
            <MediaView
              mediaItems={data.mediaItems}
              defaultView={data.settings.mediaView}
              onCreateMedia={handleCreateMedia}
              onUpdateMedia={handleUpdateMedia}
              onDeleteMedia={handleDeleteMedia}
            />
          )}
        </main>
      </div>

      {/* Mobile Floating Bottom Navigation */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 bg-[#fffdfa]/95 backdrop-blur-md border border-[#ded5c8] rounded-2xl shadow-xl p-1.5 flex items-center overflow-x-auto gap-1">
        {mobileNavTabs.map((tab) => {
          const active = currentModule === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigateToModule(tab.id as ModuleType)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                active
                  ? 'bg-[var(--accent)] text-white shadow-xs font-bold'
                  : 'text-[#6e6255] hover:text-[#29251f]'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] mt-0.5 whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Brand & Appearance Modal */}
      <BrandModal
        isOpen={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        settings={data.settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Non-intrusive Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === 'error'
              ? 'bg-[#2b1f1d] text-rose-100 border-rose-800'
              : toast.type === 'success'
              ? 'bg-[#1e2a22] text-emerald-100 border-emerald-800'
              : 'bg-[#29251f] text-white border-stone-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <RefreshCw className="w-5 h-5 text-amber-400 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
            {toast.onRetry && (
              <button
                onClick={() => {
                  toast.onRetry?.();
                  setToast(null);
                }}
                className="mt-1 text-[11px] font-bold text-amber-300 hover:underline"
              >
                立即重试 →
              </button>
            )}
          </div>

          <button
            onClick={() => setToast(null)}
            className="text-stone-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
