import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Wrench,
  Clock,
  FileCode,
  Download,
  Eye,
  RefreshCw,
  Search,
  Database
} from 'lucide-react';
import { RunSummary, RunRecord } from '../types';

interface RunStoreHistoryViewProps {
  runs: RunSummary[];
  onRefresh: () => void;
  onSelectRun: (runId: string) => void;
  isLoading: boolean;
}

export const RunStoreHistoryView: React.FC<RunStoreHistoryViewProps> = ({
  runs,
  onRefresh,
  onSelectRun,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [selectedJson, setSelectedJson] = useState<any | null>(null);

  const filteredRuns = runs.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.target_filename.toLowerCase().includes(q) ||
      r.provider_name.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  });

  const exportRunJson = (run: RunSummary) => {
    fetch(`/api/runs/${run.id}`)
      .then((res) => res.json())
      .then((data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `testcraft_run_${run.id}.json`;
        a.click();
      });
  };

  const viewRunDetails = (runId: string) => {
    fetch(`/api/runs/${runId}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedJson(data);
      });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[600px]">
      {/* Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <span>RunStore Persistent Inode Records</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                .testcraft/runs/
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Saved via cross-platform atomic writes (tempfile $\rightarrow$ os.replace)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search runs by ID, target, status..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="flex-1 overflow-x-auto p-4">
        {filteredRuns.length === 0 ? (
          <div className="text-center py-16 text-slate-500 font-mono text-xs">
            <History className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p>No stored runs found.</p>
            <p className="text-slate-600 text-[11px] mt-1">Execute a test pipeline to save persistent run snapshots.</p>
          </div>
        ) : (
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="pb-3 pl-2">Status</th>
                <th className="pb-3">Run ID</th>
                <th className="pb-3">Target Module</th>
                <th className="pb-3">Provider</th>
                <th className="pb-3">Pass Rate</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRuns.map((r) => {
                const isPassed = r.status === 'passed';
                const isRepaired = r.was_repaired || r.status === 'repaired';
                const isFailed = r.status === 'failed';
                const dateStr = new Date(r.timestamp * 1000).toLocaleTimeString();

                return (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pl-2">
                      {isRepaired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Wrench className="w-3 h-3" /> Repaired
                        </span>
                      ) : isPassed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="py-3 text-indigo-400 font-semibold">{r.id}</td>

                    <td className="py-3 text-slate-200 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.target_filename}</span>
                    </td>

                    <td className="py-3 text-slate-400 max-w-[140px] truncate" title={r.provider_name}>
                      {r.provider_name.split('(')[0]}
                    </td>

                    <td className="py-3">
                      <span className={r.passed === r.total ? 'text-emerald-400' : 'text-amber-400'}>
                        {r.passed} / {r.total} ({r.total > 0 ? Math.round((r.passed / r.total) * 100) : 0}%)
                      </span>
                    </td>

                    <td className="py-3 text-slate-400">{r.duration_ms.toFixed(1)}ms</td>

                    <td className="py-3 text-slate-500 text-[11px]">{dateStr}</td>

                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectRun(r.id)}
                          className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[11px] font-sans font-semibold transition-colors"
                          title="Load this run into Workbench"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => viewRunDetails(r.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Inspect raw JSON"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => exportRunJson(r)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Download JSON record"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* JSON Inspection Modal */}
      {selectedJson && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-slate-200">
                Run Record: {selectedJson.id} (run_{selectedJson.id}.json)
              </span>
              <button
                onClick={() => setSelectedJson(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                Close ✕
              </button>
            </div>
            <pre className="p-4 overflow-auto font-mono text-xs text-indigo-300/90 bg-slate-950 flex-1 leading-relaxed">
              {JSON.stringify(selectedJson, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
