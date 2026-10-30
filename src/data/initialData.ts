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
  SportTypeItem,
  WeatherInfo,
  WishlistState,
} from '../types/workbench';

export const isoDate = (date: Date = new Date()): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const shiftDate = (days: number, base: Date = new Date()): string => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return isoDate(d);
};

export const uid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const DEFAULT_PLAN: PlanItem[] = [
  { id: 'move-1', group: '运动', title: '力量训练 2 次', titleEn: 'Strength training ×2', note: '每次 30–40 分钟', done: false },
  { id: 'move-2', group: '运动', title: '中低强度有氧 3 次', titleEn: 'Moderate cardio ×3', note: '快走、骑行或游泳', done: false },
  { id: 'meal-1', group: '饮食', title: '每餐一掌心蛋白质', titleEn: 'Palm-size protein per meal', note: '鱼、蛋、瘦肉或豆制品', done: false },
  { id: 'meal-2', group: '饮食', title: '午晚餐蔬菜占一半', titleEn: 'Veggies = half the plate', note: '优先深色蔬菜', done: false },
  { id: 'meal-3', group: '饮食', title: '主食不过度削减', titleEn: "Don't cut carbs too much", note: '每餐约一拳头', done: false },
  { id: 'meal-4', group: '恢复', title: '睡够 7 小时', titleEn: 'Sleep 7+ hours', note: '恢复也是减脂计划', done: false },
];

export const EXPENSE_CATEGORIES = ['吃饭', '交通', '购物', '娱乐', '房租', '看病', '学习', '其他'];
export const INCOME_CATEGORIES = ['工资', '奖金', '兼职', '理财', '其他'];
export const SHOPPING_CATEGORIES = ['食品', '日用品', '数码', '穿搭', '家居', '其他'];
export const PLANNER_LISTS = ['生活', '工作', '家庭', '个人'];
export const MEDIA_TYPES = ['电影', '剧', '书', '番', '游戏', '音乐'] as const;

export const DEFAULT_SPORT_TYPES: SportTypeItem[] = [
  { name: '跑步', emoji: '🏃' },
  { name: '骑行', emoji: '🚴' },
  { name: '游泳', emoji: '🏊' },
  { name: '健身', emoji: '💪' },
  { name: '瑜伽', emoji: '🧘' },
  { name: '步行', emoji: '🚶' },
  { name: '篮球', emoji: '🏀' },
  { name: '其他', emoji: '🎯' },
];
export const MEDIA_STATUSES = ['想看', '在看', '看完', '搁置'] as const;

export const HABIT_DEFS: Omit<HabitItem, 'id' | 'entries'>[] = [
  { key: 'water', name: '喝水', nameEn: 'Drink water', type: 'counter', target: 8, unit: '杯', unitEn: 'cups', tone: 'sage' },
  { key: 'sleep', name: '起床', nameEn: 'Wake up', type: 'time', target: 1, unit: '时间点', unitEn: 'time', tone: 'plum' },
  { key: 'exercise', name: '运动', nameEn: 'Exercise', type: 'check', target: 1, unit: '次', unitEn: 'times', tone: 'terra' },
  { key: 'reading', name: '看书', nameEn: 'Read', type: 'check', target: 1, unit: '次', unitEn: 'times', tone: 'sand' },
  { key: 'meditation', name: '冥想', nameEn: 'Meditate', type: 'check', target: 1, unit: '次', unitEn: 'times', tone: 'sage' },
];

export const INITIAL_MENSTRUAL: MenstrualSettings = {
  cycleLength: 28,
  periodDuration: 5,
  records: [
    {
      id: 'm-1',
      startDate: shiftDate(-27), // Started 27 days ago -> Next expected tomorrow!
      endDate: shiftDate(-22),
      durationDays: 5,
      flow: 'medium',
      painLevel: 2,
      symptoms: ['腰酸', '疲劳'],
      note: '状态平稳，饮用红糖姜茶好转',
      createdAt: Date.now() - 27 * 86400000,
    },
    {
      id: 'm-2',
      startDate: shiftDate(-55),
      endDate: shiftDate(-50),
      durationDays: 5,
      flow: 'medium',
      painLevel: 3,
      symptoms: ['轻度痛经', '胸部胀痛'],
      note: '第一天微痛，温敷袋缓解',
      createdAt: Date.now() - 55 * 86400000,
    },
    {
      id: 'm-3',
      startDate: shiftDate(-83),
      endDate: shiftDate(-78),
      durationDays: 5,
      flow: 'medium',
      painLevel: 1,
      symptoms: ['情绪微波动'],
      note: '作息规律，无严重不适',
      createdAt: Date.now() - 83 * 86400000,
    },
  ],
};

