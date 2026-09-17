import { Router, Request, Response } from 'express';
import { registerUser, loginUser } from '../utils/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await registerUser(email, password);
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    return res.status(201).json(result);
});

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    if (result.error) {
        return res.status(401).json({ error: result.error });
    }
    return res.json(result);
});

export default router;