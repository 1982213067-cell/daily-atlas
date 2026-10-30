import React from 'react';
import {
  Home,
  Wallet,
  CheckCircle2,
  Activity,
  Calendar,
  ShoppingCart,
  Film,
  SlidersHorizontal,
  Heart,
  Sun,
  HeartPulse,
  MapPin,
} from 'lucide-react';
import { ModuleType, Settings } from '../types/workbench';
import { SyncStatus } from '../services/api';

interface SidebarProps {
  currentModule: ModuleType;
  onSelectModule: (mod: ModuleType) => void;
  settings: Settings;
  onOpenBrandModal: () => void;
  syncStatus: SyncStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  settings,
  onOpenBrandModal,
  syncStatus,
}) => {
  const sections: {
    title: string;
    items: { id: ModuleType; label: string; icon: React.ReactNode; badge?: string }[];
  }[] = [
    {
      title: '工作台',
      items: [
        { id: 'dashboard', label: '今日总览', icon: <Home className="w-5 h-5" /> },
      ],
    },
    {
      title: '健康与节律',
      items: [
        { id: 'health', label: '健康档案', icon: <HeartPulse className="w-5 h-5 text-emerald-600" />, badge: '体检指标' },
        { id: 'menstrual', label: '经期节律', icon: <Heart className="w-5 h-5 text-rose-500" />, badge: '推算提醒' },
        { id: 'habits', label: '习惯健康', icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" /> },
        { id: 'fitness', label: '减脂健身', icon: <Activity className="w-5 h-5 text-teal-600" /> },
      ],
    },
    {
      title: '从容生活',
      items: [
        { id: 'weather', label: '天气预告', icon: <Sun className="w-5 h-5 text-amber-500" />, badge: '出行提醒' },
        { id: 'wishlist', label: '待打卡', icon: <MapPin className="w-5 h-5 text-rose-500" />, badge: '心愿清单' },
      ],
    },
    {
      title: '统筹与清单',
      items: [
        { id: 'money', label: '记账理财', icon: <Wallet className="w-5 h-5 text-[#b65f42]" /> },
        { id: 'planner', label: '日程统筹', icon: <Calendar className="w-5 h-5 text-[#4d3045]" /> },
        { id: 'home', label: '待买清单', icon: <ShoppingCart className="w-5 h-5 text-[#a57c45]" /> },
        { id: 'media', label: '书影音', icon: <Film className="w-5 h-5 text-indigo-600" /> },
      ],
    },
  ];

  return (
    <aside className="w-[var(--sidebar)] fixed inset-y-0 left-0 bg-[#ede6dc] border-r border-[#685744]/15 flex flex-col z-30 select-none overflow-y-auto">
      {/* Brand Header */}
      <button
        onClick={onOpenBrandModal}
        type="button"
        className="group text-left p-5 pb-4 hover:bg-[#e4dbcf]/60 transition-colors flex items-center justify-between border-b border-[#685744]/10"
        title="点击自定义工作台名称与外观"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            {settings.brand?.avatar || '日'}
          </div>
          <div className="min-w-0">
            <h2 className="font-serif-sc font-bold text-[#29251f] text-base leading-tight truncate">
              {settings.brand?.name || '日常集'}
            </h2>
            <p className="text-[11px] text-[#746d63] truncate mt-0.5">
              {settings.brand?.tagline || '生活有迹可循'}
            </p>
          </div>
        </div>
        <SlidersHorizontal className="w-4 h-4 text-[#8a7f72] opacity-70 group-hover:opacity-100 group-hover:text-[var(--accent)] transition-all shrink-0 ml-1" />
      </button>

      {/* Nav List */}
      <nav className="p-3 space-y-3 flex-1">
        {sections.map((sec, secIdx) => (
          <div key={secIdx}>
            <div className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-[#8a8075] uppercase">
              {sec.title}
            </div>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const active = currentModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectModule(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs sm:text-sm transition-all text-left ${
                      active
                        ? 'bg-[var(--accent)] text-white shadow-sm font-semibold'
                        : 'text-[#443c34] hover:bg-[#e4dcce]/70'
                    }`}
                  >
                    <span className={active ? 'text-white' : ''}>{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && !active && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#ded5c8] text-[#554b42] font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Online Database Sync Status Box */}
      <div className="p-3 m-3 bg-[#fffdfa]/85 rounded-2xl border border-[#ded5c8] shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                syncStatus.syncing
                  ? 'bg-amber-500 animate-ping'
                  : syncStatus.online
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold text-[#29251f]">
              {syncStatus.syncing ? '线上同步中...' : syncStatus.online ? '线上资料库已连接' : '离线模式'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[#746d63] leading-relaxed">
          数据已写入线上空间数据表，换设备或刷新均可即时恢复。
        </p>

        <div className="pt-1 border-t border-[#ded5c8]/60 flex items-center justify-between text-[10px] text-[#8e8578]">
          <span>已记 {syncStatus.totalRows || '30+'} 项资料</span>
          <span className="text-emerald-700 font-medium">双向即时生效</span>
        </div>
      </div>
    </aside>
  );
};
