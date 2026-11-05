# Activity & Role Permission Matrix

Status: Draft for approval · Last updated: 2026-11-05

Defines which activities each role may perform, plus each activity's display
label and associated prop. This drives both the UI (which buttons show) and
backend validation (which activity changes are accepted).

---

## 1. Roles

| Role ID            | Display name               |
| ------------------ | -------------------------- |
| TRU_TRI            | Trụ trì (Abbot)            |
| HOA_THUONG         | Hòa thượng (Senior Monk)   |
| KHACH_THAP_PHUONG  | Khách thập phương (Visitor)|

## 2. Activities

| Activity ID   | Display name | Prop                | Has animation |
| ------------- | ------------ | ------------------- | ------------- |
| CHANTING      | Tụng kinh    | sutra book          | yes           |
| OFFER_INCENSE | Dâng hương   | incense stick       | yes           |
| LISTENING     | Nghe kinh    | — (seated)          | yes           |
| OFFERING      | Dâng lễ      | tray of flowers/fruit | yes         |
| WOODEN_FISH   | Gõ mõ        | wooden fish + mallet| yes           |
| MEDITATION    | Thiền định   | cushion             | yes           |
| RING_BELL     | Thỉnh chuông | temple bell         | yes           |
| WALKING       | Đi dạo       | —                   | yes (walk)    |
| PRAYING       | Cầu nguyện   | — (hands joined)    | yes           |

## 3. Permission matrix

✅ allowed · ⛔ not allowed

| Activity \ Role | TRU_TRI | HOA_THUONG | KHACH_THAP_PHUONG |
| --------------- | :-----: | :--------: | :---------------: |
| CHANTING        |   ✅    |     ✅     |        ⛔         |
| OFFER_INCENSE   |   ✅    |     ✅     |        ✅         |
| LISTENING       |   ✅    |     ✅     |        ✅         |
| OFFERING        |   ✅    |     ✅     |        ✅         |
| WOODEN_FISH     |   ✅    |     ✅     |        ⛔         |
| MEDITATION      |   ✅    |     ✅     |        ✅         |
| RING_BELL       |   ✅    |     ⛔     |        ⛔         |
| WALKING         |   ✅    |     ✅     |        ✅         |
| PRAYING         |   ✅    |     ✅     |        ✅         |

Rationale (proposed — adjust freely):
- RING_BELL (Thỉnh chuông) reserved for the Abbot as the temple host ritual.
- CHANTING and WOODEN_FISH are ritual/clergy activities, so Visitors are limited
  to lay activities (incense, offering, listening, meditation, walking, praying).
- Every role can do the gentle shared activities so the space never feels empty.

## 4. Default activity per role

| Role               | Default on entry |
| ------------------ | ---------------- |
| TRU_TRI            | WALKING          |
| HOA_THUONG         | WALKING          |
| KHACH_THAP_PHUONG  | WALKING          |

## 5. Config shape (planned)

```ts
// config/roles.ts
export const ROLES = {
  TRU_TRI:           { id: "TRU_TRI", label: "Trụ trì" },
  HOA_THUONG:        { id: "HOA_THUONG", label: "Hòa thượng" },
  KHACH_THAP_PHUONG: { id: "KHACH_THAP_PHUONG", label: "Khách thập phương" },
} as const;

// config/activities.ts
export const ACTIVITIES = {
  CHANTING:      { id: "CHANTING",      label: "Tụng kinh",    prop: "sutra" },
  OFFER_INCENSE: { id: "OFFER_INCENSE", label: "Dâng hương",   prop: "incense" },
  LISTENING:     { id: "LISTENING",     label: "Nghe kinh",    prop: null },
  OFFERING:      { id: "OFFERING",      label: "Dâng lễ",      prop: "tray" },
  WOODEN_FISH:   { id: "WOODEN_FISH",   label: "Gõ mõ",        prop: "woodfish" },
  MEDITATION:    { id: "MEDITATION",    label: "Thiền định",   prop: "cushion" },
  RING_BELL:     { id: "RING_BELL",     label: "Thỉnh chuông", prop: "bell" },
  WALKING:       { id: "WALKING",       label: "Đi dạo",       prop: null },
  PRAYING:       { id: "PRAYING",       label: "Cầu nguyện",   prop: null },
} as const;

// config/permissions.ts
export const PERMISSIONS: Record<RoleId, ActivityId[]> = {
  TRU_TRI: [ /* all nine */ ],
  HOA_THUONG: ["CHANTING","OFFER_INCENSE","LISTENING","OFFERING",
               "WOODEN_FISH","MEDITATION","WALKING","PRAYING"],
  KHACH_THAP_PHUONG: ["OFFER_INCENSE","LISTENING","OFFERING",
               "MEDITATION","WALKING","PRAYING"],
};
```

The same `PERMISSIONS` map is used client-side (to render buttons) and mirrored
in security rules / a Cloud Function check so a tampered client cannot perform a
disallowed activity.
