import { query, isDbConnected } from '../db/index.js';
import { generateRepoOverview, generateModuleExplanation } from './explainer.js';
import { detectDomain } from './analyzer.js';

// In-memory fallback if PostgreSQL is not active
const memoryStore = {
  repos: new Map(),
  modules: new Map(),
  dependencies: new Map(),
  nextRepoId: 1,
  nextModuleId: 1,
  nextDepId: 1,
};

export async function saveRepositoryData(repoMeta, analysisResult) {
  const { modules, dependencies, metrics } = analysisResult;
  const overview = await generateRepoOverview(repoMeta, metrics, modules);

  // If DB connected, save to PostgreSQL
  if (isDbConnected()) {
    try {
      // Upsert repository
      const repoRes = await query(
        `INSERT INTO repositories (repo_url, name, owner, description, stars, default_branch, primary_language, architecture_overview, metrics, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (repo_url) DO UPDATE SET
           name = EXCLUDED.name,
           owner = EXCLUDED.owner,
           description = EXCLUDED.description,
           stars = EXCLUDED.stars,
           default_branch = EXCLUDED.default_branch,
           primary_language = EXCLUDED.primary_language,
           architecture_overview = EXCLUDED.architecture_overview,
           metrics = EXCLUDED.metrics,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id;`,
        [
          repoMeta.html_url || repoMeta.repo_url,
          repoMeta.name,
          repoMeta.owner,
          repoMeta.description,
          repoMeta.stars || 0,
          repoMeta.default_branch || 'main',
          repoMeta.primary_language,
          overview,
          JSON.stringify(metrics),
        ]
      );

      const repoId = repoRes.rows[0].id;

      // Clear existing modules for this repo to avoid stale duplicates
      await query(`DELETE FROM modules WHERE repo_id = $1`, [repoId]);

      // Save modules
      const tempToDbId = new Map();
      for (const mod of modules) {
        const incoming = dependencies.filter(d => d.targetTempId === mod.tempId);
        const outgoing = dependencies.filter(d => d.sourceTempId === mod.tempId);
        const explanation = await generateModuleExplanation(mod, incoming, outgoing);

        const modRes = await query(
          `INSERT INTO modules (repo_id, path, name, file_type, layer, size_bytes, loc, summary, deep_explanation, symbols, raw_content)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id;`,
          [
            repoId,
            mod.path,
            mod.name,
            mod.file_type,
            mod.layer,
            mod.size_bytes,
            mod.loc,
            explanation.summary,
            explanation.deep_explanation,
            JSON.stringify(mod.symbols),
            mod.raw_content,
          ]
        );

        const dbId = modRes.rows[0].id;
        tempToDbId.set(mod.tempId, dbId);
      }

      // Save dependencies
      for (const dep of dependencies) {
        const sourceId = tempToDbId.get(dep.sourceTempId);
        const targetId = tempToDbId.get(dep.targetTempId);
        if (sourceId && targetId) {
          await query(
            `INSERT INTO module_dependencies (repo_id, source_module_id, target_module_id, import_specifiers)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (repo_id, source_module_id, target_module_id) DO NOTHING;`,
            [repoId, sourceId, targetId, JSON.stringify(dep.specifiers || [])]
          );
        }
      }

      return { repoId, source: 'postgresql' };
    } catch (err) {
      console.warn('PostgreSQL insert error, falling back to memory store:', err.message);
    }
  }

  // Memory fallback
  const repoId = memoryStore.nextRepoId++;
  const repoRecord = {
    id: repoId,
    repo_url: repoMeta.html_url || repoMeta.repo_url || `custom-${repoId}`,
    name: repoMeta.name,
    owner: repoMeta.owner || 'local',
    description: repoMeta.description,
    stars: repoMeta.stars || 0,
    default_branch: repoMeta.default_branch || 'main',
    primary_language: repoMeta.primary_language || 'JavaScript',
    architecture_overview: overview,
    metrics,
    created_at: new Date().toISOString(),
  };
  memoryStore.repos.set(repoId, repoRecord);

  const tempToMemId = new Map();
  for (const mod of modules) {
    const modId = memoryStore.nextModuleId++;
    const incoming = dependencies.filter(d => d.targetTempId === mod.tempId);
    const outgoing = dependencies.filter(d => d.sourceTempId === mod.tempId);
    const explanation = await generateModuleExplanation(mod, incoming, outgoing);

    const modRecord = {
      id: modId,
      repo_id: repoId,
      path: mod.path,
      name: mod.name,
      file_type: mod.file_type,
      layer: mod.layer,
      size_bytes: mod.size_bytes,
      loc: mod.loc,
      summary: explanation.summary,
      deep_explanation: explanation.deep_explanation,
      symbols: mod.symbols,
      raw_content: mod.raw_content,
      inDegree: mod.inDegree,
      outDegree: mod.outDegree,
    };
    memoryStore.modules.set(modId, modRecord);
    tempToMemId.set(mod.tempId, modId);
  }

  const repoDeps = [];
  for (const dep of dependencies) {
    const depId = memoryStore.nextDepId++;
    const sourceId = tempToMemId.get(dep.sourceTempId);
    const targetId = tempToMemId.get(dep.targetTempId);
    if (sourceId && targetId) {
      const depRecord = {
        id: depId,
        repo_id: repoId,
        source_module_id: sourceId,
        target_module_id: targetId,
        import_specifiers: dep.specifiers || [],
      };
      memoryStore.dependencies.set(depId, depRecord);
      repoDeps.push(depRecord);
    }
  }

  return { repoId, source: 'memory' };
}

