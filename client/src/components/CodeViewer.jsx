import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

export const CodeViewer = ({ code, language, filePath }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = (code || '').split('\n');

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2 text-slate-300">
          <Code className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">{filePath}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
            {language}
          </span>
          <span className="text-slate-500">• {lines.length} lines</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                <td className="w-10 pr-4 text-right text-slate-600 select-none font-mono text-[11px] align-top">
                  {idx + 1}
                </td>
                <td className="text-slate-300 whitespace-pre font-mono text-[12px] break-all">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
