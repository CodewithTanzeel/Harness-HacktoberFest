import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Copy,
  Check,
  Trash2,
  HelpCircle,
  Cpu,
  ShieldCheck,
  FileText,
  CornerDownLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface CliInfo {
  name: string;
  version: string;
  pythonVersion: string;
  isolation: string;
  hasGeminiKey: boolean;
  samples: string[];
}

export default function App() {
  const [command, setCommand] = useState('validatekaro');
  const [logs, setLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cliInfo, setCliInfo] = useState<CliInfo | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message and info fetch
  useEffect(() => {
    fetch('/api/cli/info')
      .then((res) => res.json())
      .then((info: CliInfo) => {
        setCliInfo(info);
      })
      .catch((e) => console.error(e));

    const welcomeBanner = [
      '\x1b[1m\x1b[36m==================================================================\x1b[0m',
      '\x1b[1m\x1b[36m  TestCraft CLI - Autonomous Pytest Generator & Self-Healing Tool  \x1b[0m',
      '\x1b[1m\x1b[36m==================================================================\x1b[0m',
      '\x1b[1m\x1b[32m  ⚡ Quick Start: Type "validatekaro" for all-in-one verification \x1b[0m',
      '\x1b[2m  Supports: \x1b[0m\x1b[33mUnix (./validatekaro)\x1b[0m \x1b[2m|\x1b[0m \x1b[33mCMD (validatekaro.bat)\x1b[0m \x1b[2m|\x1b[0m \x1b[33mPowerShell (.\\validatekaro.ps1)\x1b[0m',
      '\x1b[2m  Type \x1b[0m\x1b[1m\x1b[33mtestcraft --help\x1b[0m\x1b[2m to view all available commands.\x1b[0m',
      '',
    ];
    setLogs(welcomeBanner);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runCommand = async (cmdToRun?: string) => {
    const rawCmd = (cmdToRun || command).trim();
    if (!rawCmd || isExecuting) return;

    setIsExecuting(true);
    setHistory((prev) => [rawCmd, ...prev.filter((c) => c !== rawCmd)]);
    setHistoryIndex(-1);

    setLogs((prev) => [...prev, `\x1b[32m$ ${rawCmd}\x1b[0m`]);

    try {
      const res = await fetch('/api/cli/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: rawCmd }),
      });
      const data = await res.json();

      if (data.stdout) {
        setLogs((prev) => [...prev, data.stdout]);
      }
      if (data.stderr) {
        setLogs((prev) => [...prev, `\x1b[31m${data.stderr}\x1b[0m`]);
      }
      if (!data.stdout && !data.stderr) {
        setLogs((prev) => [...prev, `\x1b[2m(Process completed with exit code ${data.exitCode})\x1b[0m\n`]);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `\x1b[31mCLI Execution Error: ${err.message}\x1b[0m\n`]);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setCommand(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommand(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearScreen = () => {
    setLogs([]);
  };

  const renderAnsi = (text: string) => {
    const sanitized = text
      .replace(/\u001b\[0m/g, '</span>')
      .replace(/\u001b\[1m/g, '<span class="font-bold text-white">')
      .replace(/\u001b\[2m/g, '<span class="text-slate-500">')
      .replace(/\u001b\[32m/g, '<span class="text-emerald-400">')
      .replace(/\u001b\[31m/g, '<span class="text-rose-400 font-semibold">')
      .replace(/\u001b\[33m/g, '<span class="text-amber-400">')
      .replace(/\u001b\[34m/g, '<span class="text-sky-400">')
      .replace(/\u001b\[35m/g, '<span class="text-purple-400">')
      .replace(/\u001b\[36m/g, '<span class="text-cyan-400">')
      .replace(/\u001b\[42m\u001b\[30m/g, '<span class="bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">')
      .replace(/\u001b\[41m\u001b\[37m/g, '<span class="bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded">');
    return sanitized;
  };

  const presets = [
    { label: '⚡ validatekaro (All-in-One)', cmd: 'validatekaro', primary: true },
    { label: 'testcraft --help', cmd: 'testcraft --help' },
    { label: 'Run with Auto-Repair', cmd: 'testcraft run samples/calculator.py --provider fake-simulate-repair' },
    { label: 'Run Calculator', cmd: 'testcraft run samples/calculator.py' },
    { label: 'Inspect AST', cmd: 'testcraft inspect samples/calculator.py' },
    { label: 'Run Auth Validator', cmd: 'testcraft run samples/auth_validator.py' },
    { label: 'Run E-commerce Cart', cmd: 'testcraft run samples/ecommerce_cart.py' },
    { label: 'Run Data Pipeline', cmd: 'testcraft run samples/data_pipeline.py' },
    { label: 'List Stored Runs', cmd: 'testcraft list-runs' },
    { label: 'List Providers', cmd: 'testcraft list-providers' },
  ];

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 font-mono flex flex-col overflow-hidden">
      {/* Top CLI Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-xs tracking-tight text-white">
              testcraft <span className="text-slate-500 font-normal">v0.1.0</span>
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              CLI Mode
            </span>
          </div>
        </div>

        {/* Telemetry info */}
        <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-300">
            <Cpu className="w-3 h-3 text-indigo-400" />
            Python 3.10 Subprocess
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            PYTHONPATH Resolved
          </span>
          <span className="text-slate-700">•</span>
          <span className="text-slate-400">
            Store: <code className="text-indigo-300">.testcraft/runs/</code>
          </span>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              showDocs ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>CLI Guide</span>
          </button>
          <button
            onClick={copyLogs}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title="Copy terminal session"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={clearScreen}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title="Clear terminal screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </header>

      {/* Preset Command Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 text-xs">
        <span className="text-slate-500 font-semibold shrink-0 text-[11px]">Quick Run:</span>
        {presets.map((p, i) => (
          <button
            key={i}
            onClick={() => {
              setCommand(p.cmd);
              runCommand(p.cmd);
            }}
            disabled={isExecuting}
            className={`shrink-0 px-2.5 py-1 rounded border transition-colors disabled:opacity-50 text-[11px] ${
              p.primary
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/50 shadow-md shadow-emerald-500/20 font-bold hover:brightness-110'
                : 'bg-slate-800/80 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border-slate-700/80'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Terminal Screen & Collapsible Docs Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Terminal Screen */}
        <div className="flex-1 flex flex-col bg-slate-950 p-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto text-xs leading-relaxed selection:bg-indigo-500/30 font-mono pr-2">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className="whitespace-pre-wrap font-mono mb-1"
                dangerouslySetInnerHTML={{ __html: renderAnsi(log) }}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Command Prompt Line */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 shrink-0">
            <span className="text-emerald-400 font-bold select-none flex items-center gap-1">
              <span>testcraft</span>
              <span className="text-slate-500">$</span>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              className="flex-1 bg-transparent text-slate-100 text-xs focus:outline-none placeholder:text-slate-600 font-mono"
              placeholder="e.g. testcraft run samples/calculator.py"
              autoFocus
            />
            <button
              onClick={() => runCommand()}
              disabled={isExecuting || !command.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all disabled:opacity-50 shadow-md active:scale-95"
            >
              <Play className={`w-3 h-3 fill-current ${isExecuting ? 'animate-spin' : ''}`} />
              <span>{isExecuting ? 'Running...' : 'Execute'}</span>
            </button>
          </div>
        </div>

        {/* CLI User Guide & README Side Drawer */}
        {showDocs && (
          <aside className="w-[480px] border-l border-slate-800 bg-slate-900/98 overflow-y-auto p-4 text-xs shrink-0 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-100">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="text-sm">User Guide &amp; Elicitation Spec</span>
              </div>
              <button
                onClick={() => setShowDocs(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Close guide"
              >
                ✕
              </button>
            </div>

            {/* Global Anywhere Notice */}
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px] leading-relaxed">
              <span className="font-bold text-white block mb-1">⚡ Global Anywhere-on-Computer Support</span>
              Run <code className="text-white font-mono font-bold">ValidateKaro</code> from <strong>ANY directory or path</strong> on your computer:
              <ul className="mt-1 list-disc list-inside text-slate-300 space-y-0.5">
                <li><strong>Linux / macOS:</strong> <code className="text-emerald-400">ValidateKaro [target.py]</code> (in /usr/local/bin)</li>
                <li><strong>Windows CMD:</strong> <code className="text-emerald-400">ValidateKaro [target.py]</code> (via install.bat)</li>
                <li><strong>PowerShell:</strong> <code className="text-emerald-400">ValidateKaro [target.py]</code> (via install.ps1)</li>
              </ul>
            </div>

            {/* Practical Cheatsheet */}
            <div className="space-y-3 font-mono text-[11px]">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-emerald-400 font-bold">1. Standard Execution</span>
                  <button
                    onClick={() => {
                      setCommand('testcraft run samples/calculator.py');
                      runCommand('testcraft run samples/calculator.py');
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-sans font-semibold underline"
                  >
                    Run Now ▶
                  </button>
                </div>
                <div className="text-slate-300 text-[10px] mb-1">
                  <code>testcraft run samples/calculator.py</code>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Generates test suite, executes in isolated subprocess, parses JUnit XML.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-400 font-bold">2. Self-Healing Simulation</span>
                  <button
                    onClick={() => {
                      setCommand('testcraft run samples/calculator.py --provider fake-simulate-repair');
                      runCommand('testcraft run samples/calculator.py --provider fake-simulate-repair');
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-sans font-semibold underline"
                  >
                    Run Now ▶
                  </button>
                </div>
                <div className="text-slate-300 text-[10px] mb-1">
                  <code>testcraft run samples/calculator.py --provider fake-simulate-repair</code>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Exercises FailureAnalyzer failure classification &amp; automatic assertion healing.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sky-400 font-bold">3. AST &amp; Token Inspection</span>
                  <button
                    onClick={() => {
                      setCommand('testcraft inspect samples/ecommerce_cart.py');
                      runCommand('testcraft inspect samples/ecommerce_cart.py');
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-sans font-semibold underline"
                  >
                    Run Now ▶
                  </button>
                </div>
                <div className="text-slate-300 text-[10px] mb-1">
                  <code>testcraft inspect samples/ecommerce_cart.py</code>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Extracts functions, classes, imported libraries, and token heuristics without executing code.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-400 font-bold">4. Save Suite to File</span>
                  <button
                    onClick={() => {
                      setCommand('testcraft run samples/auth_validator.py -o tests/test_auth.py');
                      runCommand('testcraft run samples/auth_validator.py -o tests/test_auth.py');
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-sans font-semibold underline"
                  >
                    Run Now ▶
                  </button>
                </div>
                <div className="text-slate-300 text-[10px] mb-1">
                  <code>testcraft run samples/auth_validator.py -o tests/test_auth.py</code>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Persists the final passing test file to your repository tests folder.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-emerald-400 font-bold">5. Atomic RunStore &amp; Diffs</span>
                  <button
                    onClick={() => {
                      setCommand('testcraft list-runs');
                      runCommand('testcraft list-runs');
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-sans font-semibold underline"
                  >
                    Run Now ▶
                  </button>
                </div>
                <div className="text-slate-300 text-[10px] mb-1">
                  <code>testcraft list-runs</code>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Queries atomic JSON runs in <code>.testcraft/runs/</code> committed via <code>os.replace</code>.
                </div>
              </div>
            </div>

            {/* Documentation File Notice */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Full User Guide in Project Root</span>
              </div>
              <p>
                The complete, unabridged technical guide is located in <code className="text-indigo-300 font-mono">README.md</code>. It documents the untrusted drafts model, the <code>PYTHONPATH</code> challenge resolution, FailureAnalyzer categories, and custom provider extensions.
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
