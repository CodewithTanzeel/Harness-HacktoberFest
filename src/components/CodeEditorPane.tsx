import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Sparkles,
  Play,
  ShieldCheck,
  AlertCircle,
  Code2,
  Cpu,
  Layers,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { AstInspection } from '../types';

interface CodeEditorPaneProps {
  sourceCode: string;
  setSourceCode: (code: string) => void;
  sourceFilename: string;
  testCode: string;
  setTestCode: (code: string) => void;
  testFilename: string;
  astInfo: AstInspection | null;
  onOpenAstModal: () => void;
  onGenerateOnly: () => void;
  onRunOnly: () => void;
  isGenerating: boolean;
  isRunning: boolean;
}

export const CodeEditorPane: React.FC<CodeEditorPaneProps> = ({
  sourceCode,
  setSourceCode,
  sourceFilename,
  testCode,
  setTestCode,
  testFilename,
  astInfo,
  onOpenAstModal,
  onGenerateOnly,
  onRunOnly,
  isGenerating,
  isRunning,
}) => {
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);

  const copyToClipboard = (text: string, isSource: boolean) => {
    navigator.clipboard.writeText(text);
    if (isSource) {
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    } else {
      setCopiedTest(true);
      setTimeout(() => setCopiedTest(false), 2000);
    }
  };

  const sourceByteSize = new TextEncoder().encode(sourceCode).length;
  const sourceEstimatedTokens = Math.max(1, Math.floor(sourceCode.length / 4));
  const maxByteLimit = 60000;
  const bytePercentage = Math.min(100, Math.round((sourceByteSize / maxByteLimit) * 100));

  const sourceLines = sourceCode.split('\n');
  const testLines = testCode ? testCode.split('\n') : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-[580px]">
      {/* LEFT PANE: Source Module Under Test */}
      <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
        {/* Source Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/70 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-semibold text-slate-200">{sourceFilename}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({sourceLines.length} lines)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Token and Byte Budget Display */}
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              <span>{sourceByteSize} / 60KB</span>
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    bytePercentage > 90
                      ? 'bg-rose-500'
                      : bytePercentage > 70
                      ? 'bg-amber-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${bytePercentage}%` }}
                />
              </div>
              <span className="text-indigo-400 font-medium">~{sourceEstimatedTokens} tokens</span>
            </div>

            {/* AST Quick Inspection Button */}
            <button
              onClick={onOpenAstModal}
              title="Inspect AST symbols"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Cpu className="w-3 h-3 text-indigo-400" />
              <span>AST Symbols</span>
            </button>

            <button
              onClick={() => copyToClipboard(sourceCode, true)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
              title="Copy source code"
            >
              {copiedSource ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Source Code Editor Body */}
        <div className="relative flex-1 flex bg-slate-950/90 overflow-hidden font-mono text-[13px] leading-relaxed">
          {/* Line Numbers */}
          <div className="select-none py-3 px-2 text-right text-slate-600 bg-slate-950/40 border-r border-slate-800/60 shrink-0 w-10">
            {sourceLines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full p-3 bg-transparent text-slate-100 resize-none focus:outline-none font-mono selection:bg-indigo-500/30 overflow-auto"
            placeholder="Write or paste your Python source code here..."
          />
        </div>

        {/* Source Footer Stats */}
        <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {astInfo ? (
              astInfo.isValid ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Valid AST Syntax
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Syntax Error: {astInfo.error}
                </span>
              )
            ) : (
              <span>AST ready</span>
            )}
            {astInfo && (
              <span>
                • {astInfo.functions.length} funcs, {astInfo.classes.length} classes
              </span>
            )}
          </div>
          <span className="text-slate-500">Python 3 Target Module</span>
        </div>
      </div>

      {/* RIGHT PANE: Autonomous Test Suite (test_<module>.py) */}
      <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
        {/* Test Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/70 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/80" />
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span className="font-mono font-semibold text-slate-200">{testFilename}</span>
            {testLines.length > 0 && (
              <span className="text-[10px] text-slate-400 font-mono">
                ({testLines.length} lines)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateOnly}
              disabled={isGenerating || isRunning}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30 text-xs font-medium transition-all disabled:opacity-50"
              title="Regenerate test suite draft"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isGenerating ? 'Drafting...' : 'Regenerate Draft'}</span>
            </button>

            <button
              onClick={onRunOnly}
              disabled={isRunning || !testCode.trim()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all disabled:opacity-50"
              title="Run current test code directly in subprocess"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run Suite</span>
            </button>

            <button
              onClick={() => copyToClipboard(testCode, false)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
              title="Copy test suite code"
            >
              {copiedTest ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Test Code Editor Body */}
        <div className="relative flex-1 flex bg-slate-950/90 overflow-hidden font-mono text-[13px] leading-relaxed">
          {testLines.length > 0 ? (
            <>
              {/* Line Numbers */}
              <div className="select-none py-3 px-2 text-right text-slate-600 bg-slate-950/40 border-r border-slate-800/60 shrink-0 w-10">
                {testLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full p-3 bg-transparent text-indigo-100/90 resize-none focus:outline-none font-mono selection:bg-indigo-500/30 overflow-auto"
                placeholder="# Generated pytest suite will appear here..."
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Sparkles className="w-10 h-10 text-indigo-400/40 mb-3" />
              <p className="text-sm font-medium text-slate-300">Untrusted Draft Ready to Generate</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Click &ldquo;Execute Pipeline&rdquo; above to autonomously generate, validate AST, run isolated subprocess tests, and self-heal any failures.
              </p>
              <button
                onClick={onGenerateOnly}
                disabled={isGenerating}
                className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Test Draft Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Test Footer */}
        <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Isolated scratch:</span>
            <span className="text-indigo-400">.testcraft/scratch/</span>
          </div>
          <span className="text-slate-500">pytest-compatible harness</span>
        </div>
      </div>
    </div>
  );
};
