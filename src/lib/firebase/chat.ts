"use client";

/**
 * Public room chat over Firebase RTDB.
 *
 *  chat/{pushId}         { sessionId, displayName, text, createdAt }
 *  chatThrottle/{uid}    server time of that user's last message
 *
 * A message and its throttle stamp are written in one multi-location update,
 * so the rules can refuse a message sent within CHAT.minGapMs of the last one
 * (database.rules.json). Messages older than CHAT.retentionMs may be deleted
 * by anyone; each client prunes a few on start to keep the node small.
 */

import {
  ref,
  push,
  update,
  remove,
  get,
  query,
  limitToLast,
  limitToFirst,
  orderByChild,
  endAt,
  onChildAdded,
  serverTimestamp,
  type Database,
} from "firebase/database";
import { getFirebase } from "./client";
import { CHAT } from "@/config/chat";
import { parseIncoming } from "@/lib/chat-core";
import type { ChatCallbacks, IChat } from "@/lib/chat-types";

export class FirebaseChat implements IChat {
  private db: Database;
  private cbs: ChatCallbacks;
  private unsub?: () => void;

  constructor(cbs: ChatCallbacks) {
    this.db = getFirebase().db;
    this.cbs = cbs;
  }

  start(): void {
    const recent = query(ref(this.db, "chat"), limitToLast(CHAT.historySize));
    this.unsub = onChildAdded(recent, (snap) => {
      const msg = snap.key ? parseIncoming(snap.key, snap.val()) : null;
      if (msg) this.cbs.onMessage(msg);
    });
    void this.pruneOld();
  }

  async send(sessionId: string, displayName: string, text: string): Promise<boolean> {
    const key = push(ref(this.db, "chat")).key;
    if (!key) return false;
    try {
      await update(ref(this.db), {
        [`chat/${key}`]: { sessionId, displayName, text, createdAt: serverTimestamp() },
        [`chatThrottle/${sessionId}`]: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn("[chat] send refused:", err);
      return false;
    }
  }

  /** Best-effort cleanup of messages past their retention. Never throws. */
  private async pruneOld(): Promise<void> {
    try {
      const old = query(
        ref(this.db, "chat"),
        orderByChild("createdAt"),
        endAt(Date.now() - CHAT.retentionMs),
        limitToFirst(20)
      );
      const snap = await get(old);
      snap.forEach((child) => {
        void remove(child.ref).catch(() => {});
      });
    } catch {
      // Pruning is housekeeping only.
    }
  }

  dispose(): void {
    this.unsub?.();
    this.unsub = undefined;
  }
}
