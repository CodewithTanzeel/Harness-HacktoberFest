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

// ---------------- CLI Execution API ----------------

// 1. Direct CLI Command Execution Endpoint
app.post('/api/cli/exec', (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command string is required' });
  }

  const trimmed = command.trim();
  
  // Whitelist/Sanitize for safe CLI commands
  // Supported forms:
  // - testcraft ...
  // - ./testcraft ...
  // - python3 engine/cli.py ...
  // - python3 -m engine.cli ...
  let cmdArgs: string[] = [];
  
  if (trimmed.startsWith('validatekaro') || trimmed.startsWith('./validatekaro')) {
    const rawTokens = trimmed.replace(/^\.?\/?validatekaro(?:\.bat|\.ps1|\.cmd)?\s*/, '').trim();
    const subArgs = rawTokens.length > 0 ? rawTokens.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [] : [];
    cmdArgs = ['validatekaro', ...subArgs];
  } else if (trimmed.startsWith('testcraft') || trimmed.startsWith('./testcraft')) {
    const rawTokens = trimmed.replace(/^\.?\/?testcraft\s*/, '').trim();
    cmdArgs = rawTokens.length > 0 ? rawTokens.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [] : ['--help'];
  } else if (trimmed.startsWith('python3 engine/cli.py')) {
    const rawTokens = trimmed.replace(/^python3\s+engine\/cli\.py\s*/, '').trim();
    cmdArgs = rawTokens.length > 0 ? rawTokens.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [] : ['--help'];
  } else if (trimmed === 'help' || trimmed === '--help' || trimmed === '-h') {
    cmdArgs = ['--help'];
  } else {
    // Treat directly as testcraft subcommands
    cmdArgs = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || ['--help'];
  }

  // Strip enclosing quotes from arguments
  const cleanedArgs = cmdArgs.map(arg => {
    if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
      return arg.slice(1, -1);
    }
    return arg;
  });

  const pyProcess = spawn('python3', ['engine/cli.py', ...cleanedArgs], {
    cwd: __dirname,
    env: {
      ...process.env,
      PYTHONPATH: `.:${__dirname}:${process.env.PYTHONPATH || ''}`,
      PYTHONUNBUFFERED: '1',
    },
  });

  let stdout = '';
  let stderr = '';

  pyProcess.stdout.on('data', chunk => {
    stdout += chunk.toString();
  });

  pyProcess.stderr.on('data', chunk => {
    stderr += chunk.toString();
  });

  pyProcess.on('close', exitCode => {
    res.json({
      command: trimmed,
      stdout,
      stderr,
      exitCode: exitCode ?? 0,
    });
  });
});

// 2. Get CLI Info & Sample Targets
app.get('/api/cli/info', (req, res) => {
  const samplesDir = path.join(__dirname, 'samples');
  let samples: string[] = [];
  if (fs.existsSync(samplesDir)) {
    samples = fs.readdirSync(samplesDir).filter(f => f.endsWith('.py')).map(f => `samples/${f}`);
  }

  res.json({
    name: 'testcraft',
    version: '0.1.0',
    pythonVersion: 'Python 3.10.12',
    isolation: 'Subprocess with resolved PYTHONPATH',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    samples,
  });
});

// 3. Get README.md content
app.get('/api/readme', (req, res) => {
  const readmePath = path.join(__dirname, 'README.md');
  if (fs.existsSync(readmePath)) {
    const content = fs.readFileSync(readmePath, 'utf-8');
    res.json({ content });
  } else {
    res.status(404).json({ error: 'README.md not found' });
  }
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
    console.log(`TestCraft CLI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
