import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK as per gemini-api guidelines
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ---------------- API Routes ----------------

// 1. Get Available Providers
app.get('/api/providers', (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const providers = [
    {
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash (Active Engine)',
      model: 'gemini-3.8-flash',
      isAvailable: hasGeminiKey,
      description: 'Google Flagship Flash reasoning & code generation model',
      recommended: true,
    },
    {
      id: 'fake',
      name: 'FakeProvider (Deterministic Mock / Zero-Token)',
      model: 'mock-v1-deterministic',
      isAvailable: true,
      description: 'Instant zero-token deterministic mock generation with standard assertions',
      recommended: false,
    },
    {
      id: 'fake-simulate-repair',
      name: 'FakeProvider (Simulate Failure & Auto-Repair)',
      model: 'mock-v1-repair-loop',
      isAvailable: true,
      description: 'Deliberately creates assertion drift to exercise FailureAnalyzer & self-healing',
      recommended: false,
    },
  ];
  res.json({ providers, hasGeminiKey });
});

// 2. Get Sample Modules
app.get('/api/samples', (req, res) => {
  const samplesDir = path.join(__dirname, 'samples');
  if (!fs.existsSync(samplesDir)) {
    return res.json({ samples: [] });
  }

  const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.py'));
  const samples = files.map(file => {
    const fullPath = path.join(samplesDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    return {
      filename: file,
      path: fullPath,
      moduleName: file.replace('.py', ''),
      content,
      byteSize: Buffer.byteLength(content, 'utf-8'),
    };
  });

  res.json({ samples });
});

// 3. Inspect Python Source AST
app.post('/api/ast/inspect', (req, res) => {
  const { code, moduleName = 'module_under_test' } = req.body;
  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Source code is required' });
  }

  // Use python3 ast inspect script
  const pyProcess = spawn('python3', [
    '-c',
    `
import ast, json, sys
code = sys.stdin.read()
try:
    tree = ast.parse(code)
    imported = []
    functions = []
    classes = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                imported.append(a.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imported.append(node.module)
        elif isinstance(node, ast.FunctionDef) or isinstance(node, getattr(ast, 'AsyncFunctionDef', ())):
            functions.append({"name": node.name, "lineno": node.lineno, "args": [a.arg for a in node.args.args]})
        elif isinstance(node, ast.ClassDef):
            classes.append({"name": node.name, "lineno": node.lineno})
    print(json.dumps({
        "isValid": True,
        "imports": sorted(list(set(imported))),
        "functions": functions,
        "classes": classes
    }))
except SyntaxError as e:
    print(json.dumps({
        "isValid": False,
        "error": f"{e.msg} at line {e.lineno}",
        "lineno": e.lineno,
        "offset": e.offset
    }))
except Exception as e:
    print(json.dumps({"isValid": False, "error": str(e)}))
`
  ]);

  let stdout = '';
  let stderr = '';

  pyProcess.stdin.write(code);
  pyProcess.stdin.end();

  pyProcess.stdout.on('data', chunk => stdout += chunk);
  pyProcess.stderr.on('data', chunk => stderr += chunk);

  pyProcess.on('close', codeExit => {
    try {
      const parsed = JSON.parse(stdout);
      res.json(parsed);
    } catch (e) {
      res.status(500).json({ error: 'Failed to inspect AST', details: stderr || stdout });
    }
  });
});

