import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Shirt,
  Layers,
  Palette,
  Calendar,
  Plus,
  Trash2,
  Tag,
  Check,
  ChevronRight,
  Sun,
  CloudRain,
  Wind,
  Compass,
  Info,
  Camera,
} from 'lucide-react';
import { CleanfitItem, CleanfitLook, CleanfitState, WeatherInfo } from '../types/workbench';
import { isoDate } from '../data/initialData';

interface CleanfitViewProps {
  cleanfit: CleanfitState;
  weather?: WeatherInfo;
  onUpdateCleanfit: (cleanfit: Partial<CleanfitState>) => Promise<void>;
}

// 4 Classic Cleanfit Signature Formulas
const CLEANFIT_FORMULAS = [
  {
    id: 'formula-ivy',
    title: '静奢常春藤 (Quiet Ivy)',
    tagline: '重磅T + 燕麦羊毛开衫 + 炭灰垂感微锥裤 + 德训鞋',
    colors: ['#29251f', '#e6ddd0', '#5c5449', '#fffdfa'],
    colorNames: ['炭灰', '燕麦米', '深咖', '象牙白'],
    seasonTip: '适合 14℃ ~ 22℃ 春秋微凉气温',
    description: '最经典的 Cleanfit 舒适公式。开衫选用羊毛或厚重华夫格，内搭领口紧实的重磅圆领白T，下身搭配垂坠感西裤，脚踩德训鞋，松弛得体。',
  },
  {
    id: 'formula-workwear',
    title: '城市微工装 (City Utility)',
    tagline: '短款拉链防风夹克 + 卡其直筒工装裤 + 极简工装靴',
    colors: ['#3e453c', '#d3be9e', '#1e2229', '#f2ece4'],
    colorNames: ['松绿', '水洗卡其', '冷灰黑', '原色米白'],
    seasonTip: '适合大风降温、轻户外与通勤',
    description: '去繁就简的工装风格。保留硬挺版型与利落插袋，摒弃过多杂乱绑带与反光条，整体保持干净轮廓。',
  },
  {
    id: 'formula-monochrome',
    title: '极净黑白调 (Monochrome Clean)',
    tagline: '挺括微廓形黑西装/开衫 + 纯白重磅打底 + 黑色垂坠拖地裤',
    colors: ['#1c1c1e', '#ffffff', '#8e8e93'],
    colorNames: ['极黑', '纯白', '中灰'],
    seasonTip: '适合四季重要会面、出差与城市穿梭',
    description: '高级感永远来自色彩克制。用高克重纯白T打底打破黑色的沉闷，西裤裤腿自然堆叠在鞋面，线条笔直修长。',
  },
  {
    id: 'formula-earthy',
    title: '松弛大地感 (Earthy Relaxed)',
    tagline: '微透棉麻衬衫/亨利衫 + 燕麦宽松西裤 + 麂皮德训鞋/勃肯',
    colors: ['#a8896c', '#ece4d8', '#4a4237', '#ffffff'],
    colorNames: ['焦糖驼', '沙滩米', '泥炭深灰', '纯白'],
    seasonTip: '适合 20℃ ~ 28℃ 晴朗舒适温和天气',
    description: '天然面料的呼吸感。棉麻面料自然的肌理与微褶皱呈现不经雕琢的自在，透气吸湿，步态轻盈。',
  },
];

