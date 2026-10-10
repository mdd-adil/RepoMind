import { GoogleGenAI } from '@google/genai';
import { getRepoModules, getRepository } from './repoStore.js';

let aiClient = null;
function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

/**
 * Score relevance of a module against user query tokens
 */
function scoreModuleRelevance(mod, queryTokens, rawQuery) {
  let score = 0;
  const lowerPath = (mod.path || '').toLowerCase();
  const lowerName = (mod.name || '').toLowerCase();
  const lowerLayer = (mod.layer || '').toLowerCase();
  const lowerSummary = (mod.summary || '').toLowerCase();
  const lowerDeep = (mod.deep_explanation || '').toLowerCase();
  const lowerContent = (mod.raw_content || '').toLowerCase();

  const symbols = Array.isArray(mod.symbols) ? mod.symbols : [];
  const symbolNames = symbols.map(s => (s.name || '').toLowerCase()).join(' ');

  // Exact phrase match bonus
  if (lowerContent.includes(rawQuery)) score += 30;
  if (lowerPath.includes(rawQuery)) score += 40;
  if (symbolNames.includes(rawQuery)) score += 35;

  for (const token of queryTokens) {
    if (token.length < 2) continue;

    // Path / file name match (very high signal)
    if (lowerName.includes(token)) score += 18;
    else if (lowerPath.includes(token)) score += 12;

    // Layer match (e.g. "auth controller", "router", "model")
    if (lowerLayer.includes(token)) score += 10;

    // Exported symbols (functions, classes)
    if (symbolNames.includes(token)) score += 15;

    // Summary & humanized explanation
    if (lowerSummary.includes(token)) score += 8;
    if (lowerDeep.includes(token)) score += 6;

    // Raw source code occurrence count
    const occurrences = (lowerContent.match(new RegExp(token, 'g')) || []).length;
    if (occurrences > 0) {
      score += Math.min(occurrences * 2, 16);
    }
  }

  // Weight entry points slightly higher if query seems architectural
  if (['how', 'architecture', 'start', 'flow', 'work', 'entry', 'overview'].some(w => rawQuery.includes(w))) {
    if (lowerPath.includes('index') || lowerPath.includes('main') || lowerPath.includes('app') || lowerPath.includes('server')) {
      score += 8;
    }
  }

  return score;
}

/**
 * Perform semantic & keyword chunk retrieval
 */
export async function retrieveRelevantContext(repoId, queryStr, topK = 5) {
  const modules = await getRepoModules(repoId);
  if (!modules || modules.length === 0) {
    return [];
  }

  const rawQuery = queryStr.toLowerCase().trim();
  const queryTokens = rawQuery
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'what', 'where'].includes(t));

  const scored = modules.map(mod => ({
    mod,
    score: scoreModuleRelevance(mod, queryTokens, rawQuery),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Take top K relevant modules (filter out zero-score if we have better candidates)
  let selected = scored.slice(0, topK);
  if (selected[0] && selected[0].score === 0) {
    // If no strong keyword match, provide top representative modules
    selected = scored.slice(0, Math.min(3, scored.length));
  }

  return selected.map(item => {
    const m = item.mod;
    // Trim raw_content if exceptionally large to protect token limits
    let codeSnippet = m.raw_content || '';
    if (codeSnippet.length > 2500) {
      codeSnippet = codeSnippet.substring(0, 2500) + '\n\n... [remaining code truncated for token efficiency]';
    }

    return {
      id: m.id,
      name: m.name,
      path: m.path,
      layer: m.layer,
      file_type: m.file_type,
      loc: m.loc,
      summary: m.summary,
      symbols: m.symbols,
      codeSnippet,
      relevanceScore: item.score,
    };
  });
}

/**
 * Main RAG Query Handler: Synthesizes intelligent answer with citations
 */
export async function answerCodebaseQuery(repoId, userQuestion) {
  const repo = await getRepository(repoId);
  const repoName = repo ? repo.name : 'this codebase';

  const retrievedDocs = await retrieveRelevantContext(repoId, userQuestion, 4);

  // Fallback heuristic answer if AI key is unavailable or fails
  const buildHeuristicResponse = () => {
    if (!retrievedDocs || retrievedDocs.length === 0) {
      return {
        answer: `I analyzed the codebase for "${userQuestion}", but no specific modules matched your search terms closely. Try asking about a specific file, routing, or architectural layer.`,
        sources: [],
      };
    }

    const sourceCitations = retrievedDocs.map(d => ({
      id: d.id,
      name: d.name,
      path: d.path,
      layer: d.layer,
      summary: d.summary,
    }));

    let text = `Based on the codebase analysis of **${repoName}**, here are the most relevant components addressing: **"${userQuestion}"**\n\n`;
    
    retrievedDocs.forEach((doc, idx) => {
      text += `### ${idx + 1}. \`${doc.path}\` (${doc.layer.toUpperCase()})\n`;
      text += `**Role**: ${doc.summary || 'Provides supporting logic and architectural wiring.'}\n`;
      if (Array.isArray(doc.symbols) && doc.symbols.length > 0) {
        const topSymbols = doc.symbols.slice(0, 5).map(s => `\`${s.name}\``).join(', ');
        text += `**Key Exports/Symbols**: ${topSymbols}\n`;
      }
      text += `\n`;
    });

    text += `> 💡 **Architectural Note**: These modules interact together to fulfill this responsibility within the **${repo?.primary_language || 'application'}** stack.`;

    return {
      answer: text,
      sources: sourceCitations,
    };
  };

  const client = getAiClient();
  if (!client) {
    return buildHeuristicResponse();
  }

  try {
    const contextText = retrievedDocs
      .map(
        (doc, i) => `--- Module ${i + 1}: ${doc.path} (${doc.layer}) ---
Summary: ${doc.summary}
LOC: ${doc.loc}
Symbols: ${(doc.symbols || []).map(s => s.name).join(', ')}
Code:
\`\`\`${doc.file_type || ''}
${doc.codeSnippet}
\`\`\``
      )
      .join('\n\n');

    const prompt = `You are an expert software architect acting as a Codebase RAG (Retrieval-Augmented Generation) assistant for repository "${repoName}".

User Question: "${userQuestion}"

Here is the retrieved context from the codebase:
${contextText}

Instructions:
1. Answer the user's question clearly, warmly, and accurately using the provided code snippets and module summaries.
2. Reference specific files using \`filepath\` syntax.
3. Explain the actual data flow, functions, or execution mechanics step-by-step.
4. Conclude with a short summary or architectural takeaway.
5. Keep markdown formatting clean, using bold terms and code blocks where helpful.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const aiAnswer = response?.text;
    if (!aiAnswer) {
      return buildHeuristicResponse();
    }

    return {
      answer: aiAnswer,
      sources: retrievedDocs.map(d => ({
        id: d.id,
        name: d.name,
        path: d.path,
        layer: d.layer,
        summary: d.summary,
      })),
    };
  } catch (err) {
    console.warn('Gemini RAG query generation fallback triggered:', err.message);
    return buildHeuristicResponse();
  }
}
