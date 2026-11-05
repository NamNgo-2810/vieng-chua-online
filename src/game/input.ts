/**
 * Shared movement-intent vector, written by touch controls (React) and read by
 * the Phaser scene each frame. Keeps touch input decoupled from Phaser's
 * keyboard handling: the scene simply adds this vector to its keyboard vector.
 *
 * Values are in [-1, 1]. (0,0) means no touch movement.
 */
export const virtualInput = { x: 0, y: 0 };

export function setVirtualInput(x: number, y: number) {
  virtualInput.x = Math.max(-1, Math.min(1, x));
  virtualInput.y = Math.max(-1, Math.min(1, y));
}

export function clearVirtualInput() {
  virtualInput.x = 0;
  virtualInput.y = 0;
}
