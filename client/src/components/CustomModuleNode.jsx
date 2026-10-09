import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Globe, 
  Cpu, 
  Server, 
  Database, 
  Layout, 
  Zap, 
  Boxes, 
  Shield, 
  Settings, 
  Code2, 
  ArrowDownRight, 
  ArrowUpRight 
} from 'lucide-react';

const layerNeo = {
  route: {
    icon: Globe,
    headerBg: 'bg-[#00ff66]',
    text: 'text-black',
    tagBg: 'bg-[#00ff66] text-black',
    domainFe: 'bg-[#ff007f] text-white',
    domainBe: 'bg-black text-[#00ff66]',
  },
  controller: {
    icon: Cpu,
    headerBg: 'bg-[#ffea00]',
    text: 'text-black',
    tagBg: 'bg-[#ffea00] text-black',
    domainFe: 'bg-[#ff007f] text-white',
    domainBe: 'bg-black text-[#ffea00]',
  },
  middleware: {
    icon: Shield,
    headerBg: 'bg-[#ffea00]',
    text: 'text-black',
    tagBg: 'bg-[#ffea00] text-black',
    domainFe: 'bg-[#ff007f] text-white',
    domainBe: 'bg-black text-[#ffea00]',
  },
  service: {
    icon: Server,
    headerBg: 'bg-[#00f0ff]',
    text: 'text-black',
    tagBg: 'bg-[#00f0ff] text-black',
    domainFe: 'bg-[#ff007f] text-white',
    domainBe: 'bg-black text-[#00f0ff]',
  },
  model: {
    icon: Database,
    headerBg: 'bg-[#ff007f]',
    text: 'text-white',
    tagBg: 'bg-[#ff007f] text-white',
    domainFe: 'bg-white text-black',
    domainBe: 'bg-black text-[#ff007f]',
  },
  database: {
    icon: Database,
    headerBg: 'bg-[#b55fe6]',
    text: 'text-white',
    tagBg: 'bg-[#b55fe6] text-white',
    domainFe: 'bg-white text-black',
    domainBe: 'bg-black text-[#b55fe6]',
  },
  component: {
    icon: Layout,
    headerBg: 'bg-[#b55fe6]',
    text: 'text-white',
    tagBg: 'bg-[#b55fe6] text-white',
    domainFe: 'bg-[#ffea00] text-black',
    domainBe: 'bg-black text-white',
  },
  hook: {
    icon: Zap,
    headerBg: 'bg-[#ff6b00]',
    text: 'text-white',
    tagBg: 'bg-[#ff6b00] text-white',
    domainFe: 'bg-[#ffea00] text-black',
    domainBe: 'bg-black text-white',
  },
  util: {
    icon: Boxes,
    headerBg: 'bg-[#00f0ff]',
    text: 'text-black',
    tagBg: 'bg-[#00f0ff] text-black',
    domainFe: 'bg-[#ff007f] text-white',
    domainBe: 'bg-black text-white',
  },
  config: {
    icon: Settings,
    headerBg: 'bg-[#e2e8f0]',
    text: 'text-black',
    tagBg: 'bg-[#e2e8f0] text-black',
    domainFe: 'bg-[#ff007f] text-white',
    domainBe: 'bg-black text-white',
  },
  core: {
    icon: Code2,
    headerBg: 'bg-[#ffea00]',
    text: 'text-black',
    tagBg: 'bg-[#ffea00] text-black',
    domainFe: 'bg-[#ff007f] text-white',
    domainBe: 'bg-black text-white',
  },
  other: {
    icon: Code2,
    headerBg: 'bg-[#94a3b8]',
    text: 'text-black',
    tagBg: 'bg-[#94a3b8] text-black',
    domainFe: 'bg-[#ff007f] text-white',
    domainBe: 'bg-black text-white',
  },
};

export const CustomModuleNode = memo(({ data, selected }) => {
  const layer = data.layer || 'core';
  const cfg = layerNeo[layer] || layerNeo.other;
  const IconComponent = cfg.icon || Code2;

  return (
    <div
      className={`group relative w-[290px] sm:w-[320px] bg-white dark:bg-[#161822] text-black dark:text-white border-2 border-black transition-all duration-150 select-none ${
        selected
          ? 'shadow-[6px_6px_0px_0px_#ffea00] ring-2 ring-[#ffea00] -translate-x-0.5 -translate-y-0.5'
          : 'shadow-[5px_5px_0px_0px_#000000] hover:shadow-[7px_7px_0px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5'
      }`}
    >
      {/* Strict Horizontal Flow Connection Handles for Left-to-Right Lineup */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3.5 !h-3.5 !-left-2 !bg-[#ffea00] !border-2 !border-black !rounded-none shadow-[1px_1px_0px_0px_#000]" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3.5 !h-3.5 !-right-2 !bg-[#00f0ff] !border-2 !border-black !rounded-none shadow-[1px_1px_0px_0px_#000]" 
      />

      {/* Neo Header Strip with Layer Color & Domain Badges */}
      <div className={`px-3 py-1.5 border-b-2 border-black flex items-center justify-between ${cfg.headerBg} ${cfg.text}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-black uppercase tracking-wider">
            {layer}
          </span>
          {data.domain && (
            <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 border border-black uppercase ${
              data.domain === 'frontend' ? 'bg-[#ff007f] text-white' : 'bg-black text-white'
            }`}>
              {data.domain === 'frontend' ? 'FE' : data.domain === 'backend' ? 'BE' : 'SHARE'}
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-tight">
          .{data.file_type}
        </span>
      </div>

      {/* Body: Large Icon & Module Name in Horizontal Manner */}
      <div className="p-3 sm:p-3.5 flex items-start gap-3">
        {/* Large Neo-Brutalist Icon Box */}
        <div className="w-12 h-12 bg-[#f0ece1] dark:bg-[#202332] text-black dark:text-zinc-100 border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]">
          <IconComponent className="w-6 h-6 stroke-[2.5]" />
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-mono font-black text-black dark:text-zinc-100 truncate tracking-tight mb-0.5" title={data.label}>
            {data.label}
          </div>
          <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 truncate mb-2" title={data.path}>
            {data.path}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between pt-1.5 border-t-2 border-black/20 dark:border-black/60 text-[11px] font-mono font-bold">
            <span className="text-zinc-600 dark:text-zinc-400">{data.loc || 0} loc</span>
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-0.5 text-black dark:text-[#00ff66] bg-[#00ff66]/20 dark:bg-black/50 px-1 py-0.5 border border-black text-[10px] font-black"
                title={`${data.inDegree} callers`}
              >
                <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
                {data.inDegree} in
              </span>
              <span
                className="flex items-center gap-0.5 text-black dark:text-[#00f0ff] bg-[#00f0ff]/20 dark:bg-black/50 px-1 py-0.5 border border-black text-[10px] font-black"
                title={`${data.outDegree} imports`}
              >
                <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                {data.outDegree} out
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
