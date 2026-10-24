import React, { useState } from 'react';
import {
  Stethoscope,
  Wrench,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  GitCompare,
  Sparkles,
  FileDiff,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { FailureDiagnosis, RepairAttempt, RunRecord } from '../types';

interface FailureAnalyzerViewProps {
  diagnosis: FailureDiagnosis | null;
  repairAttempt: RepairAttempt | null;
  latestRun: RunRecord | null;
  onTriggerRepair: () => void;
  isRepairing: boolean;
}

export const FailureAnalyzerView: React.FC<FailureAnalyzerViewProps> = ({
  diagnosis,
  repairAttempt,
  latestRun,
  onTriggerRepair,
  isRepairing,
}) => {
  const [diffMode, setDiffMode] = useState<'split' | 'unified'>('split');

  const activeDiagnosis = repairAttempt?.diagnosis || diagnosis;
  const originalCode = repairAttempt?.original_code || latestRun?.initial_test_code || '';
  const repairedCode = repairAttempt?.repaired_code || latestRun?.final_test_code || '';
  const wasRepaired = latestRun?.was_repaired || repairAttempt?.success;

  if (!activeDiagnosis && !wasRepaired) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        <Stethoscope className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-400">Failure Analyzer Idle</p>
        <p className="text-xs text-slate-500 mt-1">
          When test execution encounters failures or syntax/import errors, the Failure Analyzer will classify the root cause and power the self-healing repair loop.
        </p>
      </div>
    );
  }

  const categoryBadgeColors: Record<string, string> = {
    assertion_failure: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    import_hallucination: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    syntax: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    timeout: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    runtime_exception: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    fixture_missing: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  };

  const origLines = originalCode.split('\n');
  const repLines = repairedCode.split('\n');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
      {/* Header Banner */}
      <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              wasRepaired
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            {wasRepaired ? <Wrench className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm">
                {wasRepaired ? 'Self-Healing Repair Succeeded' : 'Failure Diagnosed — Ready for Repair'}
              </h3>
              {activeDiagnosis && (
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                    categoryBadgeColors[activeDiagnosis.category] || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {activeDiagnosis.category.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {activeDiagnosis?.summary || 'Assertion drift corrected against source module'}
            </p>
          </div>
        </div>

        {/* Action Button & Diff Mode Switcher */}
        <div className="flex items-center gap-2">
          {repairedCode && originalCode !== repairedCode && (
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setDiffMode('split')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  diffMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setDiffMode('unified')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  diffMode === 'unified' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unified
              </button>
            </div>
          )}

          {!wasRepaired && latestRun?.status === 'failed' && (
            <button
              onClick={onTriggerRepair}
              disabled={isRepairing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold text-xs tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
              <span>{isRepairing ? 'Healing Tests...' : 'Trigger Auto-Repair'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Suggested Fix and Diagnosis Details */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">
              Root Cause Identification:
            </span>
            <div className="text-slate-200 font-semibold mb-1">
              Test: <span className="text-amber-400">{activeDiagnosis?.root_cause_test || 'TestSuite'}</span>
            </div>
            <div className="text-slate-400 text-[11px] leading-relaxed">
              {activeDiagnosis?.summary}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">
              Self-Healing Prescription:
            </span>
            <div className="text-emerald-400 text-[11px] leading-relaxed flex items-start gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{activeDiagnosis?.suggested_fix || 'Realigning assertions to true module semantics.'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Diff Viewer */}
      {originalCode && repairedCode && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <GitCompare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Repair Code Diff</span>
              <span className="text-[11px] font-mono text-slate-500">
                (Failed Draft vs. Healed Suite)
              </span>
            </div>
          </div>

          {diffMode === 'split' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs font-mono">
              {/* Original Failed Code */}
              <div className="border border-rose-950/60 bg-rose-950/10 rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 bg-rose-950/30 border-b border-rose-900/40 text-rose-300 text-[11px] font-semibold flex items-center justify-between">
                  <span>- Original (Failed Test Suite)</span>
                  <span>{origLines.length} lines</span>
                </div>
                <pre className="p-3 text-rose-200/80 overflow-x-auto max-h-[340px] text-[11px] leading-relaxed">
                  {originalCode}
                </pre>
              </div>

              {/* Repaired Passing Code */}
              <div className="border border-emerald-950/60 bg-emerald-950/10 rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 bg-emerald-950/30 border-b border-emerald-900/40 text-emerald-300 text-[11px] font-semibold flex items-center justify-between">
                  <span>+ Repaired (Self-Healed Suite)</span>
                  <span>{repLines.length} lines</span>
                </div>
                <pre className="p-3 text-emerald-200/90 overflow-x-auto max-h-[340px] text-[11px] leading-relaxed">
                  {repairedCode}
                </pre>
              </div>
            </div>
          ) : (
            /* Unified Diff */
            <div className="border border-slate-800 rounded-lg bg-slate-950 font-mono text-xs overflow-x-auto max-h-[340px] p-3 text-[11px] leading-relaxed">
              <div className="text-slate-500 mb-2">--- a/test_draft.py (Failed)</div>
              <div className="text-slate-500 mb-2">+++ b/test_draft.py (Repaired)</div>
              {repLines.map((line, idx) => {
                const orig = origLines[idx];
                const isDifferent = orig !== line;
                return (
                  <div
                    key={idx}
                    className={`px-1.5 py-0.5 rounded ${
                      isDifferent ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    <span className="select-none text-slate-600 mr-2">{idx + 1}</span>
                    {isDifferent ? `+ ${line}` : `  ${line}`}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
