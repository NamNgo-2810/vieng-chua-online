"use client";

/**
 * Merit over Firebase RTDB.
 *
 *  merit/{uid}        { total, day{index,earned}, streak{count,lastIndex}, lastAward{ritual: ts}, lastAwardAt }
 *  templeMerit/total  shared merit of the whole temple
 *
 * An award is one multi-location update; the rules (src/lib/merit-rules.ts,
 * generated into database.rules.json) check cooldowns, the ritual's spot and
 * duration, the daily cap, and that the temple total grows by the same amount.
 */

import { ref, onValue, update, increment, serverTimestamp, type Database, type Unsubscribe } from "firebase/database";
import { getFirebase } from "./client";
import { normalizeMerit } from "@/lib/merit-core";
import type { IMerit, MeritCallbacks } from "@/lib/merit-types";

export class FirebaseMerit implements IMerit {
  private db: Database;
  private cbs: MeritCallbacks;
  private unsubs: Unsubscribe[] = [];

  constructor(cbs: MeritCallbacks) {
    this.db = getFirebase().db;
    this.cbs = cbs;
  }

  start(uid: string): void {
    this.unsubs.push(onValue(ref(this.db, `merit/${uid}`), (s) => this.cbs.onMerit(normalizeMerit(s.val()))));
    this.unsubs.push(
      onValue(ref(this.db, "templeMerit/total"), (s) => {
        const v = s.val();
        this.cbs.onTemple(typeof v === "number" ? v : 0);
      })
    );
  }

  async award(uid: string, activity: string, d: Parameters<IMerit["award"]>[2]): Promise<boolean> {
    try {
      await update(ref(this.db), {
        [`merit/${uid}/total`]: increment(d.amount),
        [`merit/${uid}/day`]: d.next.day,
        [`merit/${uid}/streak`]: d.next.streak,
        [`merit/${uid}/lastAward/${activity}`]: serverTimestamp(),
        [`merit/${uid}/lastAwardAt`]: serverTimestamp(),
        "templeMerit/total": increment(d.amount),
      });
      return true;
    } catch (err) {
      console.warn("[merit] award refused:", err);
      return false;
    }
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }
}
