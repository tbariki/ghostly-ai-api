import 'dotenv/config';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import {
  createSession,
  getQuestionsForRole,
  getSession,
  getSessionSummary,
  listSessions,
  submitTurn,
} from './lib/interview';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const createSessionSchema = z.object({
  role: z.string().min(2),
  jobTitle: z.string().min(2),
});

const submitTurnSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(10),
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'ghostly-ai-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/interviews/sessions', (_req: Request, res: Response) => {
  res.json(listSessions());
});

app.post('/api/interviews/sessions', (req: Request, res: Response) => {
  const parsed = createSessionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid session payload',
      details: parsed.error.flatten(),
    });
  }

  const session = createSession(parsed.data.role, parsed.data.jobTitle);
  return res.status(201).json(session);
});

app.get('/api/interviews/roles/:role/questions', (req: Request, res: Response) => {
  const { role } = req.params;
  res.json(getQuestionsForRole(role));
});

app.get('/api/interviews/sessions/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    const session = getSession(sessionId);
    return res.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(404).json({ error: message });
  }
});

app.post('/api/interviews/sessions/:sessionId/turn', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const parsed = submitTurnSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid answer payload',
      details: parsed.error.flatten(),
    });
  }

  try {
    const updatedSession = await submitTurn(sessionId, parsed.data.questionId, parsed.data.answer);
    return res.json(updatedSession);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(404).json({ error: message });
  }
});

app.get('/api/interviews/sessions/:sessionId/summary', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    const summary = getSessionSummary(sessionId);
    return res.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(404).json({ error: message });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Ghostly AI API listening on http://localhost:${port}`);
});
