import React, { useState, useRef } from 'react';
import { 
  GitBranch, 
  Upload, 
  Terminal, 
  ArrowRight, 
  Loader2, 
  FileArchive, 
  Zap, 
  AlertCircle 
} from 'lucide-react';
import { analyzeRepo, uploadRepoZip } from '../services/api';
import { PRESET_DATA } from '../data/presetData';

const SAMPLE_REPOS = [
  { name: 'expressjs/express', desc: 'Node.js web framework architecture' },
  { name: 'axios/axios', desc: 'HTTP client module & interceptor system' },
  { name: 'facebook/flux', desc: 'Dispatcher & unidirectional store flow' },
  { name: 'sindresorhus/ky', desc: 'Modern fetch wrapper & retry engine' },
];

// Pre-built interactive demo for instant 1-second preview
const BUILTIN_DEMO = {
  repo: {
    id: 999,
    name: 'cloud-commerce-core',
    owner: 'enterprise-org',
    description: 'Microservice-ready modular architecture showcasing controllers, services, database models, and utilities.',
    stars: 1420,
    default_branch: 'main',
    primary_language: 'TypeScript',
    architecture_overview: `### Architectural Pattern: Layered Clean Architecture\n\nThe codebase is organized into strict separation of concerns across 5 architectural tiers:\n- **Routing Layer**: Exposes REST endpoints and binds HTTP parameters.\n- **Controller Layer**: Decouples incoming requests and orchestrates service invocation.\n- **Service Tier**: Encapsulates core business transactions and validation.\n- **Data Layer**: Manages PostgreSQL queries and schema entities.\n- **Utility Tier**: Reusable cryptography and telemetry tools.`,
    metrics: {
      totalModules: 6,
      totalDependencies: 7,
      totalLoc: 850,
      averageLoc: 141,
      layerBreakdown: { route: 1, controller: 1, service: 2, model: 1, util: 1 },
      topHubs: [
        { path: 'src/services/orderService.ts', inDegree: 2, outDegree: 2 },
        { path: 'src/models/orderModel.ts', inDegree: 2, outDegree: 0 },
      ],
    },
  },
  graph: {
    nodes: [
      {
        id: '100',
        type: 'moduleNode',
        position: { x: 80, y: 120 },
        data: {
          id: 100,
          label: 'CheckoutPage.tsx',
          path: 'src/client/pages/CheckoutPage.tsx',
          layer: 'component',
          domain: 'frontend',
          file_type: 'tsx',
          loc: 112,
          summary: 'Frontend React checkout view rendering payment fields, cart items, and order submission.',
          inDegree: 0,
          outDegree: 1,
        },
      },
      {
        id: '101',
        type: 'moduleNode',
        position: { x: 80, y: 300 },
        data: {
          id: 101,
          label: 'useCheckout.ts',
          path: 'src/client/hooks/useCheckout.ts',
          layer: 'hook',
          domain: 'frontend',
          file_type: 'ts',
          loc: 64,
          summary: 'Custom reactive hook dispatching checkout API requests and managing pending state.',
          inDegree: 1,
          outDegree: 1,
        },
      },
      {
        id: '102',
        type: 'moduleNode',
        position: { x: 500, y: 120 },
        data: {
          id: 102,
          label: 'orderRouter.ts',
          path: 'src/server/routes/orderRouter.ts',
          layer: 'route',
          domain: 'backend',
          file_type: 'ts',
          loc: 48,
          summary: 'Express API route defining POST /orders and GET /orders/:id endpoints.',
          inDegree: 1,
          outDegree: 1,
        },
      },
      {
        id: '103',
        type: 'moduleNode',
        position: { x: 920, y: 120 },
        data: {
          id: 103,
          label: 'orderController.ts',
          path: 'src/server/controllers/orderController.ts',
          layer: 'controller',
          domain: 'backend',
          file_type: 'ts',
          loc: 95,
          summary: 'Validates request payload, formats HTTP response, and coordinates OrderService.',
          inDegree: 1,
          outDegree: 1,
        },
      },
      {
        id: '104',
        type: 'moduleNode',
        position: { x: 1340, y: 120 },
        data: {
          id: 104,
          label: 'orderService.ts',
          path: 'src/server/services/orderService.ts',
          layer: 'service',
          domain: 'backend',
          file_type: 'ts',
          loc: 185,
          summary: 'Executes core order business rules, inventories verification, and payment transactions.',
          inDegree: 1,
          outDegree: 1,
        },
      },
      {
        id: '105',
        type: 'moduleNode',
        position: { x: 1760, y: 120 },
        data: {
          id: 105,
          label: 'orderModel.ts',
          path: 'src/server/models/orderModel.ts',
          layer: 'model',
          domain: 'backend',
          file_type: 'ts',
          loc: 110,
          summary: 'PostgreSQL entity persistence layer executing SQL queries for customer orders.',
          inDegree: 1,
          outDegree: 0,
        },
      },
    ],
    edges: [
      // Frontend -> Frontend (Purple / Violet)
      {
        id: 'e100-101',
        source: '100',
        target: '101',
        type: 'smoothstep',
        data: { domain: 'frontend', color: '#c084fc' },
      },
      // Frontend -> Backend Fullstack API Bridge (Amber / Gold)
      {
        id: 'e101-102',
        source: '101',
        target: '102',
        type: 'smoothstep',
        data: { domain: 'bridge', color: '#fbbf24' },
      },
      // Backend -> Backend (Emerald Green)
      {
        id: 'e102-103',
        source: '102',
        target: '103',
        type: 'smoothstep',
        data: { domain: 'backend', color: '#10b981' },
      },
      {
        id: 'e103-104',
        source: '103',
        target: '104',
        type: 'smoothstep',
        data: { domain: 'backend', color: '#10b981' },
      },
      {
        id: 'e104-105',
        source: '104',
        target: '105',
        type: 'smoothstep',
        data: { domain: 'backend', color: '#10b981' },
      },
    ],
  },
};

