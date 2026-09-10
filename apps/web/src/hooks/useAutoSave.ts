import { useEffect, useRef } from 'react';
import { useStore, getDispatch, getState, serializeGraph } from '../store';
import { putGraph } from '../api/graph';

const DEBOUNCE_MS = 500;

// Module-level refs (shared across hook instances — only one App mounts)
let timerRef: ReturnType<typeof setTimeout> | undefined;
let inflightRef = false;
let debouncingRef = false;

async function runSave() {
  debouncingRef = false;
  const spaceId = getState().spaceId;
  if (!spaceId || inflightRef) return;

  inflightRef = true;
  getDispatch()({ type: 'SAVE_START' });

  const graph = serializeGraph();
  const etag = getState().etag;
  if (!etag) {
    getDispatch()({ type: 'SAVE_ERROR', message: 'No ETag' });
    inflightRef = false;
    return;
  }

  const result = await putGraph(spaceId, graph, etag);
  inflightRef = false;

  if (!result.ok) {
    getDispatch()({ type: 'SAVE_ERROR', message: result.error.message, code: result.error.code });
  } else {
    getDispatch()({ type: 'SAVE_SUCCESS', etag: result.data.etag });
  }
}

/** Flush debounce and wait for in-flight save. Called by generation flow. */
export async function flushSave(): Promise<boolean> {
  if (timerRef !== undefined) {
    clearTimeout(timerRef);
    timerRef = undefined;
    debouncingRef = false;
  }

  const s = getState();
  if (!s.dirty && !inflightRef) return true;

  if (s.dirty && s.spaceId) {
    inflightRef = true;
    getDispatch()({ type: 'SAVE_START' });

    const graph = serializeGraph();
    const etag = s.etag;
    if (!etag) {
      inflightRef = false;
      return false;
    }

    const result = await putGraph(s.spaceId, graph, etag);
    inflightRef = false;

    if (!result.ok) {
      getDispatch()({ type: 'SAVE_ERROR', message: result.error.message, code: result.error.code });
      return false;
    }
    getDispatch()({ type: 'SAVE_SUCCESS', etag: result.data.etag });
  }

  while (inflightRef) {
    await new Promise((r) => setTimeout(r, 50));
  }
  return getState().saveStatus !== 'error';
}

export function useAutoSave() {
  const dirty = useStore((s) => s.dirty);
  const saveStatus = useStore((s) => s.saveStatus);

  useEffect(() => {
    if (!dirty || saveStatus === 'saving' || debouncingRef) return;

    debouncingRef = true;
    timerRef = setTimeout(runSave, DEBOUNCE_MS);

    return () => {
      if (timerRef !== undefined) clearTimeout(timerRef);
      debouncingRef = false;
    };
  }, [dirty, saveStatus]); // eslint-disable-line react-hooks/exhaustive-deps
}
