import React from 'react';
import {
  Trash2,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { ModuleType, SedentaryState, Settings, WeatherInfo } from '../types/workbench';
import { SyncStatus } from '../services/api';
import { SedentaryReminder } from './SedentaryReminder';

interface TopbarProps {
  currentModule: ModuleType;
  settings: Settings;
  syncStatus: SyncStatus;
  sedentary?: SedentaryState;
  weather?: WeatherInfo;
  onUpdateSedentary?: (sedentary: Partial<SedentaryState>) => Promise<void>;
  onSelectModule?: (mod: ModuleType) => void;
  onClearSamples: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onRetrySync: () => void;
  onToggleLang: () => void;
}

const MODULE_TITLES: Record<ModuleType, { title: string; subtitle: string }> = {
  dashboard: { title: '今天，慢慢来', subtitle: '把握今日生活节奏，留一份明白账' },
  money: { title: '记账理财', subtitle: '收支记账、预算分配、月度对比与消费结构' },
  habits: { title: '习惯健康', subtitle: '自定义微习惯，勾选/计数/时间点/词语打卡与30天热力图' },
  fitness: { title: '减脂健身', subtitle: '体重体脂、7日均线、BMI、热量缺口与周计划' },
  planner: { title: '日程统筹', subtitle: '按日统筹优先级事项，提醒与智能清单' },
  home: { title: '待买清单', subtitle: '想买先记下，分类汇总与采购控制' },
  media: { title: '书影音', subtitle: '精神角落，在线搜索自动填入、封面墙与年度统计' },
  menstrual: { title: '经期节律', subtitle: '周期规律智能推算、提前一天关怀提醒与阶段温养' },
  health: { title: '健康档案', subtitle: '基本信息、指标监测、体检报告与就诊用药一体化管理' },
  weather: { title: '天气预告', subtitle: '出门从容预警、大风降温添衣、下雨带伞与紫外线防晒' },
  wishlist: { title: '待打卡', subtitle: '想去的旅游点、想吃的美食店、想尝试的新爱好，一个个去实现' },
};

export const Topbar: React.FC<TopbarProps> = ({
  currentModule,
  settings,
  syncStatus,
  sedentary,
  weather,
  onUpdateSedentary,
  onSelectModule,
  onClearSamples,
  onExportBackup,
  onImportBackup,
  onRetrySync,
  onToggleLang,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const info = MODULE_TITLES[currentModule] || MODULE_TITLES.dashboard;

  const todayStr = React.useMemo(() => {
    const d = new Date();
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${days[d.getDay()]}`;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-[#f5f0e8]/90 backdrop-blur-md border-b border-[#685744]/10 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Title block */}
      <div>
        <p className="text-xs font-medium text-[#746d63] tracking-wide mb-0.5">
          {todayStr}
        </p>
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif-sc text-2xl md:text-3xl font-bold text-[#29251f]">
            {info.title}
          </h1>
          <span className="hidden lg:inline text-xs text-[#8a8075]">
            {info.subtitle}
          </span>
        </div>
      </div>

      {/* Action buttons & Online status */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Compact Weather Status */}
        {weather && onSelectModule && (
          <button
            onClick={() => onSelectModule('weather')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#fffdfa] border border-[#ded5c8] hover:bg-[#ede6dc] transition-all text-[#443c34]"
            title="查看完整天气从容出行建议"
          >
            <span>{weather.city}</span>
            <span className="font-bold">{weather.temp}℃</span>
            <span className="text-[#746d63]">{weather.condition}</span>
            {(weather.rainWarning || weather.tempDropWarning || weather.windWarning) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        )}

        {/* Compact Sedentary 40-Min Activity Timer */}
        {sedentary && onUpdateSedentary && (
          <SedentaryReminder
            sedentary={sedentary}
            onUpdateSedentary={onUpdateSedentary}
            compact={true}
          />
        )}
        {/* Sync state badge */}
        <div
          onClick={syncStatus.error ? onRetrySync : undefined}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            syncStatus.error ? 'cursor-pointer' : ''
          } ${
            syncStatus.error
              ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : syncStatus.syncing
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
          title={syncStatus.error ? '点击重试连接' : '线上资料库已同步'}
        >
          {syncStatus.error ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>同步异常 (点击重试)</span>
            </>
          ) : syncStatus.syncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>线上同步中...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>线上资料库已同步</span>
            </>
          )}
        </div>

        {/* Clear samples */}
        <button
          onClick={onClearSamples}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-[#746d63] hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
          title="清空初始示例数据（保留自建内容）"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">清空示例</span>
        </button>

        {/* Import file */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-[#524940] bg-[#fffdfa] border border-[#ded5c8] hover:bg-[#ede6dc] transition-colors shadow-2xs"
          title="从本地导入 JSON 备份"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>导入</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Export backup */}
        <button
          onClick={onExportBackup}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[var(--accent)] hover:opacity-90 shadow-sm transition-opacity"
          title="导出资料库全部数据为 JSON 备份"
        >
          <Download className="w-3.5 h-3.5" />
          <span>导出备份</span>
        </button>

        {/* Lang toggle */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs text-[#746d63] hover:bg-[#e4dcce] border border-[#ded5c8]/50"
          title="切换语言 (中/EN)"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">{settings.lang === 'en' ? 'EN' : '中'}</span>
        </button>
      </div>
    </header>
  );
};
