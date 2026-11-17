/**
 * Builds the RTDB security rules for merit from the game's own config, so the
 * server checks the same numbers and ritual spots the client uses.
 *
 * `npm run rules:gen` writes these into database.rules.json; the test
 * tests/merit-rules.test.ts fails if the file drifts from what this builds.
 *
 * What the rules enforce for an award (one multi-location write):
 *  - merit/{uid}/lastAward/{ritual} = now: that ritual's cooldown passed, the
 *    player's node shows that ritual started >= ritualMs ago, and the player's
 *    position is inside a spot that offers it;
 *  - merit/{uid}/lastAwardAt = now, at least minGapMs after the previous award;
 *  - total grows by 1..maxAward and only together with a lastAward stamp;
 *  - day.index is today's Vietnam day number; day.earned grows by exactly the
 *    total's growth (reset on a new day) and stays <= dailyCap;
 *  - templeMerit/total grows by exactly the player's total growth.
 * Limit: players write their own position, so a determined cheater can still
 * fake standing at a spot; this stops casual tampering, not everything.
 */

import { MERIT } from "@/config/merit";
import { RITUAL_SPOTS } from "@/config/ritual-spots";
import { ACTIVITY_IDS, type ActivityId } from "@/config/activities";
import { AREAS, AREA_IDS, type AreaId } from "@/config/areas";
import { MILESTONES } from "@/config/milestones";
import { EMOTE_IDS } from "@/config/emotes";
import { NOTES, NOTE_KINDS } from "@/config/notes";

const P = "root.child('players').child(auth.uid)";

/** Activities that can earn merit. */
export const MERIT_ACTIVITIES: ActivityId[] = ACTIVITY_IDS.filter((a) => MERIT.values[a] > 0);

/** Rule expression: the player is in `area` (no stored area means the courtyard). */
function inAreaCondition(area: AreaId): string {
  return area === "COURTYARD"
    ? `(!${P}.child('area').exists() || ${P}.child('area').val() === 'COURTYARD')`
    : `${P}.child('area').val() === '${area}'`;
}

/** Rule expression: the player's stored area and position are inside a spot offering `activity`. */
export function spotBoxCondition(activity: ActivityId): string {
  const boxes = RITUAL_SPOTS.filter((s) => s.activities.includes(activity)).map(
    (s) =>
      `(${inAreaCondition(s.area)} && ${P}.child('positionX').val() >= ${s.x - s.radius} && ${P}.child('positionX').val() <= ${s.x + s.radius}` +
      ` && ${P}.child('positionY').val() >= ${s.y - s.radius} && ${P}.child('positionY').val() <= ${s.y + s.radius})`
  );
  return boxes.length ? `(${boxes.join(" || ")})` : "false";
}

/** Rule for merit/{uid}/lastAward/{$activity}. */
export function lastAwardRule(): string {
  const perActivity = MERIT_ACTIVITIES.map((a) => `($activity === '${a}' && ${spotBoxCondition(a)})`).join(" || ");
  return [
    "newData.val() === now",
    `(!data.exists() || now >= data.val() + ${MERIT.cooldownMs})`,
    `${P}.child('currentActivity').val() === $activity`,
    `${P}.child('activityStartedAt').isNumber()`,
    `now >= ${P}.child('activityStartedAt').val() + ${MERIT.ritualMs}`,
    `(${perActivity})`,
  ].join(" && ");
}

const OLD_TOTAL = "(data.exists() ? data.val() : 0)";

/** Rule for merit/{uid}/total. */
export function totalRule(): string {
  const stamped = MERIT_ACTIVITIES.map((a) => `newData.parent().child('lastAward').child('${a}').val() === now`).join(" || ");
  return [
    "newData.isNumber()",
    `newData.val() > ${OLD_TOTAL}`,
    `newData.val() <= ${OLD_TOTAL} + ${MERIT.maxAward}`,
    "newData.parent().child('lastAwardAt').val() === now",
    `(${stamped})`,
  ].join(" && ");
}

const OFFSET_MS = MERIT.utcOffsetHours * 3600_000;
const DAY_MS = 86_400_000;

/**
 * Rules for two fields of players/{uid}, generated so they track the config:
 * currentActivity must be a known activity; area must be a known area, and a
 * locked area (its milestone not reached by templeMerit/total) is refused.
 */
