/**
 * Asset-prep orchestrator (Phase 0.5).
 *
 * The provided Gemini sheets are NOT on a clean uniform grid and have a painted
 * grey/white checkerboard instead of a real alpha channel. Slicing is done by
 * two Python passes (Pillow + numpy) that key out the checkerboard and crop by
 * detected components:
 *
 *   scripts/prep_characters.py  -> normalized 64x64 cells + atlas JSON (stdout)
 *   scripts/prep_props.py       -> per-item cleaned PNGs + name map (stdout)
 *
 * This TS entry point runs both, copies the background, generates tinted
 * placeholders for the two roles without bespoke art, and writes the typed
 * manifest consumed by the game.
 *
 * It is idempotent: re-running regenerates the same outputs. Originals in
 * /assets are never modified.
 *
 * Run with: npm run assets:prep   (requires: python + pillow + numpy)
 */

import { PNG } from "pngjs";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "assets");
const PUB = path.join(ROOT, "public", "assets");
const CELL = 64;

interface AtlasEntry {
  file: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Resolve the python executable (py launcher on Windows, else python3/python). */
function pythonCmd(): string {
  const candidates =
    process.platform === "win32" ? ["python", "py", "python3"] : ["python3", "python"];
  for (const c of candidates) {
    try {
      execFileSync(c, ["--version"], { stdio: "ignore" });
      return c;
    } catch {
      // try next
    }
  }
  throw new Error("Python not found on PATH. Install Python 3 with Pillow + numpy.");
}

function runPython<T>(script: string): T {
  const py = pythonCmd();
  const out = execFileSync(py, [path.join(ROOT, "scripts", script)], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  // The script prints one JSON line on stdout; take the last non-empty line.
  const line = out.trim().split(/\r?\n/).filter(Boolean).pop() ?? "{}";
  return JSON.parse(line) as T;
}

function readPng(file: string): PNG {
  return PNG.sync.read(fs.readFileSync(file));
}

function writePng(png: PNG, file: string) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, PNG.sync.write(png));
}

// ---------------------------------------------------------------------------
// Background: copy temple scene as-is.
// ---------------------------------------------------------------------------
function prepBackground(): string {
  const src = path.join(SRC, "background.png");
  const dst = path.join(PUB, "background", "temple-bg.png");
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  return "background/temple-bg.png";
}

// ---------------------------------------------------------------------------
// Placeholders for the two roles without bespoke art (Abbot, Visitor).
// Recolor the monk's normalized cells so all three roles render end-to-end.
// ---------------------------------------------------------------------------
function tintFile(srcFile: string, dstFile: string, tint: [number, number, number]) {
  if (!fs.existsSync(srcFile)) return;
  const png = readPng(srcFile);
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] === 0) continue;
    png.data[i] = Math.round(png.data[i] * 0.5 + tint[0] * 0.5);
    png.data[i + 1] = Math.round(png.data[i + 1] * 0.5 + tint[1] * 0.5);
    png.data[i + 2] = Math.round(png.data[i + 2] * 0.5 + tint[2] * 0.5);
  }
  writePng(png, dstFile);
}

function prepPlaceholders() {
  const base = path.join(PUB, "characters", "hoa_thuong");
  const files = fs.existsSync(base)
    ? fs.readdirSync(base).filter((f) => f.endsWith(".png"))
    : [];
  const variants: { role: string; tint: [number, number, number] }[] = [
    { role: "tru_tri", tint: [201, 162, 74] }, // warm saffron/gold
    { role: "khach_thap_phuong", tint: [120, 140, 170] }, // cool grey-blue
  ];
  for (const v of variants) {
    const dir = path.join(PUB, "characters", v.role);
    ensureDir(dir);
    for (const f of files) {
      tintFile(path.join(base, f), path.join(dir, f), v.tint);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  ensureDir(PUB);

  console.log("[assets] slicing monk character sheet (python)...");
  const chars = runPython<{ atlas: Record<string, AtlasEntry>; walkDirs: string }>(
    "prep_characters.py"
  );
  const monkAtlas = chars.atlas;
  // The monk walk strip isn't a clean 4-direction grid, so the auto-detected
  // walkDirs can map facings to the wrong frames. Pin a verified mapping:
  // down uses the front frames, up the back frame, and left/right share the
  // right-facing frames (Character mirrors for left). Falls back to whatever
  // the slicer reported only if the WALKING strip has too few frames.
  const walkFrames = monkAtlas.WALKING?.frames ?? 0;
  const walkDirs =
    walkFrames >= 8 ? "down:0-1,up:3-3,left:6-7,right:6-7" : chars.walkDirs || "down";
  console.log(`[assets] monk activities: ${Object.keys(monkAtlas).join(", ")} (walkDirs=${walkDirs})`);

  console.log("[assets] slicing + cleaning props (python)...");
  const props = runPython<Record<string, string>>("prep_props.py");
  console.log(
    `[assets] named props: ${Object.keys(props).join(", ") || "(none matched)"}`
  );

  console.log("[assets] copying background...");
  const background = prepBackground();

  console.log("[assets] generating placeholders for abbot + visitor...");
  prepPlaceholders();

  // Re-point an atlas's files from the monk dir to a role's own (tinted) dir.
  const rebase = (
    atlas: Record<string, AtlasEntry>,
    fromDir: string,
    toDir: string
  ) => {
    const out: Record<string, AtlasEntry> = {};
    for (const [k, v] of Object.entries(atlas)) {
      out[k] = { ...v, file: v.file.replace(fromDir, toDir) };
    }
    return out;
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    cell: CELL,
    background,
    characters: {
      HOA_THUONG: { dir: "characters/hoa_thuong", walkDirs, activities: monkAtlas },
      TRU_TRI: {
        dir: "characters/tru_tri",
        walkDirs,
        activities: rebase(monkAtlas, "characters/hoa_thuong", "characters/tru_tri"),
        placeholder: true,
      },
      KHACH_THAP_PHUONG: {
        dir: "characters/khach_thap_phuong",
        walkDirs,
        activities: rebase(
          monkAtlas,
          "characters/hoa_thuong",
          "characters/khach_thap_phuong"
        ),
        placeholder: true,
      },
    },
    props,
  };

  const manifestFile = path.join(ROOT, "src", "config", "generated-manifest.json");
  ensureDir(path.dirname(manifestFile));
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`[assets] wrote ${path.relative(ROOT, manifestFile)}`);
  console.log("[assets] done.");
}

main();
