
import React, { useState } from 'react';
import { PuzzleParams, PuzzleStats, ShapeType, ShapeDesignElement } from '../types';
import { Settings2, Music, Shuffle, Rotate3D, Box, Layers, Zap, Activity, Plus, Trash2, Download, ChevronDown, ChevronRight, Edit3 } from 'lucide-react';

interface ControlPanelProps {
  params: PuzzleParams;
  stats: PuzzleStats;
  onChange: (newParams: Partial<PuzzleParams>) => void;
  onToggleScramble: () => void;
  // Designer Actions
  onAddElement: (type: ShapeType) => void;
  onUpdateElement: (id: string, changes: Partial<ShapeDesignElement>) => void;
  onRemoveElement: (id: string) => void;
  onExportSTL: () => void;
}

const SHAPE_OPTIONS: ShapeType[] = ['Sphere', 'Box', 'Torus', 'Gyroid', 'Mandelbulb', 'Julia', 'Twist', 'Atom', 'Heart', 'SchwarzP', 'Star'];

const ElementRow: React.FC<{
  element: ShapeDesignElement;
  onUpdate: (id: string, changes: Partial<ShapeDesignElement>) => void;
  onRemove: (id: string) => void;
}> = ({ element, onUpdate, onRemove }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-blue-500/20 bg-blue-950/20">
      <div className="flex items-center justify-between p-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-xs font-bold text-blue-200">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {element.type}
        </button>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onRemove(element.id)}
            className="rounded p-1 text-red-400 hover:bg-red-900/30"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="space-y-3 border-t border-blue-500/10 p-2 text-[10px]">
          {/* Type Select */}
          <div className="flex items-center justify-between">
            <span className="text-blue-200/60">Type</span>
            <select 
              value={element.type}
              onChange={(e) => onUpdate(element.id, { type: e.target.value as ShapeType })}
              className="rounded bg-[#050915] px-1 py-0.5 text-blue-100 outline-none ring-1 ring-blue-500/30"
            >
              {SHAPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Scale */}
          <div className="space-y-1">
            <div className="flex justify-between text-blue-200/60">
               <span>Scale</span>
               <span>{element.scale.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.1" max="2.0" step="0.1" 
              value={element.scale}
              onChange={(e) => onUpdate(element.id, { scale: parseFloat(e.target.value) })}
              className="h-1 w-full rounded-full bg-blue-900/50 accent-blue-400"
            />
          </div>

          {/* Position */}
          <div className="space-y-1">
             <span className="text-blue-200/60">Position (X, Y, Z)</span>
             <div className="grid grid-cols-3 gap-1">
               {[0, 1, 2].map((axis) => (
                 <input 
                   key={axis}
                   type="number" step="0.1"
                   value={element.position[axis]}
                   onChange={(e) => {
                      const newPos = [...element.position] as [number, number, number];
                      newPos[axis] = parseFloat(e.target.value);
                      onUpdate(element.id, { position: newPos });
                   }}
                   className="w-full rounded bg-[#050915] px-1 py-0.5 text-center text-blue-100 ring-1 ring-blue-500/30 focus:ring-blue-400"
                 />
               ))}
             </div>
          </div>

          {/* Rotation */}
          <div className="space-y-1">
             <span className="text-blue-200/60">Rotation (Deg)</span>
             <div className="grid grid-cols-3 gap-1">
               {[0, 1, 2].map((axis) => (
                 <input 
                   key={axis}
                   type="number" step="15"
                   value={Math.round(element.rotation[axis] * (180/Math.PI))}
                   onChange={(e) => {
                      const newRot = [...element.rotation] as [number, number, number];
                      newRot[axis] = parseFloat(e.target.value) * (Math.PI/180);
                      onUpdate(element.id, { rotation: newRot });
                   }}
                   className="w-full rounded bg-[#050915] px-1 py-0.5 text-center text-blue-100 ring-1 ring-blue-500/30 focus:ring-blue-400"
                 />
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  params, stats, onChange, onToggleScramble, 
  onAddElement, onUpdateElement, onRemoveElement, onExportSTL 
}) => {
  
  const handleParamChange = <K extends keyof PuzzleParams>(key: K, value: PuzzleParams[K]) => {
    onChange({ [key]: value });
  };

  return (
    <div className="fixed left-4 top-4 z-10 flex max-h-[90vh] w-full max-w-[300px] flex-col rounded-xl border border-blue-400/30 bg-[#060a14]/95 text-blue-50 shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md backdrop-saturate-150 sm:max-w-[320px]">
      
      {/* Header */}
      <div className="flex-none border-b border-blue-400/20 p-4 pb-3">
        <h1 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-300">
          <Box size={16} />
          3D Puzzle Lab
        </h1>
        <div className="mt-3 flex rounded bg-blue-950/50 p-1">
           <button 
             onClick={() => handleParamChange('mode', 'SINGLE')}
             className={`flex-1 rounded py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${params.mode === 'SINGLE' ? 'bg-blue-600 text-white shadow' : 'text-blue-400 hover:text-blue-200'}`}
           >
             Single
           </button>
           <button 
             onClick={() => handleParamChange('mode', 'DESIGNER')}
             className={`flex-1 rounded py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${params.mode === 'DESIGNER' ? 'bg-blue-600 text-white shadow' : 'text-blue-400 hover:text-blue-200'}`}
           >
             Designer
           </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-blue-900/50">
        <div className="space-y-5">
          
          {/* SINGLE MODE SHAPE SELECTOR */}
          {params.mode === 'SINGLE' && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-1.5 font-medium uppercase tracking-wide text-blue-200/70">
                <Layers size={12} />
                Shape
              </label>
              <select
                value={params.shape}
                onChange={(e) => handleParamChange('shape', e.target.value as ShapeType)}
                className="h-7 flex-1 rounded bg-[#050915] px-2 text-blue-100 outline-none ring-1 ring-blue-400/30 focus:ring-blue-400/60"
              >
                {SHAPE_OPTIONS.map(opt => (
                   <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* DESIGNER MODE LIST */}
          {params.mode === 'DESIGNER' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-blue-200/70">
                <label className="flex items-center gap-1.5 font-medium uppercase tracking-wide">
                  <Edit3 size={12} />
                  Composition
                </label>
                <button onClick={() => onAddElement('Box')} className="text-blue-400 hover:text-blue-200">
                  <Plus size={14} />
                </button>
              </div>
              
              <div className="space-y-2">
                {params.elements.map(el => (
                  <ElementRow 
                    key={el.id} 
                    element={el} 
                    onUpdate={onUpdateElement} 
                    onRemove={onRemoveElement} 
                  />
                ))}
                {params.elements.length === 0 && (
                  <div className="py-4 text-center text-[10px] italic text-blue-500/50">
                    No shapes added. Click + to start.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GLOBAL SETTINGS (Apply to both modes) */}
          <div className="space-y-4 border-t border-blue-500/20 pt-4">
             {/* Resolution */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="text-blue-200/70">Resolution</label>
                <span className="font-mono text-blue-300">{params.resolution}³</span>
              </div>
              <input
                type="range" min="10" max="40" step="1"
                value={params.resolution}
                onChange={(e) => handleParamChange('resolution', parseInt(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-blue-900/50 accent-blue-400 outline-none"
              />
            </div>

            {/* Explode */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 text-blue-200/70">
                  <Zap size={12} />
                  Explode
                </label>
                <span className="font-mono text-blue-300">{params.explode.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={params.explode}
                onChange={(e) => handleParamChange('explode', parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-blue-900/50 accent-blue-400 outline-none"
              />
            </div>

            {/* Noise */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 text-blue-200/70">
                  <Activity size={12} />
                  Noise
                </label>
                <span className="font-mono text-blue-300">{params.noise.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={params.noise}
                onChange={(e) => handleParamChange('noise', parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-blue-900/50 accent-blue-400 outline-none"
              />
            </div>
            
            {/* Speed */}
             <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 text-blue-200/70">
                  <Settings2 size={12} />
                  Anim Speed
                </label>
                <span className="font-mono text-blue-300">{params.speed.toFixed(2)}x</span>
              </div>
              <input
                type="range" min="0" max="2" step="0.01"
                value={params.speed}
                onChange={(e) => handleParamChange('speed', parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-blue-900/50 accent-blue-400 outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={onToggleScramble}
              className={`flex w-full items-center justify-center gap-2 rounded px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all
                ${params.isScrambled 
                  ? 'bg-red-900/30 text-red-200 ring-1 ring-red-500/50 hover:bg-red-900/50' 
                  : 'bg-blue-900/30 text-blue-200 ring-1 ring-blue-500/50 hover:bg-blue-900/50'
                }`}
            >
              <Shuffle size={14} />
              {params.isScrambled ? 'Solve Puzzle' : 'Scramble'}
            </button>
            
            {params.mode === 'DESIGNER' && (
              <button
                onClick={onExportSTL}
                className="flex w-full items-center justify-center gap-2 rounded bg-emerald-900/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-500/50 transition-all hover:bg-emerald-900/50"
              >
                <Download size={14} />
                Export STL (Print)
              </button>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="autorotate"
                checked={params.autoRotate}
                onChange={(e) => handleParamChange('autoRotate', e.target.checked)}
                className="h-4 w-4 rounded border-blue-500/50 bg-blue-900/30 text-blue-500"
              />
              <label htmlFor="autorotate" className="flex cursor-pointer items-center gap-1.5 text-xs text-blue-200/70 select-none">
                <Rotate3D size={12} />
                Auto-rotate
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="audio"
                checked={params.audioEnabled}
                onChange={(e) => handleParamChange('audioEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-blue-500/50 bg-blue-900/30 text-blue-500"
              />
              <label htmlFor="audio" className="flex cursor-pointer items-center gap-1.5 text-xs text-blue-200/70 select-none">
                <Music size={12} />
                Audio React (Mic)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex-none border-t border-blue-400/20 p-4 pt-3 text-[10px] text-blue-400/60">
          <div className="flex justify-between">
              <span>Particles:</span>
              <span className="font-mono text-blue-200">{stats.pieceCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between mt-1">
              <span>Audio Level:</span>
              <span className="font-mono text-blue-200">{stats.audioLevel.toFixed(2)}</span>
          </div>
      </div>
    </div>
  );
};

export default ControlPanel;
