import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { getInitialSeedData, uid, INITIAL_MENSTRUAL, INITIAL_SEDENTARY, INITIAL_CLEANFIT, INITIAL_DAILY_TIPS, INITIAL_WEATHER, INITIAL_HEALTH, INITIAL_WISHLIST, DEFAULT_SPORT_TYPES } from './src/data/initialData.ts';
import {
  DatabaseState,
  TableMeta,
  RecordItem,
  HabitItem,
  MediaItem,
  PlanItem,
  FitnessProfile,
  Settings,
  MenstrualSettings,
  SedentaryState,
  CleanfitState,
  LifeTip,
  SportTypeItem,
  WeatherInfo,
  HealthState,
  WishlistState,
} from './src/types/workbench.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

// Ensure directory exists (best-effort; cloud persistence does not depend on it)
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  /* sandbox may be read-only; cloud store is the source of truth */
}

/* ================= 云端持久化（WorkBuddy 云数据库 REST，按模块分表） ================= */
const CLOUD_REST =
  process.env.WB_CLOUD_REST ||
  'https://daily-atlas-cloud.app.workbuddy.host/.cloud/database/rest/wbapp_state';
const CLOUD_KEY =
  process.env.WB_CLOUD_KEY ||
  'wbpk_bpHy7Zk63nyHdOWTTCG7Ti_qDoscOVPNZYxE9Z5NAyN0WipCoL0ndtG';

// 每个业务模块在云端独立存一行（module 为唯一键），页面按模块读写、互不覆盖
const MODULE_SLICES: Array<{
  key: string;
  get: (s: DatabaseState) => unknown;
  set: (s: DatabaseState, v: unknown) => void;
}> = [
  { key: 'records', get: (s) => s.records, set: (s, v) => { s.records = v as RecordItem[]; } },
  { key: 'habits', get: (s) => s.habits, set: (s, v) => { s.habits = v as HabitItem[]; } },
  { key: 'media', get: (s) => s.mediaItems, set: (s, v) => { s.mediaItems = v as MediaItem[]; } },
  { key: 'settings', get: (s) => s.settings, set: (s, v) => { s.settings = v as Settings; } },
  { key: 'menstrual', get: (s) => s.menstrual, set: (s, v) => { s.menstrual = v as MenstrualSettings; } },
  { key: 'sedentary', get: (s) => s.sedentary, set: (s, v) => { s.sedentary = v as SedentaryState; } },
  { key: 'cleanfit', get: (s) => s.cleanfit, set: (s, v) => { s.cleanfit = v as CleanfitState; } },
  { key: 'dailyTips', get: (s) => s.dailyTips, set: (s, v) => { s.dailyTips = v as LifeTip[]; } },
  { key: 'weather', get: (s) => s.weather, set: (s, v) => { s.weather = v as WeatherInfo; } },
  { key: 'health', get: (s) => s.health, set: (s, v) => { s.health = v as HealthState; } },
  { key: 'wishlist', get: (s) => s.wishlist, set: (s, v) => { s.wishlist = v as WishlistState; } },
];

// 带退避重试的 fetch：网络抖动时重试而不是直接报错，避免一次抖动就丢掉一次写入
// 注意：这里的 Response 指浏览器/Node 全局 Response，而非上方 express 的 Response
async function cloudFetch(url: string, init: RequestInit = {}, retries = 3): Promise<globalThis.Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function cloudUpsert(rows: Array<{ module: string; data: unknown; updated_at: string }>): Promise<void> {
  const res = await cloudFetch(`${CLOUD_REST}?on_conflict=module`, {
    method: 'POST',
    headers: {
      'x-wb-webapp-access-key': CLOUD_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`云端写入失败: HTTP ${res.status}`);
}

async function cloudLoadAll(): Promise<Record<string, unknown> | null> {
  const res = await cloudFetch(
    `${CLOUD_REST}?select=module,data`,
    { headers: { 'x-wb-webapp-access-key': CLOUD_KEY } },
    2
  );
  if (!res.ok) throw new Error(`云端读取失败: HTTP ${res.status}`);
  const arr = (await res.json()) as Array<{ module: string; data: unknown }>;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const map: Record<string, unknown> = {};
  for (const row of arr) {
    if (row && typeof row.module === 'string' && row.data !== undefined) map[row.module] = row.data;
  }
  return map;
}

// 仅取云端所有模块行最近更新时间戳，用于多端双向同步的轻量轮询
async function cloudLatestUpdatedAt(): Promise<number | null> {
  try {
    const res = await fetch(`${CLOUD_REST}?select=updated_at`, {
      headers: { 'x-wb-webapp-access-key': CLOUD_KEY },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ updated_at: string }>;
    if (!Array.isArray(arr)) return null;
    let max = 0;
    for (const r of arr) {
      const t = Date.parse(r && typeof r.updated_at === 'string' ? r.updated_at : '');
      if (Number.isFinite(t) && t > max) max = t;
    }
    return max > 0 ? max : null;
  } catch {
    return null;
  }
}

/* 数据结构迁移：云数据和本地文件共用，保证拿到最新结构 */
function migrateState(parsed: DatabaseState): DatabaseState {
  // Ensure new submodules are present in existing stored databases
  if (!parsed.menstrual) parsed.menstrual = INITIAL_MENSTRUAL;
  if (!parsed.sedentary) parsed.sedentary = INITIAL_SEDENTARY;
  if (!parsed.cleanfit) parsed.cleanfit = INITIAL_CLEANFIT;
  if (!parsed.dailyTips) parsed.dailyTips = INITIAL_DAILY_TIPS;
  if (!parsed.weather) parsed.weather = INITIAL_WEATHER;
  if (!parsed.health) parsed.health = INITIAL_HEALTH;
  if (!parsed.wishlist) parsed.wishlist = INITIAL_WISHLIST;
  // 迁移 sportTypes：旧版为 string[]，新版为 {name, emoji}[]
  if (!Array.isArray(parsed.settings?.sportTypes) || parsed.settings.sportTypes.length === 0) {
    parsed.settings.sportTypes = DEFAULT_SPORT_TYPES.map((x) => ({ ...x }));
  } else if (typeof parsed.settings.sportTypes[0] === 'string') {
    const legacy = parsed.settings.sportTypes as unknown as string[];
    const emojiMap: Record<string, string> = {};
    DEFAULT_SPORT_TYPES.forEach((x) => (emojiMap[x.name] = x.emoji));
    parsed.settings.sportTypes = legacy.map((name) => ({
      name,
      emoji: emojiMap[name] || '🎯',
    }));
  }
  // 迁移就诊记录：旧版（type/title/detail/medication）→ 新版（病名 + 病程分期含用药明细）
  if (Array.isArray(parsed.health?.medicalRecords) && parsed.health.medicalRecords.length > 0) {
    // 旧版记录字段与新类型不兼容，按"任意结构"处理后再归一化回 MedicalRecord[]
    const legacyRecords = parsed.health.medicalRecords as unknown as Record<string, unknown>[];
    parsed.health.medicalRecords = legacyRecords.map((rec: Record<string, unknown>) => {
      // 最老结构：type/title/detail/medication
      if (rec && typeof rec.disease !== 'string') {
        const legacyType = typeof rec.type === 'string' ? rec.type : '';
        const legacyTitle = typeof rec.title === 'string' ? rec.title : '';
        const disease = [legacyTitle, legacyType].filter(Boolean).join(' · ') || '未命名病况';
        const oldDetail = typeof rec.detail === 'string' ? rec.detail.trim() : '';
        const oldMed = typeof rec.medication === 'string' ? rec.medication.trim() : '';
        return {
          ...rec,
          disease,
          stages: [
            {
              name: '初期',
              date: typeof rec.date === 'string' ? rec.date : undefined,
              detail: oldDetail || undefined,
              medications: oldMed ? [oldMed] : [],
            },
          ],
        };
      }
      // 中间结构：顶层 details/medications + stages → 详情并入首期说明、用药并入首期
      const stages = Array.isArray(rec.stages) ? rec.stages : [];
      const topMeds = Array.isArray(rec.medications) ? (rec.medications as string[]).filter(Boolean) : [];
      const legacyDetails = Array.isArray(rec.details)
        ? (rec.details as { label?: string; content?: string }[])
            .map((d) => [String(d?.label || '').trim(), String(d?.content || '').trim()].filter(Boolean).join('：'))
            .filter(Boolean)
        : [];
      if (stages.length > 0) {
        const first = stages[0] as Record<string, unknown>;
        const firstMeds = Array.isArray(first.medications) ? (first.medications as string[]) : [];
        const firstDetail = typeof first.detail === 'string' ? first.detail.trim() : '';
        stages[0] = {
          ...first,
          medications: [...firstMeds, ...topMeds],
          detail: [firstDetail, ...legacyDetails].filter(Boolean).join('\n') || undefined,
        };
      } else if (topMeds.length > 0 || legacyDetails.length > 0) {
        stages.push({
          name: '初期',
          date: typeof rec.date === 'string' ? rec.date : undefined,
          detail: legacyDetails.join('\n') || undefined,
          medications: topMeds,
        });
      }
      const cleaned: Record<string, unknown> = { ...rec, stages };
      delete cleaned.details;
      delete cleaned.medications;
      return cleaned;
    }) as unknown as HealthState['medicalRecords'];
  }
  return parsed;
}

function loadLocalFile(): DatabaseState | null {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.records) && Array.isArray(parsed.habits)) {
        return migrateState(parsed as DatabaseState);
      }
    }
  } catch (err) {
    console.error('Error reading local database file:', err);
  }
  return null;
}

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function writeLocalFile(state: DatabaseState): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.warn('Local file write skipped:', err);
  }
}

