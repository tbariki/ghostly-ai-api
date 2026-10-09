# Ghostly AI API

A lightweight backend for an interview AI assistant. This starter project supports creating interview sessions, serving role-based questions, collecting candidate answers, and returning evaluation feedback. All API endpoints are protected by API keys.

## Features

- API key management (create, revoke, delete)
- Create interview sessions for a role or job title
- Serve role-aware question sets
- Accept candidate responses
- Score answers using a built-in heuristic
- Generate AI-assisted interview feedback when `OPENAI_API_KEY` is configured
- Return session summaries for recruiter or dashboard use
- Bearer token authentication on all interview endpoints

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

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Add an OpenAI key if you want AI-powered coaching feedback:

```bash
OPENAI_API_KEY=your_key_here
```

4. Run the app:

```bash
npm run dev
```

5. Check health (public endpoint):

```bash
curl http://localhost:4000/health
```

## API Key Management

All interview endpoints require an API key in the `Authorization: Bearer <key>` header.

### Generate a new API key

```http
POST /api/keys
Authorization: Bearer dev-admin-key
Content-Type: application/json

{
  "name": "My Interview Bot"
}
```

**Response:**

```json
{
  "id": "...",
  "key": "gai_...",
  "name": "My Interview Bot",
  "createdAt": "2026-10-09T..."
}
```

**Important:** Save the `key` value immediately. It is only shown once.

### List API keys

```http
GET /api/keys
Authorization: Bearer dev-admin-key
```

### Get API key details

```http
GET /api/keys/{id}
Authorization: Bearer dev-admin-key
```

### Revoke an API key

```http
POST /api/keys/{id}/revoke
Authorization: Bearer dev-admin-key
```

### Delete an API key

```http
DELETE /api/keys/{id}
Authorization: Bearer dev-admin-key
```

## Interview API

All endpoints require `Authorization: Bearer <your-api-key>` header.

### Create a session

```http
POST /api/interviews/sessions
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "role": "Senior Frontend Engineer",
  "jobTitle": "senior-frontend-engineer"
}
```

### List all sessions

```http
GET /api/interviews/sessions
Authorization: Bearer <your-api-key>
```

### Get role questions

```http
GET /api/interviews/roles/senior%20frontend%20engineer/questions
Authorization: Bearer <your-api-key>
```

### Submit an answer

```http
POST /api/interviews/sessions/:sessionId/turn
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "questionId": "q-engineer-1",
  "answer": "I led a migration that improved deploy reliability by reducing deployment errors and shortening release time."
}
```

### Get session

```http
GET /api/interviews/sessions/:sessionId
Authorization: Bearer <your-api-key>
```

### Get summary

```http
GET /api/interviews/sessions/:sessionId/summary
Authorization: Bearer <your-api-key>
```

## Development

For local development, use the default admin key: `dev-admin-key`

```bash
Authorization: Bearer dev-admin-key
```

## Notes

This API is intentionally built as a strong starter for Ghostly AI to evolve into a full interview intelligence platform with:

- persistent database storage (PostgreSQL/SQLite)
- role-based access control (RBAC)
- recruiter dashboards
- candidate scoring history
- multi-round interviews
- stronger AI evaluation models
- usage analytics and monitoring
