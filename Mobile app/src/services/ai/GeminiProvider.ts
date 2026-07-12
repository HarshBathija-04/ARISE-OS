/**
 * SOLO OS — Gemini (Google) ECHO provider.
 * Thin marker over the remote base; the model + key live in the edge function.
 */
import { RemoteAIProvider } from './RemoteAIProvider';

export class GeminiProvider extends RemoteAIProvider {
  readonly name = 'gemini';
}
