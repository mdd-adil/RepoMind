import express from 'express';
import { getModuleDetails } from '../services/repoStore.js';

const router = express.Router();

// GET /api/modules/:id - Get full module details, explanation, and code
router.get('/:id', async (req, res) => {
  try {
    const mod = await getModuleDetails(req.params.id);
    if (!mod) {
      return res.status(404).json({ success: false, statusCode: 404, error: 'Module not found' });
    }
    res.json({
      success: true,
      data: mod,
    });
  } catch (err) {
    console.error('Error fetching module details:', err);
    res.status(500).json({ success: false, statusCode: 500, error: 'Internal server error' });
  }
});

export default router;
