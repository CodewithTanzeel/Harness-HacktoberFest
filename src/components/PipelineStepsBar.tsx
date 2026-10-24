import React from 'react';
import {
  FileCheck,
  Sparkles,
  Binary,
  PlayCircle,
  Stethoscope,
  Wrench,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { PipelineStage, RunRecord } from '../types';

interface PipelineStepsBarProps {
  currentStage: PipelineStage;
  latestRun: RunRecord | null;
  isRunning: boolean;
}

export const PipelineStepsBar: React.FC<PipelineStepsBarProps> = ({
  currentStage,
  latestRun,
  isRunning,
}) => {
  const steps = [
    {
      id: 'analyzing',
      label: '1. Source & Tokens',
      icon: FileCheck,
      desc: '< 60KB & AST Check',
    },
    {
      id: 'generating',
      label: '2. LLM Draft',
      icon: Sparkles,
      desc: 'Untrusted test draft',
    },
    {
      id: 'ast_validation',
      label: '3. AST & Imports',
      icon: Binary,
      desc: 'Anti-hallucination gate',
    },
    {
      id: 'executing',
      label: '4. Isolated Runner',
      icon: PlayCircle,
      desc: 'Resolved PYTHONPATH',
    },
    {
      id: 'diagnosing',
      label: '5. Failure Diagnosis',
      icon: Stethoscope,
      desc: 'Trace classification',
    },
    {
      id: 'repairing',
      label: '6. Self-Healing',
      icon: Wrench,
      desc: 'One-shot repair attempt',
    },
    {
      id: 'storing',
      label: '7. RunStore Atomic',
      icon: Database,
      desc: 'os.replace commit',
    },
  ];

  const getStepState = (stepId: string, index: number) => {
    if (!isRunning && !latestRun) {
      return { status: 'idle', color: 'text-slate-500 border-slate-800 bg-slate-900/50' };
    }

    if (isRunning) {
      const stageOrder: PipelineStage[] = [
        'analyzing',
        'generating',
        'ast_validation',
        'executing',
        'diagnosing',
        'repairing',
        'storing',
      ];
      const currentIndex = stageOrder.indexOf(currentStage);

      if (currentStage === stepId) {
        return {
          status: 'running',
          color: 'text-indigo-400 border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500',
        };
      }
      if (currentIndex > index) {
        return { status: 'done', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' };
      }
      return { status: 'pending', color: 'text-slate-600 border-slate-800 bg-slate-900/40' };
    }

    // Finished run state
    if (latestRun) {
      if (stepId === 'repairing') {
        if (latestRun.was_repaired) {
          return { status: 'repaired', color: 'text-amber-400 border-amber-500/50 bg-amber-500/10' };
        }
        if (latestRun.status === 'failed') {
          return { status: 'failed', color: 'text-rose-400 border-rose-500/50 bg-rose-500/10' };
        }
        return { status: 'skipped', color: 'text-slate-500 border-slate-800 bg-slate-900/40' };
      }

      if (latestRun.status === 'failed' && (stepId === 'executing' || stepId === 'diagnosing')) {
        return { status: 'failed', color: 'text-rose-400 border-rose-500/50 bg-rose-500/10' };
      }

      return { status: 'done', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' };
    }

    return { status: 'idle', color: 'text-slate-500 border-slate-800 bg-slate-900/50' };
  };

  return (
    <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-2 overflow-x-auto">
        {steps.map((step, idx) => {
          const state = getStepState(step.id, idx);
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all duration-200 shrink-0 ${state.color}`}
              >
                {state.status === 'running' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : state.status === 'done' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : state.status === 'repaired' ? (
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                ) : state.status === 'failed' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Icon className="w-3.5 h-3.5 opacity-70" />
                )}

                <div>
                  <div className="font-semibold tracking-tight">{step.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{step.desc}</div>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="w-4 h-[1px] bg-slate-800 shrink-0 hidden sm:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
