import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  CheckCircle2,
  RefreshCw,
  Server,
  Layers,
  ArrowUpDown,
  Download,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { DatabaseState, TableMeta } from '../types/workbench';
import { api, SyncStatus } from '../services/api';

interface DatabaseSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  currentData: DatabaseState;
  onTriggerSync: () => Promise<void>;
}

export const DatabaseSpaceModal: React.FC<DatabaseSpaceModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  currentData,
  onTriggerSync,
}) => {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('records');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pingMs, setPingMs] = useState<number>(4);
  const [syncingNow, setSyncingNow] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadTables();
    }
  }, [isOpen]);

  const loadTables = async () => {
    try {
      setIsLoading(true);
      const start = performance.now();
      const res = await api.getTables();
      setPingMs(Math.round(performance.now() - start));
      setTables(res.tables || []);
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncingNow(true);
      await onTriggerSync();
      await loadTables();
    } finally {
      setSyncingNow(false);
    }
  };

  if (!isOpen) return null;

  const currentTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  // Raw rows preview
  let previewRows: any[] = [];
  if (selectedTableId === 'records') {
    previewRows = currentData.records.slice(0, 8);
  } else if (selectedTableId === 'habits') {
    previewRows = currentData.habits.slice(0, 8);
  } else if (selectedTableId === 'media') {
    previewRows = currentData.mediaItems.slice(0, 8);
  } else if (selectedTableId === 'fitness') {
    previewRows = currentData.settings.weeklyPlan.slice(0, 8);
  } else if (selectedTableId === 'settings') {
    previewRows = [{ key: 'global_settings', ...currentData.settings }];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-xs">
      <div className="bg-[#fffdfa] border border-[#ded5c8] w-full max-w-4xl max-h-[90vh] rounded-[var(--radius)] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-[#ded5c8]/80 bg-[#faf6f0] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-sc font-bold text-xl text-[#29251f]">
                  资料库空间 · 在线数据表
                </h2>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  线上存储与双向同步中
                </span>
              </div>
              <p className="text-xs text-[#746d63] mt-0.5">
                各模块独立绑定线上数据表，数据已物理持久化存储于后端服务中
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#ede6dc] hover:bg-[#ded5c8] text-[#544b42] flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Database Status Bar */}
        <div className="px-6 py-3 bg-[#f2ede4] border-b border-[#ded5c8] flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-4 text-[#544b42]">
            <span className="flex items-center gap-1.5 font-medium">
              <Server className="w-3.5 h-3.5 text-[var(--accent)]" />
              API 端点：<code className="bg-white/80 px-1.5 py-0.5 rounded font-mono text-[11px]">/api/database/*</code>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              网络延迟：<b>{pingMs} ms</b>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              换设备/换浏览器数据不丢失
            </span>
          </div>

          <button
            onClick={handleManualSync}
            disabled={syncingNow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-xs shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
            <span>{syncingNow ? '同步中...' : '即时校验与双向同步'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Table Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {tables.map((tbl) => {
              const active = tbl.id === selectedTableId;
              return (
                <button
                  key={tbl.id}
                  onClick={() => setSelectedTableId(tbl.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    active
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs scale-101'
                      : 'bg-[#faf7f2] border-[#ded5c8] text-[#443c34] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Table className={`w-4 h-4 ${active ? 'text-white' : 'text-[#8a7f72]'}`} />
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        active ? 'bg-white/20 text-white' : 'bg-[#ede6dc] text-[#554b42]'
                      }`}
                    >
                      {tbl.rowCount} 行
                    </span>
                  </div>
                  <strong className="text-xs font-bold leading-tight block truncate">
                    {tbl.name.split(' ')[0]}
                  </strong>
                  <span className="text-[10px] opacity-75 font-mono truncate mt-0.5">
                    {tbl.id}_table
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Table Details */}
          {currentTable && (
            <div className="space-y-4">
              {/* Table meta info banner */}
              <div className="bg-[#faf7f2] border border-[#ded5c8] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-[#29251f] flex items-center gap-2">
                    <span>{currentTable.name}</span>
                    <span className="text-xs font-mono font-normal text-[#746d63] bg-[#ede6dc] px-2 py-0.5 rounded-md">
                      主键：{currentTable.primaryKey}
                    </span>
                  </h3>
                  <p className="text-xs text-[#746d63] mt-1">
                    {currentTable.description}
                  </p>
                </div>
                <div className="text-xs text-[#746d63] shrink-0 font-medium">
                  在线数据量：<b className="text-emerald-700 text-sm font-bold">{currentTable.rowCount}</b> 行记录
                </div>
              </div>

              {/* Table Columns Schema */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8a7f72] mb-2">
                  数据表字段定义 (Column Schema)
                </h4>
                <div className="border border-[#ded5c8] rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#ede6dc] border-b border-[#ded5c8] text-[#554b42] font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">字段名</th>
                        <th className="px-3.5 py-2.5">数据类型</th>
                        <th className="px-3.5 py-2.5">业务说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ded5c8]/50 bg-white">
                      {currentTable.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-[#faf7f2]">
                          <td className="px-3.5 py-2 font-mono font-bold text-[#29251f]">
                            {col.name}
                          </td>
                          <td className="px-3.5 py-2 font-mono text-[#b65f42]">
                            {col.type}
                          </td>
                          <td className="px-3.5 py-2 text-[#746d63]">
                            {col.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw Records Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8a7f72]">
                    线上数据实时切片 (前 8 条)
                  </h4>
                  <span className="text-[11px] text-[#8a7f72]">
                    自动同步，写回响应 100%
                  </span>
                </div>

                <div className="bg-[#29251f] text-[#ded5c8] p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-56 leading-relaxed shadow-inner">
                  <pre>{JSON.stringify(previewRows, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#faf6f0] border-t border-[#ded5c8] flex items-center justify-between text-xs text-[#746d63]">
          <span>日常集 · 在线生活工作台资料库引擎 v2.0</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold shadow-xs hover:opacity-90 transition-opacity"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};
