import React, { useState, useMemo, useEffect } from 'react';
import {
  Film,
  Plus,
  Trash2,
  LayoutGrid,
  List,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
  Tv,
  Gamepad2,
  Music,
  Search,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Info,
} from 'lucide-react';
import { MediaItem } from '../types/workbench';
import { MEDIA_STATUSES, MEDIA_TYPES, isoDate } from '../data/initialData';
import { compressImageToBase64 } from '../utils/helpers';
import { api } from '../services/api';

interface MediaViewProps {
  mediaItems: MediaItem[];
  defaultView?: 'wall' | 'list';
  onCreateMedia: (item: Partial<MediaItem>) => Promise<void>;
  onUpdateMedia: (id: string, item: Partial<MediaItem>) => Promise<void>;
  onDeleteMedia: (id: string) => Promise<void>;
}

export const MediaView: React.FC<MediaViewProps> = ({
  mediaItems,
  defaultView = 'wall',
  onCreateMedia,
  onUpdateMedia,
  onDeleteMedia,
}) => {
  const today = isoDate();

  // Form State (Star rating removed per user request)
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<MediaItem['type']>('书');
  const [status, setStatus] = useState<MediaItem['status']>('看完');
  const [review, setReview] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [genre, setGenre] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Online search state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Array<{
    name: string;
    type: string;
    author?: string;
    year?: string;
    genre?: string;
    cover?: string;
    summary?: string;
  }>>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // Delete modal state
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'wall' | 'list'>(defaultView);

  // Filters (Star rating filter removed)
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Perform online search
  const triggerOnlineSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    try {
      setIsSearching(true);
      setShowSearchDropdown(true);
      const res = await api.searchMedia(q, type);
      setSearchResults(res || []);
    } catch (err) {
      console.warn('Media search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Select a search result and auto-fill cover & metadata
  const handleSelectSearchResult = (item: (typeof searchResults)[0]) => {
    setName(item.name);
    if (item.type && (MEDIA_TYPES as readonly string[]).includes(item.type)) {
      setType(item.type as any);
    }
    if (item.cover) setCoverUrl(item.cover);
    if (item.author) setAuthor(item.author);
    if (item.year) setYear(item.year);
    if (item.genre) setGenre(item.genre);
    if (item.summary && !review) setReview(item.summary.slice(0, 80));
    setShowSearchDropdown(false);
  };

  // Handle image upload from computer (optional backup)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImageToBase64(file, 600, 0.8);
        setCoverUrl(base64);
      } catch (err) {
        console.error('Image compression failed:', err);
      }
    }
  };

  // Submit media item
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onCreateMedia({
        name: name.trim(),
        type,
        status,
        review: review.trim(),
        cover: coverUrl.trim(),
        author: author.trim(),
        year: year.trim(),
        genre: genre.trim(),
        date: today,
        createdAt: Date.now(),
      });
      setName('');
      setReview('');
      setCoverUrl('');
      setAuthor('');
      setYear('');
      setGenre('');
      setSearchResults([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return mediaItems.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      return true;
    });
  }, [mediaItems, filterType, filterStatus]);

  // Annual Statistics
  const annualStats = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const thisYearItems = mediaItems.filter((m) => m.date.startsWith(currentYear) || m.status === '看完');
    const totalCount = thisYearItems.length;

    // Type counts
    const typeCounts: Record<string, number> = {};
    mediaItems.forEach((m) => {
      typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
    });

    return { totalCount, typeCounts };
  }, [mediaItems]);

  const getTypeIcon = (t: string) => {
    switch (t) {
      case '电影':
        return <Film className="w-3.5 h-3.5" />;
      case '剧':
        return <Tv className="w-3.5 h-3.5" />;
      case '书':
        return <BookOpen className="w-3.5 h-3.5" />;
      case '游戏':
        return <Gamepad2 className="w-3.5 h-3.5" />;
      case '音乐':
        return <Music className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Annual Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-[var(--radius)] shadow-2xs">
        <div>
          <span className="text-xs text-[#746d63] block mb-1">全部藏品总数</span>
          <strong className="text-xl font-bold font-serif-sc text-[#29251f] block">
            {mediaItems.length} 部
          </strong>
        </div>

        <div>
          <span className="text-xs text-[#746d63] block mb-1">年度标记与阅毕</span>
          <strong className="text-xl font-bold font-serif-sc text-[var(--accent)] block">
            {annualStats.totalCount} 部
          </strong>
        </div>

        <div>
          <span className="text-xs text-[#746d63] block mb-1">正在体验中</span>
          <strong className="text-xl font-bold font-serif-sc text-amber-700 block">
            {mediaItems.filter((m) => m.status === '在看').length} 部
          </strong>
        </div>

        <div>
          <span className="text-xs text-[#746d63] block mb-1">种草想看清单</span>
          <strong className="text-xl font-bold font-serif-sc text-[#627a67] block">
            {mediaItems.filter((m) => m.status === '想看').length} 部
          </strong>
        </div>
      </div>

      {/* Main Grid: Form Left, Media View Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs h-fit space-y-4">
          <div className="border-b border-[#ded5c8]/60 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                我的精神收藏
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                记下一部作品
              </h2>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              数据表即刻写回
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Title with Online Search */}
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[#29251f]">
                    作品名称 (由微软必应检索封面) *
                  </label>
                  <span className="text-[10px] text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 font-semibold flex items-center gap-1">
                    <span>cn.bing.com 引擎</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {name.trim() && (
                    <a
                      href={`https://cn.bing.com/search?q=${encodeURIComponent(name.trim())}&scope=web&FORM=HDRSC1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#746d63] hover:text-[var(--accent)] flex items-center gap-1 hover:underline"
                      title="在微软必应网页端直接搜索完整词条"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>必应网页版 ↗</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => triggerOnlineSearch(name)}
                    disabled={isSearching || !name.trim()}
                    className="text-[11px] text-[var(--accent)] hover:underline font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    {isSearching ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Search className="w-3 h-3" />
                    )}
                    <span>必应联网检索</span>
                  </button>
                </div>
              </div>

              {/* Quick Popular Sample Chips for Instant Verification */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2 text-[11px] text-[#8a7f72]">
                <span>快捷热搜：</span>
                {['漫长的季节', '狂飙', '繁花', '庆余年', '平凡的世界', '白夜行'].map((hot) => (
                  <button
                    key={hot}
                    type="button"
                    onClick={() => {
                      setName(hot);
                      triggerOnlineSearch(hot);
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#faf7f2] border border-[#ded5c8] hover:border-[var(--accent)] hover:text-[#29251f] transition-colors"
                  >
                    {hot}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="输入书名或电视剧名（如：漫长的季节、狂飙、平凡的世界、繁花、庆余年）..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.length >= 2) {
                      triggerOnlineSearch(e.target.value);
                    } else {
                      setShowSearchDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)]"
                />

                {isSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a7f72] flex items-center gap-1 bg-[#faf7f2] px-2 py-1 rounded-md">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                    <span className="text-[10px]">必应检索中...</span>
                  </span>
                )}
              </div>

              {/* Online Search Results Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#fffdfa] border border-[#ded5c8] rounded-2xl shadow-xl max-h-72 overflow-y-auto divide-y divide-[#ded5c8]/50 animate-in fade-in zoom-in-95">
                  <div className="p-2.5 bg-[#f0f7fa] text-[11px] font-semibold text-sky-950 flex items-center justify-between border-b border-sky-200">
                    <span className="flex items-center gap-1">
                      <span>🔍 必应 (cn.bing.com) 匹配到的作品与高清海报 (点击一键填入)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSearchDropdown(false)}
                      className="text-stone-500 hover:text-stone-800 text-xs px-1.5"
                    >
                      ✕
                    </button>
                  </div>
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSearchResult(item)}
                      className="p-2.5 flex items-center gap-3 hover:bg-[#faf7f2] cursor-pointer transition-colors"
                    >
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt={item.name}
                          className="w-9 h-12 object-cover rounded-md border border-[#ded5c8] shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-12 bg-[#ede6dc] rounded-md flex items-center justify-center text-[#8e8478] shrink-0">
                          {getTypeIcon(item.type)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-xs font-bold text-[#29251f] truncate font-serif-sc">
                            {item.name}
                          </strong>
                          <span className="text-[9px] bg-[#ede6dc] px-1.5 py-0.2 rounded font-medium">
                            {item.type}
                          </span>
                          {item.year && (
                            <span className="text-[9px] text-[#8a7f72]">{item.year}</span>
                          )}
                        </div>
                        {item.author && (
                          <p className="text-[11px] text-[#746d63] truncate mt-0.5">
                            {item.author}
                          </p>
                        )}
                        {item.summary && (
                          <p className="text-[10px] text-[#8e8478] truncate mt-0.5">
                            {item.summary}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-[var(--accent)] shrink-0 bg-[#ede6dc]/70 px-2 py-1 rounded-lg">
                        填入
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form category & status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  作品形态
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium"
                >
                  {MEDIA_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  状态标记
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium"
                >
                  {MEDIA_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Author / Year optional row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  作者 / 导演 / 制作方
                </label>
                <input
                  type="text"
                  placeholder="联网检索时会自动填充"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs text-[#29251f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#746d63] mb-1">
                  年份 / 流派
                </label>
                <input
                  type="text"
                  placeholder="如：2023 / 科幻文学"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-xs text-[#29251f]"
                />
              </div>
            </div>

            {/* Cover Preview Badge */}
            {coverUrl ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    className="w-10 h-14 object-cover rounded-md border border-emerald-300 shadow-2xs shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-emerald-900 block truncate flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      已就绪封面海报
                    </span>
                    <span className="text-[10px] text-emerald-700 block truncate">
                      无需手动上传，保存即可直接使用
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="text-xs text-rose-600 hover:underline shrink-0"
                >
                  更换
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#faf7f2] border border-dashed border-[#ded5c8] rounded-2xl flex items-center justify-between gap-2 text-xs text-[#746d63]">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#8a7f72]" />
                  输入作品名点击“联网搜封面”即可自动填充海报
                </span>
                <label className="text-[11px] text-[var(--accent)] font-semibold cursor-pointer shrink-0 hover:underline">
                  或上传本地图
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            )}

            {/* Personal Short Review */}
            <div>
              <label className="block text-xs font-semibold text-[#746d63] mb-1">
                个人短评或观后感
              </label>
              <textarea
                rows={3}
                placeholder="记录击中你的那一句台词，或是留下的余味..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm text-[#29251f] placeholder:text-[#a09588] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? '保存中...' : '记入书影音'}</span>
            </button>
          </form>
        </div>

        {/* Media Items View (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ded5c8]/60 pb-3">
            <div>
              <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
                藏品清单
              </p>
              <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                精神角落 ({filteredItems.length})
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs bg-[#faf7f2] border border-[#ded5c8] px-2.5 py-1.5 rounded-xl font-medium"
              >
                <option value="all">全部类型</option>
                {MEDIA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs bg-[#faf7f2] border border-[#ded5c8] px-2.5 py-1.5 rounded-xl font-medium"
              >
                <option value="all">全部状态</option>
                {MEDIA_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* View Switcher: Wall vs List */}
              <div className="flex items-center bg-[#faf7f2] border border-[#ded5c8] rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('wall')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'wall'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[#746d63] hover:text-[#29251f]'
                  }`}
                  title="封面墙视图 (Cover Wall)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[#746d63] hover:text-[#29251f]'
                  }`}
                  title="列表视图 (List Table)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-[#8e8578] text-sm">
              暂无匹配的书影音作品，在左侧输入作品名称即可联网检索并收录
            </div>
          ) : viewMode === 'wall' ? (
            /* Cover Wall Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-[#faf7f2] border border-[#ded5c8] rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-md transition-all relative"
                >
                  <div className="relative aspect-3/4 bg-[#ede6dc] overflow-hidden">
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#9c8e80] p-4 text-center">
                        {getTypeIcon(item.type)}
                        <span className="font-serif-sc font-bold text-sm text-[#29251f] mt-2 line-clamp-2">
                          {item.name}
                        </span>
                      </div>
                    )}

                    {/* Status badge */}
                    <span
                      className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-xs ${
                        item.status === '看完'
                          ? 'bg-emerald-700/85 text-white'
                          : item.status === '在看'
                          ? 'bg-[#4d3045]/85 text-white'
                          : 'bg-black/60 text-white'
                      }`}
                    >
                      {item.status}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={() => setMediaToDelete(item)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      title="删除藏品"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] text-[#746d63] mb-0.5">
                        <span className="flex items-center gap-1 font-semibold">
                          {getTypeIcon(item.type)}
                          {item.type}
                        </span>
                        {item.author && (
                          <span className="truncate">· {item.author}</span>
                        )}
                      </div>

                      <strong className="block text-sm font-bold text-[#29251f] truncate font-serif-sc">
                        {item.name}
                      </strong>

                      {item.review && (
                        <p className="text-xs text-[#746d63] line-clamp-2 mt-1 leading-relaxed">
                          “{item.review}”
                        </p>
                      )}
                    </div>

                    <span className="text-[10px] text-[#8a7f72] font-mono block pt-1 border-t border-[#ded5c8]/50">
                      {item.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List Table View */
            <div className="divide-y divide-[#ded5c8]/50">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-4 group hover:bg-[#faf7f2]/60 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt={item.name}
                        className="w-9 h-12 object-cover rounded-md border border-[#ded5c8] shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-12 bg-[#ede6dc] rounded-md flex items-center justify-center text-[#8e8478] shrink-0">
                        {getTypeIcon(item.type)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-[#29251f] font-serif-sc truncate">
                          {item.name}
                        </strong>
                        <span className="text-[10px] bg-[#ede6dc] text-[#544b42] px-2 py-0.5 rounded-md font-medium shrink-0">
                          {item.type}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold shrink-0">
                          {item.status}
                        </span>
                      </div>

                      {item.author && (
                        <span className="text-xs text-[#8a7f72] truncate block mt-0.5">
                          {item.author} {item.year ? `(${item.year})` : ''}
                        </span>
                      )}

                      {item.review && (
                        <p className="text-xs text-[#746d63] truncate mt-0.5">
                          “{item.review}”
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[#8a7f72] font-mono">{item.date}</span>
                    <button
                      onClick={() => setMediaToDelete(item)}
                      className="opacity-60 group-hover:opacity-100 text-[#a09187] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="删除藏品"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      {mediaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded5c8] w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#29251f]">
                  删除作品藏品
                </h3>
                <p className="text-xs text-[#746d63]">
                  将从书影音资料库中移除
                </p>
              </div>
            </div>

            <p className="text-xs text-[#554b42] leading-relaxed bg-[#faf7f2] p-3 rounded-xl border border-[#ded5c8]">
              确定要删除“<strong className="text-[#29251f]">{mediaToDelete.name}</strong>”吗？
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMediaToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#746d63] hover:bg-[#ede6dc]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteMedia(mediaToDelete.id);
                  setMediaToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
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
