import express from 'express';
import { answerCodebaseQuery, retrieveRelevantContext } from '../services/ragService.js';

const router = express.Router();

/**
 * POST /api/repos/:id/rag/query
 * Body: { question: string }
 */
router.post('/:id/rag/query', async (req, res) => {
  const { id } = req.params;
  const { question } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Question is required for codebase analysis',
    });
  }

  try {
    const result = await answerCodebaseQuery(id, question.trim());
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('RAG query error:', err);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: 'Failed to process codebase query',
    });
  }
});

/**
 * GET /api/repos/:id/rag/retrieve?q=query
 * Retrieves raw matched module chunks without running final synthesis
 */
router.get('/:id/rag/retrieve', async (req, res) => {
  const { id } = req.params;
  const queryStr = req.query.q || '';

  if (!queryStr.trim()) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Search query parameter q is required',
    });
  }

  try {
    const context = await retrieveRelevantContext(id, queryStr.trim());
    res.json({
      success: true,
      data: context,
    });
  } catch (err) {
    console.error('RAG retrieve error:', err);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: 'Retrieval failed',
    });
  }
});

export default router;
