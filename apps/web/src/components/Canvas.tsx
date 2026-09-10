import { useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Node,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type IsValidConnection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore, useDispatch, getState } from '../store';
import { PromptNode } from './nodes/PromptNode';
import { GeneratorNode } from './nodes/GeneratorNode';
import { ResultNode } from './nodes/ResultNode';
import type { CanvasNode, CanvasEdge } from '../types';

const NODE_TYPES = {
  prompt: PromptNode,
  generator: GeneratorNode,
  result: ResultNode,
};

export function Canvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const viewport = useStore((s) => s.viewport);
  const dispatch = useDispatch();

  // O(1) node lookup by id
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // O(1) edge-source index: which source ids already have an output edge
  // Stored in ref so isValidConnection doesn't re-create on every edge change
  const edgeSourcesRef = useRef<Set<string>>(new Set());
  useMemo(() => {
    const next = new Set<string>();
    for (let i = 0; i < edges.length; i++) next.add(edges[i].source);
    edgeSourcesRef.current = next;
  }, [edges]);

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const source = nodeMap.get(connection.source);
      const target = nodeMap.get(connection.target);
      if (!source || !target) return false;
      if (source.type === 'prompt' && target.type === 'generator') return true;
      if (source.type === 'generator' && target.type === 'result') {
        return !edgeSourcesRef.current.has(source.id);
      }
      return false;
    },
    [nodeMap],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const next = applyNodeChanges(changes, nodes) as CanvasNode[];
      dispatch({ type: 'SET_GRAPH', payload: { nodes: next } });
    },
    [nodes, dispatch],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const next = applyEdgeChanges(changes, edges) as CanvasEdge[];
      dispatch({ type: 'SET_GRAPH', payload: { edges: next } });
    },
    [edges, dispatch],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const source = nodeMap.get(connection.source);
      const target = nodeMap.get(connection.target);
      if (!source || !target) return;

      const allowed =
        (source.type === 'prompt' && target.type === 'generator') ||
        (source.type === 'generator' && target.type === 'result');
      if (!allowed) return;

      // Each target can have only one incoming edge
      for (let i = 0; i < edges.length; i++) {
        if (edges[i].target === target.id) return;
      }
      // Generator can have only one result output
      if (source.type === 'generator' && edgeSourcesRef.current.has(source.id)) return;

      const next = addEdge({ ...connection, id: crypto.randomUUID() }, edges) as CanvasEdge[];
      dispatch({ type: 'SET_GRAPH', payload: { edges: next } });
    },
    [nodeMap, edges, dispatch],
  );

  const onNodeDragStop = useCallback(() => {
    dispatch({ type: 'SET_DIRTY', value: true });
  }, [dispatch]);

  const onMoveEnd = useCallback(
    (_: unknown, vp: { x: number; y: number; zoom: number }) => {
      dispatch({ type: 'SET_GRAPH', payload: { viewport: vp } });
    },
    [dispatch],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = new Set(deleted.map((n) => n.id));
      const remainingNodes = nodes.filter((n) => !deletedIds.has(n.id));
      const remainingEdges = edges.filter(
        (e) => !deletedIds.has(e.source) && !deletedIds.has(e.target),
      );

      const gens = getState().activeGenerations;
      for (const [genNodeId, entry] of gens) {
        if (deletedIds.has(genNodeId) || deletedIds.has(entry.resultNodeId)) {
          dispatch({ type: 'REMOVE_GENERATION', nodeId: genNodeId });
        }
      }

      dispatch({
        type: 'SET_GRAPH',
        payload: { nodes: remainingNodes, edges: remainingEdges },
      });
    },
    [nodes, edges, dispatch],
  );

  // Stable node refs: only re-create objects whose data actually changed
  const nodeCache = useRef(new Map<string, CanvasNode>());
  const flowNodes = useMemo(() => {
    const prev = nodeCache.current;
    const next = new Map<string, CanvasNode>();
    const result: CanvasNode[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const cached = prev.get(n.id);
      if (
        cached &&
        cached.data === n.data &&
        cached.position === n.position &&
        cached.type === n.type
      ) {
        next.set(n.id, cached);
      } else {
        next.set(n.id, { ...n, data: { ...n.data } } as CanvasNode);
      }
      result.push(next.get(n.id)!);
    }
    nodeCache.current = next;
    return result;
  }, [nodes]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={edges}
      viewport={viewport}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      onMoveEnd={onMoveEnd}
      onNodesDelete={onNodesDelete}
      isValidConnection={isValidConnection}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
