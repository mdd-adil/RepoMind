import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import { CustomModuleNode } from './CustomModuleNode';
import { Search, Filter, Layers, RefreshCw, X, Eye } from 'lucide-react';

const nodeTypes = {
  moduleNode: CustomModuleNode,
};

const ARCH_TIERS = [
  { col: 0, label: '01 / ROUTING & ENTRY', desc: 'Routes, pages, endpoints' },
  { col: 1, label: '02 / CONTROLLERS', desc: 'Request handlers, middleware' },
  { col: 2, label: '03 / SERVICES & DOMAIN', desc: 'Business logic, components' },
  { col: 3, label: '04 / DATA & PERSISTENCE', desc: 'Models, schemas, databases' },
  { col: 4, label: '05 / UTILS & CONFIG', desc: 'Libraries, helpers, env' },
];

export const GraphView = ({ graphData, selectedModuleId, onSelectModule }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLayers, setActiveLayers] = useState(new Set());
  const [domainFilter, setDomainFilter] = useState('all'); // 'all' | 'frontend' | 'backend'

  // Extract all unique layers
  const availableLayers = useMemo(() => {
    if (!graphData?.nodes) return [];
    const set = new Set();
    graphData.nodes.forEach(n => {
      if (n.data?.layer) set.add(n.data.layer);
    });
    return Array.from(set).sort();
  }, [graphData]);

  // Synchronize active layers when graphData updates
  useEffect(() => {
    if (availableLayers.length > 0) {
      setActiveLayers(new Set(availableLayers));
    }
  }, [availableLayers]);

  // Update nodes & edges for React Flow
  useEffect(() => {
    if (!graphData || !graphData.nodes) return;

    // Filter nodes by active layers, search query & domain filter
    const filteredNodes = graphData.nodes
      .filter(node => {
        const matchesLayer = activeLayers.size === 0 || activeLayers.has(node.data?.layer);
        const matchesDomain = domainFilter === 'all' || node.data?.domain === domainFilter;
        const matchesSearch = !searchQuery || 
          node.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.data?.path?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesLayer && matchesDomain && matchesSearch;
      })
      .map(node => ({
        ...node,
        selected: String(node.id) === String(selectedModuleId),
      }));

    const visibleNodeIds = new Set(filteredNodes.map(n => String(n.id)));

    // Highlight and color edges by frontend / backend / fullstack bridge domain
    const formattedEdges = (graphData.edges || [])
      .filter(edge => visibleNodeIds.has(String(edge.source)) && visibleNodeIds.has(String(edge.target)))
      .map(edge => {
        const isOutbound = selectedModuleId && String(edge.source) === String(selectedModuleId);
        const isInbound = selectedModuleId && String(edge.target) === String(selectedModuleId);
        const isConnected = isOutbound || isInbound;
        const isDimmed = selectedModuleId && !isConnected;

        // Domain-specific edge coloring
        const domain = edge.data?.domain || 'backend';
        let baseColor = '#10b981'; // backend emerald
        if (domain === 'frontend') {
          baseColor = '#c084fc'; // frontend violet/purple
        } else if (domain === 'bridge') {
          baseColor = '#fbbf24'; // fullstack API bridge amber
        }

        const strokeColor = selectedModuleId
          ? (isOutbound ? '#38bdf8' : isInbound ? '#34d399' : '#1e2230')
          : baseColor;

        return {
          ...edge,
          animated: isConnected || domain === 'bridge',
          className: (isConnected || domain === 'bridge') ? 'animated-edge' : '',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: isConnected ? 16 : 13,
            height: isConnected ? 16 : 13,
            color: strokeColor,
          },
          style: {
            stroke: strokeColor,
            strokeWidth: isConnected ? 2.8 : (domain === 'bridge' ? 2.2 : 1.6),
            opacity: isDimmed ? 0.12 : 0.9,
          },
        };
      });

    setNodes(filteredNodes);
    setEdges(formattedEdges);
  }, [graphData, selectedModuleId, searchQuery, activeLayers, domainFilter, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    onSelectModule(node.id);
  }, [onSelectModule]);

  const toggleLayer = (layer) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setActiveLayers(new Set(availableLayers));
    setSearchQuery('');
  };

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-[#0b0c10] text-zinc-500 p-8">
        <div className="w-10 h-10 rounded-lg bg-[#141620] border border-[#232736] flex items-center justify-center mb-3 text-zinc-400">
          <Layers className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-zinc-300 mb-1">No module graph loaded</p>
        <p className="text-xs text-zinc-500">Provide a GitHub repo URL or drop a .zip codebase archive above to visualize.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#0b0c10] overflow-hidden flex-1 select-none">
      {/* Top Filter and Controls Bar (Responsive Neo-Brutalism) */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-[#161822] text-black dark:text-white border-2 border-black shadow-[4px_4px_0px_0px_#000] max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100%-360px)] font-mono transition-colors duration-200">
        {/* Search Input */}
        <div className="relative flex items-center w-full sm:w-auto min-w-[180px] sm:min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f6f3eb] dark:bg-[#0d0f14] border-2 border-black pl-8 pr-7 py-1 text-xs text-black dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-black font-mono font-bold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Domain Filter: Frontend / Backend / All */}
        <div className="flex items-center bg-[#f6f3eb] dark:bg-[#0d0f14] border-2 border-black p-0.5">
          <button
            onClick={() => setDomainFilter('all')}
            className={`px-2 py-0.5 text-[10px] font-black uppercase transition-colors ${
              domainFilter === 'all'
                ? 'bg-[#ffea00] text-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setDomainFilter('frontend')}
            className={`px-2 py-0.5 text-[10px] font-black uppercase transition-colors ${
              domainFilter === 'frontend'
                ? 'bg-[#ff007f] text-white shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            FE ONLY
          </button>
          <button
            onClick={() => setDomainFilter('backend')}
            className={`px-2 py-0.5 text-[10px] font-black uppercase transition-colors ${
              domainFilter === 'backend'
                ? 'bg-[#00ff66] text-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            BE ONLY
          </button>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
          {availableLayers.map(layer => {
            const isActive = activeLayers.has(layer);
            return (
              <button
                key={layer}
                onClick={() => toggleLayer(layer)}
                className={`text-[10px] font-black uppercase px-2 py-0.5 border border-black transition-all ${
                  isActive
                    ? 'bg-[#00f0ff] text-black shadow-[1px_1px_0px_0px_#000]'
                    : 'bg-[#f0ece1] dark:bg-[#202332] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {layer}
              </button>
            );
          })}

          <button
            onClick={resetFilters}
            className="p-1 bg-[#f0ece1] dark:bg-[#202332] border border-black text-black dark:text-zinc-300 hover:bg-[#ffea00] hover:text-black transition-colors shrink-0"
            title="Reset active filters"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Swimlane Column Headers Overlay (Horizontal Lineup) */}
      <div className="absolute top-20 left-0 right-0 z-0 pointer-events-none overflow-x-auto overflow-y-hidden pl-[80px]">
        <div className="flex gap-[100px] w-max">
          {ARCH_TIERS.map(tier => (
            <div key={tier.col} className="w-[320px] border-b-2 border-black/80 pb-2">
              <div className="text-[11px] font-mono font-black uppercase tracking-wider text-black dark:text-[#ffea00] bg-[#ffea00] dark:bg-black/80 inline-block px-2 py-0.5 border border-black shadow-[2px_2px_0px_0px_#000]">
                {tier.label}
              </div>
              <div className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 mt-0.5">
                {tier.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Graph Legend & Status Footer (Neo-Brutalism HUD) */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 p-2 sm:p-2.5 bg-white dark:bg-[#161822] text-black dark:text-zinc-300 border-2 border-black shadow-[4px_4px_0px_0px_#000] text-[10px] sm:text-[11px] font-mono font-bold flex flex-wrap items-center gap-2 sm:gap-3.5 transition-colors duration-200">
        <div className="flex items-center gap-1.5 text-black dark:text-[#ffea00]">
          <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>EDGES:</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 bg-[#c084fc] border border-black"></span>
          <span>Frontend</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 bg-[#00ff66] border border-black"></span>
          <span>Backend</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 bg-[#fbbf24] border border-black"></span>
          <span>Full-Stack Bridge</span>
        </div>
        <div className="text-zinc-500 dark:text-zinc-400 hidden xs:inline sm:border-l-2 sm:border-black sm:pl-2">
          {nodes.length} / {graphData.nodes.length} nodes
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.08}
          maxZoom={1.8}
        >
          <Background color="#161922" gap={30} size={1} />
          <Controls position="top-right" />
          <MiniMap
            nodeColor={(node) => {
              switch (node.data?.layer) {
                case 'route': return '#10b981';
                case 'controller': return '#f59e0b';
                case 'service': return '#38bdf8';
                case 'component': return '#8b5cf6';
                case 'model': return '#ec4899';
                case 'util': return '#14b8a6';
                default: return '#64748b';
              }
            }}
            maskColor="rgba(11, 12, 16, 0.75)"
            position="bottom-right"
          />
        </ReactFlow>
      </div>
    </div>
  );
};
