import React, { useState, useMemo } from 'react';
import {
  Lightbulb,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle2,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertTriangle,
  Check,
  X,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { LifeTip } from '../types/workbench';

interface DailyTipsViewProps {
  tips: LifeTip[];
  onUpdateTips: (tips: LifeTip[]) => Promise<void>;
}

export const DailyTipsView: React.FC<DailyTipsViewProps> = ({
  tips,
  onUpdateTips,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const filteredTips = useMemo(() => {
    if (selectedCategory === 'all') return tips;
    return tips.filter((t) => t.category === selectedCategory);
  }, [tips, selectedCategory]);

  const currentTip = filteredTips[currentIndex] || tips[0];

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleNextTip = () => {
    if (filteredTips.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredTips.length);
    setIsPlaying(false);
  };

  const handlePrevTip = () => {
    if (filteredTips.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + filteredTips.length) % filteredTips.length);
    setIsPlaying(false);
  };

  const handleToggleLearned = async () => {
    if (!currentTip) return;
    const updated = tips.map((t) =>
      t.id === currentTip.id ? { ...t, learned: !t.learned } : t
    );
    await onUpdateTips(updated);
  };

  const handleToggleBookmark = async () => {
    if (!currentTip) return;
    const updated = tips.map((t) =>
      t.id === currentTip.id ? { ...t, bookmarked: !t.bookmarked } : t
    );
    await onUpdateTips(updated);
  };

  const categories = [
    { id: 'all', label: '全部常识' },
    { id: 'kitchen', label: '厨房食材' },
    { id: 'wardrobe', label: '衣物养护' },
    { id: 'home', label: '居家清洁' },
    { id: 'health', label: '健康急救' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ded5c8]/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-serif-sc text-[#29251f]">
                  每日生活常识科普
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold">
                  大白话 + 演示视频
                </span>
              </div>
              <p className="text-xs text-[#746d63] mt-0.5">
                每天搞懂一个生活小常识，不讲深奥术语，三步弄懂实操，少走生活弯路
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevTip}
              className="p-2 rounded-xl bg-[#faf7f2] border border-[#ded5c8] text-[#554b42] hover:bg-[#ede6dc] transition-colors"
              title="上一个常识"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-[#29251f] px-2">
              {currentIndex + 1} / {filteredTips.length}
            </span>
            <button
              onClick={handleNextTip}
              className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-2xs transition-colors flex items-center gap-1"
            >
              <span>换下一个</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-4">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategory(c.id);
                setCurrentIndex(0);
                setIsPlaying(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                selectedCategory === c.id
                  ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-2xs'
                  : 'bg-[#faf7f2] border-[#ded5c8] text-[#554b42] hover:bg-[#ede6dc]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Video & Content Showcase */}
      {currentTip && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Video Demonstration Card (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs flex flex-col justify-between">
            <div>
              {/* Category & Status Bar */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#ede6dc] text-[#554b42]">
                  {currentTip.categoryLabel}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleBookmark}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors ${
                      currentTip.bookmarked
                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                        : 'bg-[#faf7f2] text-[#746d63] border-[#ded5c8]'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${currentTip.bookmarked ? 'fill-amber-600 text-amber-600' : ''}`} />
                    <span>{currentTip.bookmarked ? '已收藏' : '收藏'}</span>
                  </button>

                  <button
                    onClick={handleToggleLearned}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors ${
                      currentTip.learned
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                        : 'bg-[#faf7f2] text-[#746d63] border-[#ded5c8]'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${currentTip.learned ? 'text-emerald-700' : ''}`} />
                    <span>{currentTip.learned ? '已学会' : '标记掌握'}</span>
                  </button>
                </div>
              </div>

              {/* Title & Summary */}
              <h3 className="text-xl font-bold font-serif-sc text-[#29251f] mb-2 leading-snug">
                {currentTip.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#746d63] leading-relaxed mb-4">
                {currentTip.summary}
              </p>

              {/* Video Player */}
              <div className="relative rounded-2xl overflow-hidden bg-black/90 aspect-video shadow-md group">
                <video
                  ref={videoRef}
                  src={currentTip.videoUrl}
                  poster={currentTip.videoPoster}
                  playsInline
                  loop
                  muted={isMuted}
                  className="w-full h-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {/* Video Play Overlay */}
                {!isPlaying && (
                  <div
                    onClick={handleTogglePlay}
                    className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex flex-col items-center justify-center cursor-pointer transition-all group-hover:bg-black/25"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/90 text-amber-700 flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                      <Play className="w-7 h-7 fill-amber-700 translate-x-0.5" />
                    </div>
                    <span className="text-white text-xs font-semibold mt-3 tracking-wide drop-shadow-sm">
                      点击播放实操讲解演示
                    </span>
                  </div>
                )}

                {/* Floating controls in player */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white/90 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={handleTogglePlay} className="p-1 hover:text-white">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  <div className="text-[11px] font-mono text-white/80">
                    实操演示循环播放中
                  </div>

                  <button onClick={handleToggleMute} className="p-1 hover:text-white">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Core Formula Takeaway */}
            <div className="p-4 mt-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-bold text-amber-950 block">
                  大白话一句话记牢（口诀）：
                </strong>
                <p className="text-xs text-amber-900 mt-0.5 font-medium leading-relaxed">
                  {currentTip.keyTakeaway}
                </p>
              </div>
            </div>
          </div>

          {/* Action Steps & Red/Black Comparison (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 3 Step Action Guide */}
            <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#ded5c8]/60">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-bold font-serif-sc text-[#29251f]">
                  3 步秒懂实操法
                </h4>
              </div>

              <div className="space-y-3">
                {currentTip.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#faf7f2] border border-[#ded5c8] flex items-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-xl bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-[#29251f] font-medium leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Red / Black List Comparison */}
            <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-4">
              <h4 className="text-sm font-bold font-serif-sc text-[#29251f] pb-2 border-b border-[#ded5c8]/60">
                避坑红黑榜 · 对比一目了然
              </h4>

              {/* Green / Dos */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>正确做法 (建议)</span>
                </span>
                {currentTip.dos.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Red / Don'ts */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                  <X className="w-3.5 h-3.5" />
                  <span>常见误区 (踩坑别做)</span>
                </span>
                {currentTip.donts.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-950 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
