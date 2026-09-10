import { useCallback, useEffect, useRef } from 'react';
import { useStore, getDispatch, getState } from '../store';
import { startGeneration, pollGeneration } from '../api/generations';
import { flushSave } from './useAutoSave';

export function useGeneration() {
  const spaceId = useStore((s) => s.spaceId);
  const isGenerating = (nodeId: string) => getState().activeGenerations.has(nodeId);
  const dispatch = getDispatch();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const start = useCallback(
    async (nodeId: string, scenario: 'success' | 'failure') => {
      if (!spaceId) return;

      // Flush pending saves before generation
      const saved = await flushSave();
      if (!saved) return;

      const etag = getState().etag;
      if (!etag) return;

      // Find connected result node
      const edges = getState().edges;
      const resultEdge = edges.find((e) => e.source === nodeId);
      if (!resultEdge) return;

      const resultNodeId = resultEdge.target;

      // Abort existing generation for this node
      const existing = getState().activeGenerations.get(nodeId);
      if (existing) existing.abort.abort();

      const abort = new AbortController();
      dispatch({ type: 'ADD_GENERATION', nodeId, generationId: '', resultNodeId, abort });

      const result = await startGeneration(spaceId, { nodeId, graphETag: etag, scenario });

      if (!mountedRef.current) return;

      if (!result.ok) {
        dispatch({ type: 'REMOVE_GENERATION', nodeId });
        return;
      }

      const gen = result.data;
      dispatch({ type: 'REMOVE_GENERATION', nodeId });

      if (gen.status === 'succeeded' && gen.imageUrl) {
        dispatch({
          type: 'SET_GENERATION_RESULT',
          nodeId,
          resultNodeId: gen.resultNodeId,
          imageUrl: gen.imageUrl,
        });
        return;
      }

      if (gen.status === 'failed') return;

      // Processing — start polling
      const pollAbort = new AbortController();
      dispatch({
        type: 'ADD_GENERATION',
        nodeId,
        generationId: gen.id,
        resultNodeId: gen.resultNodeId,
        abort: pollAbort,
      });

      const pollResult = await pollGeneration(spaceId, gen.id, 1500, pollAbort.signal);
      if (!mountedRef.current || !pollResult.ok) return;

      if (pollResult.data.status === 'succeeded' && pollResult.data.imageUrl) {
        dispatch({
          type: 'SET_GENERATION_RESULT',
          nodeId,
          resultNodeId: gen.resultNodeId,
          imageUrl: pollResult.data.imageUrl,
        });
      } else {
        dispatch({ type: 'REMOVE_GENERATION', nodeId });
      }
    },
    [spaceId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const stop = useCallback((nodeId: string) => {
    dispatch({ type: 'REMOVE_GENERATION', nodeId });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { start, stop, isGenerating };
}
