import { GoogleGenAI } from '@google/genai';

let aiClient = null;
function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export async function generateRepoOverview(repoMeta, metrics, modules) {
  const topLayers = Object.entries(metrics.layerBreakdown || {})
    .sort((a, b) => b[1] - a[1])
    .map(([l, count]) => `${l} (${count})`)
    .join(', ');

  const primaryEntrypoints = modules
    .filter(m => m.path.includes('index') || m.path.includes('main') || m.path.includes('app') || m.path.includes('server'))
    .map(m => m.path)
    .slice(0, 5)
    .join(', ');

  let overview = `### Architecture & Project Overview\n\n`;
  overview += `**${repoMeta.name}** is a ${repoMeta.primary_language || 'multi-language'} project composed of **${metrics.totalModules} modules** spanning **${metrics.totalLoc.toLocaleString()} lines of code** with **${metrics.totalDependencies} inter-module dependencies**.\n\n`;
  overview += `#### Key Structure & Layers\n`;
  overview += `- **Architectural Distribution**: ${topLayers || 'General modules'}\n`;
  if (primaryEntrypoints) {
    overview += `- **Core Entrypoints**: \`${primaryEntrypoints}\`\n`;
  }
  overview += `- **Dependency Density**: Average of ${(metrics.totalDependencies / (metrics.totalModules || 1)).toFixed(1)} connections per module.\n`;

  // Try AI enhancement if key is provided
  const client = getAiClient();
  if (client) {
    try {
      const prompt = `Summarize the software architecture and purpose of a repository named "${repoMeta.name}" with description "${repoMeta.description}".
Language: ${repoMeta.primary_language}.
Key files: ${modules.slice(0, 15).map(m => m.path).join(', ')}.
Provide a concise 2-paragraph architectural summary explaining what the project does and how its main components cooperate.`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response && response.text) {
        overview += `\n\n#### Deep Architecture Analysis\n${response.text}`;
      }
    } catch (err) {
      console.warn('Gemini repo overview generation skipped:', err.message);
    }
  }

  return overview;
}

