import React, { useMemo, useState } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Check,
  Pencil,
  X,
  Settings2,
  Sparkles,
  CircleCheckBig,
} from 'lucide-react';
import { WishlistState, WishlistItem, WishlistCategory } from '../types/workbench';
import { isoDate, uid, HOBBY_SUGGESTIONS } from '../data/initialData';

const CATEGORY_EMOJI_POOL = [
  '🏞️', '🍜', '📸', '🎯', '🏖️', '⛰️', '🏝️', '🎪',
  '🍲', '🍰', '☕', '🍺', '🦀', '🍢', '🥘', '🧋',
  '🎡', '🗼', '⛩️', '🏯', '🎆', '🎠', '🚂', '⛵',
  '🎨', '🎵', '💃', '🧶', '🏊', '🎾', '🧘', '💆',
  '🏸', '🪩', '🪵', '🥧', '🪁', '🏹', '📷', '✨',
];

interface WishlistViewProps {
  wishlist: WishlistState;
  onUpdateWishlist: (wishlist: Partial<WishlistState>) => Promise<void>;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  wishlist,
  onUpdateWishlist,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'pending' | 'done' | 'all'>('pending');
  const [manageCategories, setManageCategories] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 新增条目表单
  const [itemName, setItemName] = useState<string>('');
  const [itemCategory, setItemCategory] = useState<string>(
    wishlist.categories[0]?.id || 'cat-hobby',
  );
  const [itemNote, setItemNote] = useState<string>('');

