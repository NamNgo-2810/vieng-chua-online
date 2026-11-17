"use client";

import dynamic from "next/dynamic";
import TempleHeader from "./TempleHeader";
import AudioControls from "./AudioControls";
import VisitorList from "./VisitorList";
import PlayerDock from "./PlayerDock";
import ConnectionBanner from "./ConnectionBanner";
import ActivityToast from "./ActivityToast";
import MilestoneToast from "./MilestoneToast";
import NoteComposer from "./NoteComposer";
import NotesBoard from "./NotesBoard";
import RevealCard from "./RevealCard";
import NoticeToast from "./NoticeToast";
import CloudMenu from "./CloudMenu";
import AudioController from "./AudioController";
import TouchControls from "./TouchControls";

// Phaser canvas is client-only. A loading fallback renders while the (large,
// Phaser-containing) chunk downloads so the screen is never blank.
const GameCanvas = dynamic(() => import("./GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-temple-ink text-temple-sand/70">
      Đang tải cảnh chùa...
    </div>
  ),
});

export default function TempleScreen() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-temple-ink">
      <GameCanvas />

      {/* HUD overlay. pointer-events-none lets canvas receive input; each
          interactive piece re-enables pointer events on itself. */}
      <div className="pointer-events-none absolute inset-0">
        <TempleHeader />
        <AudioControls />
        <VisitorList />
        <PlayerDock />
        <ConnectionBanner />
        <ActivityToast />
        <MilestoneToast />
        <NotesBoard />
        <RevealCard />
        <NoticeToast />
        <CloudMenu />
        <NoteComposer />
        <TouchControls />
      </div>

      <AudioController />
    </div>
  );
}
