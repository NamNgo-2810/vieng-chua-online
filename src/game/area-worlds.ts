/**
 * How each code-drawn area builds its world (the courtyard is the painted
 * background plus decor, built by TempleScene itself).
 */

import type * as Phaser from "phaser";
import type { AreaId } from "@/config/areas";
import { buildGarden } from "./garden-world";
import { buildMainHall } from "./areas/main-hall";
import { buildBellTower } from "./areas/bell-tower";
import { buildAncestorHall } from "./areas/ancestor-hall";
import { buildBambooGrove } from "./areas/bamboo-grove";
import { buildTamQuan } from "./areas/tam-quan";
import { buildReleasePond } from "./areas/release-pond";
import { buildSutraLibrary } from "./areas/sutra-library";
import { buildQuanAmHill } from "./areas/quan-am-hill";
import { buildHoaQuaSon } from "./areas/hoa-qua-son";

/** Builders may return something the scene uses later (e.g. the koi to steer). */
export const AREA_WORLDS: Record<Exclude<AreaId, "COURTYARD">, (scene: Phaser.Scene) => unknown> = {
  MAIN_HALL: buildMainHall,
  LOTUS_GARDEN: buildGarden,
  BELL_TOWER: buildBellTower,
  ANCESTOR_HALL: buildAncestorHall,
  BAMBOO_GROVE: buildBambooGrove,
  TAM_QUAN: buildTamQuan,
  RELEASE_POND: buildReleasePond,
  SUTRA_LIBRARY: buildSutraLibrary,
  QUAN_AM_HILL: buildQuanAmHill,
  HOA_QUA_SON: buildHoaQuaSon,
};
