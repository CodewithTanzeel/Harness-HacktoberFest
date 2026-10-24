import React from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  History,
  ShieldCheck,
  Cpu,
  Layers,
  FileCode2,
  AlertTriangle
} from 'lucide-react';
import { ProviderInfo, SampleModule, PipelineStage } from '../types';

interface HeaderProps {
  providers: ProviderInfo[];
  selectedProvider: string;
  onSelectProvider: (id: string) => void;
  samples: SampleModule[];
  selectedSample: string;
  onSelectSample: (filename: string) => void;
  onRunPipeline: () => void;
  isRunning: boolean;
  currentStage: PipelineStage;
  activeView: 'workbench' | 'terminal' | 'history';
  setActiveView: (view: 'workbench' | 'terminal' | 'history') => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  providers,
  selectedProvider,
  onSelectProvider,
  samples,
  selectedSample,
  onSelectSample,
  onRunPipeline,
  isRunning,
  currentStage,
  activeView,
  setActiveView,
  onReset,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1720px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand and Architectural Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/20 text-white font-bold ring-1 ring-white/20">
            <Cpu className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                TestCraft
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  v0.1 Engine
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <span>Python 3.10 Subprocess Isolation</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> PYTHONPATH Resolver Active
              </span>
            </p>
          </div>
        </div>

        {/* Center Controls: Sample selector & Provider selector */}
        <div className="flex items-center gap-2.5">
          {/* Sample Source File Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Target:</span>
            <select
              value={selectedSample}
              onChange={(e) => onSelectSample(e.target.value)}
              disabled={isRunning}
              className="bg-transparent text-white font-mono font-medium focus:outline-none cursor-pointer"
            >
              {samples.map((s) => (
                <option key={s.filename} value={s.filename} className="bg-slate-900 text-slate-200">
                  {s.filename} ({Math.round(s.byteSize / 1024 * 10) / 10}KB)
                </option>
              ))}
              <option value="custom.py" className="bg-slate-900 text-slate-200">
                + Custom Source (Editable)
              </option>
            </select>
          </div>

          {/* Provider Registry Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Provider:</span>
            <select
              value={selectedProvider}
              onChange={(e) => onSelectProvider(e.target.value)}
              disabled={isRunning}
              className="bg-transparent text-white font-mono font-medium focus:outline-none cursor-pointer max-w-[210px] truncate"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveView('workbench')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeView === 'workbench'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Workbench
            </button>
            <button
              onClick={() => setActiveView('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeView === 'terminal'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal CLI
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeView === 'history'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              RunStore
            </button>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            disabled={isRunning}
            title="Reset code to original sample"
            className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onRunPipeline}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs tracking-wide uppercase transition-all shadow-lg ${
              isRunning
                ? 'bg-indigo-700/60 text-indigo-200 cursor-not-allowed animate-pulse ring-2 ring-indigo-500/50'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/25 ring-1 ring-white/20 active:scale-[0.98]'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? (
              <span>Running {currentStage}...</span>
            ) : (
              <span>Execute Pipeline</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