export const INITIAL_SEDENTARY: SedentaryState = {
  intervalMinutes: 40,
  startHour: 8,
  endHour: 19,
  lastCheckinTime: Date.now() - 22 * 60 * 1000, // 22 minutes ago
  todayCount: 6,
  lastDate: isoDate(),
  enabled: true,
};

export const INITIAL_CLEANFIT: CleanfitState = {
  items: [
    {
      id: 'cf-1',
      category: 'tops',
      name: '重磅纯棉纯白短袖 Tee',
      color: '奶白色',
      season: 'all',
      material: '260g 精梳棉',
      fitNote: '微落肩、正肩领口不松垮、微宽松',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'cf-2',
      category: 'tops',
      name: '浅蓝微透气牛津纺衬衫',
      color: '浅雾蓝',
      season: 'spring',
      material: '100% 支纱纯棉',
      fitNote: '合身自然垂坠、单穿打底皆宜',
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'cf-3',
      category: 'outerwear',
      name: '燕麦色美利奴羊毛针织开衫',
      color: '燕麦米',
      season: 'autumn',
      material: '100% 美利奴羊毛',
      fitNote: '保暖软糯、V领显颈长、换季百搭',
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'cf-4',
      category: 'outerwear',
      name: '深藏青双面羊毛无里布西装',
      color: '深藏青',
      season: 'autumn',
      material: '双面呢毛呢',
      fitNote: '无垫肩随性版型、利落克制',
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'cf-5',
      category: 'bottoms',
      name: '炭灰色高腰垂坠阔腿西裤',
      color: '炭灰',
      season: 'all',
      material: '抗皱涤毛混纺',
      fitNote: '单褶、轻微堆褶、拉长腿部线条',
      image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'cf-6',
      category: 'bottoms',
      name: '原色赤耳直筒复古牛仔裤',
      color: '深牛仔蓝',
      season: 'all',
      material: '13.5oz 赤耳单宁',
      fitNote: '直筒微修饰腿型、复古水洗锁边',
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'cf-7',
      category: 'shoes',
      name: '灰白生胶底复古德训鞋',
      color: '灰白米',
      season: 'all',
      material: '小牛皮+翻毛皮',
      fitNote: '脚感轻巧、Cleanfit 灵魂鞋履',
      image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'cf-8',
      category: 'shoes',
      name: '黑色光面小牛皮乐福鞋',
      color: '纯黑',
      season: 'all',
      material: '头层牛皮',
      fitNote: '雅致随性、微方头',
      image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'cf-9',
      category: 'accessories',
      name: '深棕色植鞣革极简托特包',
      color: '深棕',
      season: 'all',
      material: '头层植鞣牛皮',
      fitNote: '大容量日常通勤、越用质感越温润',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=400&q=80',
    },
  ],
  looks: [
    {
      id: 'look-1',
      date: isoDate(),
      title: '降温微雨通勤 · 燕麦开衫叠搭',
      formula: '纯白T打底 + 燕麦羊毛开衫 + 炭灰垂坠西裤 + 德训鞋',
      weatherTag: '适宜 15-20℃ / 换季防风',
      tags: ['日常通勤', '低饱和度', '随性体面'],
      items: ['cf-1', 'cf-3', 'cf-5', 'cf-7', 'cf-9'],
      photo: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      note: '整体燕麦色与炭灰结合，内里露出一道白T圆领边，视觉干净克制。',
      createdAt: Date.now() - 86400000,
    },
    {
      id: 'look-2',
      date: shiftDate(-3),
      title: '周末咖啡漫步 · 浅蓝牛津纺与原色牛仔',
      formula: '浅蓝牛津纺衬衫 + 原色直筒牛仔裤 + 黑色乐福鞋',
      weatherTag: '适宜 18-24℃ / 晴好微风',
      tags: ['咖啡探店', '周末休闲', '松弛感'],
      items: ['cf-2', 'cf-6', 'cf-8'],
      photo: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
      note: '衬衫解开前两颗纽扣，衣袖挽起两折，搭配直筒牛仔裤露出干净脚踝。',
      createdAt: Date.now() - 3 * 86400000,
    },
  ],
  activeFormulaId: 'look-1',
};

