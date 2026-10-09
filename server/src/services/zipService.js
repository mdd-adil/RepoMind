import AdmZip from 'adm-zip';
import path from 'path';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  'coverage',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  'test',
  'tests',
  '__tests__',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.rb',
  '.php',
  '.json',
  '.yaml',
  '.yml',
  '.sql',
  '.html',
  '.css',
]);

const MAX_FILE_SIZE = 500 * 1024; // 500KB per file to avoid huge assets
const MAX_TOTAL_FILES = 400; // Cap to keep graph responsive

export function extractFilesFromZip(zip) {
  const zipEntries = zip.getEntries();
  const rawFiles = [];

  // Find root directory prefix if zip has a wrapper folder (e.g. repo-main/)
  let rootPrefix = '';
  if (zipEntries.length > 0) {
    const firstEntry = zipEntries[0].entryName;
    const parts = firstEntry.split(/[/\\]/);
    if (parts.length > 1 && parts[0]) {
      rootPrefix = parts[0] + '/';
    }
  }

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;

    let relativePath = entry.entryName.replace(/\\/g, '/');
    if (rootPrefix && relativePath.startsWith(rootPrefix)) {
      relativePath = relativePath.slice(rootPrefix.length);
    }

    // Check if path contains ignored directory
    const segments = relativePath.split('/');
    const isIgnored = segments.some(seg => IGNORED_DIRS.has(seg.toLowerCase()) || seg.startsWith('.'));
    if (isIgnored) continue;

    const ext = path.extname(relativePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;

    // Check size
    if (entry.header.size > MAX_FILE_SIZE) continue;

    try {
      const content = entry.getData().toString('utf8');
      rawFiles.push({
        path: relativePath,
        name: path.basename(relativePath),
        ext,
        size: entry.header.size,
        content,
      });
    } catch (e) {
      // Binary or invalid encoding, skip
    }

    if (rawFiles.length >= MAX_TOTAL_FILES) {
      console.warn(`Reached maximum file limit of ${MAX_TOTAL_FILES}. Stopping zip extraction.`);
      break;
    }
  }

  return rawFiles;
}

export function createZipFromBuffer(buffer) {
  return new AdmZip(buffer);
}
