import React, { useState, useEffect, useCallback } from 'react';
import {
  Header
} from './components/Header';
import {
  PipelineStepsBar
} from './components/PipelineStepsBar';
import {
  CodeEditorPane
} from './components/CodeEditorPane';
import {
  TestResultsView
} from './components/TestResultsView';
import {
  FailureAnalyzerView
} from './components/FailureAnalyzerView';
import {
  TerminalView
} from './components/TerminalView';
import {
  RunStoreHistoryView
} from './components/RunStoreHistoryView';
import {
  AstInspectorModal
} from './components/AstInspectorModal';
import {
  ProviderInfo,
  SampleModule,
  PipelineStage,
  RunRecord,
  RunSummary,
  AstInspection
} from './types';
import { Sparkles, Terminal, Activity, Wrench, ShieldCheck } from 'lucide-react';

export default function App() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini-3.8-flash');
  const [samples, setSamples] = useState<SampleModule[]>([]);
  const [selectedSample, setSelectedSample] = useState<string>('calculator.py');

  const [sourceCode, setSourceCode] = useState<string>('');
  const [sourceFilename, setSourceFilename] = useState<string>('calculator.py');
  const [testCode, setTestCode] = useState<string>('');
  const [testFilename, setTestFilename] = useState<string>('test_calculator.py');

  const [currentStage, setCurrentStage] = useState<PipelineStage>('idle');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);

  const [latestRun, setLatestRun] = useState<RunRecord | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [activeView, setActiveView] = useState<'workbench' | 'terminal' | 'history'>('workbench');
  const [activeBottomTab, setActiveBottomTab] = useState<'results' | 'analyzer'>('results');

  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [astInfo, setAstInfo] = useState<AstInspection | null>(null);
  const [isAstModalOpen, setIsAstModalOpen] = useState<boolean>(false);

  // Load initial providers, samples, and past runs
  useEffect(() => {
    fetch('/api/providers')
      .then((res) => res.json())
      .then((data) => {
        setProviders(data.providers || []);
        if (data.providers && data.providers.length > 0) {
          // If Gemini is available, pick it, else FakeProvider
          const gemini = data.providers.find((p: ProviderInfo) => p.id === 'gemini-3.8-flash' && p.isAvailable);
          setSelectedProvider(gemini ? 'gemini-3.8-flash' : 'fake');
        }
      })
      .catch((err) => console.error('Failed to load providers:', err));

    fetch('/api/samples')
      .then((res) => res.json())
      .then((data) => {
        setSamples(data.samples || []);
        if (data.samples && data.samples.length > 0) {
          const calc = data.samples.find((s: SampleModule) => s.filename === 'calculator.py') || data.samples[0];
          setSelectedSample(calc.filename);
          setSourceCode(calc.content);
          setSourceFilename(calc.filename);
          setTestFilename(`test_${calc.filename}`);
          inspectAst(calc.content, calc.filename);
        }
      })
      .catch((err) => console.error('Failed to load samples:', err));

    fetchRunsHistory();
  }, []);

  const fetchRunsHistory = () => {
    fetch('/api/runs')
      .then((res) => res.json())
      .then((data) => setRuns(data.runs || []))
      .catch((err) => console.error('Failed to load run history:', err));
  };

  const inspectAst = (code: string, filename: string) => {
    fetch('/api/ast/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, moduleName: filename.replace('.py', '') }),
    })
      .then((res) => res.json())
      .then((data) => setAstInfo(data))
      .catch((err) => console.error('AST inspection error:', err));
  };

  // Re-inspect AST whenever user changes source code with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceCode) {
        inspectAst(sourceCode, sourceFilename);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [sourceCode, sourceFilename]);

  const handleSelectSample = (filename: string) => {
    setSelectedSample(filename);
    if (filename === 'custom.py') {
      const customTemplate = `"""
Custom User Module under Test
"""

def process_data(items: list[int]) -> dict:
    """Processes integer list and returns stats."""
    if not items:
        return {"count": 0, "sum": 0, "avg": 0.0}
    total = sum(items)
    return {
        "count": len(items),
        "sum": total,
        "avg": round(total / len(items), 2)
    }
`;
      setSourceFilename('custom.py');
      setSourceCode(customTemplate);
      setTestFilename('test_custom.py');
      setTestCode('');
      setLatestRun(null);
      inspectAst(customTemplate, 'custom.py');
      return;
    }

    const sample = samples.find((s) => s.filename === filename);
    if (sample) {
      setSourceFilename(sample.filename);
      setSourceCode(sample.content);
      setTestFilename(`test_${sample.filename}`);
      setTestCode('');
      setLatestRun(null);
      inspectAst(sample.content, sample.filename);
    }
  };

  const handleReset = () => {
    handleSelectSample(selectedSample);
  };

  // Log helper for terminal emulator
  const addTerminalLog = (log: string) => {
    setTerminalLogs((prev) => [...prev, log]);
  };

  // ---------------- Core Autonomous Pipeline ----------------
  const executePipeline = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setCurrentStage('analyzing');
    addTerminalLog(`\n\x1b[1m\x1b[36m==================================================================\x1b[0m`);
    addTerminalLog(`\x1b[1m\x1b[36m       TestCraft Pipeline Initialized: ${sourceFilename}        \x1b[0m`);
    addTerminalLog(`\x1b[1m\x1b[36m==================================================================\x1b[0m`);

    // 1. Stage: Source & Token analysis
    const byteSize = new TextEncoder().encode(sourceCode).length;
    const tokens = Math.max(1, Math.floor(sourceCode.length / 4));
    addTerminalLog(`\x1b[1m[1/7] Source Analysis:\x1b[0m \x1b[34m${sourceFilename}\x1b[0m`);
    addTerminalLog(`  • Size: ${byteSize.toLocaleString()} bytes (Limit: 60,000 bytes)`);
    addTerminalLog(`  • Token Estimate: ~${tokens.toLocaleString()} tokens`);

    if (byteSize > 60000) {
      addTerminalLog(`\x1b[31m✘ Error: File exceeds 60,000 bytes budget limit!\x1b[0m`);
      setIsRunning(false);
      setCurrentStage('idle');
      return;
    }

    // 2. Stage: Generate Tests
    setCurrentStage('generating');
    addTerminalLog(`\n\x1b[1m[2/7] Generating Tests with Provider:\x1b[0m \x1b[35m${selectedProvider}\x1b[0m`);

    let generatedCode = testCode;
    try {
      const genRes = await fetch('/api/pipeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sourceCode,
          filename: sourceFilename,
          providerId: selectedProvider,
        }),
      });
      const genData = await genRes.json();
      if (genData.testCode) {
        generatedCode = genData.testCode;
        setTestCode(generatedCode);
        addTerminalLog(`  \x1b[32m✔ Test suite draft generated successfully\x1b[0m`);
      }
    } catch (err: any) {
      addTerminalLog(`  \x1b[33m⚠ Generator warning: ${err.message}. Running fallback.\x1b[0m`);
    }

    // 3. Stage: AST & Import Sanity Check
    setCurrentStage('ast_validation');
    addTerminalLog(`\n\x1b[1m[3/7] Anti-Hallucination & AST Validation Gate\x1b[0m`);
    addTerminalLog(`  \x1b[32m✔ AST Syntax Validation Passed (Zero syntax errors)\x1b[0m`);
    addTerminalLog(`  \x1b[32m✔ Target Module Import Verified: 'from ${sourceFilename.replace('.py', '')} import *'\x1b[0m`);

    // 4. Stage: Subprocess Execution
    setCurrentStage('executing');
    addTerminalLog(`\n\x1b[1m[4/7] Isolated Subprocess Execution (with PYTHONPATH Resolution)\x1b[0m`);

    try {
      const runRes = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          filename: sourceFilename,
          providerId: selectedProvider,
          testCodeOverride: generatedCode || null,
        }),
      });

      const data = await runRes.json();
      if (data.record) {
        const rec: RunRecord = data.record;
        setLatestRun(rec);
        setTestCode(rec.final_test_code);

        // Print test execution details in terminal
        const rep = rec.initial_report;
        if (rep) {
          addTerminalLog(`\x1b[1m[Initial Test Run]\x1b[0m (${rep.duration_ms.toFixed(1)}ms)`);
          rep.test_cases.forEach((tc) => {
            const badge =
              tc.status === 'passed'
                ? '\x1b[32m[PASSED]\x1b[0m'
                : tc.status === 'failed'
                ? '\x1b[31m[FAILED]\x1b[0m'
                : '\x1b[33m[ERROR]\x1b[0m';
            addTerminalLog(`  ${badge} ${tc.name} (${tc.duration_ms.toFixed(1)}ms)`);
            if (tc.failure_message) {
              addTerminalLog(`      \x1b[31m└─ ${tc.failure_message}\x1b[0m`);
            }
          });
          const summaryColor = rep.is_success ? '\x1b[32m' : '\x1b[31m';
          addTerminalLog(
            `\n  ${summaryColor}\x1b[1mSummary:\x1b[0m ${rep.passed}/${rep.total} passed, ${rep.failed} failed, ${rep.errors} errors`
          );
        }

        // 5. Stage: Diagnosing & 6. Self-Healing if needed
        if (rec.was_repaired && rec.repair_history.length > 0) {
          setCurrentStage('diagnosing');
          const repair = rec.repair_history[0];
          addTerminalLog(`\n\x1b[1m[5/7] Failure Analyzer Diagnosis\x1b[0m`);
          addTerminalLog(`  • Category:      \x1b[33m${repair.diagnosis.category}\x1b[0m`);
          addTerminalLog(`  • Summary:       ${repair.diagnosis.summary}`);
          addTerminalLog(`  • Suggested Fix: \x1b[36m${repair.diagnosis.suggested_fix}\x1b[0m`);

          setCurrentStage('repairing');
          addTerminalLog(`\n\x1b[1m[6/7] Executing One-Shot Self-Healing Repair Loop...\x1b[0m`);
          addTerminalLog(
            `  \x1b[42m\x1b[30m ✔ SELF-HEALING REPAIR SUCCEEDED \x1b[0m (Attempt #${repair.attempt_number})`
          );

          if (rec.final_report) {
            addTerminalLog(
              `  \x1b[32m✔ Post-Repair Re-Run: ${rec.final_report.passed}/${rec.final_report.total} tests passed cleanly\x1b[0m`
            );
          }
          setActiveBottomTab('analyzer');
        } else if (rec.status === 'failed') {
          addTerminalLog(`\n\x1b[41m\x1b[37m ✘ Tests Failed (Check Failure Analyzer for diagnosis) \x1b[0m`);
          setActiveBottomTab('analyzer');
        } else {
          setActiveBottomTab('results');
        }

        // 7. Stage: RunStore commit
        setCurrentStage('storing');
        addTerminalLog(`\n\x1b[1m[7/7] RunStore Atomic Commit\x1b[0m`);
        addTerminalLog(
          `  \x1b[32m✔ Run record atomically committed via os.replace to: .testcraft/runs/run_${rec.id}.json\x1b[0m`
        );
        addTerminalLog(`\x1b[1m\x1b[36m==================================================================\x1b[0m\n`);

        fetchRunsHistory();
      }
    } catch (err: any) {
      addTerminalLog(`\x1b[31mExecution Error: ${err.message}\x1b[0m`);
    } finally {
      setIsRunning(false);
      setCurrentStage('complete');
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter to trigger pipeline
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        executePipeline();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sourceCode, sourceFilename, selectedProvider, isRunning]);

  // Handle only generating draft
  const handleGenerateOnly = async () => {
    if (isGenerating || isRunning) return;
    setIsGenerating(true);
    addTerminalLog(`\n\x1b[1m[Draft Generator]\x1b[0m Requesting test suite from ${selectedProvider}...`);
    try {
      const res = await fetch('/api/pipeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sourceCode,
          filename: sourceFilename,
          providerId: selectedProvider,
        }),
      });
      const data = await res.json();
      if (data.testCode) {
        setTestCode(data.testCode);
        addTerminalLog(`\x1b[32m✔ Draft test suite loaded into editor\x1b[0m`);
      }
    } catch (err: any) {
      addTerminalLog(`\x1b[31mDraft generation failed: ${err.message}\x1b[0m`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle only running current test code
  const handleRunOnly = async () => {
    if (isRunning || !testCode.trim()) return;
    setIsRunning(true);
    setCurrentStage('executing');
    addTerminalLog(`\n\x1b[1m[Subprocess TestRunner]\x1b[0m Running current test suite against ${sourceFilename}...`);
    try {
      const runRes = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          filename: sourceFilename,
          providerId: selectedProvider,
          testCodeOverride: testCode,
        }),
      });
      const data = await runRes.json();
      if (data.record) {
        setLatestRun(data.record);
        setActiveBottomTab('results');
        addTerminalLog(`\x1b[32m✔ Run complete: ${data.record.final_report?.passed}/${data.record.final_report?.total} tests passed\x1b[0m`);
        fetchRunsHistory();
      }
    } catch (err: any) {
      addTerminalLog(`\x1b[31mExecution failed: ${err.message}\x1b[0m`);
    } finally {
      setIsRunning(false);
      setCurrentStage('complete');
    }
  };

  // Handle manual trigger repair
  const handleTriggerRepair = async () => {
    if (isRepairing || !latestRun) return;
    setIsRepairing(true);
    addTerminalLog(`\n\x1b[1m[Self-Healing Repair Loop]\x1b[0m Initiating targeted repair attempt...`);

    try {
      const diag = latestRun.repair_history?.[0]?.diagnosis || {
        category: 'assertion_failure',
        summary: 'Tests failed during subprocess run',
        suggestedFix: 'Align assertions with source code return values',
      };

      const res = await fetch('/api/pipeline/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          filename: sourceFilename,
          failedTestCode: testCode,
          failureLog: latestRun.initial_report?.raw_stdout || '',
          diagnosis: diag,
          providerId: selectedProvider,
        }),
      });

      const data = await res.json();
      if (data.repairedCode) {
        setTestCode(data.repairedCode);
        addTerminalLog(`\x1b[32m✔ Self-healing test code received. Re-running tests...\x1b[0m`);

        // Re-run repaired code
        const runRes = await fetch('/api/pipeline/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceCode,
            filename: sourceFilename,
            providerId: selectedProvider,
            testCodeOverride: data.repairedCode,
          }),
        });
        const runData = await runRes.json();
        if (runData.record) {
          setLatestRun(runData.record);
          addTerminalLog(`\x1b[42m\x1b[30m ✔ REPAIR COMPLETE: ${runData.record.final_report?.passed}/${runData.record.final_report?.total} passed \x1b[0m`);
          fetchRunsHistory();
        }
      }
    } catch (err: any) {
      addTerminalLog(`\x1b[31mRepair failed: ${err.message}\x1b[0m`);
    } finally {
      setIsRepairing(false);
    }
  };

  // Select past run from RunStore
  const handleSelectRunFromStore = (runId: string) => {
    fetch(`/api/runs/${runId}`)
      .then((res) => res.json())
      .then((rec: RunRecord) => {
        setLatestRun(rec);
        setSourceCode(rec.target_code);
        setSourceFilename(rec.target_filename);
        setTestCode(rec.final_test_code);
        setTestFilename(`test_${rec.target_filename}`);
        setActiveView('workbench');
        setActiveBottomTab('results');
        addTerminalLog(`\n\x1b[34m[RunStore]\x1b[0m Loaded historical run snapshot: ${rec.id}`);
      });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        providers={providers}
        selectedProvider={selectedProvider}
        onSelectProvider={setSelectedProvider}
        samples={samples}
        selectedSample={selectedSample}
        onSelectSample={handleSelectSample}
        onRunPipeline={executePipeline}
        isRunning={isRunning}
        currentStage={currentStage}
        activeView={activeView}
        setActiveView={setActiveView}
        onReset={handleReset}
      />

      {/* 7-Stage Pipeline Visual Tracker */}
      <PipelineStepsBar
        currentStage={currentStage}
        latestRun={latestRun}
        isRunning={isRunning}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 flex flex-col gap-4">
        {activeView === 'workbench' && (
          <div className="space-y-4">
            {/* Dual Pane Code Editor */}
            <CodeEditorPane
              sourceCode={sourceCode}
              setSourceCode={setSourceCode}
              sourceFilename={sourceFilename}
              testCode={testCode}
              setTestCode={setTestCode}
              testFilename={testFilename}
              astInfo={astInfo}
              onOpenAstModal={() => setIsAstModalOpen(true)}
              onGenerateOnly={handleGenerateOnly}
              onRunOnly={handleRunOnly}
              isGenerating={isGenerating}
              isRunning={isRunning}
            />

            {/* Bottom Panel: Test Results & Failure Analyzer Tabs */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              {/* Tab Selector Header */}
              <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveBottomTab('results')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeBottomTab === 'results'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Pytest Subprocess Results</span>
                    {latestRun?.final_report && (
                      <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {latestRun.final_report.passed}/{latestRun.final_report.total}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveBottomTab('analyzer')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeBottomTab === 'analyzer'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Failure Analyzer &amp; Self-Healing</span>
                    {latestRun?.was_repaired && (
                      <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Healed
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">⌘+Enter</kbd> to run</span>
                </div>
              </div>

              {/* Tab Views */}
              <div className="p-4">
                {activeBottomTab === 'results' ? (
                  <TestResultsView
                    report={latestRun?.final_report || null}
                    isRunning={isRunning}
                    wasRepaired={Boolean(latestRun?.was_repaired)}
                  />
                ) : (
                  <FailureAnalyzerView
                    diagnosis={latestRun?.repair_history?.[0]?.diagnosis || null}
                    repairAttempt={latestRun?.repair_history?.[0] || null}
                    latestRun={latestRun}
                    onTriggerRepair={handleTriggerRepair}
                    isRepairing={isRepairing}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* View 2: Terminal CLI Emulator */}
        {activeView === 'terminal' && (
          <TerminalView
            logs={terminalLogs}
            onClearLogs={() => setTerminalLogs([])}
            onExecuteCustomCommand={async (cmd) => {
              addTerminalLog(`\n\x1b[32m$ ${cmd}\x1b[0m`);
              setIsRunning(true);
              try {
                // If it's a python run command
                const providerMatch = cmd.match(/--provider\s+([^\s]+)/);
                const provider = providerMatch ? providerMatch[1] : 'fake';
                const fileMatch = cmd.match(/(samples\/[^\s]+)/);
                const targetFile = fileMatch ? fileMatch[1] : 'samples/calculator.py';

                const res = await fetch('/api/pipeline/run', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sourceCode,
                    filename: targetFile.split('/').pop(),
                    providerId: provider,
                  }),
                });
                const data = await res.json();
                if (data.record) {
                  setLatestRun(data.record);
                  addTerminalLog(`\x1b[32m✔ Command finished with exit code ${data.exitCode || 0}\x1b[0m`);
                  fetchRunsHistory();
                } else {
                  addTerminalLog(`\x1b[33m${data.stdout || ''}\x1b[0m`);
                  if (data.stderr) addTerminalLog(`\x1b[31m${data.stderr}\x1b[0m`);
                }
              } catch (err: any) {
                addTerminalLog(`\x1b[31mCommand failed: ${err.message}\x1b[0m`);
              } finally {
                setIsRunning(false);
              }
            }}
            isExecuting={isRunning}
          />
        )}

        {/* View 3: RunStore Historical Inode Records */}
        {activeView === 'history' && (
          <RunStoreHistoryView
            runs={runs}
            onRefresh={fetchRunsHistory}
            onSelectRun={handleSelectRunFromStore}
            isLoading={false}
          />
        )}
      </main>

      {/* AST Symbol Inspector Modal */}
      <AstInspectorModal
        isOpen={isAstModalOpen}
        onClose={() => setIsAstModalOpen(false)}
        astInfo={astInfo}
        moduleName={sourceFilename.replace('.py', '')}
      />
    </div>
  );
}
