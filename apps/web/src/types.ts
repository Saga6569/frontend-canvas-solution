import type { Node, Edge } from '@xyflow/react';
import type { GraphData, SpaceData, GenerationData, GenerationRequest } from '@canvas/contracts';
import type { Result, ApiError } from './api/client';

export type { GraphData, SpaceData, GenerationData, GenerationRequest };
export type { Result, ApiError };

// Simple node/edge types - data is validated at API boundary
export type CanvasNode = Node;
export type CanvasEdge = Edge;

export type GraphPayload = GraphData;
export type SaveStatus = 'idle' | 'debouncing' | 'saving' | 'error';