export async function generateModuleExplanation(mod, incomingDeps = [], outgoingDeps = []) {
  const symbolList = (mod.symbols || []).map(s => `\`${s.name}\` (${s.type}${s.exported ? ', exported' : ''})`);
  const outgoingList = outgoingDeps.map(d => `\`${d.targetPath || d.path || d.name}\``);
  const incomingList = incomingDeps.map(d => `\`${d.sourcePath || d.path || d.name}\``);

  // 1. Precise, friendly "What It Does"
  let whatItDoes = '';
  switch (mod.layer) {
    case 'controller':
      whatItDoes = `This file is the traffic director for this part of the app. When requests arrive, it checks what data came in, asks the business services to do the heavy lifting, and sends back a clean, formatted response to whoever asked.`;
      break;
    case 'service':
      whatItDoes = `This file is the engine room where the core business decisions happen. It validates rules, runs calculations, updates records, and makes sure data is sound without having to worry about website URLs or request headers.`;
      break;
    case 'route':
      whatItDoes = `This file sets up the API endpoints and web routes for "${mod.name}". Think of it like a signpost: when someone visits a specific URL path, it guides them straight to the right controller function.`;
      break;
    case 'component':
      whatItDoes = `This is a visual UI component. It builds the interactive buttons, forms, and layouts users see on screen, and instantly updates when someone clicks, types, or when new data arrives.`;
      break;
    case 'hook':
      whatItDoes = `This is a custom React hook designed to save time. It packages up reusable logic (like fetching data or managing a timer) so any screen in your app can use it with just one line of code.`;
      break;
    case 'model':
    case 'database':
      whatItDoes = `This is the direct link to the database. It outlines what information gets stored (like users or orders) and provides safe functions to look up, save, and update records.`;
      break;
    case 'middleware':
      whatItDoes = `This is a security and helper guard that sits in the middle of request pipelines. It checks if users are logged in, blocks bad requests, logs traffic, and catches unexpected errors before they reach your main code.`;
      break;
    case 'util':
    case 'config':
      whatItDoes = `This is a shared utility toolkit for "${mod.name}". It contains handy helper functions (like date formatting, math, or app settings) that other files can grab anytime.`;
      break;
    default:
      whatItDoes = `This is a foundational piece of the app located at \`${mod.path}\`. It sets up key exports, configurations, or system wiring that the rest of the project relies on.`;
  }

  // 2. Clear, step-by-step humanized "How It Works"
  let deepExplanation = "";
  deepExplanation += `This module is named **${mod.name}** and lives at \`${mod.path}\`. It operates in the **${(mod.domain || 'fullstack').toUpperCase()}** part of the codebase as a **${mod.layer.toUpperCase()}** file.\n\n`;
  
  deepExplanation += `#### 1. Step-by-Step Flow\n`;
  if (mod.layer === 'route') {
    deepExplanation += `1. **Listens for incoming traffic**: It sets up route definitions (like \`GET\` or \`POST\`).\n`;
    deepExplanation += `2. **Checks parameters**: When someone calls this endpoint, it extracts any IDs or query values in the address.\n`;
    deepExplanation += `3. **Passes the baton**: It hands the request over to the matching controller functions to formulate an answer.\n\n`;
  } else if (mod.layer === 'controller') {
    deepExplanation += `1. **Takes the request**: It unpacks the user’s input and verifies that necessary fields exist.\n`;
    deepExplanation += `2. **Calls the specialists**: It calls functions in related files (${outgoingList.slice(0, 3).join(', ') || 'internal helpers'}) to do the actual data work.\n`;
    deepExplanation += `3. **Replies to the user**: If everything went well, it sends back a \`200 OK\` with the results. If something broke, it catches the error and sends back a helpful error message.\n\n`;
  } else if (mod.layer === 'service') {
    deepExplanation += `1. **Applies business rules**: It runs validations and processes algorithms step-by-step.\n`;
    deepExplanation += `2. **Interacts with storage**: When data needs to be saved or fetched, it calls into database models (${outgoingList.slice(0, 3).join(', ') || 'database'}).\n`;
    deepExplanation += `3. **Returns clean results**: It packages the processed data and hands it back up to whoever called it.\n\n`;
  } else if (mod.layer === 'component') {
    deepExplanation += `1. **Mounts onto the screen**: When loaded, it prepares its initial state and default values.\n`;
    deepExplanation += `2. **Listens for user interaction**: It attaches click, typing, or submission handlers to interactive elements.\n`;
    deepExplanation += `3. **Re-renders on changes**: Whenever new data arrives or the user takes an action, it re-renders the screen smoothly.\n\n`;
  } else {
    deepExplanation += `1. **Loads into memory**: When another file imports it, it exports its functions and constants.\n`;
    deepExplanation += `2. **Executes upon request**: It takes in parameters, performs its job, and returns the result without causing surprise side-effects.\n`;
    deepExplanation += `3. **Reusability**: Because it is modular, multiple different files can share this exact same logic.\n\n`;
  }

  deepExplanation += `#### 2. How It Connects to Other Files\n`;
  if (outgoingList.length > 0) {
    deepExplanation += `- **Dependencies (${outgoingList.length})**: This file reaches out to ${outgoingList.join(', ')} to get things done.\n`;
  } else {
    deepExplanation += `- **Dependencies**: It is completely self-contained with no local dependencies.\n`;
  }

  if (incomingList.length > 0) {
    deepExplanation += `- **Who Calls This (${incomingList.length})**: Other files (${incomingList.join(', ')}) import this module when they need its capabilities.\n\n`;
  } else {
    deepExplanation += `- **Who Calls This**: It doesn't appear to be imported locally; it is likely a top-level startup script or main entry point.\n\n`;
  }

  deepExplanation += `#### 3. Code Breakdown & Functions\n`;
  deepExplanation += `- **Total Lines of Code**: ${mod.loc} non-empty lines (${(mod.size_bytes / 1024).toFixed(1)} KB).\n`;
  if (symbolList.length > 0) {
    deepExplanation += `- **Key Functions & Classes (${symbolList.length})**:\n`;
    symbolList.slice(0, 8).forEach(sym => {
      deepExplanation += `  - ${sym}\n`;
    });
    if (symbolList.length > 8) {
      deepExplanation += `  - *...and ${symbolList.length - 8} more functions*\n`;
    }
  } else {
    deepExplanation += `- **Functions**: Self-executing script logic without separate exported functions.\n`;
  }

  // AI Generation if Gemini API key is configured
  const client = getAiClient();
  if (client && mod.raw_content && mod.raw_content.length < 15000) {
    try {
      const prompt = `You are explaining code to a fellow developer in clear, warm, conversational human language.
File path: "${mod.path}" (${mod.loc} lines, layer: ${mod.layer}).
Code:
\`\`\`${mod.file_type}
${mod.raw_content.slice(0, 6000)}
\`\`\`

Explain this file in plain English:
1. **What It Does**: (2 simple, humanized paragraphs explaining what problem this file solves).
2. **How The Code Works (Step-by-Step)**: (A clear, numbered explanation of what happens from start to finish when this code runs).
3. **Key Functions**: (Explain what each key function does in practical terms).
4. **How Other Files Use It**: (Where it fits into the whole picture).`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response && response.text) {
        return {
          summary: whatItDoes,
          deep_explanation: response.text,
        };
      }
    } catch (err) {
      console.warn(`AI explanation fallback for ${mod.path}:`, err.message);
    }
  }

  return {
    summary: whatItDoes,
    deep_explanation: deepExplanation,
  };
}
