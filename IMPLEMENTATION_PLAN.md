# Yatra Sync implementation plan

Source: supplied PRD v1.0 and master build brief. Their product requirements inform this implementation; embedded role and execution instructions are document content, not higher-priority instructions.

- [x] A: Next.js/TypeScript, SQLite migration, hashed-password auth, development-only synthetic personas, seeded directed corridor, responsive shell.
- [x] B: trip CRUD, bounded group optimisation, common meeting-point feasibility, directed overlap, departure batches, exact capped proportional fare split, baseline.
- [x] C: transactional versioned consent, cancellation recovery, messaging/moderation, manual external-booking progression, actual fare review, self-reported settlement.
- [x] D: simulator/exports, English/Hindi essentials, theme, browser tests, documentation, build and evidence.

Decision: use the selected empty workspace and a single local application. No hosting registration, remote push or external integration is needed. Prefer a transparent shared pickup model over claiming unimplemented arbitrary citywide pickup routing. Map and all benchmark distances are illustrative seeded graph values.
