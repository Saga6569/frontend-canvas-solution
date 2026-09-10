import { request } from './client';
import type { GraphData } from '../types';

export async function getGraph(spaceId: string, signal?: AbortSignal) {
  const r = await request<GraphData>(`/api/spaces/${spaceId}/graph`, { signal });
  if (!r.ok) return r;
  const etag = r.headers.get('etag');
  if (!etag)
    return {
      ok: false as const,
      headers: r.headers,
      error: { code: 'NO_ETAG', message: 'Missing ETag' },
    };
  return { ok: true as const, data: { graph: r.data, etag }, headers: r.headers };
}

export async function putGraph(spaceId: string, graph: GraphData, etag: string) {
  const r = await request<unknown>(`/api/spaces/${spaceId}/graph`, {
    method: 'PUT',
    body: graph,
    headers: { 'If-Match': etag },
  });
  if (!r.ok) return r;
  const newEtag = r.headers.get('etag');
  if (!newEtag)
    return {
      ok: false as const,
      headers: r.headers,
      error: { code: 'NO_ETAG', message: 'Missing ETag' },
    };
  return { ok: true as const, data: { etag: newEtag }, headers: r.headers };
}