export const INITIAL_DAILY_TIPS: LifeTip[] = [
  {
    id: 'tip-1',
    category: 'wardrobe',
    categoryLabel: '衣物护理',
    title: '羽绒服局部沾油不用整件洗！白醋+洗洁精3分钟极速去油渍法',
    summary: '羽绒服频繁整件机洗会破坏羽绒天然油脂和面料涂层导致保暖性下降。局部去渍不仅省水省干洗费，而且立竿见影。',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    videoPoster: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    keyTakeaway: '白醋软化污渍表层 + 洗洁精乳化油脂 + 热毛巾温水打圈吸附',
    steps: [
      '在小喷瓶或小碟中按 1:1 比例加入洗洁精与食用白醋，搅拌均匀。',
      '用棉签或小软刷蘸取少量溶液，涂在羽绒服油渍处，轻轻顺着面料纹理刷动 30 秒，静置 2 分钟让其乳化。',
      '拿一条浸透热温水并拧干的干净毛巾，在污渍处反复按压打圈擦拭，最后用吹风机冷风吹干即可光洁如新！',
    ],
    donts: [
      '切忌直接将整件羽绒服扔进洗衣机高速甩干（极易面料炸裂或鸭绒结团）。',
      '切忌用热风紧贴烘吹，高温会破坏面料防水压胶涂层。',
    ],
    dos: [
      '沾上火锅油或奶茶后越早处理越容易彻底清除。',
      '大面积脏污建议送专业中性干洗或专用羽绒清洗剂手洗。',
    ],
    learned: false,
    bookmarked: true,
  },
  {
    id: 'tip-2',
    category: 'kitchen',
    categoryLabel: '食材保鲜',
    title: '绿叶蔬菜放两三天就烂？一张厨房纸巾保鲜延长至两周',
    summary: '蔬菜变质烂叶主要因为呼吸作用产生的冷凝水聚集在包装内形成水气霉烂。控制湿度是保鲜的真正秘密。',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoPoster: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    keyTakeaway: '干爽包裹 + 吸收凝水 + 避开乙烯催熟源',
    steps: [
      '买回来的菠菜、生菜、香菜切记先不要水洗（残留水滴会加速烂根）。',
      '取 2-3 张厚厨房纸巾，像包花一样将菜根与叶子轻柔卷起包裹。',
      '放入保鲜袋中，袋口不用扎得死紧，留一指缝隙微透气，放入冰箱蔬果保鲜抽屉。',
    ],
    donts: [
      '切忌将绿叶菜和苹果、熟香蕉放在同一个抽屉（苹果会释放大量乙烯气体催熟腐烂蔬菜）。',
      '切忌湿漉漉直接密封在买菜塑料袋里。',
    ],
    dos: [
      '如果纸巾过几天变潮湿，及时换一张干燥纸巾，叶子依然脆嫩如初。',
    ],
    learned: true,
    bookmarked: false,
  },
  {
    id: 'tip-3',
    category: 'emergency',
    categoryLabel: '应急急救',
    title: '不小心被开水或油锅烫伤？牢记急救五字诀“冲、脱、泡、盖、送”',
    summary: '烫伤后千万不要涂抹牙膏、酱油、香油或抹紫药水！这些民间土方不仅无法降温，还会导致创口严重感染并阻碍医生判断创面。',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    videoPoster: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    keyTakeaway: '第一时间冷水冲淋 15-20 分钟带走余热最关键',
    steps: [
      '【冲】：立即用流动的自来水冷水持续冲洗伤处 15–20 分钟，迅速带走皮下余热，减轻深度损伤。',
      '【脱】：在冷水中小心剪开或脱去表面衣服，切忌暴力硬撕扯，如衣物已粘住皮肤切勿硬拽。',
      '【泡】：如果仍感剧烈烧灼刺痛，可将伤处继续浸泡在冷水中 10–15 分钟（不要用冰块直接冰敷）。',
      '【盖】：用干净的无菌纱布或清洁毛巾轻轻覆盖在伤口上，保护创面防感染。',
      '【送】：若起水泡或面积较大，切勿自行挑破水泡，立即就近送医处理。',
    ],
    donts: [
      '切忌涂抹牙膏（牙膏含薄荷发热，且难以清洗，加剧二次创伤）。',
      '切忌涂抹酱油、红药水、面粉（深色污染伤口，极易化脓感染）。',
    ],
    dos: [
      '冷水冲洗是医学界公认最唯一有效的降温止痛黄金急救准则。',
    ],
    learned: false,
    bookmarked: true,
  },
  {
    id: 'tip-4',
    category: 'home',
    categoryLabel: '家居妙招',
    title: '衣服泛黄有汗渍洗不掉？温水+小苏打+白醋浸泡还原雪白',
    summary: '汗液中的蛋白质与油脂在空气中氧化会形成顽固黄色污斑，普通洗衣液很难彻底分解。利用弱碱性小苏打分解油脂加过碳酸钠效果极佳。',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    videoPoster: 'https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&w=800&q=80',
    keyTakeaway: '40℃ 温水 + 小苏打/过碳酸钠浸泡 30 分钟',
    steps: [
      '准备一盆约 40℃ 的温水，加入 2 勺食用小苏打（或过碳酸钠爆炸盐）。',
      '将白T恤或衬衫领口发黄处浸泡在温水中，用手轻揉搓出泡沫，静置浸泡 30 分钟。',
      '加入常规洗衣液正常揉洗后清水漂洗，发黄暗沉立刻退去，衣服恢复亮白。',
    ],
    donts: [
      '切忌用 84 消毒液直接浸泡丝绸、羊毛或彩棉（会直接腐蚀纤维导致衣物发硬烧破）。',
    ],
    dos: [
      '晾晒时将浅色棉麻衣物反面朝外阴干，避免烈日暴晒导致紫外线氧化发黄。',
    ],
    learned: false,
    bookmarked: false,
  },
  {
    id: 'tip-5',
    category: 'kitchen',
    categoryLabel: '厨房技巧',
    title: '冻肉化冻又硬又柴还出水？双面铝锅夹肉法 8 分钟极速软化',
    summary: '直接泡热水解冻会让肉表面烫熟而内部依然冻硬，且肉汁和鲜味大量流失；微波炉解冻容易半生不熟。利用铝的高导热性可在常温下飞速解冻。',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoPoster: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80',
    keyTakeaway: '上下双铝锅热传导，无需插电，锁住肉汁营养',
    steps: [
      '取一个底部平整的铝锅倒扣在台面上。',
      '将需要解冻的冻肉排或肉块（用保鲜膜包好）平放在倒扣的锅底上。',
      '再拿另一个铝锅装入半锅冷水，正向压在肉块上方。铝的极高导热系数会迅速将肉的热量平衡，8-10 分钟肉质便自然软嫩，口感犹如鲜肉！',
    ],
    donts: [
      '切忌用滚烫开水直接浸泡冻肉（会导致细菌迅速滋生且肉蛋白质变性发柴）。',
    ],
    dos: [
      '日常冷冻肉类前，建议切成一餐份量的扁平肉饼或肉片分装冷冻，解冻更快更均匀。',
    ],
    learned: true,
    bookmarked: false,
  },
];

