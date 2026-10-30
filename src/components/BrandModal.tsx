import React, { useState } from 'react';
import { Settings, ToneType } from '../types/workbench';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => Promise<void>;
}

export const BrandModal: React.FC<BrandModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const brand = settings.brand || {
    name: '日常集',
    avatar: '日',
    tagline: '生活有迹可循',
    theme: 'plum',
  };

  const [name, setName] = useState<string>(brand.name);
  const [avatar, setAvatar] = useState<string>(brand.avatar);
  const [tagline, setTagline] = useState<string>(brand.tagline);
  const [theme, setTheme] = useState<ToneType>(brand.theme || 'plum');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onUpdateSettings({
        brand: {
          name: name.trim() || '日常集',
          avatar: avatar.trim().slice(0, 2) || '日',
          tagline: tagline.trim() || '生活有迹可循',
          theme,
        },
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const THEMES: { id: ToneType; name: string; color: string; desc: string }[] = [
    { id: 'plum', name: '暮紫 (Plum)', color: '#4d3045', desc: '克制、沉静的东方色泽' },
    { id: 'terra', name: '陶土 (Terracotta)', color: '#b65f42', desc: '温暖质朴的陶器色' },
    { id: 'sage', name: '鼠尾草绿 (Sage)', color: '#627a67', desc: '舒缓自洽的植物感' },
    { id: 'sand', name: '暖沙 (Sand)', color: '#a57c45', desc: '温润明朗的原野色' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#fffdfa] border border-[#ded5c8] w-full max-w-md rounded-[var(--radius)] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-[#ded5c8]/60 pb-3">
          <div>
            <p className="text-xs font-semibold text-[#8a7f72] uppercase tracking-wider">
              自定义工作台外观
            </p>
            <h3 className="font-serif-sc font-bold text-lg text-[#29251f]">
              品牌与主题色
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#ede6dc] text-[#746d63] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="p-4 rounded-2xl bg-[#ede6dc]/70 border border-[#ded5c8] flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold text-xl shadow-xs transition-colors"
            style={{ backgroundColor: THEMES.find((t) => t.id === theme)?.color || '#4d3045' }}
          >
            {avatar.slice(0, 1) || '日'}
          </div>
          <div>
            <strong className="font-serif-sc font-bold text-base text-[#29251f] block">
              {name || '日常集'}
            </strong>
            <span className="text-xs text-[#746d63] block mt-0.5">
              {tagline || '生活有迹可循'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-[#746d63] mb-1">
                工作台名称
              </label>
              <input
                type="text"
                required
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-medium text-[#29251f]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#746d63] mb-1">
                徽标单字
              </label>
              <input
                type="text"
                required
                maxLength={2}
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm font-bold text-center text-[#29251f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#746d63] mb-1">
              签名理念标语
            </label>
            <input
              type="text"
              maxLength={40}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#ded5c8] rounded-xl text-sm text-[#29251f]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#746d63] mb-1.5">
              主题基调色
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    theme === th.id
                      ? 'border-[#29251f] bg-white ring-2 ring-[var(--accent)] shadow-xs'
                      : 'border-[#ded5c8] bg-[#faf7f2] hover:bg-white'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: th.color }}
                  />
                  <div className="min-w-0">
                    <strong className="block text-xs font-bold text-[#29251f] truncate">
                      {th.name.split(' ')[0]}
                    </strong>
                    <span className="text-[10px] text-[#746d63] truncate block">
                      {th.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-[#ded5c8]/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[#746d63] hover:bg-[#ede6dc]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存并应用'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
