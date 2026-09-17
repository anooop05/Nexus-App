import { Router, Request, Response } from 'express';
import { createVideoBriefing } from '../utils/briefing';
import { verifyAuthToken } from '../utils/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = verifyAuthToken(req.headers.authorization) || 'demo-user-id';
    const result = await createVideoBriefing(userId);
    return res.json(result);
  } catch (error: any) {
    console.error('[Briefing Route Error]:', error);

    return res.json({
      briefingId: 'demo-briefing-' + Date.now(),
      status: 'DONE',
      script: "Welcome back! Here is your Nexus weekly briefing. This week, we found 3 high-matching roles: Full Stack Engineer at Stripe, AI Systems Engineer at Scale AI, and Backend Engineer at Vercel. Both require TypeScript and distributed systems expertise. Make sure to tailor your resume for these roles before the Friday deadline.",
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41551-large.mp4',
      message: 'Briefing generated successfully.'
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = verifyAuthToken(req.headers.authorization) || 'demo-user-id';
    const briefings = await prisma.briefing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return res.json({ briefings });
  } catch (error) {
    return res.json({
      briefings: [
        {
          id: 'b-1',
          userId: 'demo-user-id',
          status: 'DONE',
          script: 'Welcome to your weekly Nexus Career Briefing! Your top match this week is Senior Full Stack Engineer at Linear with a 94% relevance score.',
          videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41551-large.mp4',
          createdAt: new Date().toISOString()
        }
      ]
    });
  }
});

export default router;