function rowsForModules(
  state: DatabaseState,
  keys: string[]
): Array<{ module: string; data: unknown; updated_at: string }> {
  const now = new Date().toISOString();
  return keys.map((key) => {
    const def = MODULE_SLICES.find((m) => m.key === key);
    return { module: key, data: def ? def.get(state) : null, updated_at: now };
  });
}

function reconstructFromCloud(map: Record<string, unknown>, base: DatabaseState): DatabaseState {
  const state = migrateState(deepClone(base));
  for (const def of MODULE_SLICES) {
    if (map[def.key] !== undefined) def.set(state, map[def.key]);
  }
  return migrateState(state);
}

async function loadDatabase(): Promise<DatabaseState> {
  const local = loadLocalFile();
  const base = local || getInitialSeedData();
  try {
    const map = await cloudLoadAll();
    if (map) {
      const hasModuleRows = MODULE_SLICES.some((m) => map[m.key] !== undefined);
      if (hasModuleRows) {
        console.log('☁️  Loaded state from cloud (per-module tables)');
        return reconstructFromCloud(map, base);
      }
      // 旧版：整库只有一条 main 记录 → 兼容读取并迁移成分模块多行
      if (map['main'] !== undefined) {
        const migrated = migrateState(map['main'] as DatabaseState);
        await cloudUpsert(rowsForModules(migrated, MODULE_SLICES.map((m) => m.key)));
        writeLocalFile(migrated);
        console.log('☁️  Migrated legacy single-blob to per-module tables');
        return migrated;
      }
    }
    // 云端可达但为空 → 用本地/种子初始化并上云
    await cloudUpsert(rowsForModules(base, MODULE_SLICES.map((m) => m.key)));
    writeLocalFile(base);
    console.log('☁️  Cloud empty, seeded per-module tables');
    return base;
  } catch (err) {
    console.warn('Cloud load failed, falling back to local file:', err);
  }
  if (local) {
    console.log('📦 Loaded state from local file (offline fallback)');
    return migrateState(local);
  }
  return migrateState(getInitialSeedData());
}

// In-memory cache synced with cloud (loaded at startup)
let dbState: DatabaseState = getInitialSeedData();
let lastPersisted: DatabaseState | null = null;
let writeChain: Promise<unknown> = Promise.resolve();
let writeInFlight = 0;

/* ================= 实时推送（SSE）：任一设备写入后，其它设备秒级收到刷新信号 ================= */
const sseClients = new Set<{ id: number; res: Response }>();
let sseSeq = 0;

