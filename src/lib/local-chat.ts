"use client";

/**
 * Offline chat: your messages appear locally (bubble + log), and the demo
 * visitor greets you once, so offline mode shows what chat looks like.
 * Never used when Firebase is configured.
 */

import type { ChatCallbacks, IChat } from "@/lib/chat-types";

/** Delay before the demo visitor's greeting (ms). */
const DEMO_GREETING_DELAY_MS = 3000;

export class LocalChat implements IChat {
  private cbs: ChatCallbacks;
  private counter = 0;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(cbs: ChatCallbacks) {
    this.cbs = cbs;
  }

  start(): void {
    this.timer = setTimeout(() => {
      this.cbs.onMessage({
        id: `local-${++this.counter}`,
        sessionId: "demo-visitor",
        displayName: "Cô Lan",
        text: "Nam mô A Di Đà Phật. Chào bạn!",
        createdAt: Date.now(),
      });
    }, DEMO_GREETING_DELAY_MS);
  }

  async send(sessionId: string, displayName: string, text: string): Promise<boolean> {
    this.cbs.onMessage({ id: `local-${++this.counter}`, sessionId, displayName, text, createdAt: Date.now() });
    return true;
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
