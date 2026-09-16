import { config, useMock } from '../config';
import { createClaudeBackend } from './claude';
import { createGeminiBackend } from './gemini';
import { mockBackend } from './mock';
import type { AgentBackend } from './types';

export const backend: AgentBackend = useMock
  ? mockBackend
  : config.provider === 'claude'
    ? createClaudeBackend(config.claude)
    : createGeminiBackend(config.gemini);
