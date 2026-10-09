import path from 'path';
import * as babelParser from '@babel/parser';
import _traverse from '@babel/traverse';

// Deal with ES module vs CommonJS default export for babel traverse
const traverse = _traverse.default || _traverse;

export function categorizeLayer(filePath) {
  const normalized = filePath.toLowerCase().replace(/\\/g, '/');
  if (normalized.includes('/controller') || normalized.includes('controller.')) return 'controller';
  if (normalized.includes('/service') || normalized.includes('service.')) return 'service';
  if (normalized.includes('/route') || normalized.includes('routes') || normalized.includes('/api/')) return 'route';
  if (normalized.includes('/component') || normalized.includes('/pages') || normalized.includes('/views') || normalized.includes('.tsx') || normalized.includes('.jsx')) return 'component';
  if (normalized.includes('/hook') || normalized.includes('use')) return 'hook';
  if (normalized.includes('/model') || normalized.includes('/schema') || normalized.includes('/entities')) return 'model';
  if (normalized.includes('/util') || normalized.includes('/helper') || normalized.includes('/lib/')) return 'util';
  if (normalized.includes('/middleware')) return 'middleware';
  if (normalized.includes('/config') || normalized.includes('.config.') || normalized.includes('/env')) return 'config';
  if (normalized.includes('/db') || normalized.includes('/database')) return 'database';
  return 'core';
}

export function detectDomain(filePath) {
  const normalized = filePath.toLowerCase().replace(/\\/g, '/');
  if (
    normalized.includes('/client') || 
    normalized.includes('/frontend') || 
    normalized.includes('/web') || 
    normalized.includes('/ui') || 
    normalized.includes('/components') || 
    normalized.includes('/pages') || 
    normalized.includes('/views') || 
    normalized.includes('/hooks') || 
    normalized.endsWith('.jsx') || 
    normalized.endsWith('.tsx') || 
    normalized.endsWith('.vue') || 
    normalized.endsWith('.svelte')
  ) {
    return 'frontend';
  }
  if (
    normalized.includes('/server') || 
    normalized.includes('/backend') || 
    normalized.includes('/api') || 
    normalized.includes('/controller') || 
    normalized.includes('/service') || 
    normalized.includes('/model') || 
    normalized.includes('/route') || 
    normalized.includes('/middleware') || 
    normalized.includes('/db') || 
    normalized.includes('/database')
  ) {
    return 'backend';
  }
  return 'shared';
}

export function parseJsTsModule(code, filePath) {
  const imports = [];
  const symbols = [];
  const exports = [];

  const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const isJsx = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');

  try {
    const ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: [
        isJsx ? 'jsx' : null,
        isTs ? 'typescript' : null,
        'classProperties',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'asyncGenerators',
        'objectRestSpread',
      ].filter(Boolean),
      errorRecovery: true,
    });

    traverse(ast, {
      ImportDeclaration({ node }) {
        const source = node.source.value;
        const specifiers = node.specifiers.map(spec => {
          if (spec.type === 'ImportDefaultSpecifier') return spec.local.name;
          if (spec.type === 'ImportSpecifier') return spec.imported.name;
          if (spec.type === 'ImportNamespaceSpecifier') return `* as ${spec.local.name}`;
          return '';
        }).filter(Boolean);

        imports.push({ source, specifiers });
      },

      CallExpression({ node }) {
        if (node.callee && node.callee.name === 'require' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (arg.type === 'StringLiteral') {
            imports.push({ source: arg.value, specifiers: ['require'] });
          }
        }
      },

      ExportNamedDeclaration({ node }) {
        if (node.declaration) {
          if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
            symbols.push({ type: 'function', name: node.declaration.id.name, exported: true });
            exports.push(node.declaration.id.name);
          } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
            symbols.push({ type: 'class', name: node.declaration.id.name, exported: true });
            exports.push(node.declaration.id.name);
          } else if (node.declaration.type === 'VariableDeclaration') {
            node.declaration.declarations.forEach(d => {
              if (d.id && d.id.name) {
                symbols.push({ type: 'variable', name: d.id.name, exported: true });
                exports.push(d.id.name);
              }
            });
          }
        }
        if (node.specifiers) {
          node.specifiers.forEach(s => {
            if (s.exported && s.exported.name) {
              exports.push(s.exported.name);
            }
          });
        }
      },

      ExportDefaultDeclaration({ node }) {
        let name = 'default';
        if (node.declaration.id && node.declaration.id.name) {
          name = node.declaration.id.name;
        } else if (node.declaration.name) {
          name = node.declaration.name;
        }
        symbols.push({ type: 'defaultExport', name, exported: true });
        exports.push(name);
      },

      FunctionDeclaration({ node }) {
        if (node.id && !symbols.some(s => s.name === node.id.name)) {
          symbols.push({ type: 'function', name: node.id.name, exported: false });
        }
      },

      ClassDeclaration({ node }) {
        if (node.id && !symbols.some(s => s.name === node.id.name)) {
          symbols.push({ type: 'class', name: node.id.name, exported: false });
        }
      },
    });
  } catch (err) {
    // Regex fallback
    return parseWithRegex(code, filePath);
  }

  return { imports, symbols, exports };
}

