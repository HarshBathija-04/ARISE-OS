/**
 * SOLO OS — Claude (Anthropic) ECHO provider.
 * Thin marker over the remote base; the model + key live in the edge function.
 */
import { RemoteAIProvider } from './RemoteAIProvider';

export class ClaudeProvider extends RemoteAIProvider {
  readonly name = 'claude';
}
