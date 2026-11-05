import * as Phaser from "phaser";
import { TempleScene } from "./TempleScene";
import { TEMPLE } from "./world";

/**
 * Probe whether this environment can actually compile AND link a trivial WebGL
 * shader program. `Phaser.AUTO` only checks that a WebGL *context* exists, but
 * some environments (software rendering, remote desktop, locked-down GPUs,
 * headless/VM) expose a context whose shader linker then fails at runtime with
 * "Link Shader failed". Detecting that here lets us fall back to the Canvas
 * renderer, which uses no shaders and renders our pixel-art fine.
 */
function canLinkWebGLShader(): boolean {
  if (typeof document === "undefined") return false;
  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return false;

    gl.shaderSource(vs, "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}");
    gl.compileShader(vs);
    gl.shaderSource(fs, "void main(){gl_FragColor=vec4(1.0);}");
    gl.compileShader(fs);

    const program = gl.createProgram();
    if (!program) return false;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const ok = gl.getProgramParameter(program, gl.LINK_STATUS) === true;

    // Clean up probe resources.
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return ok;
  } catch {
    return false;
  } finally {
    canvas = null;
  }
}

/** Build the Phaser game instance mounted into the given parent element. */
export function createGame(parent: HTMLElement): Phaser.Game {
  const webglOk = canLinkWebGLShader();
  if (!webglOk && typeof console !== "undefined") {
    console.warn(
      "[game] WebGL shader linking unavailable; using the Canvas renderer. " +
        "The temple will still render, without WebGL-only effects."
    );
  }

  return new Phaser.Game({
    // CANVAS when WebGL can't link shaders; WebGL otherwise. (Not AUTO: AUTO
    // picks WebGL whenever a context exists, even if it later fails to link.)
    type: webglOk ? Phaser.WEBGL : Phaser.CANVAS,
    parent,
    width: TEMPLE.width,
    height: TEMPLE.height,
    backgroundColor: "#2b2119",
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      keyboard: {
        // Listen on window (not the canvas) so WASD/arrow keys keep working
        // after the player clicks a HUD button or anywhere outside the canvas.
        // Without this, the canvas loses focus and movement stops until it is
        // clicked again.
        target: typeof window !== "undefined" ? window : undefined,
      },
    },
    scene: [TempleScene],
  });
}
