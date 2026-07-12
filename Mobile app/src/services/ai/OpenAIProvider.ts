/**
 * SOLO OS — OpenAI ECHO provider.
 * Thin marker over the remote base; the model + key live in the edge function.
 */
import { RemoteAIProvider } from './RemoteAIProvider';

export class OpenAIProvider extends RemoteAIProvider {
  readonly name = 'openai';
}
