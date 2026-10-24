import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Play, Copy, Check, Trash2, CornerDownLeft } from 'lucide-react';

interface TerminalViewProps {
  logs: string[];
  onClearLogs: () => void;
  onExecuteCustomCommand: (cmd: string) => void;
  isExecuting: boolean;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  logs,
  onClearLogs,
  onExecuteCustomCommand,
  isExecuting,
}) => {
  const [inputCmd, setInputCmd] = useState('python3 engine/cli.py run samples/calculator.py --provider fake');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleRun = (cmdToRun?: string) => {
    const cmd = cmdToRun || inputCmd;
    if (!cmd.trim() || isExecuting) return;
    onExecuteCustomCommand(cmd.trim());
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert basic ANSI colors to HTML styling
  const renderAnsi = (text: string) => {
    // Strip or translate ANSI escapes
    const sanitized = text
      .replace(/\u001b\[0m/g, '</span>')
      .replace(/\u001b\[1m/g, '<span class="font-bold text-white">')
      .replace(/\u001b\[32m/g, '<span class="text-emerald-400">')
      .replace(/\u001b\[31m/g, '<span class="text-rose-400 font-semibold">')
      .replace(/\u001b\[33m/g, '<span class="text-amber-400">')
      .replace(/\u001b\[34m/g, '<span class="text-blue-400">')
      .replace(/\u001b\[35m/g, '<span class="text-purple-400">')
      .replace(/\u001b\[36m/g, '<span class="text-cyan-400">')
      .replace(/\u001b\[42m\u001b\[30m/g, '<span class="bg-emerald-500 text-slate-950 font-bold px-1 rounded">')
      .replace(/\u001b\[41m\u001b\[37m/g, '<span class="bg-rose-500 text-white font-bold px-1 rounded">');

    return sanitized;
  };

  const presets = [
    { label: 'Run Calculator (Pass)', cmd: 'python3 engine/cli.py run samples/calculator.py --provider fake' },
    { label: 'Run with Auto-Repair', cmd: 'python3 engine/cli.py run samples/calculator.py --provider fake-simulate-repair' },
    { label: 'Run E-commerce Cart', cmd: 'python3 engine/cli.py run samples/ecommerce_cart.py --provider fake' },
    { label: 'Run Auth Validator', cmd: 'python3 engine/cli.py run samples/auth_validator.py --provider fake' },
    { label: 'List Stored Runs', cmd: 'python3 engine/cli.py list-runs' },
    { label: 'List Providers', cmd: 'python3 engine/cli.py list-providers' },
  ];

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[680px]">
      {/* Terminal Title Bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <TerminalIcon className="w-4 h-4 text-indigo-400" />
          <span className="font-mono text-xs font-semibold text-slate-200">
            testcraft-cli -- bash shell
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyLogs}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Preset Command Bar */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
        <span className="text-slate-500 shrink-0">Presets:</span>
        {presets.map((p, i) => (
          <button
            key={i}
            onClick={() => {
              setInputCmd(p.cmd);
              handleRun(p.cmd);
            }}
            disabled={isExecuting}
            className="shrink-0 px-2 py-1 rounded bg-slate-800/80 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700 transition-colors disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Terminal Screen Output */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed selection:bg-indigo-500/30">
        {logs.length === 0 ? (
          <div className="text-slate-600 select-none py-10 text-center">
            <p>TestCraft Terminal session ready.</p>
            <p className="text-[11px] mt-1 text-slate-500">Run any command using presets or the prompt below.</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className="whitespace-pre-wrap font-mono mb-1"
              dangerouslySetInnerHTML={{ __html: renderAnsi(log) }}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Terminal Input Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <span className="text-emerald-400 font-mono text-xs font-bold">$</span>
        <input
          type="text"
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRun();
          }}
          disabled={isExecuting}
          className="flex-1 bg-transparent font-mono text-xs text-slate-100 focus:outline-none placeholder:text-slate-600"
          placeholder="Type command (e.g. python3 engine/cli.py run samples/calculator.py)..."
        />
        <button
          onClick={() => handleRun()}
          disabled={isExecuting || !inputCmd.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold transition-all disabled:opacity-50"
        >
          <Play className={`w-3 h-3 fill-current ${isExecuting ? 'animate-spin' : ''}`} />
          <span>Execute</span>
        </button>
      </div>
    </div>
  );
};
