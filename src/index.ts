import 'dotenv/config';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createSession,
  getQuestionsForRole,
  getSession,
  getSessionSummary,
  listSessions,
  submitTurn,
} from './lib/interview';
import {
  generateApiKey,
  validateApiKey,
  listApiKeys,
  getApiKey,
  revokeApiKey,
  deleteApiKey,
} from './lib/apikeys';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const adminKey = process.env.ADMIN_KEY || 'dev-admin-key';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

declare global {
  namespace Express {
    interface Request {
      apiKeyId?: string;
    }
  }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  const validation = validateApiKey(token);

  if (!validation.valid) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.apiKeyId = validation.id;
  next();
};

const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);

  if (token === adminKey) {
    next();
    return;
  }

  const validation = validateApiKey(token);
  if (!validation.valid) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.apiKeyId = validation.id;
  next();
};

const createSessionSchema = z.object({
  role: z.string().min(2),
  jobTitle: z.string().min(2),
});

const submitTurnSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(10),
});

const createApiKeySchema = z.object({
  name: z.string().min(2),
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'ghostly-ai-api',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/keys', adminAuthMiddleware, (req: Request, res: Response) => {
  const parsed = createApiKeySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: parsed.error.flatten(),
    });
  }

  const apiKey = generateApiKey(parsed.data.name);
  return res.status(201).json(apiKey);
});

app.get('/api/keys', adminAuthMiddleware, (_req: Request, res: Response) => {
  res.json(listApiKeys());
});

app.get('/api/keys/:id', adminAuthMiddleware, (req: Request, res: Response) => {
  const key = getApiKey(req.params.id);

  if (!key) {
    return res.status(404).json({ error: 'API key not found' });
  }

  res.json(key);
});

app.post('/api/keys/:id/revoke', adminAuthMiddleware, (req: Request, res: Response) => {
  const success = revokeApiKey(req.params.id);

  if (!success) {
    return res.status(404).json({ error: 'API key not found' });
  }

  res.json({ message: 'API key revoked' });
});

app.delete('/api/keys/:id', adminAuthMiddleware, (req: Request, res: Response) => {
  const success = deleteApiKey(req.params.id);

  if (!success) {
    return res.status(404).json({ error: 'API key not found' });
  }

  res.json({ message: 'API key deleted' });
});

app.get('/api/interviews/sessions', authMiddleware, (_req: Request, res: Response) => {
  res.json(listSessions());
});

app.post('/api/interviews/sessions', authMiddleware, (req: Request, res: Response) => {
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

app.get('/api/interviews/roles/:role/questions', authMiddleware, (req: Request, res: Response) => {
  const { role } = req.params;
  res.json(getQuestionsForRole(role));
});

app.get('/api/interviews/sessions/:sessionId', authMiddleware, (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    const session = getSession(sessionId);
    return res.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(404).json({ error: message });
  }
});

app.post('/api/interviews/sessions/:sessionId/turn', authMiddleware, async (req: Request, res: Response) => {
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

app.get('/api/interviews/sessions/:sessionId/summary', authMiddleware, (req: Request, res: Response) => {
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
  console.log(`Admin key (dev): ${adminKey}`);
});
