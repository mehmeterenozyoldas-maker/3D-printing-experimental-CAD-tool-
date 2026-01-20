
import React, { useState, useCallback, useRef } from 'react';
import PuzzleScene, { PuzzleSceneHandle } from './components/PuzzleScene';
import ControlPanel from './components/ControlPanel';
import { PuzzleParams, PuzzleStats, ShapeDesignElement, ShapeType } from './types';

function App() {
  // Initial state for Designer Mode
  const defaultElement: ShapeDesignElement = {
    id: '1',
    type: 'Sphere',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
    enabled: true,
  };

  const [params, setParams] = useState<PuzzleParams>({
    mode: 'SINGLE',
    elements: [defaultElement],
    shape: 'Sphere',
    resolution: 22,
    explode: 0.0,
    noise: 0.4,
    speed: 1.0,
    autoRotate: true,
    isScrambled: false,
    audioEnabled: false,
  });

  const [stats, setStats] = useState<PuzzleStats>({
    pieceCount: 0,
    audioLevel: 0,
  });

  const sceneRef = useRef<PuzzleSceneHandle>(null);

  const handleParamsChange = useCallback((newParams: Partial<PuzzleParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const handleToggleScramble = useCallback(() => {
    setParams((prev) => {
      const isNowScrambled = !prev.isScrambled;
      return {
        ...prev,
        isScrambled: isNowScrambled,
        explode: isNowScrambled ? 1.0 : 0.0,
        noise: isNowScrambled ? 0.8 : 0.4,
      };
    });
  }, []);

  const handleStatsUpdate = useCallback((newStats: PuzzleStats) => {
    setStats(newStats);
  }, []);

  // --- Designer Mode Handlers ---

  const handleAddElement = useCallback((type: ShapeType) => {
    setParams(prev => ({
      ...prev,
      elements: [
        ...prev.elements,
        {
          id: Math.random().toString(36).substring(7),
          type,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: 1,
          enabled: true,
        }
      ]
    }));
  }, []);

  const handleUpdateElement = useCallback((id: string, changes: Partial<ShapeDesignElement>) => {
    setParams(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, ...changes } : el)
    }));
  }, []);

  const handleRemoveElement = useCallback((id: string) => {
    setParams(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id)
    }));
  }, []);

  const handleExportSTL = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.exportSTL();
    }
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_10%_0%,#1b2735_0%,#05060b_55%,#020308_100%)] text-slate-100">
      <PuzzleScene 
        ref={sceneRef}
        params={params} 
        onStatsUpdate={handleStatsUpdate} 
        onPhysicsUpdate={() => {}} 
      />
      <ControlPanel 
        params={params} 
        stats={stats} 
        onChange={handleParamsChange} 
        onToggleScramble={handleToggleScramble}
        onAddElement={handleAddElement}
        onUpdateElement={handleUpdateElement}
        onRemoveElement={handleRemoveElement}
        onExportSTL={handleExportSTL}
      />
    </div>
  );
}

export default App;
