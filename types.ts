
export interface Point {
  x: number;
  y: number;
}

export interface DrawingAction {
  points: Point[];
  color: string;
  width: number;
}

export interface AppState {
  color: string;
  brushSize: number;
  isLocked: boolean;
  isFullscreen: boolean;
}
