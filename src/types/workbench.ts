export type ModuleType =
  | 'dashboard'
  | 'money'
  | 'habits'
  | 'fitness'
  | 'planner'
  | 'home'
  | 'media'
  | 'menstrual'
  | 'health'
  | 'weather'
  | 'wishlist';

export type ToneType = 'plum' | 'terra' | 'sage' | 'sand';

export interface MoneyData {
  flow: 'expense' | 'income';
  amount: number;
  category: string;
  note?: string;
}

export interface FitnessData {
  weight?: number;
  bodyFat?: number;
  calories?: number;
  duration?: number;
  note?: string;
  // 运动打卡字段
  sportType?: string; // 跑步/骑行/游泳/健身/瑜伽/步行/篮球/其他
  time?: string; // HH:mm
  distance?: number; // 公里
  feeling?: string; // 超棒/不错/一般/疲惫
}

export interface PlannerData {
  title: string;
  titleEn?: string;
  time?: string;
  priority: 'high' | 'normal' | 'low';
  list: string;
  note?: string;
  remind?: boolean;
  done: boolean;
}

export interface ShoppingData {
  name: string;
  quantity?: string;
  category: string;
  price?: number;
  priority: 'high' | 'normal' | 'low';
  note?: string;
  bought: boolean;
  boughtDate?: string;
}

export interface RecordItem {
  id: string;
  type: 'money' | 'fitness' | 'planner' | 'home';
  date: string; // YYYY-MM-DD
  createdAt: number;
  sample?: boolean;
  data: MoneyData | FitnessData | PlannerData | ShoppingData;
}

export type HabitType = 'check' | 'counter' | 'time' | 'word';

export interface HabitItem {
  id: string;
  key: string;
  name: string;
  nameEn?: string;
  type: HabitType;
  target: number;
  unit: string;
  unitEn?: string;
  tone: ToneType;
  entries: Record<string, number | string>; // date -> count/number/time/words
  createdAt?: number;
  sample?: boolean;
}

export interface PlanItem {
  id: string;
  group: '运动' | '饮食' | '恢复';
  title: string;
  titleEn?: string;
  note?: string;
  noteEn?: string;
  done: boolean;
}

export interface FitnessProfile {
  height: number;
  target: number;
  startWeight: number;
  age: number;
  sex: 'male' | 'female';
  activity: number;
}

export interface SportTypeItem {
  name: string;
  emoji: string;
}

export interface MediaItem {
  id: string;
  name: string;
  type: '电影' | '剧' | '书' | '番' | '游戏' | '音乐';
  status: '想看' | '在看' | '看完' | '搁置';
  review: string;
  date: string;
  cover?: string;
  author?: string;
  year?: string;
  genre?: string;
  createdAt?: number;
  sample?: boolean;
}

export interface MenstrualRecord {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  durationDays?: number; // Days of bleeding
  flow: 'light' | 'medium' | 'heavy' | 'very-heavy';
  painLevel: number; // 0 to 5
  symptoms: string[]; // 痛经, 疲劳, 情绪波动, 腰酸, 胸部胀痛, 水肿, 畏寒
  note?: string;
  createdAt: number;
}

export interface MenstrualSettings {
  cycleLength: number; // default e.g. 28 days
  periodDuration: number; // default e.g. 5 days
  records: MenstrualRecord[];
}

export interface SedentaryState {
  intervalMinutes: number; // default 40
  startHour: number; // 8:00
  endHour: number; // 19:00
  lastCheckinTime: number; // timestamp
  todayCount: number;
  lastDate: string;
  enabled: boolean;
}

export interface CleanfitItem {
  id: string;
  category: 'tops' | 'bottoms' | 'shoes' | 'outerwear' | 'accessories';
  name: string;
  color: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
  material?: string;
  image?: string;
  fitNote?: string;
}

export interface CleanfitLook {
  id: string;
  date: string;
  title: string;
  formula: string;
  weatherTag: string;
  tags: string[];
  items: string[];
  photo?: string;
  note?: string;
  createdAt: number;
}

export interface CleanfitState {
  items: CleanfitItem[];
  looks: CleanfitLook[];
  activeFormulaId?: string;
}

export interface LifeTip {
  id: string;
  category: 'kitchen' | 'wardrobe' | 'emergency' | 'home' | 'health';
  categoryLabel: string;
  title: string;
  summary: string;
  videoUrl: string;
  videoPoster: string;
  keyTakeaway: string;
  steps: string[];
  donts: string[];
  dos: string[];
  learned?: boolean;
  bookmarked?: boolean;
}

