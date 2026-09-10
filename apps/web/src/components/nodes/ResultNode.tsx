import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

export function ResultNode({ data }: NodeProps & { data: { label: string; imageUrl?: string } }) {
  return (
    <div style={{ padding: 8, minWidth: 180 }}>
      <Handle type="target" position={Position.Left} />
      <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
        Result
      </label>
      {data.imageUrl ? (
        <img
          src={data.imageUrl}
          alt="Generated"
          style={{ maxWidth: 200, maxHeight: 200, display: 'block' }}
        />
      ) : (
        <div style={{ padding: 8, textAlign: 'center', opacity: 0.5 }}>{data.label}</div>
      )}
    </div>
  );
}
