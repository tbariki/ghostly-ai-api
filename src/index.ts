import { randomUUID } from 'crypto';
import OpenAI from 'openai';

export type Question = {
  id: string;
  text: string;
  category: string;
};

export type InterviewTurn = {
  id: string;
  questionId: string;
  question: string;
  answer: string;
  feedback: string;
  score: number;
  createdAt: string;
};

export type InterviewSession = {
  id: string;
  role: string;
  jobTitle: string;
  createdAt: string;
  questions: Question[];
  turns: InterviewTurn[];
  summary: string;
};

const sessions = new Map<string, InterviewSession>();

const baseQuestions: Question[] = [
  {
    id: 'q-1',
    text: 'Tell me about a time you solved a difficult problem under pressure.',
    category: 'Behavioral',
  },
  {
    id: 'q-2',
    text: 'How do you prioritize tasks when multiple deadlines are happening at once?',
    category: 'Prioritization',
  },
  {
    id: 'q-3',
    text: 'Describe a project where you made a technical decision that improved team performance.',
    category: 'Technical Leadership',
  },
  {
    id: 'q-4',
    text: 'What does strong collaboration with cross-functional teams look like to you?',
    category: 'Collaboration',
  },
  {
    id: 'q-5',
    text: 'Why are you interested in this role and how would you add value?',
    category: 'Motivation',
  },
];

function buildSummary(turns: InterviewTurn[]) {
  if (turns.length === 0) {
    return 'No responses yet. The interview has started.';
  }

  const averageScore = Math.round(
    turns.reduce((total, turn) => total + turn.score, 0) / turns.length,
  );

  const latest = turns[turns.length - 1];

  return `Average score: ${averageScore}/100. Latest answer: ${latest.feedback}`;
}

export function createSession(role: string, jobTitle: string): InterviewSession {
  const session: InterviewSession = {
    id: randomUUID(),
    role,
    jobTitle,
    createdAt: new Date().toISOString(),
    questions: baseQuestions,
    turns: [],
    summary: 'No responses yet. The interview has started.',
  };

  sessions.set(session.id, session);
  return session;
}

export function getSession(sessionId: string): InterviewSession {
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`);
  }

  return session;
}

export function getSessionSummary(sessionId: string) {
  const session = getSession(sessionId);
  return {
    sessionId: session.id,
    role: session.role,
    summary: session.summary,
    averageScore: session.turns.length
      ? Math.round(
          session.turns.reduce((total, turn) => total + turn.score, 0) / session.turns.length,
        )
      : 0,
    totalTurns: session.turns.length,
  };
}

function determineFallbackScore(answer: string): number {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  if (words < 25) return 58;
  if (words < 50) return 72;
  if (words < 90) return 84;
  return 92;
}

async function generateOpenAIFeedback(question: string, answer: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return 'No OpenAI key configured. Using built-in evaluation fallback.';
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content:
          'You are an interview coach. Give concise but specific feedback. Mention strengths, gaps, and a clear next step for improvement.',
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nCandidate answer: ${answer}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  return content?.trim() || 'Feedback generated successfully.';
}

export async function submitTurn(
  sessionId: string,
  questionId: string,
  answer: string,
): Promise<InterviewSession> {
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`);
  }

  const question = session.questions.find((item) => item.id === questionId);

  if (!question) {
    throw new Error(`Question ${questionId} not found in session ${sessionId}`);
  }

  const fallbackScore = determineFallbackScore(answer);
  const feedback = await generateOpenAIFeedback(question.text, answer).catch(
    () => 'The answer was recorded. Use the score as a guiding signal and improve specificity with examples.',
  );

  const turn: InterviewTurn = {
    id: randomUUID(),
    questionId: question.id,
    question: question.text,
    answer,
    feedback: feedback.length > 260 ? `${feedback.slice(0, 257)}...` : feedback,
    score: fallbackScore,
    createdAt: new Date().toISOString(),
  };

  session.turns.push(turn);
  session.summary = buildSummary(session.turns);
  sessions.set(sessionId, session);

  return session;
}

export function resetSessionsForDemo(): void {
  sessions.clear();
}

export function listSessions(): InterviewSession[] {
  return Array.from(sessions.values());
}

export function getQuestionForSession(sessionId: string, questionId: string): Question | undefined {
  const session = sessions.get(sessionId);
  return session?.questions.find((question) => question.id === questionId);
}

export function countSessions(): number {
  return sessions.size;
}

export function seedDemoSession(): InterviewSession {
  const created = createSession('Senior Product Engineer', 'senior-product-engineer');
  sessions.set(created.id, created);
  return created;
}