  // 新增/编辑分类
  const [showCategoryForm, setShowCategoryForm] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryEmoji, setCategoryEmoji] = useState<string>('🎯');

  // 编辑条目
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  const categories = wishlist.categories || [];
  const items = wishlist.items || [];

  const catName = (id: string): string => {
    const cat = categories.find((c) => c.id === id);
    return cat ? `${cat.emoji} ${cat.name}` : '未分类';
  };

  const stats = useMemo(() => {
    const doneCount = items.filter((i) => i.done).length;
    return {
      total: items.length,
      pending: items.length - doneCount,
      done: doneCount,
      rate: items.length ? Math.round((doneCount / items.length) * 100) : 0,
    };
  }, [items]);

  const visibleItems = useMemo(() => {
    return items
      .filter((i) => (activeCategory === 'all' ? true : i.categoryId === activeCategory))
      .filter((i) => {
        if (activeFilter === 'pending') return !i.done;
        if (activeFilter === 'done') return i.done;
        return true;
      })
      .sort((a, b) => {
        // 未打卡在前，已打卡在后；同组内新添加的在前
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
  }, [items, activeCategory, activeFilter]);

  /* ---------------- 条目操作 ---------------- */

  const addItem = async (name: string, categoryId?: string, note?: string) => {
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;
    const newItem: WishlistItem = {
      id: uid(),
      categoryId: categoryId || itemCategory,
      name: trimmed,
      note: (note || '').trim(),
      done: false,
      createdAt: Date.now(),
    };
    setIsSubmitting(true);
    try {
      await onUpdateWishlist({ items: [...items, newItem] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    await addItem(itemName, itemCategory, itemNote);
    setItemName('');
    setItemNote('');
  };

  const toggleDone = async (item: WishlistItem) => {
    const updated = items.map((i) =>
      i.id === item.id
        ? {
            ...i,
            done: !i.done,
            doneDate: !i.done ? isoDate() : undefined,
          }
        : i,
    );
    await onUpdateWishlist({ items: updated });
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('确定删除这条打卡心愿吗？')) return;
    await onUpdateWishlist({ items: items.filter((i) => i.id !== id) });
  };

  const saveEdit = async () => {
    if (!editingItemId || !editName.trim()) return;
    const updated = items.map((i) =>
      i.id === editingItemId ? { ...i, name: editName.trim(), note: editNote.trim() } : i,
    );
    await onUpdateWishlist({ items: updated });
    setEditingItemId(null);
  };

  /* ---------------- 分类操作 ---------------- */

  const submitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    if (editingCategoryId) {
      const updated = categories.map((c) =>
        c.id === editingCategoryId ? { ...c, name: trimmed, emoji: categoryEmoji } : c,
      );
      await onUpdateWishlist({ categories: updated });
    } else {
      const newCat: WishlistCategory = { id: uid(), name: trimmed, emoji: categoryEmoji };
      await onUpdateWishlist({ categories: [...categories, newCat] });
      setItemCategory(newCat.id);
    }
    setCategoryName('');
    setShowCategoryForm(false);
    setEditingCategoryId(null);
  };

  const startEditCategory = (cat: WishlistCategory) => {
    setEditingCategoryId(cat.id);
    setCategoryName(cat.name);
    setCategoryEmoji(cat.emoji);
    setShowCategoryForm(true);
  };

  const deleteCategory = async (cat: WishlistCategory) => {
    const catItems = items.filter((i) => i.categoryId === cat.id);
    const msg =
      catItems.length > 0
        ? `分类「${cat.name}」下有 ${catItems.length} 条心愿，删除分类会把这些心愿一并删除，确定吗？`
        : `确定删除分类「${cat.name}」吗？`;
    if (!window.confirm(msg)) return;
    const fallbackCat = categories.find((c) => c.id !== cat.id);
    const updatedItems = fallbackCat
      ? items.map((i) => (i.categoryId === cat.id ? { ...i, categoryId: fallbackCat.id } : i))
      : [];
    await onUpdateWishlist({
      categories: categories.filter((c) => c.id !== cat.id),
      items: updatedItems,
    });
    if (activeCategory === cat.id) setActiveCategory('all');
    if (itemCategory === cat.id && fallbackCat) setItemCategory(fallbackCat.id);
  };

  const hobbyCategory = categories.find((c) => c.name.includes('爱好'));

  return (
    <div className="space-y-6">
      {/* 统计行 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs text-[#746d63] block mb-1">待打卡</span>
          <strong className="text-xl font-bold font-serif-sc text-[#29251f] block">
            {stats.pending} 条
          </strong>
        </div>
        <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs text-[#746d63] block mb-1">已打卡</span>
          <strong className="text-xl font-bold font-serif-sc text-emerald-700 block">
            {stats.done} 条
          </strong>
        </div>
        <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs text-[#746d63] block mb-1">累计心愿</span>
          <strong className="text-xl font-bold font-serif-sc text-[#29251f] block">
            {stats.total} 条
          </strong>
        </div>
        <div className="bg-[#fffdfa] border border-[#ded5c8] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs text-[#746d63] block mb-1">完成率</span>
          <strong className="text-xl font-bold font-serif-sc text-[var(--accent)] block">
            {stats.rate}%
          </strong>
        </div>
      </div>

      {/* 新增心愿 */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#fffdfa] border border-[#ded5c8] rounded-2xl shadow-2xs p-5 space-y-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-serif-sc font-bold text-[#29251f]">添加一条打卡心愿</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="名称：如「大理洱海」「陈添记鱼皮」「学壁球」"
            className="min-h-11 w-full rounded-xl border border-[#ded5c8] bg-white px-3 text-sm text-[#29251f] placeholder:text-[#b3a898] focus:outline-none focus:border-[var(--accent)]"
          />
          <select
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#ded5c8] bg-white px-3 text-sm text-[#29251f] focus:outline-none focus:border-[var(--accent)]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>
        <input
          value={itemNote}
          onChange={(e) => setItemNote(e.target.value)}
          placeholder="备注（可选）：地址、和谁一起去、期待的理由…"
          className="min-h-11 w-full rounded-xl border border-[#ded5c8] bg-white px-3 text-sm text-[#29251f] placeholder:text-[#b3a898] focus:outline-none focus:border-[var(--accent)]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isSubmitting || !itemName.trim()}
            className="min-h-11 px-5 rounded-full bg-[var(--accent)] text-white text-sm font-bold shadow-xs transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? '保存中…' : '加入心愿'}
          </button>
          <span className="text-xs text-[#746d63] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            灵感：
          </span>
          {HOBBY_SUGGESTIONS.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void addItem(s, hobbyCategory?.id || itemCategory)}
              disabled={isSubmitting}
              className="px-2.5 py-1 rounded-full border border-[#ded5c8] bg-[#faf6ef] text-xs text-[#5c5347] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
            >
              + {s}
            </button>
          ))}
        </div>
      </form>

      {/* 分类导航 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeCategory === 'all'
              ? 'bg-[var(--accent)] text-white border-transparent'
              : 'bg-[#fffdfa] text-[#5c5347] border-[#ded5c8] hover:border-[var(--accent)]'
          }`}
        >
          全部（{items.length}）
        </button>
        {categories.map((c) => {
          const count = items.filter((i) => i.categoryId === c.id).length;
          return (
            <div key={c.id} className="relative group">
              <button
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === c.id
                    ? 'bg-[var(--accent)] text-white border-transparent'
                    : 'bg-[#fffdfa] text-[#5c5347] border-[#ded5c8] hover:border-[var(--accent)]'
                }`}
              >
                {c.emoji} {c.name}（{count}）
              </button>
              {manageCategories && (
                <span className="absolute -top-1.5 -right-1.5 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => startEditCategory(c)}
                    title="编辑分类"
                    className="w-5 h-5 rounded-full bg-white border border-[#ded5c8] flex items-center justify-center hover:bg-[#f5f0e8]"
                  >
                    <Pencil className="w-2.5 h-2.5 text-[#746d63]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteCategory(c)}
                    title="删除分类"
                    className="w-5 h-5 rounded-full bg-white border border-[#ded5c8] flex items-center justify-center hover:bg-red-50"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-red-500" />
                  </button>
                </span>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setManageCategories((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
            manageCategories
              ? 'bg-[#29251f] text-white border-transparent'
              : 'bg-[#fffdfa] text-[#746d63] border-[#ded5c8] hover:border-[var(--accent)]'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          {manageCategories ? '完成' : '管理分类'}
        </button>
        {manageCategories && !showCategoryForm && (
          <button
            type="button"
            onClick={() => {
              setShowCategoryForm(true);
              setEditingCategoryId(null);
              setCategoryName('');
              setCategoryEmoji('✨');
            }}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent)]/5"
          >
            + 新分类
          </button>
        )}
      </div>

      {/* 新增/编辑分类表单 */}
      {showCategoryForm && (
        <form
          onSubmit={submitCategory}
          className="bg-[#fffdfa] border border-[var(--accent)]/40 rounded-2xl shadow-2xs p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif-sc font-bold text-[#29251f] text-sm">
              {editingCategoryId ? '编辑分类' : '新建分类'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowCategoryForm(false);
                setEditingCategoryId(null);
              }}
              className="w-7 h-7 rounded-full hover:bg-[#f5f0e8] flex items-center justify-center"
            >
              <X className="w-4 h-4 text-[#746d63]" />
            </button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="分类名称，如「旅游点」「美食店」「Citywalk」"
              className="min-h-11 flex-1 min-w-48 rounded-xl border border-[#ded5c8] bg-white px-3 text-sm text-[#29251f] placeholder:text-[#b3a898] focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="w-11 h-11 rounded-xl border border-[#ded5c8] bg-white flex items-center justify-center text-xl">
              {categoryEmoji}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {CATEGORY_EMOJI_POOL.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setCategoryEmoji(em)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors ${
                  categoryEmoji === em
                    ? 'bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]'
                    : 'hover:bg-[#f5f0e8]'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!categoryName.trim()}
              className="min-h-10 px-4 rounded-full bg-[var(--accent)] text-white text-sm font-bold shadow-xs disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </form>
      )}

      {/* 过滤 */}
      <div className="flex gap-2">
        {(
          [
            ['pending', `待打卡（${stats.pending}）`],
            ['done', `已打卡（${stats.done}）`],
            ['all', `全部（${stats.total}）`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeFilter === key
                ? 'bg-[#29251f] text-white border-transparent'
                : 'bg-[#fffdfa] text-[#5c5347] border-[#ded5c8] hover:border-[#29251f]/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 心愿列表 */}
      <div className="space-y-3">
        {visibleItems.length === 0 && (
          <div className="bg-[#fffdfa] border border-dashed border-[#ded5c8] rounded-2xl p-10 text-center">
            <MapPin className="w-8 h-8 text-[#c9bfae] mx-auto mb-3" />
            <p className="text-sm text-[#746d63]">
              {activeFilter === 'done'
                ? '还没有打卡记录，去实现一条心愿吧 ✨'
                : '这里空空的，把想去的地方、想吃的店、想尝试的爱好都记下来吧'}
            </p>
          </div>
        )}
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className={`bg-[#fffdfa] border rounded-2xl shadow-2xs p-4 flex items-start gap-3 transition-colors ${
              item.done ? 'border-emerald-200 bg-emerald-50/40' : 'border-[#ded5c8]'
            }`}
          >
            {/* 打卡按钮 */}
            <button
              type="button"
              onClick={() => void toggleDone(item)}
              title={item.done ? '取消打卡' : '打卡！'}
              className={`mt-0.5 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                item.done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-[#c9bfae] text-transparent hover:border-[var(--accent)] hover:text-[var(--accent)]/30'
              }`}
            >
              <Check className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
              {editingItemId === item.id ? (
                <div className="space-y-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-h-10 w-full rounded-xl border border-[#ded5c8] bg-white px-3 text-sm text-[#29251f] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="备注（可选）"
                    className="min-h-10 w-full rounded-xl border border-[#ded5c8] bg-white px-3 text-sm text-[#29251f] placeholder:text-[#b3a898] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={!editName.trim()}
                      className="min-h-9 px-4 rounded-full bg-[var(--accent)] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                    >
                      <CircleCheckBig className="w-3.5 h-3.5" /> 保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItemId(null)}
                      className="min-h-9 px-4 rounded-full border border-[#ded5c8] text-[#746d63] text-xs"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        item.done ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-[#29251f]'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5f0e8] text-[#746d63]">
                      {catName(item.categoryId)}
                    </span>
                    {item.done && item.doneDate && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        ✓ {item.doneDate} 打卡
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-xs text-[#746d63] mt-1 leading-relaxed">{item.note}</p>
                  )}
                </>
              )}
            </div>

            {editingItemId !== item.id && (
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemId(item.id);
                    setEditName(item.name);
                    setEditNote(item.note || '');
                  }}
                  title="编辑"
                  className="w-8 h-8 rounded-full hover:bg-[#f5f0e8] flex items-center justify-center"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#746d63]" />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  title="删除"
                  className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
