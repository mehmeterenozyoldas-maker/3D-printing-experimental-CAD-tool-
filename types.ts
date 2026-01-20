
export type ShapeType = 'Sphere' | 'Torus' | 'Box' | 'Gyroid' | 'Mandelbulb' | 'Twist' | 'Atom' | 'Julia' | 'Heart' | 'SchwarzP' | 'Star';

export type PuzzleMode = 'SINGLE' | 'DESIGNER';

export interface ShapeDesignElement {
  id: string;
  type: ShapeType;
  position: [number, number, number]; // x, y, z
  rotation: [number, number, number]; // x, y, z (euler)
  scale: number;
  enabled: boolean;
}

export interface PuzzleParams {
  mode: PuzzleMode;
  elements: ShapeDesignElement[]; // For Designer Mode
  
  // Single Mode Param
  shape: ShapeType;
  
  // Global Params
  resolution: number;
  explode: number;
  noise: number;
  speed: number;
  autoRotate: boolean;
  isScrambled: boolean;
  audioEnabled: boolean;
}

export interface PuzzleStats {
  pieceCount: number;
  audioLevel: number;
}
