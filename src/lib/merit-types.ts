import type { ActivityId } from "@/config/activities";
import type { MeritState, AwardDecision } from "@/lib/merit-core";

export interface MeritCallbacks {
  /** The local player's merit record changed (loaded, or after an award). */
  onMerit: (state: MeritState) => void;
  /** The whole temple's shared merit changed. */
  onTemple: (total: number) => void;
}

/** A merit backend: Firebase (FirebaseMerit) or offline (LocalMerit). */
export interface IMerit {
  start(uid: string): void;
  /** Write an award decided by decideAward. False if refused or failed. */
  award(uid: string, activity: ActivityId, decision: Extract<AwardDecision, { ok: true }>): Promise<boolean>;
  dispose(): void;
}
