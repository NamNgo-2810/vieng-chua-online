/**
 * Where lamps and lanterns are in each area (world px). At dusk and night the
 * scene places a warm glow above the darkening overlay at each, so lights
 * shine through the dark (lib/daytime.ts decides when).
 */

import type { AreaId } from "./areas";

/** [x, y, scale] */
export const AREA_LIGHTS: Record<AreaId, [number, number, number][]> = {
  COURTYARD: [
    [482, 253, 0.6], [894, 253, 0.6], [234, 384, 0.5], [1142, 384, 0.5], [330, 599, 0.45], [523, 630, 0.4],
    [362, 300, 0.45], [543, 280, 0.45], [832, 280, 0.45], [985, 280, 0.45],
  ],
  MAIN_HALL: [[120, 200, 0.6], [1256, 200, 0.6], [446, 260, 0.35], [930, 260, 0.35], [688, 230, 0.7]],
  LOTUS_GARDEN: [[215, 600, 0.45], [1195, 610, 0.45], [1185, 300, 0.5]],
  BELL_TOWER: [[900, 410, 0.4], [688, 330, 0.5]],
  ANCESTOR_HALL: [[620, 220, 0.4], [756, 220, 0.4], [688, 260, 0.5]],
  BAMBOO_GROVE: [[300, 280, 0.4], [600, 600, 0.35]],
  TAM_QUAN: [[590, 190, 0.5], [786, 190, 0.5], [470, 610, 0.35], [906, 610, 0.35]],
  RELEASE_POND: [[688, 470, 0.45], [180, 240, 0.35], [1220, 240, 0.35]],
  SUTRA_LIBRARY: [[240, 100, 0.45], [688, 100, 0.45], [1136, 100, 0.45], [626, 506, 0.4], [250, 530, 0.5]],
  QUAN_AM_HILL: [[688, 170, 0.9], [688, 300, 0.4]],
  HOA_QUA_SON: [[688, 200, 0.7], [330, 380, 0.4], [1030, 400, 0.4]],
};