export function parsePythonModule(code) {
  const imports = [];
  const symbols = [];
  const exports = [];

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const fromMatch = trimmed.match(/^from\s+([.\w]+)\s+import\s+(.+)$/);
    if (fromMatch) {
      const source = fromMatch[1];
      const specifiers = fromMatch[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
      imports.push({ source, specifiers });
      continue;
    }

    const importMatch = trimmed.match(/^import\s+([.\w]+)/);
    if (importMatch) {
      imports.push({ source: importMatch[1], specifiers: [importMatch[1]] });
      continue;
    }

    const defMatch = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
    if (defMatch) {
      symbols.push({ type: 'function', name: defMatch[1], exported: !defMatch[1].startsWith('_') });
      if (!defMatch[1].startsWith('_')) exports.push(defMatch[1]);
      continue;
    }

    const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)/);
    if (classMatch) {
      symbols.push({ type: 'class', name: classMatch[1], exported: true });
      exports.push(classMatch[1]);
    }
  }

  return { imports, symbols, exports };
}

function parseWithRegex(code, filePath) {
  const imports = [];
  const symbols = [];
  const exports = [];

  const importRegex = /(?:import\s+(?:\{([^}]+)\}|\*\s+as\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+))?\s*(?:from\s*)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const source = match[4] || match[5];
    if (source) {
      const named = match[1] ? match[1].split(',').map(s => s.trim()) : [];
      const defaultImport = match[2] || match[3];
      const specifiers = [...named, ...(defaultImport ? [defaultImport] : [])];
      imports.push({ source, specifiers });
    }
  }

  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g;
  while ((match = funcRegex.exec(code)) !== null) {
    symbols.push({ type: 'function', name: match[1], exported: match[0].includes('export') });
  }

  const classRegex = /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g;
  while ((match = classRegex.exec(code)) !== null) {
    symbols.push({ type: 'class', name: match[1], exported: match[0].includes('export') });
  }

  return { imports, symbols, exports };
}

export function resolveDependency(sourcePath, importSource, fileMap) {
  if (!importSource.startsWith('.')) {
    // External package dependency (e.g. 'express', 'react', 'axios')
    return null;
  }

  const sourceDir = path.dirname(sourcePath).replace(/\\/g, '/');
  let targetRelative = path.join(sourceDir, importSource).replace(/\\/g, '/');

  // Try exact match
  if (fileMap.has(targetRelative)) {
    return fileMap.get(targetRelative);
  }

  // Try appending extensions
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.py'];
  for (const ext of extensions) {
    const withExt = targetRelative + ext;
    if (fileMap.has(withExt)) {
      return fileMap.get(withExt);
    }
  }

  // Try index files
  for (const ext of extensions) {
    const withIndex = `${targetRelative}/index${ext}`;
    if (fileMap.has(withIndex)) {
      return fileMap.get(withIndex);
    }
  }

  return null;
}

