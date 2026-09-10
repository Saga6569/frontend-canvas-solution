import { request } from './client';
import type { Static } from '@sinclair/typebox';
import { Config } from '@canvas/contracts';

export type ConfigData = Static<typeof Config>;

export const getConfig = () => request<ConfigData>('/api/config');
