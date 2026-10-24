import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Code,
  FileCode,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Terminal,
  Activity
} from 'lucide-react';
import { TestRunReport, TestCaseResult } from '../types';

interface TestResultsViewProps {
  report: TestRunReport | null;
  isRunning: boolean;
  wasRepaired: boolean;
}

export const TestResultsView: React.FC<TestResultsViewProps> = ({
  report,
  isRunning,
  wasRepaired,
}) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'junit' | 'raw'>('tests');
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [copiedXml, setCopiedXml] = useState(false);

  if (!report && !isRunning) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-400">No Execution Results Yet</p>
        <p className="text-xs text-slate-500 mt-1">Execute the pipeline to see individual pytest results, durations, and JUnit XML reports.</p>
      </div>
    );
  }

  if (isRunning && !report) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-10 text-center animate-pulse">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-indigo-300">Subprocess Test Runner in Action...</p>
        <p className="text-xs text-slate-400 mt-1 font-mono">Running with isolated PYTHONPATH and timeout supervision</p>
      </div>
    );
  }

  if (!report) return null;

  const passRate = report.total > 0 ? Math.round((report.passed / report.total) * 100) : 0;

  const copyXml = () => {
    navigator.clipboard.writeText(report.junit_xml);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
      {/* Top Results Metric Bar */}
      <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold shadow-inner ${
              report.is_success
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {passRate}%
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm">
                {report.is_success ? 'Test Suite Passed' : 'Test Failures Detected'}
              </h3>
              {wasRepaired && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Healed via Repair Loop
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
              <span>{report.total} Total Tests</span>
              <span>•</span>
              <span className="text-emerald-400">{report.passed} Passed</span>
              <span>•</span>
              <span className={report.failed > 0 ? 'text-rose-400 font-bold' : ''}>
                {report.failed} Failed
              </span>
              <span>•</span>
              <span className={report.errors > 0 ? 'text-amber-400 font-bold' : ''}>
                {report.errors} Errors
              </span>
            </div>
          </div>
        </div>

        {/* Timing and Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{report.duration_ms.toFixed(1)} ms</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">Exit: {report.exit_code}</span>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'tests' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Test Cases ({report.test_cases.length})
            </button>
            <button
              onClick={() => setActiveTab('junit')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'junit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JUnit XML
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Runner Logs
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'tests' && (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {report.test_cases.map((tc, idx) => {
              const isExpanded = expandedTest === tc.name;
              const isPass = tc.status === 'passed';
              const isFail = tc.status === 'failed';
              const isErr = tc.status === 'error';

              return (
                <div
                  key={idx}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    isPass
                      ? 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                      : isFail
                      ? 'border-rose-500/40 bg-rose-950/10'
                      : 'border-amber-500/40 bg-amber-950/10'
                  }`}
                >
                  <div
                    onClick={() => setExpandedTest(isExpanded ? null : tc.name)}
                    className="flex items-center justify-between p-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      {isPass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isFail ? (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}

                      <span className="font-mono text-xs font-semibold text-slate-200">
                        {tc.name}
                      </span>

                      {tc.class_name && (
                        <span className="text-[10px] font-mono text-slate-500">
                          in {tc.class_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-slate-400">
                        {tc.duration_ms.toFixed(1)}ms
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          isPass
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isFail
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {tc.status}
                      </span>
                      {(tc.traceback || tc.failure_message || tc.stdout) && (
                        <button className="text-slate-500 hover:text-slate-300">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Traceback / Error Message */}
                  {isExpanded && (tc.traceback || tc.failure_message || tc.stdout) && (
                    <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs font-mono">
                      {tc.failure_message && (
                        <div className="mb-2 p-2 rounded bg-rose-950/30 border border-rose-500/30 text-rose-300">
                          <span className="font-bold text-rose-400">Error: </span>
                          {tc.failure_message}
                        </div>
                      )}

                      {tc.traceback && (
                        <div className="mt-2">
                          <div className="text-[11px] text-slate-500 mb-1">Traceback:</div>
                          <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-rose-200/90 overflow-x-auto whitespace-pre-wrap text-[11px] leading-relaxed">
                            {tc.traceback}
                          </pre>
                        </div>
                      )}

                      {tc.stdout && (
                        <div className="mt-2">
                          <div className="text-[11px] text-slate-500 mb-1">Standard Output:</div>
                          <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre-wrap text-[11px]">
                            {tc.stdout}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'junit' && (
          <div className="relative">
            <button
              onClick={copyXml}
              className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
            >
              {copiedXml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedXml ? 'Copied' : 'Copy XML'}</span>
            </button>
            <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300/90 overflow-x-auto max-h-[380px] leading-relaxed">
              {report.junit_xml || '<!-- No JUnit XML generated -->'}
            </pre>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="text-slate-400 mb-1 font-semibold">Standard Output (Subprocess stdout):</div>
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto max-h-[220px] whitespace-pre-wrap">
                {report.raw_stdout || '(No stdout)'}
              </pre>
            </div>
            {report.raw_stderr && (
              <div>
                <div className="text-rose-400 mb-1 font-semibold">Standard Error (Subprocess stderr):</div>
                <pre className="p-3 rounded-lg bg-slate-950 border border-rose-900/50 text-rose-300 overflow-x-auto max-h-[160px] whitespace-pre-wrap">
                  {report.raw_stderr}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