export interface WeatherInfo {
  city: string;
  condition: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  feelsLike: number;
  windDirection: string;
  windScale: number;
  windWarning: boolean;
  rainProbability: number;
  rainWarning: boolean;
  uvIndex: number;
  uvWarning: boolean;
  tempDropWarning: boolean;
  summaryTip: string;
  outfitAdvice: string;
  umbrellaAdvice: string;
  updatedAt: number;
}

// ===== 健康管理档案 =====
export interface HealthProfile {
  name: string;
  sex: 'male' | 'female';
  birthDate: string; // YYYY-MM-DD
  height: number; // cm
  bloodType: string; // A/B/AB/O + Rh
  phone?: string;
  emergencyContact?: string;
  allergies: string[]; // 过敏史
  diseases: string[]; // 既往病史
  surgeries: string[]; // 手术史
  familyHistory: string[]; // 家族史
  medications: string[]; // 长期用药
  habits: string[]; // 生活习惯标签（吸烟/饮酒/运动/饮食）
}

export interface HealthMetric {
  id: string;
  date: string; // YYYY-MM-DD
  weight?: number; // kg
  height?: number; // cm
  systolic?: number; // 收缩压 mmHg
  diastolic?: number; // 舒张压 mmHg
  heartRate?: number; // 次/分
  fastingGlucose?: number; // 空腹血糖 mmol/L
  postprandialGlucose?: number; // 餐后血糖 mmol/L
  note?: string;
  createdAt: number;
}

export interface HealthReport {
  id: string;
  date: string; // YYYY-MM-DD
  title: string; // 报告标题，如「年度体检」
  hospital?: string;
  category: string; // 体检报告/检查报告/检验报告
  items: { name: string; value: string; unit: string; reference: string; flag?: 'normal' | 'high' | 'low' }[];
  note?: string;
  createdAt: number;
}

// 病程分期（初期/中期/后期…），可自定义名称；每期自带用药明细
export interface MedicalStage {
  name: string;
  date?: string; // YYYY-MM-DD
  detail?: string;
  medications?: string[]; // 本期用药明细（多条）
}

export interface MedicalRecord {
  id: string;
  date: string; // YYYY-MM-DD 初诊/发现日期
  disease: string; // 病名
  hospital?: string;
  doctor?: string;
  stages: MedicalStage[]; // 病程分段：初期/中期/后期…（每期含用药明细）
  createdAt: number;
}

export interface HealthState {
  profile: HealthProfile;
  metrics: HealthMetric[];
  reports: HealthReport[];
  medicalRecords: MedicalRecord[];
}

// 待打卡心愿清单（旅游点 / 美食店 / 景点 / 新爱好等，分类与名称全部可自定义）
export interface WishlistCategory {
  id: string;
  name: string; // 分类名，如「旅游点」「美食店」「新爱好」
  emoji: string;
}

export interface WishlistItem {
  id: string;
  categoryId: string; // 所属分类
  name: string; // 名称，如「大理洱海」「陈添记鱼皮」「壁球」
  note?: string; // 备注：地址 / 期待理由 / 体验感受等
  done: boolean; // 是否已打卡
  doneDate?: string; // 打卡日期 YYYY-MM-DD
  createdAt: number;
}

export interface WishlistState {
  categories: WishlistCategory[];
  items: WishlistItem[];
}

export interface Settings {
  budget: number;
  recordsSinceExport: number;
  moneySinceExport: number;
  lastExportAt: string | null;
  archiveFilter: string;
  moneyFilter: string;
  plannerFilter: string;
  shoppingFilter: string;
  mediaView: 'wall' | 'list';
  mediaStatusFilter: string;
  hiddenHabitKeys: string[];
  brand: {
    name: string;
    avatar: string;
    tagline: string;
    theme: ToneType;
  };
  fitnessProfile: FitnessProfile;
  weeklyPlan: PlanItem[];
  sportTypes: SportTypeItem[];
  lang?: 'zh' | 'en';
}

export interface DatabaseState {
  version: number;
  updatedAt: number;
  records: RecordItem[];
  habits: HabitItem[];
  mediaItems: MediaItem[];
  settings: Settings;
  menstrual: MenstrualSettings;
  sedentary: SedentaryState;
  cleanfit: CleanfitState;
  dailyTips: LifeTip[];
  weather: WeatherInfo;
  health: HealthState;
  wishlist: WishlistState;
  drafts?: Record<string, unknown>;
}

export interface TableMeta {
  id: string;
  name: string;
  description: string;
  rowCount: number;
  primaryKey: string;
  columns: { name: string; type: string; description: string }[];
}
