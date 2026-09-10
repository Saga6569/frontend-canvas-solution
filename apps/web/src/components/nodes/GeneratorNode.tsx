import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useDispatch } from '../../store';
import { useGeneration } from '../../hooks/useGeneration';

export function GeneratorNode({ id, data }: NodeProps & { data: { label: string } }) {
  const dispatch = useDispatch();
  const { start, stop, isGenerating } = useGeneration();
  const generating = isGenerating(id);

  return (
    <div style={{ padding: 8, minWidth: 160 }}>
      <Handle type="target" position={Position.Left} />
      <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
        Generator
      </label>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => start(id, 'success')} disabled={generating} style={{ flex: 1 }}>
          {generating ? 'Generating...' : 'Generate'}
        </button>
        <button
          onClick={() => start(id, 'failure')}
          disabled={generating}
          title="Test failure scenario"
        >
          Fail
        </button>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
