import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useDispatch } from '../../store';

export function PromptNode({ id, data }: NodeProps & { data: { text: string } }) {
  const dispatch = useDispatch();

  return (
    <div style={{ padding: 8, minWidth: 180 }}>
      <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
        Prompt
      </label>
      <textarea
        value={data.text}
        placeholder="Describe the image..."
        onChange={(e) =>
          dispatch({ type: 'UPDATE_NODE_DATA', nodeId: id, data: { text: e.target.value } })
        }
        onPointerDown={(e) => e.stopPropagation()}
        style={{ width: '100%', minHeight: 60, resize: 'vertical', fontSize: 14 }}
      />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
