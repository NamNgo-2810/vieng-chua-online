"use client";

/**
 * Global client store (Zustand). The single bridge between Firebase, the React
 * UI, and the Phaser scene. UI/game read from here and call its actions; only
 * this store talks to the PresenceManager.
 */

import { create } from "zustand";
import type { Player, ConnectionState, AudioState, Direction } from "@/lib/types";
import type { RoleId } from "@/config/roles";
import type { ActivityId } from "@/config/activities";
import { PresenceManager } from "@/lib/firebase/presence";
import { LocalPresence } from "@/lib/local-presence";
import type { IPresence } from "@/lib/presence-types";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { recordEvent } from "@/lib/history-client";

import { TEMPLE } from "@/game/world";

const TEMPLE_WIDTH = TEMPLE.width;
const TEMPLE_HEIGHT = TEMPLE.height;

interface GameStore {
  // state
  entered: boolean;
  localSessionId: string | null;
  localPlayer: Player | null;
  players: Record<string, Player>;
  connection: ConnectionState;
  audio: AudioState;
  takenOver: boolean;
  configured: boolean;
  offline: boolean;
  /** Bumps whenever the local player's activity changes (drives UI feedback). */
  activityPulse: number;

  // derived
  onlineCount: () => number;

  // actions
  enterTemple: (displayName: string, role: RoleId) => Promise<void>;
  changeActivity: (activity: ActivityId) => Promise<void>;
  move: (x: number, y: number, dir: Direction) => void;
  leave: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  markAudioStarted: () => void;
}

let presence: IPresence | null = null;

export const useGameStore = create<GameStore>((setState, getState) => ({
  entered: false,
  localSessionId: null,
  localPlayer: null,
  players: {},
  connection: { status: "idle" },
  audio: { muted: false, sfxEnabled: true, musicVolume: 0.5, sfxVolume: 0.7, started: false },
  takenOver: false,
  configured: isFirebaseConfigured(),
  offline: false,
  activityPulse: 0,

  onlineCount: () =>
    Object.values(getState().players).filter((p) => p.isOnline).length,

  enterTemple: async (displayName, role) => {
    const callbacks = {
      onConnection: (status: ConnectionState["status"], error?: string) =>
        setState({ connection: { status, error } }),
      onPlayers: (players: Record<string, Player>) => {
        setState((s) => {
          const localSessionId = s.localSessionId;
          const localPlayer = localSessionId
            ? players[localSessionId] ?? s.localPlayer
            : s.localPlayer;
          return { players, localPlayer };
        });
      },
      onTakenOver: () => setState({ takenOver: true }),
    };

    // Pick the backend: real Firebase when configured, otherwise a fully
    // playable offline/demo mode so the experience never hard-fails.
    const offline = !isFirebaseConfigured();
    presence = offline ? new LocalPresence(callbacks) : new PresenceManager(callbacks);
    setState({ offline });

    const spawnX = TEMPLE_WIDTH / 2 + (Math.random() * 120 - 60);
    const spawnY = TEMPLE_HEIGHT * 0.72 + (Math.random() * 60 - 30);

    const sid = await presence.authenticate();
    await presence.join({ displayName, role, spawnX, spawnY });

    const local = presence.getLocal();
    setState({
      entered: true,
      localSessionId: sid,
      localPlayer: local,
    });

    if (local && !offline) {
      recordEvent("JOIN", {
        sessionId: sid,
        displayName: local.displayName,
        role: local.role,
        activity: local.currentActivity,
      });
    }

    // Safety-net LEAVE on tab close (online only).
    if (typeof window !== "undefined" && !offline) {
      window.addEventListener("beforeunload", () => {
        const l = presence?.getLocal();
        if (l) {
          recordEvent("LEAVE", {
            sessionId: l.sessionId,
            displayName: l.displayName,
            role: l.role,
            activity: l.currentActivity,
          });
        }
      });
    }
  },

  changeActivity: async (activity) => {
    if (!presence) return;
    const ok = await presence.changeActivity(activity);
    if (!ok) return;
    const local = presence.getLocal();
    setState((s) => ({ localPlayer: local, activityPulse: s.activityPulse + 1 }));
    if (local && !getState().offline) {
      recordEvent("ACTIVITY_CHANGE", {
        sessionId: local.sessionId,
        displayName: local.displayName,
        role: local.role,
        activity,
      });
    }
  },

  move: (x, y, dir) => {
    presence?.move(x, y, dir);
  },

  leave: async () => {
    const local = presence?.getLocal();
    if (local && !getState().offline) {
      recordEvent("LEAVE", {
        sessionId: local.sessionId,
        displayName: local.displayName,
        role: local.role,
        activity: local.currentActivity,
      });
    }
    await presence?.leave();
    presence?.dispose();
    presence = null;
    setState({
      entered: false,
      localPlayer: null,
      players: {},
      connection: { status: "idle" },
      offline: false,
    });
  },

  setMuted: (muted) => setState((s) => ({ audio: { ...s.audio, muted } })),
  setSfxEnabled: (enabled) => setState((s) => ({ audio: { ...s.audio, sfxEnabled: enabled } })),
  setMusicVolume: (v) =>
    setState((s) => ({ audio: { ...s.audio, musicVolume: Math.min(1, Math.max(0, v)) } })),
  setSfxVolume: (v) =>
    setState((s) => ({ audio: { ...s.audio, sfxVolume: Math.min(1, Math.max(0, v)) } })),
  markAudioStarted: () => setState((s) => ({ audio: { ...s.audio, started: true } })),
}));

export { TEMPLE } from "@/game/world";