export const INITIAL_WISHLIST: WishlistState = {
  categories: [
    { id: 'cat-travel', name: '旅游点', emoji: '🏞️' },
    { id: 'cat-food', name: '美食店', emoji: '🍜' },
    { id: 'cat-spot', name: '景点', emoji: '📸' },
    { id: 'cat-hobby', name: '新爱好', emoji: '🎯' },
  ],
  items: [],
};

// 新爱好快捷建议（点一下即可加入待打卡）
export const HOBBY_SUGGESTIONS = [
  '按摩推拿', '壁球', '游泳', '钩针', '跳舞', '陶艺', '飞盘', '攀岩', '露营', '骑行', '烘焙', '油画',
];

export const INITIAL_HEALTH: HealthState = {
  profile: {
    name: '',
    sex: 'female',
    birthDate: '',
    height: 0,
    bloodType: '',
    phone: '',
    emergencyContact: '',
    allergies: [],
    diseases: [],
    surgeries: [],
    familyHistory: [],
    medications: [],
    habits: [],
  },
  metrics: [],
  reports: [],
  medicalRecords: [],
};

export const INITIAL_WEATHER: WeatherInfo = {
  city: '北京市',
  condition: '多云转小雨 · 阵风强',
  temp: 16,
  tempMin: 11,
  tempMax: 19,
  feelsLike: 14,
  windDirection: '东北风',
  windScale: 5,
  windWarning: true,
  rainProbability: 75,
  rainWarning: true,
  uvIndex: 4,
  uvWarning: false,
  tempDropWarning: true,
  summaryTip: '⚠️ 换季降温大风伴随阵雨，体感偏凉，今日外出请做好防风保暖与携带雨具。',
  outfitAdvice: '建议采用 Cleanfit 叠穿：内搭纯棉T，外搭防风风衣或羊毛厚开衫，搭配抗皱西裤与防污鞋履。',
  umbrellaAdvice: '降雨概率 75%，出门务必随身携带折叠晴雨伞。',
  updatedAt: Date.now(),
};

