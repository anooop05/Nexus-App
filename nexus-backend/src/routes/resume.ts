import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { verifyAuthToken } from '../utils/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// In-memory buffer storage for PDF handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported for extraction.'));
    }
  },
});

// POST /api/resume/upload - Extract text from uploaded PDF
router.post('/upload', (req: Request, res: Response) => {
  upload.single('resume')(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No resume PDF file uploaded.' });
      }

      const parser = new PDFParse({ data: req.file.buffer });
      let extractedText = '';
      let numPages = 1;

      try {
        const data = await parser.getText({ pageJoiner: '\n' });
        extractedText = data.text?.trim() || '';
        numPages = data.total || data.pages?.length || 1;
      } finally {
        await parser.destroy();
      }

      if (!extractedText) {
        return res.status(400).json({ error: 'The uploaded PDF does not contain extractable text.' });
      }

      // Optionally save to database if user is authenticated
      const userId = verifyAuthToken(req.headers.authorization);
      if (userId) {
        try {
          await prisma.resume.create({
            data: {
              userId,
              rawText: extractedText,
            },
          });
        } catch (dbErr) {
          console.warn('[Resume DB Note] Could not persist resume record to DB:', dbErr);
        }
      }

      return res.json({
        message: 'PDF extracted successfully.',
        text: extractedText,
        numPages,
      });
    } catch (error: any) {
      console.error('[PDF Extraction Error]:', error);
      return res.status(500).json({ error: error.message || 'Failed to parse PDF file.' });
    }
  });
});

export default router;
