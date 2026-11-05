# UI Component Structure

Status: Draft for approval · Last updated: 2026-11-05

React DOM (Tailwind) is layered over the Phaser canvas. The canvas renders the
world; React renders onboarding and the HUD.

---

## 1. Screen layout (main)

```
┌─────────────────────────────────────────────────────────────┐
│ [TempleHeader]                               [AudioControls] │
│  name + online count                     music/sound/settings│
│                                                               │
│                                              ┌──────────────┐ │
│                 [GameCanvas / Phaser]        │ VisitorList  │ │
│                   shared temple              │ name·role·act│ │
│                                              └──────────────┘ │
│                                                               │
│ [PlayerDock]  profile + [ActivityPicker]                      │
└─────────────────────────────────────────────────────────────┘
```

- Top-left: `TempleHeader` (temple name, online visitor count).
- Top-right: `AudioControls` (music toggle, sound toggle, settings).
- Center: `GameCanvas` (Phaser, client-only).
- Right sidebar: `VisitorList` (online players, roles, activities).
- Bottom: `PlayerDock` (current player profile) + `ActivityPicker`.

## 2. Component tree

```
<AppProviders>                      // store + firebase context
  <OnboardingGate>                  // shows onboarding until entered
    <OnboardingFlow>                // name → role → preview → enter
      <DisplayNameStep/>
      <RoleSelectStep/>
      <CharacterPreview/>           // renders chosen role sprite
      <EnterTempleButton/>
    </OnboardingFlow>

    <TempleScreen>                  // main experience
      <TempleHeader/>               // top-left
      <AudioControls/>              // top-right
      <GameCanvas/>                 // Phaser mount (dynamic import, ssr:false)
      <VisitorList/>                // right sidebar
      <PlayerDock>                  // bottom
        <PlayerProfile/>
        <ActivityPicker/>           // buttons filtered by role permissions
      </PlayerDock>
      <ConnectionBanner/>           // connecting / reconnecting / error
      <SettingsDialog/>             // volume, accessibility toggles
    </TempleScreen>
  </OnboardingGate>
</AppProviders>
```

## 3. Component responsibilities

| Component          | Responsibility                                            |
| ------------------ | --------------------------------------------------------- |
| AppProviders       | Initialize store + Firebase auth; expose context          |
| OnboardingGate     | Decide onboarding vs temple based on session state         |
| OnboardingFlow     | Collect name + role, show preview, trigger join            |
| GameCanvas         | Mount Phaser `TempleScene`; bridge store ↔ scene           |
| TempleHeader       | Show temple name + live online count                       |
| AudioControls      | Mute/unmute, SFX toggle, open settings                     |
| VisitorList        | Live list of players with role + current activity          |
| PlayerDock         | Local player's profile + activity selection                |
| ActivityPicker     | Render only activities permitted for the role              |
| ConnectionBanner   | Surface connecting/reconnecting/error states               |
| SettingsDialog     | Volume slider, accessibility options                       |

## 4. Responsive behavior

- Desktop: sidebar docked right, dock full-width bottom.
- Tablet: sidebar collapsible via a toggle.
- Mobile: sidebar becomes a slide-over sheet; `ActivityPicker` becomes a
  horizontally scrollable row or bottom sheet; canvas scales to viewport.

## 5. Accessibility (baseline)

- All controls keyboard-focusable with visible focus rings.
- ARIA labels on icon-only buttons (audio, settings, activities).
- Respect `prefers-reduced-motion` for UI transitions.
- Sufficient contrast for HUD text over the canvas (semi-opaque backdrops).
- Activity buttons announce selected state (`aria-pressed`).

## 6. State wiring

- Components read from the shared store (connection, players, local player,
  audio). No component talks to RTDB directly.
- `ActivityPicker` calls `store.changeActivity`; `GameCanvas` input calls
  `store.move`; both propagate to RTDB via `lib/firebase`.