export const CleanfitView: React.FC<CleanfitViewProps> = ({
  cleanfit,
  weather,
  onUpdateCleanfit,
}) => {
  const today = isoDate();
  const [activeTab, setActiveTab] = useState<'today' | 'formulas' | 'wardrobe' | 'looks'>('today');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFormulaIdx, setActiveFormulaIdx] = useState(0);

  // Wardrobe Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<CleanfitItem['category']>('tops');
  const [itemColor, setItemColor] = useState('');
  const [itemSeason, setItemSeason] = useState<CleanfitItem['season']>('all');
  const [itemMaterial, setItemMaterial] = useState('');
  const [itemFitNote, setItemFitNote] = useState('');

  // Lookbook Modal
  const [showLookModal, setShowLookModal] = useState(false);
  const [lookToDelete, setLookToDelete] = useState<string | null>(null);
  const [lookTitle, setLookTitle] = useState('');
  const [lookFormula, setLookFormula] = useState(CLEANFIT_FORMULAS[0].title);
  const [lookWeather, setLookWeather] = useState(weather ? `${weather.temp}℃ ${weather.condition}` : '20℃ 微风');
  const [lookNote, setLookNote] = useState('');

  // Dynamic Weather-linked Today's Recommendation
  const weatherRecommendation = useMemo(() => {
    const temp = weather?.temp ?? 18;
    const cond = weather?.condition ?? '多云';
    const isWindy = (weather?.windScale ?? 3) >= 4;
    const isRain = weather?.condition?.includes('雨') || (weather?.rainProbability ?? 0) > 40;

    let adviceTitle = '';
    let pieces = [] as string[];
    let formulaName = '';
    let palette = [] as string[];

    if (isRain) {
      adviceTitle = '雨天应对 · 防泼水与干爽利落';
      pieces = ['微防水短款防风夹克', '深灰色快干垂坠西裤 (防泥点)', '黑色皮质德训鞋/防滑乐福鞋', '纯棉打底'];
      formulaName = '城市微工装防雨版';
      palette = ['#1e2229', '#3e453c', '#dedede'];
    } else if (temp < 15 || isWindy) {
      adviceTitle = '微凉降温 · 结构叠穿保暖';
      pieces = ['羊毛混纺开衫 / 翻领夹克', '280g 重磅高支纯白T恤', '深灰加厚垂坠微阔西裤', '复古德训鞋'];
      formulaName = '静奢常春藤保暖型';
      palette = ['#29251f', '#e6ddd0', '#5c5449'];
    } else if (temp > 24) {
      adviceTitle = '温暖透气 · 清爽亚麻与白T';
      pieces = ['220g 挺括圆领纯白T恤', '燕麦米色棉麻混纺休闲长裤', '麂皮德训鞋 / 浅色乐福鞋', '极简皮质手表'];
      formulaName = '松弛大地清凉型';
      palette = ['#ece4d8', '#ffffff', '#a8896c'];
    } else {
      adviceTitle = '春秋适温 · 经典极简两件套';
      pieces = ['羊毛针织开衫 (燕麦米 / 藏青)', '经典高圆领纯白短袖', '炭灰垂坠微锥长裤', '灰白德训鞋'];
      formulaName = '静奢常春藤经典版';
      palette = ['#29251f', '#e6ddd0', '#5c5449', '#ffffff'];
    }

    return {
      temp,
      cond,
      adviceTitle,
      pieces,
      formulaName,
      palette,
    };
  }, [weather]);

  // Wardrobe Items by category
  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return cleanfit.items;
    return cleanfit.items.filter((i) => i.category === categoryFilter);
  }, [cleanfit.items, categoryFilter]);

  // Add Item to Capsule Wardrobe
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const newItem: CleanfitItem = {
      id: `item-${Date.now()}`,
      name: itemName.trim(),
      category: itemCategory,
      color: itemColor.trim() || '经典大地色',
      season: itemSeason,
      material: itemMaterial.trim() || undefined,
      fitNote: itemFitNote.trim() || undefined,
    };

    await onUpdateCleanfit({
      items: [newItem, ...cleanfit.items],
    });

    setItemName('');
    setItemColor('');
    setItemMaterial('');
    setItemFitNote('');
    setShowItemModal(false);
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const updated = cleanfit.items.filter((i) => i.id !== itemToDelete);
    await onUpdateCleanfit({ items: updated });
    setItemToDelete(null);
  };

  // Add Lookbook
  const handleSaveLook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookTitle.trim()) return;

    const newLook: CleanfitLook = {
      id: `look-${Date.now()}`,
      date: today,
      title: lookTitle.trim(),
      formula: lookFormula,
      weatherTag: lookWeather.trim(),
      tags: ['Cleanfit', '今日OOTD'],
      items: [],
      note: lookNote.trim() || undefined,
      createdAt: Date.now(),
    };

    await onUpdateCleanfit({
      looks: [newLook, ...cleanfit.looks],
    });

    setLookTitle('');
    setLookNote('');
    setShowLookModal(false);
  };

  const handleConfirmDeleteLook = async () => {
    if (!lookToDelete) return;
    const updated = cleanfit.looks.filter((l) => l.id !== lookToDelete);
    await onUpdateCleanfit({ looks: updated });
    setLookToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Cleanfit Header with philosophy */}
      <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#ded5c8]/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#4a4237] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Shirt className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-serif-sc text-[#29251f]">
                  Cleanfit 极简穿搭
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f4ece1] text-[#6d573b] border border-[#e2d5c3] font-semibold">
                  合身 · 克制 · 低饱和
                </span>
              </div>
              <p className="text-xs text-[#746d63] mt-0.5">
                不过度追求大牌堆砌，注重面料垂坠感、微宽松剪裁与低饱和色彩搭配
              </p>
            </div>
          </div>

          {/* Navigation Pill-Tabs */}
          <div className="flex items-center bg-[#faf7f2] border border-[#ded5c8] rounded-xl p-1 text-xs font-semibold text-[#544b42]">
            {[
              { id: 'today', label: '今日灵感' },
              { id: 'formulas', label: '四大公式' },
              { id: 'wardrobe', label: `胶囊衣橱 (${cleanfit.items.length})` },
              { id: 'looks', label: `搭配日记 (${cleanfit.looks.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === t.id
                    ? 'bg-[#4a4237] text-white shadow-2xs'
                    : 'hover:text-[#29251f]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Core Rules Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#ded5c8]">
            <strong className="text-[#29251f] block font-bold">1. 版型重于一切 (Fit)</strong>
            <p className="text-[#746d63] text-[11px] mt-0.5">肩线微落不邋遢，裤长微堆不拖地，裤脚垂坠整齐。</p>
          </div>
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#ded5c8]">
            <strong className="text-[#29251f] block font-bold">2. 低饱和中性色 (Clean)</strong>
            <p className="text-[#746d63] text-[11px] mt-0.5">黑、白、炭灰、燕麦米、泥卡其、深藏青，全身不超过三色。</p>
          </div>
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#ded5c8]">
            <strong className="text-[#29251f] block font-bold">3. 材质肌理说话 (Texture)</strong>
            <p className="text-[#746d63] text-[11px] mt-0.5">重磅天竺棉、羊毛精纺、水洗棉麻、反绒皮麂皮德训。</p>
          </div>
        </div>
      </div>

      {/* TAB 1: TODAY'S OOTD LINKED WITH WEATHER */}
      {activeTab === 'today' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Today Outfit Recommendation */}
            <div className="lg:col-span-7 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#ded5c8]/60 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <h3 className="text-base font-bold font-serif-sc text-[#29251f]">
                      今日天气联动穿搭建议
                    </h3>
                  </div>
                  <span className="text-xs text-[#746d63] font-mono">
                    {weather?.city || '实时天气'} · {weatherRecommendation.temp}℃ {weatherRecommendation.cond}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#faf6f2] to-[#f4ebe1] border border-[#e5d8cb] mb-4">
                  <span className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider block mb-1">
                    穿搭公式参考：{weatherRecommendation.formulaName}
                  </span>
                  <h4 className="text-lg font-bold font-serif-sc text-[#29251f]">
                    {weatherRecommendation.adviceTitle}
                  </h4>

                  {/* Palette preview */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-[#746d63]">推荐色谱：</span>
                    {weatherRecommendation.palette.map((c, i) => (
                      <span
                        key={i}
                        className="w-5 h-5 rounded-full border border-black/20 shadow-2xs"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Outfit Pieces Checklist */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#29251f]">
                    组合单品推荐清单：
                  </span>
                  {weatherRecommendation.pieces.map((piece, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#faf7f2] border border-[#ded5c8] flex items-center gap-3 text-xs text-[#29251f]"
                    >
                      <span className="w-5 h-5 rounded-lg bg-[#4a4237] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold">{piece}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#ded5c8]/60 flex items-center justify-between">
                <button
                  onClick={() => {
                    setLookTitle(weatherRecommendation.adviceTitle);
                    setLookFormula(weatherRecommendation.formulaName);
                    setShowLookModal(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4a4237] text-white hover:opacity-90 shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>以此套记为今日穿搭日记</span>
                </button>
                <button
                  onClick={() => setActiveTab('formulas')}
                  className="text-xs text-[var(--accent)] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>查看全部公式</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Cleanfit Wardrobe Quick Preview */}
            <div className="lg:col-span-5 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#ded5c8]/60 mb-4">
                  <h3 className="text-base font-bold font-serif-sc text-[#29251f]">
                    胶囊衣橱常用单品
                  </h3>
                  <button
                    onClick={() => setActiveTab('wardrobe')}
                    className="text-xs text-[var(--accent)] hover:underline font-medium"
                  >
                    全部 ({cleanfit.items.length})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {cleanfit.items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#faf7f2] border border-[#ded5c8] flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-[#29251f] block font-bold">{item.name}</strong>
                        <span className="text-[#746d63] text-[11px]">
                          {item.color} {item.material ? `· ${item.material}` : ''}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#ede6dc] text-[#554b42] text-[10px] font-semibold">
                        {item.category === 'tops'
                          ? '上装'
                          : item.category === 'bottoms'
                          ? '下装'
                          : item.category === 'shoes'
                          ? '鞋履'
                          : item.category === 'outerwear'
                          ? '外套'
                          : '配饰'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowItemModal(true)}
                className="w-full mt-4 py-2 border border-dashed border-[#ded5c8] hover:border-[#4a4237] rounded-xl text-xs font-semibold text-[#544b42] bg-[#faf7f2] hover:bg-[#ede6dc] transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>录入新单品到衣橱</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FOUR SIGNATURE CLEANFIT FORMULAS */}
      {activeTab === 'formulas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CLEANFIT_FORMULAS.map((f, idx) => (
            <div
              key={f.id}
              className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#ede6dc] text-[#554b42]">
                    公式 0{idx + 1}
                  </span>
                  <span className="text-[11px] text-[#746d63]">{f.seasonTip}</span>
                </div>

                <h3 className="text-lg font-bold font-serif-sc text-[#29251f]">
                  {f.title}
                </h3>
                <p className="text-xs font-semibold text-[var(--accent)] mt-1 mb-3">
                  {f.tagline}
                </p>

                <p className="text-xs text-[#746d63] leading-relaxed mb-4">
                  {f.description}
                </p>

                {/* Color Palette */}
                <div className="p-3 bg-[#faf7f2] rounded-xl border border-[#ded5c8] mb-4">
                  <span className="text-[11px] font-bold text-[#29251f] block mb-2">
                    推荐中性色盘
                  </span>
                  <div className="flex items-center gap-3">
                    {f.colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: c }}
                        />
                        <span className="text-[11px] text-[#746d63]">{f.colorNames[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setLookTitle(`${f.title} 实践`);
                  setLookFormula(f.title);
                  setShowLookModal(true);
                }}
                className="w-full py-2 bg-[#faf7f2] hover:bg-[#4a4237] hover:text-white border border-[#ded5c8] rounded-xl text-xs font-semibold text-[#544b42] transition-colors flex items-center justify-center gap-1"
              >
                <span>套用此公式记录穿搭</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: CAPSULE WARDROBE */}
      {activeTab === 'wardrobe' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl">
            {/* Category filter */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { id: 'all', label: '全部单品' },
                { id: 'tops', label: '上装' },
                { id: 'bottoms', label: '下装' },
                { id: 'outerwear', label: '外套' },
                { id: 'shoes', label: '鞋履' },
                { id: 'accessories', label: '配饰' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    categoryFilter === c.id
                      ? 'bg-[#4a4237] text-white border-[#4a4237] font-semibold'
                      : 'bg-[#faf7f2] border-[#ded5c8] text-[#554b42]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowItemModal(true)}
              className="px-4 py-2 bg-[#4a4237] text-white rounded-xl text-xs font-semibold hover:opacity-90 shadow-2xs flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增单品</span>
            </button>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs flex flex-col justify-between hover:border-[#4a4237]/60 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#ede6dc] text-[#554b42] font-semibold">
                      {item.category === 'tops'
                        ? '上装'
                        : item.category === 'bottoms'
                        ? '下装'
                        : item.category === 'shoes'
                        ? '鞋履'
                        : item.category === 'outerwear'
                        ? '外套'
                        : '配饰'}
                    </span>
                    <span className="text-[10px] text-[#8a7f72]">
                      {item.season === 'all'
                        ? '四季'
                        : item.season === 'spring'
                        ? '春季'
                        : item.season === 'summer'
                        ? '夏季'
                        : item.season === 'autumn'
                        ? '秋季'
                        : '冬季'}
                    </span>
                  </div>

                  <strong className="text-sm font-bold text-[#29251f] block">
                    {item.name}
                  </strong>
                  <span className="text-xs text-[#746d63] block mt-0.5">
                    颜色：{item.color}
                  </span>

                  {item.material && (
                    <span className="text-[11px] text-[#8a7f72] block mt-1">
                      面料：{item.material}
                    </span>
                  )}

                  {item.fitNote && (
                    <p className="text-[11px] text-[#746d63] mt-2 italic bg-[#faf7f2] p-2 rounded-xl border border-[#ded5c8]/50">
                      "{item.fitNote}"
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-3 mt-3 border-t border-[#ded5c8]/50">
                  <button
                    onClick={() => setItemToDelete(item.id)}
                    className="p-1.5 text-[#746d63] hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    title="删除单品"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LOOKBOOK DIARY */}
      {activeTab === 'looks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl">
            <div>
              <h3 className="text-base font-bold font-serif-sc text-[#29251f]">
                穿搭日记与上身实录
              </h3>
              <p className="text-xs text-[#746d63]">
                记录每天套用的公式与实际舒适度，逐渐打造专属个人胶囊衣橱
              </p>
            </div>
            <button
              onClick={() => setShowLookModal(true)}
              className="px-4 py-2 bg-[#4a4237] text-white rounded-xl text-xs font-semibold hover:opacity-90 shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>记一则穿搭</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {cleanfit.looks.map((look) => (
              <div
                key={look.id}
                className="bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-2xl shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#746d63] mb-2">
                    <span className="font-mono">{look.date}</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#ede6dc] text-[#554b42] text-[10px] font-semibold">
                      {look.weatherTag}
                    </span>
                  </div>

                  <strong className="text-base font-bold font-serif-sc text-[#29251f] block mb-1">
                    {look.title}
                  </strong>
                  <span className="text-xs text-[var(--accent)] font-medium block mb-2">
                    套用：{look.formula}
                  </span>

                  {look.note && (
                    <p className="text-xs text-[#746d63] leading-relaxed bg-[#faf7f2] p-3 rounded-xl border border-[#ded5c8]/50">
                      {look.note}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-3 mt-3 border-t border-[#ded5c8]/50">
                  <button
                    onClick={() => setLookToDelete(look.id)}
                    className="p-1.5 text-[#746d63] hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fffdfa] border border-[#ded5c8] rounded-[var(--radius)] w-full max-w-md shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
              <h3 className="text-base font-bold font-serif-sc text-[#29251f]">
                添加单品到胶囊衣橱
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-stone-400 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1">单品名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="如：280g重磅圆领白T恤、炭灰微阔西裤..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium focus:outline-none focus:border-[#4a4237]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#29251f] block mb-1">分类</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium"
                  >
                    <option value="tops">上装 (Tops)</option>
                    <option value="bottoms">下装 (Bottoms)</option>
                    <option value="outerwear">外套 (Outerwear)</option>
                    <option value="shoes">鞋履 (Shoes)</option>
                    <option value="accessories">配饰 (Accessories)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#29251f] block mb-1">季节适配</label>
                  <select
                    value={itemSeason}
                    onChange={(e) => setItemSeason(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium"
                  >
                    <option value="all">四季皆宜</option>
                    <option value="spring">春季</option>
                    <option value="summer">夏季</option>
                    <option value="autumn">秋季</option>
                    <option value="winter">冬季</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1">颜色 (色号或描述)</label>
                <input
                  type="text"
                  placeholder="如：炭黑、象牙白、泥灰、水洗卡其..."
                  value={itemColor}
                  onChange={(e) => setItemColor(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium focus:outline-none focus:border-[#4a4237]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1">面料材质</label>
                <input
                  type="text"
                  placeholder="如：100%长绒棉、精纺羊毛、透气棉麻..."
                  value={itemMaterial}
                  onChange={(e) => setItemMaterial(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1">版型要点备忘</label>
                <input
                  type="text"
                  placeholder="如：微落肩正肩线，垂坠不臃肿..."
                  value={itemFitNote}
                  onChange={(e) => setItemFitNote(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#ded5c8]/60">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#faf7f2] text-[#554b42] border border-[#ded5c8]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#4a4237] hover:opacity-90"
                >
                  录入衣橱
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lookbook Modal */}
      {showLookModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fffdfa] border border-[#ded5c8] rounded-[var(--radius)] w-full max-w-md shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
              <h3 className="text-base font-bold font-serif-sc text-[#29251f]">
                记录今日穿搭日记
              </h3>
              <button onClick={() => setShowLookModal(false)} className="text-stone-400 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLook} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1">穿搭标题 *</label>
                <input
                  type="text"
                  required
                  placeholder="如：周二工装风通勤、周末松弛大地系..."
                  value={lookTitle}
                  onChange={(e) => setLookTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium focus:outline-none focus:border-[#4a4237]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#29251f] block mb-1">套用公式</label>
                  <select
                    value={lookFormula}
                    onChange={(e) => setLookFormula(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium"
                  >
                    {CLEANFIT_FORMULAS.map((f) => (
                      <option key={f.id} value={f.title}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#29251f] block mb-1">天气标签</label>
                  <input
                    type="text"
                    value={lookWeather}
                    onChange={(e) => setLookWeather(e.target.value)}
                    className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#29251f] block mb-1">上具体验心得</label>
                <textarea
                  rows={3}
                  value={lookNote}
                  onChange={(e) => setLookNote(e.target.value)}
                  placeholder="如：羊毛开衫在今天微风下非常舒服，西裤垂感很好，很适合今天的工作节奏..."
                  className="w-full p-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs focus:outline-none focus:border-[#4a4237]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#ded5c8]/60">
                <button
                  type="button"
                  onClick={() => setShowLookModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#faf7f2] text-[#554b42] border border-[#ded5c8]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#4a4237] hover:opacity-90"
                >
                  保存日记
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fffdfa] border border-[#ded5c8] rounded-[var(--radius)] w-full max-w-sm shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold font-serif-sc text-[#29251f]">确认删除该单品？</h3>
            <p className="text-xs text-[#746d63]">删除后将从胶囊衣橱永久移除。</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#faf7f2] text-[#554b42] border border-[#ded5c8]"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDeleteItem}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Look Confirmation Modal */}
      {lookToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fffdfa] border border-[#ded5c8] rounded-[var(--radius)] w-full max-w-sm shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold font-serif-sc text-[#29251f]">确认删除这篇穿搭？</h3>
            <p className="text-xs text-[#746d63]">删除后将从日记清单移除。</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setLookToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#faf7f2] text-[#554b42] border border-[#ded5c8]"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDeleteLook}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
