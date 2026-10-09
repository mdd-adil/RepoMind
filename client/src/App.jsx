import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RepoInput } from './components/RepoInput';
import { Dashboard } from './components/Dashboard';
import { GraphView } from './components/GraphView';
import { ModuleDetails } from './components/ModuleDetails';
import { getRepo, getGraph, getRepos } from './services/api';

export function App() {
  const [currentRepo, setCurrentRepo] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [activeView, setActiveView] = useState('graph'); // 'dashboard' | 'graph'
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('repolens_theme');
    return saved ? saved === 'dark' : true;
  });

  // Keep HTML document and body in sync with theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('repolens_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('repolens_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // Check if any repo was already analyzed on mount
  useEffect(() => {
    getRepos()
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          loadRepo(res.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadRepo = async (repoId) => {
    try {
      setLoadingGraph(true);
      const [repoRes, graphRes] = await Promise.all([
        getRepo(repoId),
        getGraph(repoId),
      ]);

      if (repoRes.success) setCurrentRepo(repoRes.data);
      if (graphRes.success) setGraphData(graphRes.data);
      setSelectedModuleId(null);
    } catch (err) {
      console.error('Failed to load repo data:', err);
    } finally {
      setLoadingGraph(false);
    }
  };

  const handleAnalysisComplete = ({ data, graph }) => {
    setCurrentRepo(data);
    setGraphData(graph);
    setSelectedModuleId(null);
    setActiveView('graph');
  };

  const handleSelectModule = (moduleId) => {
    setSelectedModuleId(moduleId);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f6f3eb] dark:bg-[#0b0c10] text-black dark:text-zinc-100 font-sans transition-colors duration-200">
      <Header
        currentRepo={currentRepo}
        activeView={activeView}
        setActiveView={setActiveView}
        onNewAnalysis={() => {
          setCurrentRepo(null);
          setGraphData(null);
          setSelectedModuleId(null);
        }}
        onSelectRepo={loadRepo}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {!currentRepo ? (
          <RepoInput onAnalysisComplete={handleAnalysisComplete} />
        ) : activeView === 'dashboard' ? (
          <Dashboard
            repo={currentRepo}
            onOpenGraph={() => setActiveView('graph')}
            onSelectModule={(id) => {
              setSelectedModuleId(id);
              setActiveView('graph');
            }}
          />
        ) : (
          <div className="flex-1 flex h-full w-full overflow-hidden relative">
            <GraphView
              graphData={graphData}
              selectedModuleId={selectedModuleId}
              onSelectModule={handleSelectModule}
              isDark={isDark}
            />

            {selectedModuleId && (
              <ModuleDetails
                moduleId={selectedModuleId}
                graphData={graphData}
                isDark={isDark}
                onClose={() => setSelectedModuleId(null)}
                onSelectModule={handleSelectModule}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
