import { randomUUID } from 'crypto';
import crypto from 'crypto';

export type ApiKey = {
  id: string;
  key: string;
  hashedKey: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
};

export type ApiKeyCreateRequest = {
  name: string;
};

export type ApiKeyResponse = {
  id: string;
  key: string;
  name: string;
  createdAt: string;
};

const apiKeys = new Map<string, ApiKey>();
const keyIndex = new Map<string, string>();

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(name: string): ApiKeyResponse {
  const id = randomUUID();
  const key = `gai_${randomUUID().replace(/-/g, '')}`;
  const hashedKey = hashKey(key);

  const apiKey: ApiKey = {
    id,
    key,
    hashedKey,
    name,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    isActive: true,
  };

  apiKeys.set(id, apiKey);
  keyIndex.set(hashedKey, id);

  return {
    id,
    key,
    name,
    createdAt: apiKey.createdAt,
  };
}

export function validateApiKey(key: string): { valid: boolean; id?: string } {
  const hashedKey = hashKey(key);
  const id = keyIndex.get(hashedKey);

  if (!id) {
    return { valid: false };
  }

  const apiKey = apiKeys.get(id);

  if (!apiKey || !apiKey.isActive) {
    return { valid: false };
  }

  apiKey.lastUsedAt = new Date().toISOString();
  apiKeys.set(id, apiKey);

  return { valid: true, id };
}

export function listApiKeys(): Array<Omit<ApiKey, 'key'>> {
  return Array.from(apiKeys.values()).map(({ key, ...rest }) => rest);
}

export function getApiKey(id: string): Omit<ApiKey, 'key'> | null {
  const apiKey = apiKeys.get(id);
  if (!apiKey) return null;

  const { key, ...rest } = apiKey;
  return rest;
}

export function revokeApiKey(id: string): boolean {
  const apiKey = apiKeys.get(id);
  if (!apiKey) return false;

  apiKey.isActive = false;
  apiKeys.set(id, apiKey);
  return true;
}

export function deleteApiKey(id: string): boolean {
  const apiKey = apiKeys.get(id);
  if (!apiKey) return false;

  keyIndex.delete(apiKey.hashedKey);
  apiKeys.delete(id);
  return true;
}

export function resetApiKeysForDemo(): void {
  apiKeys.clear();
  keyIndex.clear();
}
