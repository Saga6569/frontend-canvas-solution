import { useState, useEffect, useCallback } from 'react';
import { useStore, useDispatch, getState } from '../store';
import { listSpaces, createSpace } from '../api/spaces';

type Space = { id: string; title: string };

export function Toolbar({
  onSpaceSelect,
  onReReadGraph,
}: {
  onSpaceSelect: (id: string) => void;
  onReReadGraph: () => void;
}) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const currentSpaceId = useStore((s) => s.spaceId);
  const saveStatus = useStore((s) => s.saveStatus);
  const saveError = useStore((s) => s.saveError);
  const saveErrorCode = useStore((s) => s.saveErrorCode);
  const isGenerating = useStore((s) => s.activeGenerations.size > 0);
  const dispatch = useDispatch();

  useEffect(() => {
    listSpaces().then((r) => {
      if (r.ok) setSpaces(r.data);
    });
  }, []);

  const handleCreate = useCallback(async () => {
    const title = newTitle.trim() || `Canvas ${spaces.length + 1}`;
    const result = await createSpace(title);
    if (!result.ok) return;
    setSpaces((prev) => [result.data, ...prev]);
    setNewTitle('');
    onSpaceSelect(result.data.id);
  }, [newTitle, spaces.length, onSpaceSelect]);

  const handleAddNode = useCallback(
    (nodeType: 'prompt' | 'generator' | 'result') => {
      const positions: Record<string, { x: number; y: number }> = {
        prompt: { x: 50, y: 200 },
        generator: { x: 350, y: 200 },
        result: { x: 650, y: 200 },
      };
      const data =
        nodeType === 'prompt'
          ? { text: '' }
          : { label: nodeType === 'generator' ? 'Generator' : 'Result' };

      dispatch({
        type: 'SET_GRAPH',
        payload: {
          nodes: [
            ...getState().nodes,
            {
              id: crypto.randomUUID(),
              type: nodeType,
              position: positions[nodeType] ?? { x: 100, y: 100 },
              data,
            },
          ],
        },
      });
    },
    [dispatch],
  );

  const isConflict = saveErrorCode === 'GRAPH_VERSION_CONFLICT';

  const statusText =
    saveStatus === 'saving'
      ? 'Saving...'
      : saveStatus === 'error'
        ? isConflict
          ? 'Conflict — server graph changed'
          : `Error: ${saveError}`
        : isGenerating
          ? 'Generating...'
          : 'Saved';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid #ddd',
        background: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <select
          value={currentSpaceId ?? ''}
          onChange={(e) => e.target.value && onSpaceSelect(e.target.value)}
          aria-label="Select space"
        >
          <option value="">Select space...</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New space title"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          aria-label="New space title"
        />
        <button onClick={handleCreate}>Create</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
        <button onClick={() => handleAddNode('prompt')}>+ Prompt</button>
        <button onClick={() => handleAddNode('generator')}>+ Generator</button>
        <button onClick={() => handleAddNode('result')}>+ Result</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 12,
            padding: '2px 6px',
            borderRadius: 4,
            background: saveStatus === 'error' ? '#fee' : isGenerating ? '#ffd' : '#efe',
            color: saveStatus === 'error' ? '#c00' : '#333',
          }}
        >
          {statusText}
        </span>
        {isConflict && (
          <button onClick={onReReadGraph} style={{ fontSize: 12 }}>
            Re-read graph
          </button>
        )}
      </div>
    </div>
  );
}
