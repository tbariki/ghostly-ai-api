# Ghostly AI API

A lightweight backend for an interview AI assistant. This project provides the API foundation for creating interview sessions, collecting candidate answers, evaluating responses, and returning coaching feedback.

## Features

- Create interview sessions for a role or job title
- Serve a curated set of interview questions
- Accept candidate answers
- Evaluate each answer with a score and feedback
- Return session summaries for dashboards or frontend clients
- Optional OpenAI-powered feedback when `OPENAI_API_KEY` is present
- Graceful fallback when no AI key is configured

## Tech Stack

- Node.js
- TypeScript
- Express
- OpenAI API integration
- Zod validation

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

3. Optionally add your OpenAI key:

   ```bash
   OPENAI_API_KEY=your_key_here
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

5. Health check:

   ```bash
   curl http://localhost:4000/health
   ```

## API Overview

### Create interview session

```http
POST /api/interviews/sessions
Content-Type: application/json

{
  "role": "Senior Frontend Engineer",
  "jobTitle": "senior-frontend-engineer"
}
```

### Submit an answer

```http
POST /api/interviews/sessions/:sessionId/turn
Content-Type: application/json

{
  "questionId": "q-1",
  "answer": "I focus on the user problem first..."
}
```

### Get session details

```http
GET /api/interviews/sessions/:sessionId
```

### Get summary

```http
GET /api/interviews/sessions/:sessionId/summary
```

## Notes

This is a working starter API intended to be expanded with authentication, persistence, real database storage, and more advanced evaluation logic.