export const RepoInput = ({ onAnalysisComplete }) => {
  const [activeMode, setActiveMode] = useState('github'); // 'github' | 'upload'
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleAnalyzeGithub = async (urlToUse) => {
    const targetUrl = (urlToUse || repoUrl).trim();
    if (!targetUrl) {
      setError('400: Repository URL is required');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStage('Loading repository architecture...');

    // Curated presets are guaranteed 100% accessible instantly
    if (PRESET_DATA[targetUrl]) {
      setTimeout(() => {
        onAnalysisComplete({
          data: PRESET_DATA[targetUrl].repo,
          graph: PRESET_DATA[targetUrl].graph,
        });
        setLoading(false);
      }, 350);
      return;
    }

    try {
      setTimeout(() => setLoadingStage('Downloading & unpacking source archive...'), 1500);
      setTimeout(() => setLoadingStage('Traversing AST & mapping imports...'), 3500);

      const res = await analyzeRepo(targetUrl);
      if (res.success) {
        onAnalysisComplete({
          data: res.data,
          graph: res.graph,
        });
      } else {
        const code = res.statusCode || 500;
        setError(`${code}: ${res.error || 'Analysis failed'}`);
      }
    } catch (err) {
      const code = err.response?.data?.statusCode || err.response?.status;
      const cleanError = err.response?.data?.error || (
        code === 404 ? 'Repository not found' :
        code === 400 ? 'Invalid repository URL' :
        code === 403 ? 'Rate limit exceeded' :
        code === 422 ? 'No code files found in repository' :
        code ? `Server error` : 'Connection refused'
      );
      setError(code ? `${code}: ${cleanError}` : cleanError);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      setError('400: Invalid file format');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStage('Unpacking zip archive...');

    try {
      setTimeout(() => setLoadingStage('Parsing AST & categorizing architectural layers...'), 1500);
      const res = await uploadRepoZip(file);
      if (res.success) {
        onAnalysisComplete({
          data: res.data,
          graph: res.graph,
        });
      } else {
        const code = res.statusCode || 500;
        setError(`${code}: ${res.error || 'Upload failed'}`);
      }
    } catch (err) {
      const code = err.response?.data?.statusCode || err.response?.status;
      const cleanError = err.response?.data?.error || (
        code === 422 ? 'No code files found' :
        code ? `Server error` : 'Upload failed'
      );
      setError(code ? `${code}: ${cleanError}` : cleanError);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleLoadDemo = () => {
    onAnalysisComplete({
      data: BUILTIN_DEMO.repo,
      graph: BUILTIN_DEMO.graph,
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto my-auto p-4 sm:p-6 space-y-6 select-none font-mono">
      {/* Brand & Subtitle */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffea00] border-2 border-black text-black text-xs font-black tracking-wider shadow-[3px_3px_0px_0px_#000]">
          <Terminal className="w-4 h-4 stroke-[2.5]" />
          <span>NEO-BRUTALIST CODE EXPLORER</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,0.15)] dark:drop-shadow-[2px_2px_0px_#000]">
          Map dependencies. Understand modules.
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto font-sans leading-relaxed font-medium">
          Inspect inter-module connections, explore architectural flow graphs, and analyze code mechanics in any repository.
        </p>
      </div>

      {/* Mode Segmented Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex bg-white dark:bg-[#161822] border-2 border-black p-1 shadow-[3px_3px_0px_0px_#000]">
          <button
            onClick={() => setActiveMode('github')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black transition-all ${
              activeMode === 'github'
                ? 'bg-[#00f0ff] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            GitHub URL
          </button>
          <button
            onClick={() => setActiveMode('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black transition-all ${
              activeMode === 'upload'
                ? 'bg-[#ff007f] text-white border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Zip
          </button>
        </div>

        <button
          onClick={handleLoadDemo}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ffea00] hover:bg-[#fff033] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0px_0px_#000] neo-btn"
          title="Instant 1-second preview of interactive graph & code explainer"
        >
          <Zap className="w-3.5 h-3.5 fill-black stroke-black" />
          <span>Quick Demo View</span>
        </button>
      </div>

      {/* Main Input Card */}
      <div className="bg-white dark:bg-[#161822] border-2 border-black p-5 sm:p-6 shadow-[6px_6px_0px_0px_#000] space-y-4">
        {activeMode === 'github' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="https://github.com/owner/repo or owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeGithub()}
                  disabled={loading}
                  className="w-full bg-[#f6f3eb] dark:bg-[#0d0f14] border-2 border-black px-3.5 py-2.5 text-xs sm:text-sm text-zinc-950 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-black font-mono transition-colors disabled:opacity-50"
                />
              </div>
              <button
                onClick={() => handleAnalyzeGithub()}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#00ff66] hover:bg-[#33ff85] text-black text-xs sm:text-sm font-black border-2 border-black transition-all disabled:opacity-50 shrink-0 shadow-[3px_3px_0px_0px_#000] neo-btn cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze Codebase</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Samples */}
            <div className="pt-4 border-t-2 border-black">
              <div className="text-[11px] font-black uppercase text-zinc-900 dark:text-[#ffea00] tracking-wider mb-2.5">
                Curated Presets (Instant):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_REPOS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setRepoUrl(preset.name);
                      handleAnalyzeGithub(preset.name);
                    }}
                    disabled={loading}
                    className="flex flex-col text-left p-2.5 bg-[#f6f3eb] dark:bg-[#202332] hover:bg-[#ffea00] hover:text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all group"
                  >
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-200 group-hover:text-black">{preset.name}</span>
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400 group-hover:text-black/80 truncate font-sans font-medium">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Zip Dropzone */
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-[#00ff66] bg-[#00ff66]/10'
                : 'border-black hover:border-[#ffea00] bg-[#f6f3eb] dark:bg-[#0d0f14]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-[#ffea00] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]">
                <FileArchive className="w-6 h-6 stroke-[2.5]" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-200">
                Drop your repository <span className="bg-[#ffea00] dark:bg-black px-1.5 py-0.5 border border-black dark:border-zinc-700 text-black dark:text-[#00f0ff]">.zip</span> here, or click to browse
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-sans font-medium">
                Automatically extracts code & builds graph in PostgreSQL
              </p>
            </div>
          </div>
        )}

        {/* Live Loading Progress Bar */}
        {loading && (
          <div className="p-3 bg-[#f6f3eb] dark:bg-[#202332] border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-black dark:text-[#ffea00] animate-spin shrink-0 stroke-[2.5]" />
            <div className="text-xs font-mono">
              <span className="text-black dark:text-[#ffea00] font-black uppercase">Processing: </span>
              <span className="text-zinc-900 dark:text-zinc-200">{loadingStage || 'Extracting AST...'}</span>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="p-3 bg-[#ff007f] text-white border-2 border-black shadow-[3px_3px_0px_0px_#000] text-xs flex items-center gap-2 font-mono font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
