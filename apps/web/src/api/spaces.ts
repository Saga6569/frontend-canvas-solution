import { request } from './client';
import type { SpaceData } from '../types';

export const listSpaces = () => request<SpaceData[]>('/api/spaces');

export const createSpace = (title: string) =>
  request<SpaceData>('/api/spaces', { method: 'POST', body: { title } });

export const getSpace = (id: string) => request<SpaceData>(`/api/spaces/${id}`);
