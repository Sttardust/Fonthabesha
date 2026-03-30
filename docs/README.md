# Fonthabesha Backend Docs

This repository is currently in the planning stage.

Start here:

- `docs/backend-plan.md`: phased plan of action, delivery scope, architecture choice, milestones, and risks
- `docs/backend-spec.md`: backend product and technical specification, domain model, API outline, storage model, jobs, security, and testing strategy
- `docs/backend-blueprint.md`: implementation blueprint with module boundaries, job flows, indexes, and milestone acceptance criteria
- `docs/api-contracts.md`: draft API request and response contracts for public, contributor, admin, and analytics endpoints
- `docs/submission-review-workflow.md`: dedicated workflow for contributor submissions, processing states, reviewer actions, and moderation checklist
- `docs/admin-dashboard-notes.md`: backend-facing requirements for reviewer and admin dashboard screens
- `docs/database-schema-draft.md`: migration-oriented relational schema draft with enums, tables, relations, and indexes
- `docs/implementation-backlog.md`: practical implementation order and sprint-level engineering backlog

Planning baseline:

- The target product is a Fontshare-style font discovery and download site adapted for Amharic and Ethiopic-script fonts.
- The public Fontshare surface reviewed on 2026-03-30 includes catalog browsing, family detail pages, font pairs, FAQ/about/license pages, and an API-driven frontend.
- For this project, the recommended MVP focuses on free font discovery, metadata-rich family pages, downloads, admin/reviewer workflow, and search. Commerce and checkout are intentionally deferred unless explicitly required.