export function analyzeRepository(files) {
  const fileMap = new Map();
  const modules = [];

  // First pass: register all files
  files.forEach((file, index) => {
    const loc = file.content.split('\n').filter(line => line.trim().length > 0).length;
    const layer = categorizeLayer(file.path);
    const domain = detectDomain(file.path);
    const mod = {
      tempId: index + 1,
      path: file.path,
      name: file.name,
      file_type: file.ext.replace('.', '') || 'text',
      layer,
      domain,
      size_bytes: file.size,
      loc,
      raw_content: file.content,
      symbols: [],
      exports: [],
      rawImports: [],
    };
    fileMap.set(file.path, mod);
    modules.push(mod);
  });

  // Second pass: parse imports & symbols
  modules.forEach(mod => {
    let parsed = { imports: [], symbols: [], exports: [] };
    if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(mod.file_type)) {
      parsed = parseJsTsModule(mod.raw_content, mod.path);
    } else if (mod.file_type === 'py') {
      parsed = parsePythonModule(mod.raw_content);
    } else {
      parsed = parseWithRegex(mod.raw_content, mod.path);
    }

    mod.symbols = parsed.symbols;
    mod.exports = parsed.exports;
    mod.rawImports = parsed.imports;
  });

  // Third pass: resolve dependencies
  const dependencies = [];
  const dependencySet = new Set();

  modules.forEach(sourceMod => {
    sourceMod.rawImports.forEach(imp => {
      const targetMod = resolveDependency(sourceMod.path, imp.source, fileMap);
      if (targetMod && targetMod.tempId !== sourceMod.tempId) {
        const edgeKey = `${sourceMod.tempId}->${targetMod.tempId}`;
        if (!dependencySet.has(edgeKey)) {
          dependencySet.add(edgeKey);

          let edgeDomain = 'backend';
          if (sourceMod.domain === 'frontend' && targetMod.domain === 'frontend') {
            edgeDomain = 'frontend';
          } else if (sourceMod.domain === 'backend' && targetMod.domain === 'backend') {
            edgeDomain = 'backend';
          } else if (
            (sourceMod.domain === 'frontend' && targetMod.domain === 'backend') ||
            (sourceMod.domain === 'backend' && targetMod.domain === 'frontend')
          ) {
            edgeDomain = 'bridge'; // cross-boundary API bridge!
          } else if (sourceMod.domain === 'frontend' || targetMod.domain === 'frontend') {
            edgeDomain = 'frontend';
          }

          dependencies.push({
            sourceTempId: sourceMod.tempId,
            targetTempId: targetMod.tempId,
            sourcePath: sourceMod.path,
            targetPath: targetMod.path,
            domain: edgeDomain,
            specifiers: imp.specifiers,
          });
        }
      }
    });
  });

  // Compute graph metrics
  const inDegreeMap = new Map();
  const outDegreeMap = new Map();
  dependencies.forEach(d => {
    outDegreeMap.set(d.sourceTempId, (outDegreeMap.get(d.sourceTempId) || 0) + 1);
    inDegreeMap.set(d.targetTempId, (inDegreeMap.get(d.targetTempId) || 0) + 1);
  });

  modules.forEach(m => {
    m.inDegree = inDegreeMap.get(m.tempId) || 0;
    m.outDegree = outDegreeMap.get(m.tempId) || 0;
  });

  const layerBreakdown = {};
  let totalLoc = 0;
  modules.forEach(m => {
    layerBreakdown[m.layer] = (layerBreakdown[m.layer] || 0) + 1;
    totalLoc += m.loc;
  });

  const metrics = {
    totalModules: modules.length,
    totalDependencies: dependencies.length,
    totalLoc,
    averageLoc: modules.length > 0 ? Math.round(totalLoc / modules.length) : 0,
    layerBreakdown,
    topHubs: [...modules].sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree)).slice(0, 5).map(m => ({
      path: m.path,
      inDegree: m.inDegree,
      outDegree: m.outDegree,
    })),
  };

  return { modules, dependencies, metrics };
}
