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

export type InterviewSummary = {
  sessionId: string;
  role: string;
  summary: string;
  averageScore: number;
  totalTurns: number;
};

const sessions = new Map<string, InterviewSession>();

const questionBank: Record<string, Question[]> = {
  default: [
    {
      id: 'q-default-1',
      text: 'Tell me about a time you solved a problem that required initiative.',
      category: 'Behavioral',
    },
    {
      id: 'q-default-2',
      text: 'How do you work with people whose priorities differ from your own?',
      category: 'Collaboration',
    },
    {
      id: 'q-default-3',
      text: 'What does success look like to you in this role?',
      category: 'Motivation',
    },
  ],
  engineer: [
    {
      id: 'q-engineer-1',
      text: 'Tell me about a technical challenge you solved and how you made the decision.',
      category: 'Technical',
    },
    {
      id: 'q-engineer-2',
      text: 'How do you balance speed, quality, and maintainability in product work?',
      category: 'Engineering Judgment',
    },
    {
      id: 'q-engineer-3',
      text: 'Describe a time you improved a system or workflow for your team.',
      category: 'Impact',
    },
    {
      id: 'q-engineer-4',
      text: 'How do you handle ambiguity when requirements are still changing?',
      category: 'Problem Solving',
    },
  ],
  product: [
    {
      id: 'q-product-1',
      text: 'Describe a product decision you made that was not obvious at the start but improved outcomes.',
      category: 'Product Thinking',
    },
    {
      id: 'q-product-2',
      text: 'How do you prioritize between user needs, business goals, and technical constraints?',
      category: 'Prioritization',
    },
    {
      id: 'q-product-3',
      text: 'Tell me about a time you aligned stakeholders with competing opinions.',
      category: 'Stakeholder Management',
    },
  ],
  data: [
    {
      id: 'q-data-1',
      text: 'Walk me through a data analysis project where your findings changed a decision.',
      category: 'Analytics',
    },
    {
      id: 'q-data-2',
      text: 'How do you validate that a model or metric is actually trustworthy?',
      category: 'Methodology',
    },
    {
      id: 'q-data-3',
      text: 'How do you communicate complex insights to non-technical stakeholders?',
      category: 'Communication',
    },
  ],
  design: [
    {
      id: 'q-design-1',
      text: 'Describe a design decision that improved usability significantly.',
      category: 'Design',
    },
    {
      id: 'q-design-2',
      text: 'How do you incorporate user research into your design process?',
      category: 'Research',
    },
    {
      id: 'q-design-3',
      text: 'How do you decide when to iterate versus when to push for a bigger redesign?',
      category: 'Judgment',
    },
  ],
  sales: [
    {
      id: 'q-sales-1',
      text: 'Describe a time you won a deal by understanding the customer’s constraints better than the competition.',
      category: 'Sales',
    },
    {
      id: 'q-sales-2',
      text: 'How do you build trust quickly with a skeptical buyer?',
      category: 'Relationship Building',
    },
    {
      id: 'q-sales-3',
      text: 'Tell me about a time you turned a lost opportunity into a learning moment.',
      category: 'Resilience',
    },
  ],
  customer_support: [
    {
      id: 'q-support-1',
      text: 'Tell me about a time you de-escalated a difficult customer interaction.',
      category: 'Customer Experience',
    },
    {
      id: 'q-support-2',
      text: 'How do you balance empathy with operational efficiency?',
      category: 'Operations',
    },
    {
      id: 'q-support-3',
      text: 'What systems or habits help you keep service quality consistent at scale?',
      category: 'Scalability',
    },
  ],
};

function determineRoleQuestions(role: string): Question[] {
  const normalized = role.toLowerCase();

  if (normalized.includes('engineer') || normalized.includes('developer') || normalized.includes('software')) {
    return questionBank.engineer;
  }

  if (normalized.includes('product')) {
    return questionBank.product;
  }

  if (normalized.includes('data') || normalized.includes('analyst')) {
    return questionBank.data;
  }

  if (normalized.includes('design') || normalized.includes('ux')) {
    return questionBank.design;
  }

  if (normalized.includes('sales')) {
    return questionBank.sales;
  }

  if (normalized.includes('support') || normalized.includes('customer')) {
    return questionBank.customer_support;
  }

  return questionBank.default;
}

function buildSummary(turns: InterviewTurn[]): string {
  if (turns.length === 0) {
    return 'No responses yet. The interview has started.';
  }

  const averageScore = Math.round(
    turns.reduce((total, turn) => total + turn.score, 0) / turns.length,
  );

  const latest = turns[turns.length - 1];

  return `Average score: ${averageScore}/100. Latest answer: ${latest.feedback}`;
}

function computeAnswerScore(answer: string): number {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;

  if (words < 20) return 58;
  if (words < 45) return 72;
  if (words < 80) return 84;
  return 92;
}

async function generateOpenAIFeedback(question: string, answer: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return 'No OpenAI key configured. Using the built-in evaluation model for now.';
  }

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional interview coach. Give concise but useful feedback with strengths, gaps, and one next step the candidate can improve immediately.',
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nCandidate answer: ${answer}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    return content?.trim() || 'Feedback generated successfully.';
  } catch {
    return 'AI feedback could not be generated, so the fallback evaluation was used instead.';
  }
}

export function createSession(role: string, jobTitle: string): InterviewSession {
  const session: InterviewSession = {
    id: randomUUID(),
    role,
    jobTitle,
    createdAt: new Date().toISOString(),
    questions: determineRoleQuestions(role),
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

export function getQuestionsForRole(role: string): Question[] {
  return determineRoleQuestions(role);
}

export function getSessionSummary(sessionId: string): InterviewSummary {
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

  const score = computeAnswerScore(answer);
  const feedback = await generateOpenAIFeedback(question.text, answer).catch(
    () => 'The answer was recorded. Use the score as a signal and improve with more concrete examples and outcomes.',
  );

  const turn: InterviewTurn = {
    id: randomUUID(),
    questionId: question.id,
    question: question.text,
    answer,
    feedback: feedback.length > 260 ? `${feedback.slice(0, 257)}...` : feedback,
    score,
    createdAt: new Date().toISOString(),
  };

  session.turns.push(turn);
  session.summary = buildSummary(session.turns);
  sessions.set(sessionId, session);

  return session;
}

export function listSessions(): InterviewSession[] {
  return Array.from(sessions.values());
}

export function resetSessionsForDemo(): void {
  sessions.clear();
}

export function countSessions(): number {
  return sessions.size;
}

export function seedDemoSession(): InterviewSession {
  const created = createSession('Senior Product Engineer', 'senior-product-engineer');
  sessions.set(created.id, created);
  return created;
}

