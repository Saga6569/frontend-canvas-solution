import { useCallback, useEffect, useRef } from 'react';
import { getDispatch, getState } from '../store';
import { getGraph } from '../api/graph';
import { listGenerations, pollGeneration } from '../api/generations';
import type { CanvasNode } from '../types';

export function useGraphLoader() {
  const dispatch = getDispatch();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (spaceId: string) => {
    dispatch({ type: 'SET_SPACE', spaceId });

    const result = await getGraph(spaceId);
    if (!mountedRef.current || !result.ok) return;

    const { graph, etag } = result.data;

    const nodes: CanvasNode[] = graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    }));

    const edges = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    dispatch({
      type: 'LOAD_GRAPH',
      payload: { nodes, edges, viewport: graph.viewport, etag },
    });

    await restoreGenerations(spaceId, nodes);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function restoreGenerations(spaceId: string, nodes: CanvasNode[]) {
    const genResult = await listGenerations(spaceId);
    if (!mountedRef.current || !genResult.ok) return;

    const generatorIds = new Set(nodes.filter((n) => n.type === 'generator').map((n) => n.id));

    const seen = new Set<string>();
    for (const gen of genResult.data) {
      if (!generatorIds.has(gen.nodeId) || seen.has(gen.nodeId)) continue;
      seen.add(gen.nodeId);

      if (!nodes.some((n) => n.id === gen.resultNodeId)) continue;

      if (gen.status === 'succeeded' && gen.imageUrl) {
        dispatch({
          type: 'SET_GENERATION_RESULT',
          nodeId: gen.nodeId,
          resultNodeId: gen.resultNodeId,
          imageUrl: gen.imageUrl,
        });
      } else if (gen.status === 'processing') {
        const abort = new AbortController();
        dispatch({
          type: 'ADD_GENERATION',
          nodeId: gen.nodeId,
          generationId: gen.id,
          resultNodeId: gen.resultNodeId,
          abort,
        });
        pollRestored(spaceId, gen.id, gen.nodeId);
      }
    }
  }

  async function pollRestored(spaceId: string, generationId: string, nodeId: string) {
    const entry = getState().activeGenerations.get(nodeId);
    if (!entry) return;

    const result = await pollGeneration(spaceId, generationId, 1500, entry.abort.signal);
    if (!mountedRef.current || !result.ok) return;

    if (result.data.status === 'succeeded' && result.data.imageUrl) {
      dispatch({
        type: 'SET_GENERATION_RESULT',
        nodeId,
        resultNodeId: entry.resultNodeId,
        imageUrl: result.data.imageUrl,
      });
    } else if (result.data.status === 'failed') {
      dispatch({ type: 'REMOVE_GENERATION', nodeId });
    }
  }

  return load;
}
