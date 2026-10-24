import React from 'react';
import { Cpu, ShieldCheck, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { AstInspection } from '../types';

interface AstInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  astInfo: AstInspection | null;
  moduleName: string;
}

export const AstInspectorModal: React.FC<AstInspectorModalProps> = ({
  isOpen,
  onClose,
  astInfo,
  moduleName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-sm text-slate-100">
              Python AST Symbol Inspector: <span className="font-mono text-indigo-300">{moduleName}.py</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
          {/* Syntax Status */}
          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 ${
              astInfo?.isValid
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
            }`}
          >
            {astInfo?.isValid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="font-bold">
                {astInfo?.isValid ? 'Abstract Syntax Tree Parsed Cleanly' : 'AST Parsing Error'}
              </div>
              {astInfo?.error && <div className="text-[11px] text-rose-400 mt-0.5">{astInfo.error}</div>}
            </div>
          </div>

          {/* Imported Libraries */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Imported Libraries ({astInfo?.imports.length || 0}):
            </h4>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap gap-1.5">
              {astInfo?.imports && astInfo.imports.length > 0 ? (
                astInfo.imports.map((lib, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px]"
                  >
                    import {lib}
                  </span>
                ))
              ) : (
                <span className="text-slate-600">None (Pure Standard Library)</span>
              )}
            </div>
          </div>

          {/* Functions */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Top-Level & Class Functions ({astInfo?.functions.length || 0}):
            </h4>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
              {astInfo?.functions && astInfo.functions.length > 0 ? (
                astInfo.functions.map((fn, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-purple-400">def</span>
                      <span className="text-indigo-200 font-bold">{fn.name}</span>
                      <span className="text-slate-500">({fn.args.join(', ')})</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">line {fn.lineno}</span>
                  </div>
                ))
              ) : (
                <span className="text-slate-600">No function definitions detected.</span>
              )}
            </div>
          </div>

          {/* Classes */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Classes Defined ({astInfo?.classes.length || 0}):
            </h4>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              {astInfo?.classes && astInfo.classes.length > 0 ? (
                astInfo.classes.map((cls, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-blue-400">class</span>
                      <span className="text-amber-200 font-bold">{cls.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">line {cls.lineno}</span>
                  </div>
                ))
              ) : (
                <span className="text-slate-600">No class definitions detected.</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
