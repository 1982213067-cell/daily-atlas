import {
  CleanfitState,
  DatabaseState,
  HabitItem,
  HealthState,
  LifeTip,
  MediaItem,
  MenstrualSettings,
  PlanItem,
  RecordItem,
  SedentaryState,
  Settings,
  TableMeta,
  WeatherInfo,
  WishlistState,
} from '../types/workbench';
import { getInitialSeedData } from '../data/initialData';

const LOCAL_CACHE_KEY = 'daily_atlas_life_cache_v2';

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
  tables?: TableMeta[];
  totalRows?: number;
}

// Get fallback data from local storage or default seed
export function getFallbackData(): DatabaseState {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.records)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached state, falling back to seed', e);
  }
  return getInitialSeedData();
}

export function cacheLocalData(data: DatabaseState): void {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

// REST API calls to the online database
export const api = {
  async getStatus(): Promise<{ online: boolean; version: number; updatedAt?: number; recordCounts: Record<string, number> }> {
    const res = await fetch('/api/database/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getTables(): Promise<{ tables: TableMeta[]; totalRows: number; lastSync: number }> {
    const res = await fetch('/api/database/tables', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getAllData(): Promise<DatabaseState> {
    const res = await fetch('/api/database/all', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch database data`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Invalid database response');
    cacheLocalData(json.data);
    return json.data;
  },

  async createRecord(record: Partial<RecordItem>): Promise<RecordItem> {
    const res = await fetch('/api/database/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 写入线上数据失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '写入记录失败');
    return json.record;
  },

  async updateRecord(id: string, record: Partial<RecordItem>): Promise<RecordItem> {
    const res = await fetch(`/api/database/records/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 更新线上数据失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '更新记录失败');
    return json.record;
  },

  async deleteRecord(id: string): Promise<string> {
    const res = await fetch(`/api/database/records/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 删除线上数据失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '删除记录失败');
    return json.deletedId;
  },

  async createHabit(habit: Partial<HabitItem>): Promise<HabitItem> {
    const res = await fetch('/api/database/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habit),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 创建习惯失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '创建习惯失败');
    return json.habit;
  },

  async deleteHabit(id: string): Promise<string> {
    const res = await fetch(`/api/database/habits/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 删除习惯失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '删除习惯失败');
    return json.deletedId;
  },

  async checkinHabit(id: string, date: string, value: number | string): Promise<HabitItem> {
    const res = await fetch(`/api/database/habits/${encodeURIComponent(id)}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, value }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 打卡状态同步失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '打卡更新失败');
    return json.habit;
  },

  async updateFitnessProfile(profile: Partial<Settings['fitnessProfile']>): Promise<Settings['fitnessProfile']> {
    const res = await fetch('/api/database/fitness/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 更新减脂档案失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '更新减脂档案失败');
    return json.profile;
  },

  async addFitnessPlan(plan: Partial<PlanItem>): Promise<PlanItem> {
    const res = await fetch('/api/database/fitness/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 添加周计划失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '添加周计划失败');
    return json.plan;
  },

  async toggleFitnessPlan(id: string): Promise<PlanItem> {
    const res = await fetch(`/api/database/fitness/plans/${encodeURIComponent(id)}/toggle`, {
      method: 'PUT',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 切换计划状态失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '切换计划状态失败');
    return json.plan;
  },

  async deleteFitnessPlan(id: string): Promise<string> {
    const res = await fetch(`/api/database/fitness/plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 删除周计划失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '删除周计划失败');
    return json.deletedId;
  },

  async createMedia(item: Partial<MediaItem>): Promise<MediaItem> {
    const res = await fetch('/api/database/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 添加书影音失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '添加书影音失败');
    return json.item;
  },

  async updateMedia(id: string, item: Partial<MediaItem>): Promise<MediaItem> {
    const res = await fetch(`/api/database/media/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 更新书影音失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '更新书影音失败');
    return json.item;
  },

  async deleteMedia(id: string): Promise<string> {
    const res = await fetch(`/api/database/media/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 删除书影音失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '删除书影音失败');
    return json.deletedId;
  },

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const res = await fetch('/api/database/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 保存设置失败`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '保存设置失败');
    return json.settings;
  },

  async clearSamples(): Promise<void> {
    const res = await fetch('/api/database/clear-samples', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 清除示例失败`);
  },

  async resetDefaults(): Promise<DatabaseState> {
    const res = await fetch('/api/database/reset-defaults', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 恢复初始数据失败`);
    const json = await res.json();
    return json.data;
  },

  async importData(data: DatabaseState): Promise<DatabaseState> {
    const res = await fetch('/api/database/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 导入数据失败`);
    const json = await res.json();
    return json.data;
  },

  async searchMedia(query: string, type?: string): Promise<Array<{
    name: string;
    type: string;
    author?: string;
    year?: string;
    genre?: string;
    cover?: string;
    summary?: string;
  }>> {
    const res = await fetch(`/api/media/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type || '')}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.results || [];
  },

  async updateMenstrual(menstrual: Partial<MenstrualSettings>): Promise<MenstrualSettings> {
    const res = await fetch('/api/database/menstrual', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menstrual),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 同步月经数据失败`);
    const json = await res.json();
    return json.menstrual;
  },

  async updateSedentary(sedentary: Partial<SedentaryState>): Promise<SedentaryState> {
    const res = await fetch('/api/database/sedentary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sedentary),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 同步久坐提醒数据失败`);
    const json = await res.json();
    return json.sedentary;
  },

  async updateCleanfit(cleanfit: Partial<CleanfitState>): Promise<CleanfitState> {
    const res = await fetch('/api/database/cleanfit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanfit),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 同步穿搭数据失败`);
    const json = await res.json();
    return json.cleanfit;
  },

  async updateDailyTips(tips: LifeTip[]): Promise<LifeTip[]> {
    const res = await fetch('/api/database/daily-tips', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tips),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 同步科普常识失败`);
    const json = await res.json();
    return json.dailyTips;
  },

  async updateWeather(weather: Partial<WeatherInfo>): Promise<WeatherInfo> {
    const res = await fetch('/api/database/weather', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weather),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 同步天气数据失败`);
    const json = await res.json();
    return json.weather;
  },

  async updateHealth(health: Partial<HealthState>): Promise<HealthState> {
    const res = await fetch('/api/database/health', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(health),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 同步健康档案失败`);
    const json = await res.json();
    return json.health;
  },

  async updateWishlist(wishlist: Partial<WishlistState>): Promise<WishlistState> {
    const res = await fetch('/api/database/wishlist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wishlist),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 同步待打卡清单失败`);
    const json = await res.json();
    return json.wishlist;
  },
};
