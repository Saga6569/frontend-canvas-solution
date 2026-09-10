import { request } from './client';
import type { GenerationData, GenerationRequest } from '../types';

export type { GenerationData };

export const listGenerations = (spaceId: string, signal?: AbortSignal) =>
  request<GenerationData[]>(`/api/spaces/${spaceId}/generations`, { signal });

export const startGeneration = (spaceId: string, body: GenerationRequest) =>
  request<GenerationData>(`/api/spaces/${spaceId}/generations`, {
    method: 'POST',
    body,
    idempotencyKey: crypto.randomUUID(),
  });

export const getGeneration = (spaceId: string, generationId: string, signal?: AbortSignal) =>
  request<GenerationData>(`/api/spaces/${spaceId}/generations/${generationId}`, { signal });

export async function pollGeneration(
  spaceId: string,
  generationId: string,
  intervalMs: number,
  signal?: AbortSignal,
) {
  while (!signal?.aborted) {
    const result = await getGeneration(spaceId, generationId, signal);
    if (!result.ok) return result;
    if (result.data.status !== 'processing') return result;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, intervalMs);
      signal?.addEventListener('abort', () => clearTimeout(timer), { once: true });
    });
  }
  return {
    ok: false as const,
    headers: new Headers(),
    error: { code: 'ABORTED', message: 'Polling aborted' },
  };
}
