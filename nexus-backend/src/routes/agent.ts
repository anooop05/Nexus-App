import { Router, Request, Response } from 'express';
import { chatWithAgent } from '../utils/agent';
import { verifyAuthToken } from '../utils/auth';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  const userId = verifyAuthToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Token required.' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Field "message" is required.' });
  }

  try {
    const reply = await chatWithAgent(userId, message);
    return res.json({ reply });
  } catch (error: any) {
    console.error('[Agent Route Error]:', error);
    return res.status(500).json({ error: error.message || 'Agent execution failed.' });
  }
});

export default router;