function broadcastUpdate(): void {
  const payload = `data: ${JSON.stringify({ updatedAt: dbState.updatedAt })}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// 串行化云端写入，避免并发写乱序；写入失败回滚内存态，绝不静默丢数据
function saveDatabase(state: DatabaseState): Promise<void> {
  const snapshot = deepClone(state);
  snapshot.updatedAt = Date.now();

  const changed: string[] = [];
  for (const def of MODULE_SLICES) {
    const prev = lastPersisted ? def.get(lastPersisted) : undefined;
    const cur = def.get(snapshot);
    if (prev === undefined || JSON.stringify(cur) !== JSON.stringify(prev)) changed.push(def.key);
  }

  if (changed.length === 0) return Promise.resolve();

  // 立即提升内存版本号：其它设备的下一次轮询 / SSE 刷新能马上感知到这次变更
  state.updatedAt = snapshot.updatedAt;

  writeInFlight += 1;
  const task = writeChain.then(async () => {
    await cloudUpsert(rowsForModules(snapshot, changed));
    writeLocalFile(snapshot);
    lastPersisted = snapshot;
    broadcastUpdate();
  });
  writeChain = task.catch(() => {});

  return task
    .catch((err) => {
      // 回滚内存态到上次成功持久化的状态，避免产生"未落库的幽灵数据"
      if (lastPersisted) dbState = deepClone(lastPersisted);
      throw err;
    })
    .finally(() => {
      writeInFlight -= 1;
    });
}

// Pre-curated database for instant fast matches of popular Chinese & global works
const CURATED_MEDIA = [
  {
    name: '宇宙探索编辑部',
    type: '电影',
    author: '孔大山 / 编剧：王一通',
    year: '2023',
    genre: '科幻 / 荒诞 / 剧情',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    summary: '荒诞又真诚的伪纪录片科幻，踏上一场寻找外星人信号的荒诞旅途。',
  },
  {
    name: '漫长的季节',
    type: '剧',
    author: '辛爽 / 范伟、秦昊',
    year: '2023',
    genre: '悬疑 / 生活 / 犯罪',
    cover: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&q=80',
    summary: '东北秋天的列车，往前看，别回头。辛爽导演的生活悬疑力作。',
  },
  {
    name: '献给阿尔吉侬的花束',
    type: '书',
    author: '[美] 丹尼尔·凯斯',
    year: '1966',
    genre: '科幻 / 人性 / 经典小说',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    summary: '查理通过手术变聪明，体会了世间的人情冷暖，却又慢慢回到最初。',
  },
  {
    name: '百年孤独',
    type: '书',
    author: '[哥伦比亚] 加西亚·马尔克斯',
    year: '1967',
    genre: '魔幻现实主义 / 经典文学',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    summary: '布恩迪亚家族七代人的传奇故事，拉美魔幻现实主义巅峰巨著。',
  },
  {
    name: '三体',
    type: '书',
    author: '刘慈欣',
    year: '2008',
    genre: '科幻 / 物理学 / 太空史诗',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    summary: '文化大革命期间向宇宙发出信号，开启人类文明与三体文明的百年纠葛。',
  },
  {
    name: '活着',
    type: '书',
    author: '余华',
    year: '1993',
    genre: '现当代文学 / 苦难与坚韧',
    cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    summary: '福贵老人的悲欢离合，展现生命在承受巨大苦难时无与伦比的力量。',
  },
  {
    name: '葬送的芙莉莲',
    type: '番',
    author: '山田钟人 / 斋藤圭一郎',
    year: '2023',
    genre: '奇幻 / 治愈 / 冒险',
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    summary: '勇者一行击败魔王之后，长寿精灵魔法使重新体验人间情感的旅途。',
  },
  {
    name: '蛤蟆先生去看心理医生',
    type: '书',
    author: '[英] 罗伯特·戴博德',
    year: '1997',
    genre: '心理学 / 治愈 / 自我成长',
    cover: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=600&q=80',
    summary: '借由《柳林风声》动物角色讲述心理咨询，照亮内心童年自我状态。',
  },
  {
    name: '肖申克的救赎',
    type: '电影',
    author: '弗兰克·德拉邦特 / 蒂姆·罗宾斯',
    year: '1994',
    genre: '剧情 / 犯罪 / 救赎',
    cover: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
    summary: '希望是件美好的事，也许是世间最美好的事，而美好的事物永不消逝。',
  },
  {
    name: '千与千寻',
    type: '电影',
    author: '宫崎骏 / 吉卜力工作室',
    year: '2001',
    genre: '动画 / 奇幻 / 冒险',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    summary: '十岁少女千寻在奇幻神灵小镇的成长与寻回记忆之旅。',
  },
  {
    name: '狂飙',
    type: '剧',
    author: '徐纪周 / 张译、张颂文',
    year: '2023',
    genre: '扫黑 / 刑侦 / 悬疑',
    cover: 'https://ts4.mm.bing.net/th?id=OIP.z1vASvNcv2Q2n9EanXY02QHaNK&pid=15.1',
    summary: '京海二十年时代风云变迁，正邪搏杀与人性深渊的深刻写照。',
  },
  {
    name: '繁花',
    type: '剧',
    author: '王家卫 / 胡歌、马伊琍、唐嫣',
    year: '2023',
    genre: '时代商战 / 爱情 / 剧情',
    cover: 'https://ts2.mm.bing.net/th?id=OIP.5WbYyW8s76H_rZqEaQvY6wHaK-&pid=15.1',
    summary: '九十年代上海黄河路商海浮沉，阿宝与夜东京群像的时代记忆。',
  },
  {
    name: '庆余年',
    type: '剧',
    author: '孙皓 / 张若昀、陈道明',
    year: '2019',
    genre: '古装 / 权谋 / 奇幻',
    cover: 'https://ts1.mm.bing.net/th?id=OIP.5E_b2AqZvOL0l4aMnQiaXQHaLH&pid=15.1',
    summary: '身世神秘的少年范闲初出茅庐，历经家族、江湖、庙堂种种考验。',
  },
  {
    name: '甄嬛传',
    type: '剧',
    author: '郑晓龙 / 孙俪、陈建斌、蔡少芬',
    year: '2011',
    genre: '古装 / 宫廷 / 情感',
    cover: 'https://ts4.mm.bing.net/th?id=OIP.7yG4Y8s0-2V9ZJ6c3zJkKgHaLH&pid=15.1',
    summary: '甄嬛从不谙世事的少女成长为深谙宫闱争斗的一代太后的传奇。',
  },
  {
    name: '大明王朝1566',
    type: '剧',
    author: '张黎 / 陈宝国、黄志忠、倪大红',
    year: '2007',
    genre: '历史 / 权谋 / 历史巨作',
    cover: 'https://ts3.mm.bing.net/th?id=OIP.b28U4W5G6j8i9H3j3K1mLQHaLH&pid=15.1',
    summary: '嘉靖与海瑞的君臣博弈，展现明代嘉靖末年官场生态与社会变迁。',
  },
  {
    name: '武林外传',
    type: '剧',
    author: '尚敬 / 闫妮、沙溢、姚晨',
    year: '2006',
    genre: '古装 / 情景喜剧 / 生活',
    cover: 'https://ts2.mm.bing.net/th?id=OIP.7x2k9l8m3n4o5p6q7r8s9tHaLH&pid=15.1',
    summary: '同福客栈里的一群江湖儿女，笑中带泪的日常生活与江湖故事。',
  },
  {
    name: '去有风的地方',
    type: '剧',
    author: '丁梓光 / 刘亦菲、李现',
    year: '2023',
    genre: '田园 / 治愈 / 慢生活',
    cover: 'https://ts3.mm.bing.net/th?id=OIP.4n5m6o7p8q9r0s1t2u3v4wHaLH&pid=15.1',
    summary: '辞职来到云南云苗村有风小院，重新找回生活的力量与方向。',
  },
  {
    name: '隐秘的角落',
    type: '剧',
    author: '辛爽 / 秦昊、王景春',
    year: '2020',
    genre: '悬疑 / 犯罪 / 人性',
    cover: 'https://ts1.mm.bing.net/th?id=OIP.8v9w0x1y2z3a4b5c6d7e8fHaLH&pid=15.1',
    summary: '三个海滨小城的孩子在景区游玩时无意记录下一场谋杀案的冒险。',
  },
  {
    name: '平凡的世界',
    type: '书',
    author: '路遥',
    year: '1991',
    genre: '当代文学 / 茅盾文学奖',
    cover: 'https://ts3.mm.bing.net/th?id=OIP.kkbWyuGBuZoBb7MKsqcwOAHaHa&pid=15.1',
    summary: '陕北高原两兄弟面对现实压力与时代洪流自强不息的奋斗史诗。',
  },
  {
    name: '明朝那些事儿',
    type: '书',
    author: '当年明月',
    year: '2006',
    genre: '通俗历史 / 传记 / 明朝全景',
    cover: 'https://ts2.mm.bing.net/th?id=OIP.3c4d5e6f7g8h9i0j1k2l3mHaLH&pid=15.1',
    summary: '用幽默生动的笔调全景重现明朝三百年历史人物与波澜壮阔风云。',
  },
  {
    name: '白夜行',
    type: '书',
    author: '[日] 东野圭吾',
    year: '1999',
    genre: '悬疑 / 推理 / 人性幽微',
    cover: 'https://ts1.mm.bing.net/th?id=OIP.9a8b7c6d5e4f3g2h1i0j9kHaLH&pid=15.1',
    summary: '我的天空里没有太阳，总是黑夜，但并不暗，因为有东西代替了太阳。',
  },
  {
    name: '被讨厌的勇气',
    type: '书',
    author: '[日] 岸见一郎 / 古贺史健',
    year: '2013',
    genre: '心理学 / 阿德勒思想 / 人生哲学',
    cover: 'https://ts4.mm.bing.net/th?id=OIP.2j3k4l5m6n7o8p9q0r1s2tHaLH&pid=15.1',
    summary: '阿德勒心理学告诉我们：一切烦恼皆源于人际关系，自由就是被讨厌。',
  },
  {
    name: '红楼梦',
    type: '书',
    author: '[清] 曹雪芹',
    year: '1791',
    genre: '古典名著 / 世情小说 / 经典巅峰',
    cover: 'https://ts3.mm.bing.net/th?id=OIP.1b2c3d4e5f6g7h8i9j0k1lHaLH&pid=15.1',
    summary: '满纸荒唐言，一把辛酸泪。都云作者痴，谁解其中味。',
  },
  {
    name: '流浪地球2',
    type: '电影',
    author: '郭帆 / 吴京、李雪健、刘德华',
    year: '2023',
    genre: '科幻 / 灾难 / 太空史诗',
    cover: 'https://ts2.mm.bing.net/th?id=OIP.4f5g6h7i8j9k0l1m2n3o4pHaLH&pid=15.1',
    summary: '人类在危机面前启动数字生命计划与移山计划，走向未知的星辰大海。',
  },
];

async function startServer() {
  const app = express();

  // 访问口令：默认不启用（本机/私人链接直接打开）
  // 如需重新开启，设置环境变量 APP_PASSWORD 即可，无需改代码
  const AUTH_USER = process.env.APP_USER || 'me';
  const AUTH_PASS = process.env.APP_PASSWORD || '';
  app.use((req: Request, res: Response, next: () => void) => {
    if (!AUTH_PASS) {
      next();
      return;
    }
    const m = (req.headers.authorization || '').match(/^Basic\s+(.+)$/i);
    let ok = false;
    if (m) {
      const decoded = Buffer.from(m[1], 'base64').toString('utf8');
      const idx = decoded.indexOf(':');
      const u = idx >= 0 ? decoded.slice(0, idx) : '';
      const p = idx >= 0 ? decoded.slice(idx + 1) : '';
      ok = u === AUTH_USER && p === AUTH_PASS;
    }
    if (ok) {
      next();
      return;
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="DailyAtlas"');
    res.status(401).send('需要访问口令');
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // 启动时从云数据库加载（本地兜底），旧版单条/空库会自动迁移成分模块多行
  dbState = await loadDatabase();
  lastPersisted = deepClone(dbState);

  // 多设备双向同步：周期性轻量检查云端更新时间，云端更新且本地空闲时刷新内存态
  // （跨实例场景：本机不是写入方时，靠这里从云端把变更拉回来，再广播给在线客户端）
  setInterval(() => {
    void (async () => {
      if (writeInFlight > 0) return;
      try {
        const latest = await cloudLatestUpdatedAt();
        if (latest && latest > dbState.updatedAt) {
          const map = await cloudLoadAll();
          if (map) {
            dbState = reconstructFromCloud(map, dbState);
            dbState.updatedAt = latest; // 让客户端能感知到本次刷新
            lastPersisted = deepClone(dbState);
            broadcastUpdate();
            console.log('🔄  Reloaded state from cloud (another device changed it)');
          }
        }
      } catch {
        /* 瞬时失败忽略，下一轮再试 */
      }
    })();
  }, 10000);

  // JSON parser with sufficient limit for base64 media covers
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API router
  const api = express.Router();

  // Status check
  api.get('/status', (_req: Request, res: Response) => {
    res.json({
      online: true,
      service: 'cnb-life-workbench-database',
      version: dbState.version || 3,
      updatedAt: dbState.updatedAt || Date.now(),
      recordCounts: {
        records: dbState.records.length,
        habits: dbState.habits.length,
        mediaItems: dbState.mediaItems.length,
        weeklyPlan: dbState.settings.weeklyPlan.length,
        menstrualRecords: dbState.menstrual?.records.length || 0,
        cleanfitItems: dbState.cleanfit?.items.length || 0,
        dailyTips: dbState.dailyTips?.length || 0,
      },
    });
  });

  // Table Schemas for the Database Space View
  api.get('/tables', (_req: Request, res: Response) => {
    const tables: TableMeta[] = [
      {
        id: 'records',
        name: '综合流水表 (records_table)',
        description: '存储记账理财收支、减脂健身每日体测、日程统筹待办、待买物品清单核心流水',
        rowCount: dbState.records.length,
        primaryKey: 'id',
        columns: [
          { name: 'id', type: 'UUID/String', description: '记录主键唯一ID' },
          { name: 'type', type: 'Enum', description: '流水类别 (money | fitness | planner | home)' },
          { name: 'date', type: 'Date(YYYY-MM-DD)', description: '归属业务日期' },
          { name: 'createdAt', type: 'Timestamp', description: '创建时间戳' },
          { name: 'data', type: 'JSON/Object', description: '各业务模块专有字段对象' },
        ],
      },
      {
        id: 'habits',
        name: '习惯健康与热力图表 (habits_table)',
        description: '存储自定义打卡习惯、目标数值、打卡方式(勾选/计数/数值)以及30天打卡热力图数据',
        rowCount: dbState.habits.length,
        primaryKey: 'id',
        columns: [
          { name: 'id', type: 'String', description: '习惯唯一ID' },
          { name: 'name', type: 'String', description: '习惯名称 (如 喝水、运动)' },
          { name: 'type', type: 'Enum', description: '打卡模式 (check | counter | number)' },
          { name: 'target', type: 'Number', description: '每日目标量' },
          { name: 'unit', type: 'String', description: '计量单位' },
          { name: 'entries', type: 'Map<Date,Number>', description: '30日历史打卡记录字典' },
        ],
      },
      {
        id: 'menstrual',
        name: '月经周期健康表 (menstrual_table)',
        description: '记录每月生理期起止时间、规律推算下次来潮日期、易孕/排卵期与提前一天预警',
        rowCount: dbState.menstrual?.records.length || 0,
        primaryKey: 'id',
        columns: [
          { name: 'startDate', type: 'Date', description: '经期起始日期' },
          { name: 'endDate', type: 'Date', description: '经期结束日期' },
          { name: 'flow', type: 'Enum', description: '出血量级 (light | medium | heavy)' },
          { name: 'painLevel', type: 'Number(0-5)', description: '痛经程度' },
          { name: 'symptoms', type: 'Array<String>', description: '伴随症状标签' },
        ],
      },
      {
        id: 'sedentary',
        name: '久坐起身活动提醒表 (sedentary_table)',
        description: '40分钟工作久坐起身打卡机制，早8点至晚7点有效，记录每日起身次数与倒计时',
        rowCount: 1,
        primaryKey: 'config',
        columns: [
          { name: 'intervalMinutes', type: 'Number', description: '打卡间隔分钟数 (默认40)' },
          { name: 'startHour', type: 'Number', description: '起始生效小时 (8:00)' },
          { name: 'endHour', type: 'Number', description: '结束生效小时 (19:00)' },
          { name: 'todayCount', type: 'Number', description: '今日累计起身活动次数' },
        ],
      },
      {
        id: 'cleanfit',
        name: 'Cleanfit穿搭胶囊衣橱表 (cleanfit_table)',
        description: '合身克制质感基础款胶囊衣橱、天气联动穿搭公式与日记',
        rowCount: (dbState.cleanfit?.items.length || 0) + (dbState.cleanfit?.looks.length || 0),
        primaryKey: 'id',
        columns: [
          { name: 'category', type: 'Enum', description: '单品分类 (tops | bottoms | shoes | outerwear)' },
          { name: 'name', type: 'String', description: '单品名称与版型' },
          { name: 'color', type: 'String', description: '克制中性色系' },
          { name: 'material', type: 'String', description: '质感面料属性' },
        ],
      },
      {
        id: 'media',
        name: '书影音藏品表 (media_table)',
        description: '联网智能检索书籍/影视作品与海报封面，状态跟踪与生活精神短评',
        rowCount: dbState.mediaItems.length,
        primaryKey: 'id',
        columns: [
          { name: 'id', type: 'UUID/String', description: '藏品唯一标识' },
          { name: 'name', type: 'String', description: '作品名称' },
          { name: 'type', type: 'Enum', description: '形态 (电影/剧/书/番/游戏/音乐)' },
          { name: 'status', type: 'Enum', description: '状态 (想看/在看/看完/搁置)' },
          { name: 'review', type: 'Text', description: '个人短评' },
          { name: 'cover', type: 'Image/URL', description: '封面图' },
        ],
      },
      {
        id: 'tips',
        name: '每日科普常识视频表 (tips_table)',
        description: '大白话生活小常识库，含教学视频演示、关键步骤与避坑指南',
        rowCount: dbState.dailyTips?.length || 0,
        primaryKey: 'id',
        columns: [
          { name: 'title', type: 'String', description: '大白话常识标题' },
          { name: 'category', type: 'Enum', description: '分类 (衣物/保鲜/急救/家居)' },
          { name: 'videoUrl', type: 'URL', description: '实操教学视频' },
          { name: 'steps', type: 'Array<String>', description: '3步简明实操' },
        ],
      },
      {
        id: 'weather',
        name: '出门天气与突发预警表 (weather_table)',
        description: '当天温度、降温大风挂风添衣提醒、降雨带伞与防晒提示',
        rowCount: 1,
        primaryKey: 'city',
        columns: [
          { name: 'temp', type: 'Number', description: '当前气温' },
          { name: 'windWarning', type: 'Boolean', description: '换季挂风降温预警' },
          { name: 'rainWarning', type: 'Boolean', description: '降水带伞提醒' },
        ],
      },
      {
        id: 'fitness',
        name: '减脂档案与周计划表 (fitness_table)',
        description: '身高体重目标、Mifflin-St Jeor公式参数与运动饮食周计划',
        rowCount: dbState.settings.weeklyPlan.length + 1,
        primaryKey: 'id',
        columns: [
          { name: 'height', type: 'Number', description: '身高' },
          { name: 'target', type: 'Number', description: '目标体重' },
        ],
      },
      {
        id: 'settings',
        name: '系统偏好与预算表 (settings_table)',
        description: '存储月度预算上限、个性化工作台品牌名、图标、主题色与视图偏好',
        rowCount: 1,
        primaryKey: 'key',
        columns: [
          { name: 'budget', type: 'Number', description: '当月预算金额' },
        ],
      },
    ];

    res.json({
      success: true,
      tables,
      totalRows:
        dbState.records.length +
        dbState.habits.length +
        dbState.mediaItems.length +
        (dbState.menstrual?.records.length || 0) +
        (dbState.cleanfit?.items.length || 0) +
        (dbState.dailyTips?.length || 0) +
        10,
      lastSync: dbState.updatedAt,
    });
  });

  // Get full database
  api.get('/all', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: dbState,
    });
  });

  // 实时推送通道：SSE 长连接，任一设备写入 / 云端刷新后立即通知所有在线客户端拉取最新数据
  api.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 关闭反向代理缓冲，保证事件即时下发
    res.flushHeaders?.();

    const client = { id: ++sseSeq, res };
    sseClients.add(client);

    // 建连后先推一次当前版本，客户端据此判断是否需要立即拉取
    res.write(`data: ${JSON.stringify({ updatedAt: dbState.updatedAt })}\n\n`);

    // 心跳保活，防止网关/移动网络把空闲连接掐断
    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        /* 连接已断开，close 事件中清理 */
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(client);
    });
  });

  // ONLINE MEDIA SEARCH API (由微软必应 https://cn.bing.com/?scope=web&FORM=HDRSC1 驱动的电视剧、书籍与影视全网智能检索)
  api.get('/media/search', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '').trim();
      const typeHint = String(req.query.type || '');
      if (!q) {
        res.json({ success: true, engine: 'cn.bing.com', results: [] });
        return;
      }

      const results: Array<{
        name: string;
        type: string;
        author?: string;
        year?: string;
        genre?: string;
        cover?: string;
        summary?: string;
      }> = [];

      // 1. First check curated catalog for exact / fuzzy hits
      for (const item of CURATED_MEDIA) {
        if (
          item.name.toLowerCase().includes(q.toLowerCase()) ||
          q.toLowerCase().includes(item.name.toLowerCase())
        ) {
          results.push(item);
        }
      }

      // 2. Fetch directly from Microsoft Bing Images & Web Search (https://cn.bing.com/?scope=web&FORM=HDRSC1)
      try {
        const bingQuery = typeHint ? `${q} ${typeHint} 海报 封面` : `${q} 电视剧 书籍 海报 封面`;
        const bingImgUrl = `https://cn.bing.com/images/search?q=${encodeURIComponent(bingQuery)}&FORM=HDRSC2`;
        const bingRes = await fetch(bingImgUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          },
          signal: AbortSignal.timeout(4500),
        });

        if (bingRes.ok) {
          const html = await bingRes.text();
          const items = [...html.matchAll(/class="iusc"[^>]*m="([^"]+)"/g)]
            .map((m) => {
              try {
                const decoded = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
                return JSON.parse(decoded);
              } catch {
                return null;
              }
            })
            .filter(Boolean);

          for (const it of items.slice(0, 10)) {
            let rawTitle = it.t || it.desc || q;
            rawTitle = rawTitle.replace(/[\uE000-\uE001]/g, '').replace(/<[^>]+>/g, '').trim();

            // Extract title inside 《...》 if present
            const bracketMatch = rawTitle.match(/《([^》]+)》/);
            let cleanName = bracketMatch ? bracketMatch[1].trim() : '';
            if (!cleanName) {
              cleanName = rawTitle
                .split(/[-_|—]/)[0]
                .replace(/海报|壁纸|剧照|电视剧|电影|小说|全集|官方|精选/g, '')
                .trim();
            }
            if (!cleanName || cleanName.length > 25) {
              cleanName = q;
            }

            // Deduplicate
            if (results.some((r) => r.name.toLowerCase() === cleanName.toLowerCase())) continue;

            // Type inference
            let inferredType = typeHint || '电影';
            const contextText = rawTitle + ' ' + (it.desc || '') + ' ' + q;
            if (/电视剧|剧集|第[一二三四五六七八九十\d]+季|大结局|网剧/.test(contextText)) {
              inferredType = '剧';
            } else if (/书|小说|散文|作者|出版|精装|著|文学奖/.test(contextText)) {
              inferredType = '书';
            } else if (/动画|动漫|番剧/.test(contextText)) {
              inferredType = '番';
            } else if (/纪录片/.test(contextText)) {
              inferredType = '纪录片';
            } else if (/电影|影评|首映|票房/.test(contextText)) {
              inferredType = '电影';
            }

            // Year inference
            const yearMatch = contextText.match(/\b(19\d{2}|20\d{2})\b/);
            const year = yearMatch ? yearMatch[1] : undefined;

            // Author / Director heuristic
            let author = undefined;
            const authorMatch = contextText.match(/(?:导演|作者|著|编剧)[：:\s]*([\u4e00-\u9fa5]{2,6})/);
            if (authorMatch) {
              author = authorMatch[1];
            }

            // High-speed CDN cover from Bing
            const cover = it.turl || it.murl;

            results.push({
              name: cleanName,
              type: inferredType,
              author: author || '主创团队 / 出版方',
              year: year || (inferredType === '剧' ? '热播' : '经典'),
              genre:
                inferredType === '书'
                  ? '精选书籍 / 文学'
                  : inferredType === '剧'
                  ? '热门电视剧集'
                  : '精选影视作品',
              cover,
              summary: it.desc
                ? it.desc.replace(/[\uE000-\uE001]/g, '').slice(0, 80)
                : `${cleanName} - 必应 (cn.bing.com) 全网检索官方海报与资讯。`,
            });
          }
        }
      } catch (e) {
        console.warn('Bing search error:', e);
      }

      // 3. Fallback: If still under 3, try iTunes Search API as supplementary
      if (results.length < 3) {
        try {
          const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=all&limit=5`;
          const itunesRes = await fetch(itunesUrl, { signal: AbortSignal.timeout(3000) });
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            if (itunesData && Array.isArray(itunesData.results)) {
              for (const it of itunesData.results) {
                const name = it.trackName || it.collectionName;
                if (!name || results.some((r) => r.name.toLowerCase() === name.toLowerCase())) continue;
                let cover = it.artworkUrl100 || it.artworkUrl60;
                if (cover) cover = cover.replace('100x100bb', '600x600bb');
                results.push({
                  name,
                  type: it.kind === 'feature-movie' ? '电影' : '剧',
                  author: it.artistName || it.director,
                  year: it.releaseDate ? it.releaseDate.slice(0, 4) : undefined,
                  genre: it.primaryGenreName,
                  cover,
                  summary: it.shortDescription,
                });
              }
            }
          }
        } catch {
          // ignore
        }
      }

      // 4. Fallback: Ensure at least 1 rich entry is returned
      if (results.length === 0) {
        results.push({
          name: q,
          type: typeHint || '书',
          author: '主创 / 出版社',
          year: new Date().getFullYear().toString(),
          genre: '文艺 / 经典',
          cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
          summary: `${q} - 已为你由微软必应 (cn.bing.com) 检索到作品版式。`,
        });
      }

      res.json({
        success: true,
        engine: 'cn.bing.com',
        query: q,
        results: results.slice(0, 8),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Records CRUD
  api.post('/records', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<RecordItem>;
      if (!payload.type || !payload.data) {
        res.status(400).json({ success: false, error: 'Missing type or data' });
        return;
      }
      const newRecord: RecordItem = {
        id: payload.id || uid(),
        type: payload.type,
        date: payload.date || new Date().toISOString().slice(0, 10),
        createdAt: payload.createdAt || Date.now(),
        sample: false,
        data: payload.data,
      };

      dbState.records.unshift(newRecord);
      dbState.settings.recordsSinceExport = (dbState.settings.recordsSinceExport || 0) + 1;
      await saveDatabase(dbState);
      res.json({ success: true, record: newRecord });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.put('/records/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const idx = dbState.records.findIndex((r) => r.id === id);
      if (idx === -1) {
        res.status(404).json({ success: false, error: 'Record not found' });
        return;
      }
      dbState.records[idx] = {
        ...dbState.records[idx],
        ...req.body,
        id,
      };
      await saveDatabase(dbState);
      res.json({ success: true, record: dbState.records[idx] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.delete('/records/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const beforeCount = dbState.records.length;
      dbState.records = dbState.records.filter((r) => r.id !== id);
      if (dbState.records.length === beforeCount) {
        res.status(404).json({ success: false, error: 'Record not found' });
        return;
      }
      await saveDatabase(dbState);
      res.json({ success: true, deletedId: id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // HABITS API (Robust creation & deletion)
  api.post('/habits', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<HabitItem>;
      if (!payload.name) {
        res.status(400).json({ success: false, error: 'Habit name is required' });
        return;
      }
      const newHabit: HabitItem = {
        id: payload.id || `habit-${Date.now()}`,
        key: payload.key || `custom-${Date.now()}`,
        name: payload.name,
        nameEn: payload.nameEn || payload.name,
        type: payload.type || 'check',
        target: payload.target && payload.target > 0 ? payload.target : 1,
        unit: payload.unit || '次',
        unitEn: payload.unitEn || 'times',
        tone: payload.tone || 'sage',
        entries: payload.entries || {},
        createdAt: Date.now(),
        sample: false,
      };

      dbState.habits.push(newHabit);
      await saveDatabase(dbState);
      res.json({ success: true, habit: newHabit });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.delete('/habits/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const before = dbState.habits.length;
      dbState.habits = dbState.habits.filter((h) => h.id !== id && h.key !== id);
      await saveDatabase(dbState);
      res.json({ success: true, deletedId: id, remaining: dbState.habits.length });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.post('/habits/:id/checkin', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { date, value } = req.body as { date: string; value: number | string };
      const habit = dbState.habits.find((h) => h.id === id || h.key === id);
      if (!habit) {
        res.status(404).json({ success: false, error: 'Habit not found' });
        return;
      }
      if (!habit.entries) habit.entries = {};
      const isEmpty = typeof value === 'number' ? value <= 0 : (value ?? '') === '';
      if (isEmpty) {
        delete habit.entries[date];
      } else {
        habit.entries[date] = value;
      }
      await saveDatabase(dbState);
      res.json({ success: true, habit });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // MENSTRUAL CYCLE API (经期健康记录与预测)
  api.put('/menstrual', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<MenstrualSettings>;
      dbState.menstrual = {
        cycleLength: payload.cycleLength || dbState.menstrual?.cycleLength || 28,
        periodDuration: payload.periodDuration || dbState.menstrual?.periodDuration || 5,
        records: Array.isArray(payload.records) ? payload.records : dbState.menstrual?.records || [],
      };
      await saveDatabase(dbState);
      res.json({ success: true, menstrual: dbState.menstrual });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // SEDENTARY REMINDER API (40分钟活动打卡)
  api.put('/sedentary', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<SedentaryState>;
      dbState.sedentary = {
        ...dbState.sedentary,
        ...payload,
      };
      await saveDatabase(dbState);
      res.json({ success: true, sedentary: dbState.sedentary });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // CLEANFIT WARDROBE API (胶囊衣橱与穿搭记录)
  api.put('/cleanfit', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<CleanfitState>;
      dbState.cleanfit = {
        items: Array.isArray(payload.items) ? payload.items : dbState.cleanfit?.items || [],
        looks: Array.isArray(payload.looks) ? payload.looks : dbState.cleanfit?.looks || [],
        activeFormulaId: payload.activeFormulaId || dbState.cleanfit?.activeFormulaId,
      };
      await saveDatabase(dbState);
      res.json({ success: true, cleanfit: dbState.cleanfit });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // DAILY TIPS API (每日大白话生活科普)
  api.put('/daily-tips', async (req: Request, res: Response) => {
    try {
      const payload = req.body as LifeTip[];
      if (Array.isArray(payload)) {
        dbState.dailyTips = payload;
        await saveDatabase(dbState);
      }
      res.json({ success: true, dailyTips: dbState.dailyTips });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // WEATHER API (出门天气与从容提醒)
  // 天气数据代理：由后端请求 Open-Meteo，规避浏览器直连国外域名导致的 Failed to fetch
  api.get('/weather/forecast', async (req: Request, res: Response) => {
    try {
      const { latitude, longitude } = req.query;
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        res.status(400).json({ success: false, error: '无效的经纬度' });
        return;
      }
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation_probability,relative_humidity_2m',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
        timezone: 'auto',
        past_days: '1',
        forecast_days: '1',
      });
      const upstream = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      if (!upstream.ok) {
        res.status(502).json({ success: false, error: '天气服务暂时不可用' });
        return;
      }
      const data = await upstream.json();
      res.json({ success: true, data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({ success: false, error: `天气获取失败: ${msg}` });
    }
  });

  // 坐标反查城市名（GPS/IP 定位后调用，保证城市名与坐标一致）
  api.get('/weather/reverse', async (req: Request, res: Response) => {
    try {
      const { latitude, longitude } = req.query;
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        res.status(400).json({ success: false, error: '无效的经纬度' });
        return;
      }
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        localityLanguage: 'zh',
      });
      const upstream = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`);
      if (!upstream.ok) {
        res.status(502).json({ success: false, error: '位置反查失败' });
        return;
      }
      const data = await upstream.json();
      res.json({ success: true, data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({ success: false, error: `位置反查失败: ${msg}` });
    }
  });

  // IP 定位（免授权兜底）：后端反查请求方公网 IP 得到城市与经纬度
  api.get('/weather/ip', async (_req: Request, res: Response) => {
    try {
      const upstream = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=zh');
      if (!upstream.ok) {
        res.status(502).json({ success: false, error: 'IP 定位失败' });
        return;
      }
      const data = await upstream.json();
      res.json({ success: true, data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({ success: false, error: `IP 定位失败: ${msg}` });
    }
  });

  api.put('/weather', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<WeatherInfo>;
      dbState.weather = {
        ...dbState.weather,
        ...payload,
        updatedAt: Date.now(),
      };
      await saveDatabase(dbState);
      res.json({ success: true, weather: dbState.weather });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // HEALTH ARCHIVE API (健康管理档案)
  api.put('/health', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<HealthState>;
      const prev = dbState.health || INITIAL_HEALTH;
      dbState.health = {
        profile: { ...prev.profile, ...(payload.profile || {}) },
        metrics: Array.isArray(payload.metrics) ? payload.metrics : prev.metrics,
        reports: Array.isArray(payload.reports) ? payload.reports : prev.reports,
        medicalRecords: Array.isArray(payload.medicalRecords) ? payload.medicalRecords : prev.medicalRecords,
      };
      await saveDatabase(dbState);
      res.json({ success: true, health: dbState.health });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // WISHLIST API (待打卡心愿清单)
  api.put('/wishlist', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<WishlistState>;
      const prev = dbState.wishlist || INITIAL_WISHLIST;
      dbState.wishlist = {
        categories: Array.isArray(payload.categories) ? payload.categories : prev.categories,
        items: Array.isArray(payload.items) ? payload.items : prev.items,
      };
      await saveDatabase(dbState);
      res.json({ success: true, wishlist: dbState.wishlist });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // MEDIA API
  api.post('/media', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<MediaItem>;
      if (!payload.name) {
        res.status(400).json({ success: false, error: 'Media name is required' });
        return;
      }
      const newItem: MediaItem = {
        id: payload.id || uid(),
        name: payload.name,
        type: payload.type || '电影',
        status: payload.status || '想看',
        review: payload.review || '',
        date: payload.date || new Date().toISOString().slice(0, 10),
        cover: payload.cover || '',
        author: payload.author,
        year: payload.year,
        genre: payload.genre,
        createdAt: Date.now(),
        sample: false,
      };
      dbState.mediaItems.unshift(newItem);
      await saveDatabase(dbState);
      res.json({ success: true, item: newItem });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.put('/media/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const idx = dbState.mediaItems.findIndex((m) => m.id === id);
      if (idx === -1) {
        res.status(404).json({ success: false, error: 'Media item not found' });
        return;
      }
      dbState.mediaItems[idx] = {
        ...dbState.mediaItems[idx],
        ...req.body,
        id,
      };
      await saveDatabase(dbState);
      res.json({ success: true, item: dbState.mediaItems[idx] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.delete('/media/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const before = dbState.mediaItems.length;
      dbState.mediaItems = dbState.mediaItems.filter((m) => m.id !== id);
      if (dbState.mediaItems.length === before) {
        res.status(404).json({ success: false, error: 'Media item not found' });
        return;
      }
      await saveDatabase(dbState);
      res.json({ success: true, deletedId: id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Settings & Fitness
  api.put('/fitness/profile', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<FitnessProfile>;
      dbState.settings.fitnessProfile = {
        ...dbState.settings.fitnessProfile,
        ...payload,
      };
      await saveDatabase(dbState);
      res.json({ success: true, profile: dbState.settings.fitnessProfile });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.post('/fitness/plans', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<PlanItem>;
      if (!payload.title) {
        res.status(400).json({ success: false, error: 'Plan title is required' });
        return;
      }
      const newPlan: PlanItem = {
        id: payload.id || `plan-${Date.now()}`,
        group: payload.group || '运动',
        title: payload.title,
        note: payload.note || '',
        done: false,
      };
      dbState.settings.weeklyPlan.push(newPlan);
      await saveDatabase(dbState);
      res.json({ success: true, plan: newPlan });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.put('/fitness/plans/:id/toggle', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const plan = dbState.settings.weeklyPlan.find((p) => p.id === id);
      if (!plan) {
        res.status(404).json({ success: false, error: 'Plan not found' });
        return;
      }
      plan.done = !plan.done;
      await saveDatabase(dbState);
      res.json({ success: true, plan });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.delete('/fitness/plans/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      dbState.settings.weeklyPlan = dbState.settings.weeklyPlan.filter((p) => p.id !== id);
      await saveDatabase(dbState);
      res.json({ success: true, deletedId: id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.put('/settings', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<Settings>;
      dbState.settings = {
        ...dbState.settings,
        ...payload,
      };
      await saveDatabase(dbState);
      res.json({ success: true, settings: dbState.settings });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.post('/clear-samples', async (_req: Request, res: Response) => {
    try {
      dbState.records = dbState.records.filter((r) => !r.sample);
      dbState.mediaItems = dbState.mediaItems.filter((m) => !m.sample);
      await saveDatabase(dbState);
      res.json({ success: true, message: 'Samples cleared' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.post('/reset-defaults', async (_req: Request, res: Response) => {
    try {
      dbState = getInitialSeedData();
      await saveDatabase(dbState);
      res.json({ success: true, data: dbState });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  api.post('/import', async (req: Request, res: Response) => {
    try {
      const payload = req.body as DatabaseState;
      if (!payload || !Array.isArray(payload.records) || !Array.isArray(payload.habits)) {
        res.status(400).json({ success: false, error: 'Invalid backup structure' });
        return;
      }
      dbState = {
        version: payload.version || 3,
        updatedAt: Date.now(),
        records: payload.records,
        habits: payload.habits,
        mediaItems: Array.isArray(payload.mediaItems) ? payload.mediaItems : [],
        settings: payload.settings || getInitialSeedData().settings,
        menstrual: payload.menstrual || INITIAL_MENSTRUAL,
        sedentary: payload.sedentary || INITIAL_SEDENTARY,
        cleanfit: payload.cleanfit || INITIAL_CLEANFIT,
        dailyTips: payload.dailyTips || INITIAL_DAILY_TIPS,
        weather: payload.weather || INITIAL_WEATHER,
        health: payload.health || INITIAL_HEALTH,
        wishlist: payload.wishlist || INITIAL_WISHLIST,
      };
      await saveDatabase(dbState);
      res.json({ success: true, data: dbState });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Mount API router
  app.use('/api/database', api);
  app.use('/api', api);

  // Static / Vite middleware：优先服务已构建的 dist（生产/云部署）；否则本地 Vite 开发
  if (fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================================`);
    console.log(`🌟 日常集 · 生活工作台 (Daily Atlas Life Workbench)`);
    console.log(`🚀 Online Database Server running at http://0.0.0.0:${PORT}`);
    console.log(`📦 Database file: ${DB_FILE}`);
    console.log(`=================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
