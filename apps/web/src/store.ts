import { useSyncExternalStore, useCallback } from 'react';
import type { CanvasNode, CanvasEdge, SaveStatus, GraphPayload } from './types';

// ---- types ----

type State = {
  spaceId: string | null;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: { x: number; y: number; zoom: number };
  etag: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
  saveErrorCode: string | null;
  dirty: boolean;
  changedDuringSave: boolean;
  activeGenerations: Map<
    string,
    { generationId: string; resultNodeId: string; abort: AbortController }
  >;
};

type Action =
  | { type: 'SET_SPACE'; spaceId: string }
  | {
      type: 'LOAD_GRAPH';
      payload: {
        nodes: CanvasNode[];
        edges: CanvasEdge[];
        viewport: State['viewport'];
        etag: string;
      };
    }
  | { type: 'SET_GRAPH'; payload: Partial<Pick<State, 'nodes' | 'edges' | 'viewport'>> }
  | { type: 'UPDATE_NODE_DATA'; nodeId: string; data: Record<string, unknown> }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; etag: string }
  | { type: 'SAVE_ERROR'; message: string; code?: string }
  | { type: 'SET_DIRTY'; value: boolean }
  | {
      type: 'ADD_GENERATION';
      nodeId: string;
      generationId: string;
      resultNodeId: string;
      abort: AbortController;
    }
  | { type: 'REMOVE_GENERATION'; nodeId: string }
  | { type: 'SET_GENERATION_RESULT'; nodeId: string; resultNodeId: string; imageUrl?: string }
  | { type: 'CLEAR' };

// ---- state ----

const initialState: State = {
  spaceId: null,
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  etag: null,
  saveStatus: 'idle',
  saveError: null,
  saveErrorCode: null,
  dirty: false,
  changedDuringSave: false,
  activeGenerations: new Map(),
};

// ---- reducer ----

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SPACE':
      return { ...state, spaceId: action.spaceId };

    case 'LOAD_GRAPH':
      return {
        ...state,
        nodes: action.payload.nodes,
        edges: action.payload.edges,
        viewport: action.payload.viewport,
        etag: action.payload.etag,
        dirty: false,
        changedDuringSave: false,
        saveStatus: 'idle',
        saveError: null,
        saveErrorCode: null,
      };

    case 'SET_GRAPH': {
      const next: State = {
        ...state,
        dirty: true,
        changedDuringSave: state.saveStatus === 'saving' ? true : state.changedDuringSave,
      };
      if (action.payload.nodes) next.nodes = action.payload.nodes;
      if (action.payload.edges) next.edges = action.payload.edges;
      if (action.payload.viewport) next.viewport = action.payload.viewport;
      return next;
    }

    case 'UPDATE_NODE_DATA': {
      const nodes = state.nodes.map((n) =>
        n.id === action.nodeId ? { ...n, data: { ...n.data, ...action.data } } : n,
      );
      return {
        ...state,
        nodes,
        dirty: true,
        changedDuringSave: state.saveStatus === 'saving' ? true : state.changedDuringSave,
      };
    }

    case 'SAVE_START':
      return {
        ...state,
        saveStatus: 'saving' as const,
        saveError: null,
        saveErrorCode: null,
        changedDuringSave: false,
      };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        saveStatus: 'idle' as const,
        etag: action.etag,
        saveError: null,
        saveErrorCode: null,
        dirty: state.changedDuringSave,
        changedDuringSave: false,
      };

    case 'SAVE_ERROR':
      return {
        ...state,
        saveStatus: 'error' as const,
        saveError: action.message,
        saveErrorCode: action.code ?? null,
      };

    case 'SET_DIRTY':
      return { ...state, dirty: action.value };

    case 'ADD_GENERATION': {
      const next = new Map(state.activeGenerations);
      next.set(action.nodeId, {
        generationId: action.generationId,
        resultNodeId: action.resultNodeId,
        abort: action.abort,
      });
      return { ...state, activeGenerations: next };
    }

    case 'REMOVE_GENERATION': {
      const entry = state.activeGenerations.get(action.nodeId);
      entry?.abort.abort();
      const next = new Map(state.activeGenerations);
      next.delete(action.nodeId);
      return { ...state, activeGenerations: next };
    }

    case 'SET_GENERATION_RESULT': {
      const nodes = state.nodes.map((n) => {
        if (n.id !== action.resultNodeId) return n;
        return { ...n, data: { ...n.data, imageUrl: action.imageUrl } };
      });
      const next = new Map(state.activeGenerations);
      next.delete(action.nodeId);
      return { ...state, nodes, activeGenerations: next };
    }

    case 'CLEAR':
      return initialState;

    default:
      return state;
  }
}

// ---- reactive store ----

let state: State = initialState;
let listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function dispatch(action: Action) {
  state = reducer(state, action);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

// ---- hooks ----

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  );
}

export function useDispatch() {
  return useCallback(dispatch, []);
}

export function getDispatch() {
  return dispatch;
}

export function getState() {
  return state;
}

// ---- graph serialization (single pass over nodes + edges, minimal allocations) ----

export function serializeGraph(): GraphPayload {
  const s = getState();
  const nodes = [];
  // One pass — build API nodes, skip RF internals and UI-only fields in-place
  for (let i = 0; i < s.nodes.length; i++) {
    const n = s.nodes[i];
    const d = n.data as Record<string, unknown>;
    nodes.push({
      id: n.id,
      type: n.type as 'prompt' | 'generator' | 'result',
      position: n.position,
      data: n.type === 'prompt' ? { text: d.text ?? '' } : { label: d.label ?? '' },
    });
  }
  const edges = [];
  for (let i = 0; i < s.edges.length; i++) {
    const e = s.edges[i];
    edges.push({ id: e.id, source: e.source, target: e.target });
  }
  return { nodes, edges, viewport: s.viewport } as GraphPayload;
}
