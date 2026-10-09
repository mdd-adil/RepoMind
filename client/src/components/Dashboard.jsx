import React from 'react';
import { 
  GitBranch, 
  Star, 
  FileCode, 
  Network, 
  Layers, 
  Activity, 
  Code2,
  Terminal,
  ArrowRight
} from 'lucide-react';

export const Dashboard = ({ repo, onOpenGraph, onSelectModule }) => {
  if (!repo) return null;

  const metrics = repo.metrics || {};
  const hubs = metrics.topHubs || [];
  const layerBreakdown = metrics.layerBreakdown || {};

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#f6f3eb] dark:bg-[#0b0c10] text-black dark:text-zinc-100 select-none font-mono transition-colors duration-200">
      {/* Top Banner / Repo Info */}
      <div className="bg-white dark:bg-[#161822] border-2 border-black p-5 sm:p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-5 transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-2">
            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 bg-[#00f0ff] text-black border-2 border-black shadow-[1px_1px_0px_0px_#000]">
              {repo.primary_language || 'Polyglot'}
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-zinc-900 dark:text-zinc-300 bg-[#f0ece1] dark:bg-[#0d0f14] px-2 py-0.5 border border-black">
              <Star className="w-3.5 h-3.5 text-amber-500 dark:text-[#ffea00] fill-amber-500 dark:fill-[#ffea00]" />
              <span>{repo.stars?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-zinc-900 dark:text-zinc-300 bg-[#f0ece1] dark:bg-[#0d0f14] px-2 py-0.5 border border-black">
              <GitBranch className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>{repo.default_branch || 'main'}</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white mb-1 tracking-tight">
            {repo.owner}/{repo.name}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-400 max-w-2xl font-sans leading-relaxed">
            {repo.description || 'No description provided.'}
          </p>
        </div>

        <button
          onClick={onOpenGraph}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ffea00] hover:bg-[#fff033] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all shrink-0 self-start md:self-auto neo-btn cursor-pointer"
        >
          <Network className="w-4 h-4 stroke-[2.5]" />
          <span>Launch Module Graph</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Metric Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#161822] p-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-between transition-colors">
          <div>
            <div className="text-[11px] font-black uppercase text-zinc-600 dark:text-zinc-400 mb-1">Modules</div>
            <div className="text-2xl font-black text-black dark:text-white">{metrics.totalModules || 0}</div>
          </div>
          <div className="p-3 bg-[#00f0ff] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            <FileCode className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#161822] p-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-between transition-colors">
          <div>
            <div className="text-[11px] font-black uppercase text-zinc-600 dark:text-zinc-400 mb-1">Graph Links</div>
            <div className="text-2xl font-black text-black dark:text-white">{metrics.totalDependencies || 0}</div>
          </div>
          <div className="p-3 bg-[#00ff66] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            <Network className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#161822] p-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-between transition-colors">
          <div>
            <div className="text-[11px] font-black uppercase text-zinc-600 dark:text-zinc-400 mb-1">Non-Empty LOC</div>
            <div className="text-2xl font-black text-black dark:text-white">{metrics.totalLoc?.toLocaleString() || 0}</div>
          </div>
          <div className="p-3 bg-[#ffea00] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            <Code2 className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#161822] p-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-between transition-colors">
          <div>
            <div className="text-[11px] font-black uppercase text-zinc-600 dark:text-zinc-400 mb-1">Avg Module Scale</div>
            <div className="text-2xl font-black text-black dark:text-white">{metrics.averageLoc || 0} <span className="text-xs text-zinc-600 dark:text-zinc-400 font-normal">loc</span></div>
          </div>
          <div className="p-3 bg-[#ff007f] text-white border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Main Grid: Architecture Overview & Layers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Architecture Overview */}
        <div className="lg:col-span-2 bg-white dark:bg-[#161822] border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000] space-y-3 transition-colors">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-900 dark:text-[#ffea00]">
            <Terminal className="w-4 h-4 stroke-[2.5]" />
            Repository Architecture Breakdown
          </div>
          <div className="text-xs sm:text-sm text-zinc-900 dark:text-zinc-200 leading-relaxed font-sans bg-[#faf8f3] dark:bg-[#0d0f14] p-4 border-2 border-black shadow-[2px_2px_0px_0px_#000] whitespace-pre-line font-medium">
            {repo.architecture_overview || 'Analyzing architectural profile...'}
          </div>
        </div>

        {/* Layer Breakdown & Hubs */}
        <div className="space-y-4">
          {/* Architectural Layers */}
          <div className="bg-white dark:bg-[#161822] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] space-y-3 transition-colors">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-800 dark:text-[#00f0ff]">
              <Layers className="w-4 h-4 stroke-[2.5]" />
              Architectural Layers
            </div>
            <div className="space-y-2.5">
              {Object.entries(layerBreakdown).map(([layer, count]) => {
                const pct = Math.round((count / (metrics.totalModules || 1)) * 100);
                return (
                  <div key={layer} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-300">
                      <span className="uppercase">{layer}</span>
                      <span className="text-zinc-600 dark:text-zinc-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#f0ece1] dark:bg-[#0d0f14] border border-black overflow-hidden">
                      <div
                        className="h-full bg-[#00f0ff]"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Central Hubs */}
          {hubs.length > 0 && (
            <div className="bg-white dark:bg-[#161822] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] space-y-2.5 transition-colors">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-[#00ff66]">
                Central Hub Modules
              </div>
              <div className="space-y-2">
                {hubs.map((hub, idx) => (
                  <div
                    key={idx}
                    onClick={() => hub.id && onSelectModule(hub.id)}
                    className="p-2.5 bg-[#f6f3eb] dark:bg-[#202332] hover:bg-[#ffea00] hover:text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] text-xs flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <span className="text-zinc-900 dark:text-zinc-200 group-hover:text-black truncate max-w-[190px] font-bold" title={hub.path}>
                      {hub.path}
                    </span>
                    <span className="text-[10px] font-black text-black bg-[#00f0ff] px-1.5 py-0.5 border border-black">
                      {hub.inDegree + hub.outDegree} links
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
