import React, { useState, useEffect, useRef } from 'react';
import { Network, LayoutDashboard, FolderGit2, Plus, Terminal, ChevronDown, Check, Sun, Moon } from 'lucide-react';
import { getRepos } from '../services/api';

export const Header = ({
  currentRepo,
  activeView,
  setActiveView,
  onNewAnalysis,
  onSelectRepo,
  isDark,
  onToggleTheme,
}) => {
  const [repoList, setRepoList] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    getRepos()
      .then(res => {
        if (res.success) setRepoList(res.data);
      })
      .catch(() => {});
  }, [currentRepo]);

  // Collapse dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <header className="h-14 sm:h-16 border-b-2 border-black bg-white dark:bg-[#161822] text-black dark:text-white px-3 sm:px-5 flex items-center justify-between z-30 shrink-0 select-none shadow-[0_2px_0_0_#000] transition-colors duration-200">
      {/* Left: Brand & Responsive Repo Selector */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        
        <div 
          onClick={onNewAnalysis}
          className="flex items-center gap-1.5 sm:gap-2 font-mono font-black text-black dark:text-zinc-100 text-xs sm:text-sm tracking-tight cursor-pointer hover:opacity-90 transition-opacity shrink-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#ffea00] border-2 border-black flex items-center justify-center text-black font-black shadow-[2px_2px_0px_0px_#000]">
            
            <Terminal className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className=" xs:inline">RepoMind</span>
        </div>

        {/* Repo Dropdown */}
        {currentRepo && (
          <div ref={dropdownRef} className="relative border-l-2 border-black pl-2 sm:pl-3 min-w-0">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-[#f0ece1] dark:bg-[#202332] hover:bg-[#e4dfd2] dark:hover:bg-[#282c3f] border-2 border-black text-xs font-mono font-bold text-black dark:text-zinc-100 transition-all neo-btn"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-[#ff007f] dark:text-[#00f0ff] shrink-0" />
              <span className="truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[180px] md:max-w-[240px]">
                {currentRepo.name}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-600 dark:text-zinc-400 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-sm bg-white dark:bg-[#161822] border-2 border-black shadow-[5px_5px_0px_0px_#000] py-1 z-50 font-mono">
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black dark:text-[#ffea00] bg-[#ffea00]/30 dark:bg-transparent border-b-2 border-black flex items-center justify-between">
                  <span>Repositories</span>
                  <span className="text-zinc-600 dark:text-zinc-400 font-normal">{repoList.length} total</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y-2 divide-black/10 dark:divide-black/40">
                  {repoList.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onSelectRepo(r.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs font-bold hover:bg-[#ffea00] hover:text-black flex items-center justify-between transition-colors ${
                        r.id === currentRepo.id 
                          ? 'bg-[#ffea00] text-black font-black' 
                          : 'text-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      <span className="truncate pr-2">{r.name}</span>
                      {r.id === currentRepo.id && <Check className="w-3.5 h-3.5 text-black shrink-0 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center: View Switcher (Responsive for all screen sizes) */}
      {currentRepo && (
        <div className="flex items-center p-0.5 bg-[#f0ece1] dark:bg-[#0f1118] border-2 border-black shadow-[2px_2px_0px_0px_#000] font-mono text-xs mx-1">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 font-black transition-all ${
              activeView === 'dashboard'
                ? 'bg-[#00f0ff] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
            }`}
            title="Overview Dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </button>
          <button
            onClick={() => setActiveView('graph')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 font-black transition-all ${
              activeView === 'graph'
                ? 'bg-[#ffea00] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
            }`}
            title="Horizontal Module Dependency Graph"
          >
            <Network className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Graph</span>
          </button>
        </div>
      )}

      {/* Right: Theme Toggle & Ingest CTA */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 border-2 border-black font-mono font-black text-xs transition-all neo-btn cursor-pointer ${
            isDark 
              ? 'bg-[#ffea00] text-black hover:bg-[#fff24d]' 
              : 'bg-[#161822] text-[#ffea00] hover:bg-[#202332]'
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden md:inline ml-1.5 text-[11px]">LIGHT</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden md:inline ml-1.5 text-[11px]">DARK</span>
            </>
          )}
        </button>

        {currentRepo && (
          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#ff007f] hover:bg-[#ff1a8c] text-white text-xs font-mono font-bold border-2 border-black neo-btn"
            title="Analyze another repository or upload zip"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Ingest</span>
          </button>
        )}
      </div>
    </header>
  );
};

