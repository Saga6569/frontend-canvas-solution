import { useCallback, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { useStore, useDispatch, getState } from './store';
import { useAutoSave } from './hooks/useAutoSave';
import { useGraphLoader } from './hooks/useGraphLoader';

export default function App() {
  const spaceId = useStore((s) => s.spaceId);
  const dispatch = useDispatch();
  useAutoSave();
  const loadGraph = useGraphLoader();

  // Restore space from URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) loadGraph(hash);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup generations on unmount
  useEffect(() => {
    return () => {
      for (const [nodeId] of getState().activeGenerations) {
        dispatch({ type: 'REMOVE_GENERATION', nodeId });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpaceSelect = useCallback(
    (id: string) => {
      // Cleanup existing generations when switching spaces
      for (const [nodeId] of getState().activeGenerations) {
        dispatch({ type: 'REMOVE_GENERATION', nodeId });
      }
      window.location.hash = id;
      loadGraph(id);
    },
    [loadGraph], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleReReadGraph = useCallback(() => {
    if (spaceId) loadGraph(spaceId);
  }, [spaceId, loadGraph]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar onSpaceSelect={handleSpaceSelect} onReReadGraph={handleReReadGraph} />
      <div style={{ flex: 1, position: 'relative' }}>
        {spaceId ? (
          <Canvas />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
            }}
          >
            Create or select a space to start
          </div>
        )}
      </div>
    </div>
  );
}
