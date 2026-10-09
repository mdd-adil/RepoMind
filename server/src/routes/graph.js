import express from 'express';
import { getGraphData } from '../services/repoStore.js';

const router = express.Router();

// GET /api/repos/:id/graph - Returns React Flow formatted nodes and edges
router.get('/:id/graph', async (req, res) => {
  try {
    const graphData = await getGraphData(req.params.id);
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return res.status(404).json({ success: false, statusCode: 404, error: 'Graph not found' });
    }
    res.json({
      success: true,
      data: graphData,
    });
  } catch (err) {
    console.error('Error fetching graph data:', err);
    res.status(500).json({ success: false, statusCode: 500, error: 'Internal server error' });
  }
});

export default router;