export function getInitialSeedData(): DatabaseState {
  const today = isoDate();

  const habits: HabitItem[] = HABIT_DEFS.map((def, index) => {
    const entries: Record<string, number | string> = {};
    for (let day = 29; day >= 1; day--) {
      const d = shiftDate(-day);
      if ((day + index) % 5 !== 0) {
        if (def.type === 'counter') entries[d] = 6 + (day % 3);
        else if (def.type === 'time') entries[d] = '07:30';
        else if (def.type === 'word') entries[d] = '已记录';
        else entries[d] = 1;
      }
    }
    // Today initial state
    if (def.key === 'water') entries[today] = 5;
    if (def.key === 'sleep') entries[today] = '07:30';
    if (def.key === 'exercise') entries[today] = 1;

    return {
      ...def,
      id: `habit-${def.key}`,
      entries,
      createdAt: Date.now() - 30 * 86400000,
      sample: true,
    };
  });

  const weights = [61.2, 61.0, 60.9, 60.7, 60.8, 60.5, 60.4, 60.3, 60.2, 60.1, 60.2, 60.1, 60.0, 60.0];
  const fitnessRecords: RecordItem[] = weights.map((weight, idx) => ({
    id: `fitness-${idx}`,
    type: 'fitness',
    date: shiftDate(idx - 13),
    createdAt: Date.now() - (13 - idx) * 86400000,
    sample: true,
    data: {
      weight,
      bodyFat: Number((29.2 - idx * 0.07).toFixed(1)),
      calories: 1650 + (idx % 3) * 60,
      duration: idx % 2 ? 35 : 20,
      note: idx === 13 ? '状态平稳，力量训练完成' : '日常打卡',
    },
  }));

  const records: RecordItem[] = [
    {
      id: uid(),
      type: 'money',
      date: today,
      createdAt: Date.now() - 1000,
      sample: true,
      data: { flow: 'expense', amount: 32, category: '吃饭', note: '午饭简餐' },
    },
    {
      id: uid(),
      type: 'money',
      date: today,
      createdAt: Date.now() - 2000,
      sample: true,
      data: { flow: 'expense', amount: 6, category: '交通', note: '地铁通勤' },
    },
    {
      id: uid(),
      type: 'money',
      date: shiftDate(-2),
      createdAt: Date.now() - 3000,
      sample: true,
      data: { flow: 'income', amount: 12000, category: '工资', note: '本月薪资' },
    },
    {
      id: uid(),
      type: 'money',
      date: shiftDate(-3),
      createdAt: Date.now() - 4000,
      sample: true,
      data: { flow: 'expense', amount: 158, category: '购物', note: '春季换季T恤' },
    },
    {
      id: uid(),
      type: 'money',
      date: shiftDate(-4),
      createdAt: Date.now() - 5000,
      sample: true,
      data: { flow: 'expense', amount: 45, category: '娱乐', note: '周末电影票' },
    },
    ...fitnessRecords,
    {
      id: uid(),
      type: 'planner',
      date: today,
      createdAt: Date.now() - 6000,
      sample: true,
      data: {
        title: '整理本周生活清单',
        titleEn: 'Review weekly checklist',
        time: '10:30',
        priority: 'high',
        list: '生活',
        note: '先处理最重要的三件事，保持节奏',
        remind: true,
        done: false,
      },
    },
    {
      id: uid(),
      type: 'planner',
      date: shiftDate(1),
      createdAt: Date.now() - 7000,
      sample: true,
      data: {
        title: '预约牙科检查',
        titleEn: 'Book dental checkup',
        time: '15:00',
        priority: 'normal',
        list: '个人',
        note: '带上医保卡及洁牙预约单',
        remind: true,
        done: false,
      },
    },
    {
      id: uid(),
      type: 'home',
      date: today,
      createdAt: Date.now() - 9000,
      sample: true,
      data: {
        name: '无糖燕麦奶',
        quantity: '2 盒',
        category: '食品',
        price: 18,
        priority: 'high',
        note: '早餐搭配咖啡',
        bought: false,
      },
    },
  ];

  // Media items without star ratings! Focused on title, status, review, and cover
  const mediaItems: MediaItem[] = [
    {
      id: uid(),
      name: '宇宙探索编辑部',
      type: '电影',
      status: '看完',
      author: '孔大山 / 编剧：王一通',
      year: '2023',
      genre: '科幻 / 荒诞 / 剧情',
      review: '荒诞又真诚，浪漫得很具体。那种向着星空伸出双手的不甘，击中了所有理想主义者。',
      date: today,
      cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      sample: true,
    },
    {
      id: uid(),
      name: '漫长的季节',
      type: '剧',
      status: '看完',
      author: '辛爽 / 范伟、秦昊',
      year: '2023',
      genre: '悬疑 / 生活 / 犯罪',
      review: '往前看，别回头。辛爽导演将生活底色与命运挽歌交织，后劲极其绵长。',
      date: shiftDate(-18),
      cover: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&q=80',
      sample: true,
    },
    {
      id: uid(),
      name: '献给阿尔吉侬的花束',
      type: '书',
      status: '看完',
      author: '[美] 丹尼尔·凯斯',
      year: '1966',
      genre: '科幻 / 人性 / 经典小说',
      review: '聪明与幸福之间，并没有简单答案。智能的获得与失去，让人唏嘘不已。',
      date: shiftDate(-35),
      cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      sample: true,
    },
    {
      id: uid(),
      name: '葬送的芙莉莲',
      type: '番',
      status: '在看',
      author: '山田钟人 / 斋藤圭一郎',
      year: '2023',
      genre: '奇幻 / 治愈 / 冒险',
      review: '时间把告别变成了理解。旅程的意义不在于终点，而在于同行时的每一道微光。',
      date: shiftDate(-7),
      cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
      sample: true,
    },
    {
      id: uid(),
      name: '机器人之梦',
      type: '电影',
      status: '想看',
      author: '巴勃罗·贝格尔',
      year: '2023',
      genre: '动画 / 治愈 / 音乐',
      review: '有些相遇，即使终将告别，也在心底化作了永远的起舞。',
      date: shiftDate(-2),
      cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      sample: true,
    },
  ];

  return {
    version: 3,
    updatedAt: Date.now(),
    records,
    habits,
    mediaItems,
    menstrual: INITIAL_MENSTRUAL,
    sedentary: INITIAL_SEDENTARY,
    cleanfit: INITIAL_CLEANFIT,
    dailyTips: INITIAL_DAILY_TIPS,
    weather: INITIAL_WEATHER,
    health: INITIAL_HEALTH,
    wishlist: INITIAL_WISHLIST,
    settings: {
      budget: 5000,
      recordsSinceExport: 0,
      moneySinceExport: 0,
      lastExportAt: null,
      archiveFilter: 'all',
      moneyFilter: 'all',
      plannerFilter: 'all',
      shoppingFilter: 'pending',
      mediaView: 'wall',
      mediaStatusFilter: 'all',
      hiddenHabitKeys: [],
      brand: {
        name: '日常集',
        avatar: '日',
        tagline: '生活有迹可循',
        theme: 'plum',
      },
      fitnessProfile: {
        height: 165,
        target: 55,
        startWeight: 60,
        age: 30,
        sex: 'female',
        activity: 1.375,
      },
      weeklyPlan: DEFAULT_PLAN.map((x) => ({ ...x })),
      sportTypes: [...DEFAULT_SPORT_TYPES],
      lang: 'zh',
    },
  };
}
