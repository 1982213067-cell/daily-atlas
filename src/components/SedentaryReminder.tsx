import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Activity,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  ArrowRight,
  Flame,
  Coffee,
  RotateCcw,
} from 'lucide-react';
import { SedentaryState } from '../types/workbench';
import { playChimeSound } from '../utils/audioChime';
import { isoDate } from '../data/initialData';

interface SedentaryReminderProps {
  sedentary: SedentaryState;
  onUpdateSedentary: (sedentary: Partial<SedentaryState>) => Promise<void>;
  compact?: boolean;
}

export const SedentaryReminder: React.FC<SedentaryReminderProps> = ({
  sedentary,
  onUpdateSedentary,
  compact = false,
}) => {
  const today = isoDate();
  const [now, setNow] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasPlayedChime, setHasPlayedChime] = useState(false);

  // Tick every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = new Date(now).getHours();
  const isWithinHours = currentHour >= (sedentary.startHour ?? 8) && currentHour < (sedentary.endHour ?? 19);

  // Reset count if new day
  useEffect(() => {
    if (sedentary.lastDate !== today) {
      onUpdateSedentary({
        todayCount: 0,
        lastDate: today,
        lastCheckinTime: Date.now(),
      });
    }
  }, [sedentary.lastDate, today, onUpdateSedentary]);

  const intervalMs = (sedentary.intervalMinutes || 40) * 60 * 1000;
  const nextTargetTime = (sedentary.lastCheckinTime || now) + intervalMs;
  const diffMs = nextTargetTime - now;

  const isTimeUp = isWithinHours && diffMs <= 0 && sedentary.enabled;

  // Trigger sound when time is up
  useEffect(() => {
    if (isTimeUp && !hasPlayedChime && soundEnabled) {
      playChimeSound();
      setHasPlayedChime(true);
    }
  }, [isTimeUp, hasPlayedChime, soundEnabled]);

  const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const displaySeconds = remainingSeconds % 60;

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((intervalMs - Math.max(0, diffMs)) / intervalMs) * 100))
  );

  const handleCheckin = async () => {
    const updatedCount = (sedentary.todayCount || 0) + 1;
    await onUpdateSedentary({
      lastCheckinTime: Date.now(),
      todayCount: updatedCount,
      lastDate: today,
    });
    setHasPlayedChime(false);
  };

  const handleToggleEnable = async () => {
    await onUpdateSedentary({
      enabled: !sedentary.enabled,
      lastCheckinTime: Date.now(),
    });
    setHasPlayedChime(false);
  };

  const handleResetTimer = async () => {
    await onUpdateSedentary({
      lastCheckinTime: Date.now(),
    });
    setHasPlayedChime(false);
  };

  // Compact badge rendering (for Topbar or dashboard headers)
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          isTimeUp
            ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
            : isWithinHours
            ? 'bg-[#fffdfa] text-[#443c34] border-[#ded5c8]'
            : 'bg-[#ede6dc]/60 text-[#746d63] border-[#ded5c8]'
        }`}
        title={`久坐提醒 (08:00 - 19:00 每40分钟) · 今日已完成 ${sedentary.todayCount || 0} 次`}
      >
        <Activity className={`w-3.5 h-3.5 ${isTimeUp ? 'text-amber-600 animate-bounce' : 'text-[var(--accent)]'}`} />
        {isTimeUp ? (
          <button
            onClick={handleCheckin}
            className="font-bold underline hover:text-amber-950 flex items-center gap-1"
          >
            <span>到时该起身活动啦！</span>
            <span className="bg-amber-600 text-white px-1.5 py-0.2 rounded-md text-[10px]">打卡</span>
          </button>
        ) : isWithinHours ? (
          <span>
            活动倒计时{' '}
            <strong className="font-mono font-bold">
              {String(remainingMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
            </strong>
          </span>
        ) : (
          <span>非打卡时段 (08-19点开启)</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ded5c8]/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold font-serif-sc text-[#29251f]">
                40 分钟久坐起身提醒
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                08:00 - 19:00 运行
              </span>
            </div>
            <p className="text-xs text-[#746d63] mt-0.5">
              每工作 40 分钟起身活动 1~2 分钟，改善颈椎、腰肌与血液循环
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              soundEnabled
                ? 'bg-[#faf7f2] border-[#ded5c8] text-[#554b42] hover:bg-[#ede6dc]'
                : 'bg-stone-100 text-stone-400 border-stone-200'
            }`}
            title={soundEnabled ? '音效已开启（到时柔和铃声）' : '静音模式'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-700" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={handleToggleEnable}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              sedentary.enabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-100 text-stone-500 border-stone-200'
            }`}
          >
            {sedentary.enabled ? '提醒进行中' : '已暂停'}
          </button>
        </div>
      </div>

      {/* Alert if time is up */}
      {isTimeUp && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-bounce duration-1000 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-spin">☕</span>
            <div>
              <strong className="text-sm font-bold text-amber-950 block">
                已持续专注 40 分钟，请立即离开座椅活动！
              </strong>
              <span className="text-xs text-amber-900/80">
                去接一杯温水、伸展一下腰背、转动颈部或远眺窗外 20 秒。
              </span>
            </div>
          </div>

          <button
            onClick={handleCheckin}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>完成起身活动打卡</span>
          </button>
        </div>
      )}

      {/* Main Timer Display */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Countdown Ring & Digital clock */}
        <div className="sm:col-span-6 bg-[#faf7f2] p-5 rounded-2xl border border-[#ded5c8] flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider mb-2">
            距下一次活动打卡
          </span>

          <div className="font-mono font-bold text-4xl sm:text-5xl text-[#29251f] tracking-tight">
            {String(remainingMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
          </div>

          <div className="w-full bg-[#ded5c8]/50 h-2 rounded-full mt-4 overflow-hidden max-w-xs">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-[var(--accent)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-3 mt-4 text-xs">
            <button
              onClick={handleCheckin}
              className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-white font-semibold shadow-2xs hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>提前打卡并重置</span>
            </button>
            <button
              onClick={handleResetTimer}
              className="p-1.5 rounded-xl border border-[#ded5c8] text-[#746d63] hover:bg-[#ede6dc] transition-colors"
              title="重置40分钟计时"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Today's Stretch Stats & Schedule Info */}
        <div className="sm:col-span-6 space-y-3">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-900/80 font-medium block">
                今日起身打卡次数
              </span>
              <strong className="text-2xl font-bold font-serif-sc text-amber-950 block mt-0.5">
                {sedentary.todayCount || 0}{' '}
                <span className="text-xs font-sans text-amber-800 font-normal">次</span>
              </strong>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5 text-amber-700" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#faf7f2] border border-[#ded5c8] text-xs text-[#746d63] space-y-1.5">
            <div className="flex items-center justify-between">
              <span>提醒时间段</span>
              <span className="font-semibold text-[#29251f]">
                {String(sedentary.startHour).padStart(2, '0')}:00 - {String(sedentary.endHour).padStart(2, '0')}:00
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>提醒间隔</span>
              <span className="font-semibold text-[#29251f]">
                每隔 {sedentary.intervalMinutes || 40} 分钟
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>当前时段状态</span>
              <span className={`font-semibold ${isWithinHours ? 'text-emerald-700' : 'text-[#8a7f72]'}`}>
                {isWithinHours ? '● 处于工作活跃时段' : '○ 已在非提醒时段'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Minute Stretch Quick Guide Cards */}
      <div className="pt-2">
        <h4 className="text-xs font-bold text-[#29251f] uppercase tracking-wider mb-2.5">
          1 分钟快速工位拉伸指引
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-[#faf7f2] border border-[#ded5c8] text-left">
            <strong className="text-xs font-bold text-[#29251f] block">1. 颈椎双向侧拉</strong>
            <p className="text-[11px] text-[#746d63] mt-1 leading-snug">
              一手扶椅面，另一手轻扶对侧头部慢拉，单侧保持 15 秒。
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#faf7f2] border border-[#ded5c8] text-left">
            <strong className="text-xs font-bold text-[#29251f] block">2. 站立挺胸耸肩</strong>
            <p className="text-[11px] text-[#746d63] mt-1 leading-snug">
              起身后背十指交叉后拉，耸肩再自然下沉，打开紧缩胸腔。
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#faf7f2] border border-[#ded5c8] text-left">
            <strong className="text-xs font-bold text-[#29251f] block">3. 站立提踵踮脚</strong>
            <p className="text-[11px] text-[#746d63] mt-1 leading-snug">
              双脚微屈慢慢踮起脚尖 15 次，加速小腿静脉血液顺畅回流。
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#faf7f2] border border-[#ded5c8] text-left">
            <strong className="text-xs font-bold text-[#29251f] block">4. 远眺 20 秒护眼</strong>
            <p className="text-[11px] text-[#746d63] mt-1 leading-snug">
              看向 6 米外的窗外景物，多次轻眨眼睛，舒缓睫状肌疲劳。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
