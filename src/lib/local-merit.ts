"use client";

/**
 * Offline merit: kept in this browser's localStorage so offline play still
 * builds a streak. The temple total offline is your own merit (plus an
 * optional `templeBonus`, the `?debugTemple=N` testing aid). Storage
 * can be unavailable (private mode, blocked) — then merit lasts the session.
 */

import { normalizeMerit, type MeritState } from "@/lib/merit-core";
import type { IMerit, MeritCallbacks } from "@/lib/merit-types";

const STORAGE_KEY = "chua-online:merit";

/** Minimal storage surface (window.localStorage, or a fake in tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export class LocalMerit implements IMerit {
  private cbs: MeritCallbacks;
  private store: KeyValueStore | null;
  private state: MeritState = normalizeMerit(null);
  private templeBonus: number;

  constructor(cbs: MeritCallbacks, store: KeyValueStore | null = defaultStore(), templeBonus = 0) {
    this.cbs = cbs;
    this.store = store;
    this.templeBonus = templeBonus;
  }

  start(): void {
    try {
      const raw = this.store?.getItem(STORAGE_KEY);
      this.state = normalizeMerit(raw ? JSON.parse(raw) : null);
    } catch {
      this.state = normalizeMerit(null);
    }
    this.emit();
  }

  async award(_uid: string, _activity: string, d: Parameters<IMerit["award"]>[2]): Promise<boolean> {
    this.state = d.next;
    try {
      this.store?.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage full or blocked: keep the session's merit in memory.
    }
    this.emit();
    return true;
  }

  private emit() {
    this.cbs.onMerit(this.state);
    this.cbs.onTemple(this.state.total + this.templeBonus);
  }

  dispose(): void {}
}