// 4. Generate Tests via Gemini or Provider
app.post('/api/pipeline/generate', async (req, res) => {
  const { code, filename = 'module_under_test.py', providerId = 'gemini-3.8-flash' } = req.body;
  const moduleName = path.basename(filename, '.py');

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  // If Gemini provider is requested
  if (providerId === 'gemini-3.8-flash' && ai) {
    try {
      const prompt = `You are an autonomous Python testing expert building tests for the module '${moduleName}'.

CRITICAL IMPORT RULES:
- The target module is named '${moduleName}'.
- You MUST import the target module directly:
  from ${moduleName} import *
  OR:
  import ${moduleName}
- DO NOT hallucinate nonexistent directories or package prefixes (DO NOT write 'from src.${moduleName} import ...').
- You may use any libraries already imported in the source module, standard libraries, and pytest.

TESTING GUIDELINES:
- Write clear, robust, independent test functions starting with 'test_'.
- Test standard expected behavior, edge cases (0, negatives, empty collections, None), and exceptions using 'with pytest.raises(...)'.
- Return ONLY executable Python code. No introductory commentary, explanations, or Markdown notes.

SOURCE CODE:
\`\`\`python
${code}
\`\`\`
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let generated = response.text || '';
      // Strip markdown fences
      generated = generated.replace(/^```(?:python)?/i, '').replace(/```$/i, '').trim();

      // Normalize common hallucinated prefixes
      const hallucinationRegex = new RegExp(`from\\s+(?:src|app|tests?)\\.${moduleName}\\s+import`, 'gi');
      generated = generated.replace(hallucinationRegex, `from ${moduleName} import`);

      return res.json({ testCode: generated, provider: 'gemini-3.8-flash' });
    } catch (err: any) {
      console.error('Gemini test generation failed:', err);
      // Fallback gracefully to Python engine FakeProvider
    }
  }

  // Fallback or explicit FakeProvider execution
  const pyProcess = spawn('python3', [
    '-c',
    `
import sys, json, os
sys.path.insert(0, os.path.abspath("."))
from engine.orchestrator import Orchestrator
from engine.registry import ProviderRegistry
from engine.generate.generator import TestGenerator

payload = json.loads(sys.stdin.read())
orch = Orchestrator()
target = orch.analyze_source(payload.get("filename", "target.py"), code_content=payload.get("code", ""))
provider = ProviderRegistry.get(payload.get("providerId", "fake")) or ProviderRegistry.get("fake")
test_code, syntax_res, import_res = TestGenerator.generate(provider, target)
print(json.dumps({
    "testCode": test_code,
    "syntaxValid": syntax_res.is_valid,
    "syntaxError": syntax_res.error_message,
    "importValid": import_res.is_valid,
    "importError": import_res.error_message,
    "provider": provider.display_name
}))
`
  ]);

  let stdout = '';
  let stderr = '';
  pyProcess.stdout.on('data', chunk => stdout += chunk);
  pyProcess.stderr.on('data', chunk => stderr += chunk);

  pyProcess.stdin.write(JSON.stringify({ code, filename, providerId }));
  pyProcess.stdin.end();

  pyProcess.on('close', codeExit => {
    try {
      const data = JSON.parse(stdout);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to generate tests', details: stderr || stdout });
    }
  });
});

// 5. Repair Tests via Gemini or Provider
app.post('/api/pipeline/repair', async (req, res) => {
  const {
    sourceCode,
    filename = 'target.py',
    failedTestCode,
    failureLog,
    diagnosis,
    providerId = 'gemini-3.8-flash'
  } = req.body;

  const moduleName = path.basename(filename, '.py');

  if (providerId === 'gemini-3.8-flash' && ai) {
    try {
      const prompt = `You are an autonomous Python testing expert repairing a failed pytest suite.

TARGET SOURCE CODE (${moduleName}):
\`\`\`python
${sourceCode}
\`\`\`

FAILED TEST SUITE:
\`\`\`python
${failedTestCode}
\`\`\`

FAILURE DIAGNOSIS:
${diagnosis?.summary || 'Assertion or runtime error in test suite'}
Suggested Fix: ${diagnosis?.suggestedFix || 'Align assertions with actual return values'}

TRACEBACK & ERROR LOG:
\`\`\`
${(failureLog || '').slice(-1200)}
\`\`\`

REPAIR INSTRUCTIONS:
- Repair the test suite so all tests pass cleanly against the TRUE behavior of ${moduleName}.
- The target module MUST be imported directly: 'from ${moduleName} import *' or 'import ${moduleName}'.
- Do not hallucinate package prefixes.
- Return ONLY the complete, corrected Python test code. No explanations.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let repaired = response.text || '';
      repaired = repaired.replace(/^```(?:python)?/i, '').replace(/```$/i, '').trim();
      const hallucinationRegex = new RegExp(`from\\s+(?:src|app|tests?)\\.${moduleName}\\s+import`, 'gi');
      repaired = repaired.replace(hallucinationRegex, `from ${moduleName} import`);

      return res.json({ repairedCode: repaired, provider: 'gemini-3.8-flash' });
    } catch (err) {
      console.error('Gemini repair failed:', err);
    }
  }

  // Fallback to FakeProvider repair
  const pyProcess = spawn('python3', [
    '-c',
    `
import sys, json, os
sys.path.insert(0, os.path.abspath("."))
from engine.registry import ProviderRegistry

payload = json.loads(sys.stdin.read())
provider = ProviderRegistry.get(payload.get("providerId", "fake")) or ProviderRegistry.get("fake")
repaired = provider.repair_tests(
    source_code=payload.get("sourceCode", ""),
    module_name=payload.get("moduleName", "target"),
    failed_test_code=payload.get("failedTestCode", ""),
    failure_log=payload.get("failureLog", ""),
    diagnosis_summary=payload.get("diagnosis", {}).get("summary", ""),
    suggested_fix=payload.get("diagnosis", {}).get("suggestedFix", "")
)
print(json.dumps({"repairedCode": repaired, "provider": provider.display_name}))
`
  ]);

  let stdout = '';
  let stderr = '';
  pyProcess.stdout.on('data', chunk => stdout += chunk);
  pyProcess.stderr.on('data', chunk => stderr += chunk);

  pyProcess.stdin.write(JSON.stringify({
    sourceCode,
    moduleName,
    failedTestCode,
    failureLog,
    diagnosis,
    providerId
  }));
  pyProcess.stdin.end();

  pyProcess.on('close', () => {
    try {
      res.json(JSON.parse(stdout));
    } catch (e) {
      res.status(500).json({ error: 'Repair execution error', details: stderr || stdout });
    }
  });
});

// 6. Execute Full Pipeline (CLI / Orchestrator integration)
app.post('/api/pipeline/run', (req, res) => {
  const {
    sourceCode,
    filename = 'calculator.py',
    providerId = 'fake',
    testCodeOverride = null
  } = req.body;

  // Write temporary target file to scratch dir to avoid mutating sample source files
  const scratchDir = path.join(__dirname, '.testcraft', 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const safeFilename = path.basename(filename);
  const targetPath = path.join(scratchDir, safeFilename);
  fs.writeFileSync(targetPath, sourceCode, 'utf-8');

  const pyArgs = [
    'engine/cli.py',
    'run',
    targetPath,
    '--provider',
    providerId,
    '--json'
  ];

  const pyProcess = spawn('python3', pyArgs, {
    cwd: __dirname,
    env: {
      ...process.env,
      PYTHONPATH: `${scratchDir}:${__dirname}:${process.env.PYTHONPATH || ''}`,
    }
  });

  let stdout = '';
  let stderr = '';

  pyProcess.stdout.on('data', chunk => stdout += chunk);
  pyProcess.stderr.on('data', chunk => stderr += chunk);

  pyProcess.on('close', exitCode => {
    try {
      const record = JSON.parse(stdout);
      res.json({ success: true, record, exitCode });
    } catch (e) {
      res.status(500).json({
        success: false,
        error: 'Engine execution produced non-JSON output',
        stdout,
        stderr,
        exitCode
      });
    }
  });
});

// 7. Get Past Runs from RunStore
app.get('/api/runs', (req, res) => {
  const pyProcess = spawn('python3', [
    '-c',
    `
import sys, json, os
sys.path.insert(0, os.path.abspath("."))
from engine.store.run_store import RunStore
store = RunStore()
print(json.dumps(store.list_runs(limit=30)))
`
  ]);

  let stdout = '';
  pyProcess.stdout.on('data', chunk => stdout += chunk);
  pyProcess.on('close', () => {
    try {
      res.json({ runs: JSON.parse(stdout) });
    } catch (e) {
      res.json({ runs: [] });
    }
  });
});

// 8. Get Specific Run by ID
app.get('/api/runs/:id', (req, res) => {
  const runId = req.params.id;
  const pyProcess = spawn('python3', [
    '-c',
    `
import sys, json, os
sys.path.insert(0, os.path.abspath("."))
from engine.store.run_store import RunStore
store = RunStore()
run = store.get_run("${runId}")
print(json.dumps(run if run else {}))
`
  ]);

  let stdout = '';
  pyProcess.stdout.on('data', chunk => stdout += chunk);
  pyProcess.on('close', () => {
    try {
      const data = JSON.parse(stdout);
      if (Object.keys(data).length === 0) {
        return res.status(404).json({ error: 'Run not found' });
      }
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read run record' });
    }
  });
});

// ---------------- Dev Server & Static Setup ----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`TestCraft Engine Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