export async function getRepository(repoId) {
  const idNum = parseInt(repoId, 10);
  if (isDbConnected()) {
    try {
      const res = await query('SELECT * FROM repositories WHERE id = $1', [idNum]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      console.warn('DB getRepository error:', e.message);
    }
  }
  return memoryStore.repos.get(idNum) || null;
}

export async function listRepositories() {
  if (isDbConnected()) {
    try {
      const res = await query('SELECT id, repo_url, name, owner, description, stars, primary_language, created_at, updated_at FROM repositories ORDER BY updated_at DESC LIMIT 20');
      return res.rows;
    } catch (e) {
      console.warn('DB listRepositories error:', e.message);
    }
  }
  return Array.from(memoryStore.repos.values()).map(r => ({
    id: r.id,
    repo_url: r.repo_url,
    name: r.name,
    owner: r.owner,
    description: r.description,
    stars: r.stars,
    primary_language: r.primary_language,
    created_at: r.created_at,
  }));
}

export async function getGraphData(repoId) {
  const idNum = parseInt(repoId, 10);
  let modulesList = [];
  let depsList = [];

  if (isDbConnected()) {
    try {
      const mRes = await query('SELECT id, path, name, file_type, layer, size_bytes, loc, summary FROM modules WHERE repo_id = $1', [idNum]);
      const dRes = await query('SELECT source_module_id, target_module_id, import_specifiers FROM module_dependencies WHERE repo_id = $1', [idNum]);
      modulesList = mRes.rows;
      depsList = dRes.rows;
    } catch (e) {
      console.warn('DB getGraphData error:', e.message);
    }
  }

  if (modulesList.length === 0) {
    modulesList = Array.from(memoryStore.modules.values()).filter(m => m.repo_id === idNum);
    depsList = Array.from(memoryStore.dependencies.values()).filter(d => d.repo_id === idNum);
  }

  // Calculate degrees
  const inDegree = new Map();
  const outDegree = new Map();
  depsList.forEach(d => {
    outDegree.set(d.source_module_id, (outDegree.get(d.source_module_id) || 0) + 1);
    inDegree.set(d.target_module_id, (inDegree.get(d.target_module_id) || 0) + 1);
  });

  // Structured Architectural Tiers
  const layerColumns = {
    route: 0,
    controller: 1,
    middleware: 1,
    service: 2,
    component: 2,
    hook: 2,
    model: 3,
    database: 3,
    util: 4,
    config: 4,
    core: 4,
    other: 4,
  };

  const moduleMap = new Map();
  modulesList.forEach(m => {
    m.domain = m.domain || detectDomain(m.path);
    moduleMap.set(m.id, m);
  });

  const columnCounters = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

  const nodes = modulesList.map(m => {
    const col = layerColumns[m.layer] ?? 4;
    const row = columnCounters[col]++;

    return {
      id: String(m.id),
      type: 'moduleNode',
      position: {
        x: col * 420 + 80,
        y: row * 160 + 120,
      },
      data: {
        id: m.id,
        label: m.name,
        path: m.path,
        layer: m.layer,
        domain: m.domain, // 'frontend' | 'backend' | 'shared'
        file_type: m.file_type,
        loc: m.loc,
        summary: m.summary,
        inDegree: inDegree.get(m.id) || 0,
        outDegree: outDegree.get(m.id) || 0,
      },
    };
  });

  const edges = depsList.map((d, index) => {
    const src = moduleMap.get(d.source_module_id);
    const tgt = moduleMap.get(d.target_module_id);

    let edgeDomain = 'backend';
    let edgeColor = '#10b981'; // default backend (emerald)

    if (src && tgt) {
      if (src.domain === 'frontend' && tgt.domain === 'frontend') {
        edgeDomain = 'frontend';
        edgeColor = '#a855f7'; // Frontend -> Frontend (purple/violet)
      } else if (src.domain === 'backend' && tgt.domain === 'backend') {
        edgeDomain = 'backend';
        edgeColor = '#10b981'; // Backend -> Backend (emerald green)
      } else if (
        (src.domain === 'frontend' && tgt.domain === 'backend') ||
        (src.domain === 'backend' && tgt.domain === 'frontend')
      ) {
        edgeDomain = 'bridge';
        edgeColor = '#f59e0b'; // Frontend <-> Backend Bridge (amber)
      } else if (src.domain === 'frontend' || tgt.domain === 'frontend') {
        edgeDomain = 'frontend';
        edgeColor = '#a855f7';
      }
    }

    return {
      id: `e-${d.source_module_id}-${d.target_module_id}-${index}`,
      source: String(d.source_module_id),
      target: String(d.target_module_id),
      type: 'smoothstep',
      animated: edgeDomain === 'bridge',
      data: {
        domain: edgeDomain,
        color: edgeColor,
      },
      markerEnd: {
        type: 'arrowclosed',
        width: 14,
        height: 14,
        color: edgeColor,
      },
      style: { stroke: edgeColor, strokeWidth: 1.6 },
    };
  });

  return { nodes, edges };
}

export async function getModuleDetails(moduleId) {
  const idNum = parseInt(moduleId, 10);
  let mod = null;
  let incoming = [];
  let outgoing = [];

  if (isDbConnected()) {
    try {
      const mRes = await query('SELECT * FROM modules WHERE id = $1', [idNum]);
      if (mRes.rows.length > 0) {
        mod = mRes.rows[0];
        const inRes = await query(`
          SELECT m.id, m.name, m.path, m.layer, d.import_specifiers 
          FROM module_dependencies d 
          JOIN modules m ON d.source_module_id = m.id 
          WHERE d.target_module_id = $1`, [idNum]);
        const outRes = await query(`
          SELECT m.id, m.name, m.path, m.layer, d.import_specifiers 
          FROM module_dependencies d 
          JOIN modules m ON d.target_module_id = m.id 
          WHERE d.source_module_id = $1`, [idNum]);
        incoming = inRes.rows;
        outgoing = outRes.rows;
      }
    } catch (e) {
      console.warn('DB getModuleDetails error:', e.message);
    }
  }

  if (!mod) {
    mod = memoryStore.modules.get(idNum);
    if (mod) {
      const repoId = mod.repo_id;
      const allDeps = Array.from(memoryStore.dependencies.values()).filter(d => d.repo_id === repoId);
      incoming = allDeps
        .filter(d => d.target_module_id === idNum)
        .map(d => {
          const src = memoryStore.modules.get(d.source_module_id);
          return { id: src?.id, name: src?.name, path: src?.path, layer: src?.layer, import_specifiers: d.import_specifiers };
        });
      outgoing = allDeps
        .filter(d => d.source_module_id === idNum)
        .map(d => {
          const trg = memoryStore.modules.get(d.target_module_id);
          return { id: trg?.id, name: trg?.name, path: trg?.path, layer: trg?.layer, import_specifiers: d.import_specifiers };
        });
    }
  }

  if (!mod) return null;

  return {
    ...mod,
    incomingDependencies: incoming,
    outgoingDependencies: outgoing,
  };
}

export async function getRepoModules(repoId) {
  const idNum = parseInt(repoId, 10);
  if (isDbConnected()) {
    try {
      const res = await query(
        'SELECT id, path, name, file_type, layer, size_bytes, loc, summary, deep_explanation, symbols, raw_content FROM modules WHERE repo_id = $1',
        [idNum]
      );
      if (res.rows.length > 0) return res.rows;
    } catch (e) {
      console.warn('DB getRepoModules error:', e.message);
    }
  }

  return Array.from(memoryStore.modules.values()).filter(m => m.repo_id === idNum);
}
