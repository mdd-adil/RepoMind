import express from 'express';
import multer from 'multer';
import { parseGithubUrl, fetchRepoMetadata, fetchRepoZip } from '../services/githubService.js';
import { extractFilesFromZip, createZipFromBuffer } from '../services/zipService.js';
import { analyzeRepository } from '../services/analyzer.js';
import { saveRepositoryData, getRepository, listRepositories, getGraphData } from '../services/repoStore.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max zip upload
});

// GET /api/repos - List analyzed repositories
router.get('/', async (req, res) => {
  try {
    const repos = await listRepositories();
    res.json({ success: true, data: repos });
  } catch (err) {
    res.status(500).json({ success: false, statusCode: 500, error: 'Internal server error' });
  }
});

// GET /api/repos/:id - Get repository details
router.get('/:id', async (req, res) => {
  try {
    const repo = await getRepository(req.params.id);
    if (!repo) {
      return res.status(404).json({ success: false, statusCode: 404, error: 'Repository not found' });
    }
    res.json({ success: true, data: repo });
  } catch (err) {
    res.status(500).json({ success: false, statusCode: 500, error: 'Internal server error' });
  }
});

// POST /api/repos/analyze - Analyze GitHub repository from URL
router.post('/analyze', async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ success: false, statusCode: 400, error: 'Repository URL is required' });
  }

  let parsed;
  try {
    parsed = parseGithubUrl(repoUrl);
  } catch {
    return res.status(400).json({ success: false, statusCode: 400, error: 'Invalid repository URL' });
  }

  const { owner, repo } = parsed;

  let metadata;
  try {
    metadata = await fetchRepoMetadata(owner, repo);
  } catch (e) {
    if (e.response?.status === 404) {
      return res.status(404).json({ success: false, statusCode: 404, error: 'Repository not found' });
    }
    return res.status(400).json({ success: false, statusCode: 400, error: 'Repository unavailable' });
  }

  let zipData;
  try {
    zipData = await fetchRepoZip(owner, repo, metadata.default_branch);
  } catch (e) {
    if (e.response?.status === 404) {
      return res.status(404).json({ success: false, statusCode: 404, error: 'Repository not found' });
    }
    return res.status(404).json({ success: false, statusCode: 404, error: 'Repository archive not found' });
  }

  const files = extractFilesFromZip(zipData.zip);
  if (files.length === 0) {
    return res.status(422).json({ success: false, statusCode: 422, error: 'No code files found in repository' });
  }

  try {
    const analysis = analyzeRepository(files);
    const saved = await saveRepositoryData(metadata, analysis);
    const fullRepo = await getRepository(saved.repoId);
    const graphData = await getGraphData(saved.repoId);

    res.json({
      success: true,
      data: fullRepo,
      graph: graphData,
    });
  } catch (err) {
    console.error('Error in analyze:', err);
    res.status(500).json({ success: false, statusCode: 500, error: 'Analysis failed' });
  }
});

// POST /api/repos/upload - Analyze uploaded Zip file
router.post('/upload', upload.single('zipFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, statusCode: 400, error: 'No zip file uploaded' });
    }

    const originalName = req.file.originalname.replace(/\.zip$/i, '');
    const zip = createZipFromBuffer(req.file.buffer);
    const files = extractFilesFromZip(zip);

    if (files.length === 0) {
      return res.status(422).json({ success: false, statusCode: 422, error: 'No code files found in archive' });
    }

    const analysis = analyzeRepository(files);

    const metadata = {
      name: originalName,
      owner: 'Uploaded Archive',
      description: `Uploaded project archive (${files.length} source modules analyzed).`,
      stars: 0,
      default_branch: 'local',
      primary_language: files.some(f => f.ext === '.ts' || f.ext === '.tsx') ? 'TypeScript' : 'JavaScript',
      html_url: `upload://${originalName}-${Date.now()}`,
    };

    const saved = await saveRepositoryData(metadata, analysis);
    const fullRepo = await getRepository(saved.repoId);
    const graphData = await getGraphData(saved.repoId);

    res.json({
      success: true,
      data: fullRepo,
      graph: graphData,
    });
  } catch (err) {
    console.error('Error processing upload:', err);
    res.status(500).json({ success: false, statusCode: 500, error: 'Archive processing failed' });
  }
});

export default router;