export function playerFieldRules(): Record<string, unknown> {
  const activities = ACTIVITY_IDS.join("|");
  const areaChecks = AREA_IDS.map((a) => {
    const unlock = AREAS[a].unlock;
    const threshold = unlock ? MILESTONES.find((m) => m.id === unlock)?.threshold : undefined;
    const pure = AREAS[a].requiresPurity
      ? " && newData.parent().child('shoesOff').val() === true && newData.parent().child('washed').val() === true"
      : "";
    return threshold === undefined
      ? `(newData.val() === '${a}'${pure})`
      : `(newData.val() === '${a}' && root.child('templeMerit').child('total').val() >= ${threshold}${pure})`;
  }).join(" || ");
  return {
    currentActivity: { ".validate": `newData.isString() && newData.val().matches(/^(${activities})$/)` },
    area: { ".validate": `newData.isString() && (${areaChecks})` },
    emote: { ".validate": `newData.isString() && newData.val().matches(/^(${EMOTE_IDS.join("|")})$/)` },
    emoteAt: { ".validate": "newData.val() === now" },
    // Purification flags can be set, never cleared during a visit.
    shoesOff: { ".validate": "newData.isBoolean() && (newData.val() === true || !data.exists() || data.val() === false)" },
    washed: { ".validate": "newData.isBoolean() && (newData.val() === true || !data.exists() || data.val() === false)" },
  };
}

/**
 * Guestbook and wish notes: anyone signed in reads; you may only add your own,
 * new, within the length limit, stamped with server time, and at most one per
 * kind per NOTES.minGapMs (the notesThrottle stamp written in the same update).
 */
export function notesRules(): Record<string, unknown> {
  const kinds = NOTE_KINDS.map((k) => `$kind === '${k}'`).join(" || ");
  return {
    notes: {
      ".read": "auth != null",
      $kind: {
        ".validate": kinds,
        $id: {
          ".write": "auth != null && !data.exists() && newData.child('sessionId').val() === auth.uid && newData.parent().parent().parent().child('notesThrottle').child(auth.uid).child($kind).val() === now",
          ".validate": "newData.hasChildren(['sessionId','displayName','text','createdAt'])",
          sessionId: { ".validate": "newData.isString()" },
          displayName: { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 24" },
          text: { ".validate": `newData.isString() && newData.val().length >= 1 && newData.val().length <= ${NOTES.maxLength}` },
          createdAt: { ".validate": "newData.val() === now" },
          $other: { ".validate": false },
        },
      },
    },
    notesThrottle: {
      $uid: {
        ".read": "auth != null && auth.uid === $uid",
        $kind: {
          ".write": "auth != null && auth.uid === $uid",
          ".validate": `(${kinds}) && newData.val() === now && (!data.exists() || newData.val() >= data.val() + ${NOTES.minGapMs})`,
        },
      },
    },
  };
}

/** The full `merit` and `templeMerit` rule blocks. */
export function meritRules(): Record<string, unknown> {
  const newTotal = "newData.parent().parent().child('total').val()";
  const oldTotal = "(data.parent().parent().child('total').exists() ? data.parent().parent().child('total').val() : 0)";
  const sameDay = "(data.exists() && data.parent().child('index').val() === newData.parent().child('index').val())";
  const myNewTotal = "newData.parent().parent().child('merit').child(auth.uid).child('total').val()";
  const myOldTotal = "(root.child('merit').child(auth.uid).child('total').exists() ? root.child('merit').child(auth.uid).child('total').val() : 0)";
  return {
    merit: {
      $uid: {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        total: { ".validate": totalRule() },
        lastAwardAt: { ".validate": `newData.val() === now && (!data.exists() || now >= data.val() + ${MERIT.minGapMs})` },
        lastAward: { $activity: { ".validate": lastAwardRule() } },
        day: {
          ".validate": "newData.hasChildren(['index','earned'])",
          index: {
            ".validate": `newData.isNumber() && newData.val() % 1 === 0 && newData.val() * ${DAY_MS} <= now + ${OFFSET_MS} && (newData.val() + 1) * ${DAY_MS} > now + ${OFFSET_MS}`,
          },
          earned: {
            ".validate": `newData.isNumber() && newData.val() <= ${MERIT.dailyCap} && newData.val() - (${sameDay} ? data.val() : 0) === ${newTotal} - ${oldTotal}`,
          },
          $other: { ".validate": false },
        },
        streak: {
          ".validate": "newData.hasChildren(['count','lastIndex'])",
          count: { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= (data.exists() ? data.val() : 0) + 1" },
          lastIndex: { ".validate": "newData.val() === newData.parent().parent().child('day').child('index').val()" },
          $other: { ".validate": false },
        },
        $other: { ".validate": false },
      },
    },
    templeMerit: {
      ".read": "auth != null",
      total: {
        ".write": "auth != null",
        ".validate": `newData.isNumber() && newData.val() > (data.exists() ? data.val() : 0) && newData.val() - (data.exists() ? data.val() : 0) === ${myNewTotal} - ${myOldTotal}`,
      },
    },
  };
}
