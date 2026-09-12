import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { config } from '../config/index.js';
import { logger } from '../middleware/logger.js';
import { CustomError } from '../middleware/errorHandler.js';

export class LlmClient {
  private model: ChatGoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      logger.warn('WARNING: Gemini API Key is missing. The agent will run in simulation mode. Set GEMINI_API_KEY in backend/.env to run real LLM queries.');
      return;
    }

    try {
      this.model = new ChatGoogleGenerativeAI({
        apiKey: apiKey,
        model: 'gemini-3.5-flash-lite',
        temperature: 0.2,
      });
      logger.info('Gemini LLM Client initialized successfully using gemini-3.5-flash-lite');
    } catch (error: any) {
      logger.error(`Failed to initialize Gemini LLM Client: ${error.message}`);
    }
  }

  getModel(customApiKey?: string): ChatGoogleGenerativeAI {
    if (customApiKey) {
      return new ChatGoogleGenerativeAI({
        apiKey: customApiKey,
        model: 'gemini-3.5-flash-lite',
        temperature: 0.2,
      });
    }

    if (!this.model) {
      const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new CustomError(
          'Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env or your settings.',
          500
        );
      }
      this.model = new ChatGoogleGenerativeAI({
        apiKey: apiKey,
        model: 'gemini-3.5-flash-lite',
        temperature: 0.2,
      });
    }
    return this.model;
  }

  isConfigured(): boolean {
    return this.model !== null;
  }
}

export const llmClient = new LlmClient();
