import type { ChatMessage } from "@/lib/chat-core";

/** Receives every message (history on start, then live), already validated. */
export interface ChatCallbacks {
  onMessage: (msg: ChatMessage) => void;
}

/**
 * A chat backend. The store depends only on this, so it can swap between
 * Firebase (FirebaseChat) and the offline demo (LocalChat).
 */
export interface IChat {
  /** Begin receiving: recent history first, then live messages. */
  start(): void;
  /** Send an already-prepared message (see prepareOutgoing). False on failure. */
  send(sessionId: string, displayName: string, text: string): Promise<boolean>;
  dispose(): void;
}
