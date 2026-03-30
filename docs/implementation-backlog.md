# Implementation Backlog

## 1. Purpose

This document converts the backend plan into a practical build order for the first implementation phase.

It is not a project management system. It is the engineering backlog skeleton for the first coding pass.

## 2. Phase 1: Foundation

### Platform Bootstrap

- scaffold `NestJS` application
- configure environment loading and validation
- add structured logging
- add health endpoints
- add Docker setup for local development

Done when:

- app starts locally
- config errors fail fast
- health endpoint can report basic readiness

### Infrastructure Integrations

- connect PostgreSQL
- connect Redis
- connect S3-compatible storage
- connect Meilisearch
- define local dev compose stack

Done when:

- all service clients initialize cleanly in development
- health endpoint can test dependency reachability

### Auth Skeleton

- create user model and migration
- implement password hashing
- implement login, refresh, logout, `me`
- add role guards

Done when:

- admin, reviewer, and contributor accounts can authenticate
- protected endpoints reject wrong roles

## 3. Phase 2: Taxonomy And Compliance

### Vocabulary Management

- create migrations for publishers, designers, licenses, categories, tags
- implement admin CRUD endpoints
- add slug generation rules

Done when:

- admin can seed and manage all vocabularies needed for submissions

### Contributor Compliance

- create user profile update endpoint
- create contributor terms version model and admin management flow
- expose active declaration and terms to contributors
- persist submission assent metadata

Done when:

- contributor can complete required identity fields
- active contributor terms can be fetched
- submission cannot proceed without required assent

## 4. Phase 3: Families And Public Catalog

### Family Domain

- create `font_families`, `font_styles`, join tables
- implement family service and DTOs
- implement public list and detail endpoints

Done when:

- approved families can be listed by slug and metadata
- styles are returned correctly

### Collections

- create collections schema
- implement admin CRUD
- implement public collection reads

Done when:

- editorial collections can be created and published

## 5. Phase 4: Submission Workflow

### Submission Domain

- create `submissions`, `uploads`, `review_events`
- implement contributor draft create/update/list
- enforce submission state transitions

Done when:

- contributor can create and manage drafts
- state transitions are validated server-side

### Upload Flow

- implement upload initialization
- implement upload completion
- persist upload records
- enqueue processing jobs

Done when:

- contributor can upload font files to object storage through signed flows
- backend tracks uploads reliably

## 6. Phase 5: Processing Workers

### Processing Jobs

- create queue setup
- implement `process-upload`
- implement metadata extraction shell/service wrapper
- handle malformed files safely

Done when:

- valid font uploads produce extracted metadata
- invalid uploads fail without crashing workers

### Packaging And Previews

- implement family package generation
- implement preview asset generation
- persist object storage keys back to database

Done when:

- approved families can produce download packages
- preview artifacts are available for admin and public use

## 7. Phase 6: Review And Publication

### Reviewer APIs

- implement review queue endpoints
- implement review detail endpoint
- implement approve, reject, request-changes actions
- implement immutable audit events

Done when:

- reviewer can moderate submissions end to end
- approval promotes data into the public family record

### Dashboard Support

- implement review summary endpoint
- implement processing failures endpoint
- implement retry endpoint for failed uploads

Done when:

- admin dashboard has enough data for basic triage

## 8. Phase 7: Search, Downloads, Analytics

### Search

- create search document mapper
- implement index sync jobs
- implement public search endpoint

Done when:

- search works for Amharic and English metadata

### Downloads

- implement family/style download endpoints
- issue signed URLs
- record download events

Done when:

- published families and styles can be downloaded safely

### Analytics

- record view events
- record search events
- create daily rollup jobs
- implement admin analytics overview

Done when:

- top-level platform metrics are queryable by admins

## 9. Phase 8: Hardening

### Security And Abuse Controls

- add rate limiting
- validate upload file size and type aggressively
- protect contributor contact data from public exposure

Done when:

- public and contributor endpoints have baseline abuse resistance

### Reliability

- configure retries and dead-letter handling
- document backup and restore approach
- add smoke tests for critical flows

Done when:

- core failure modes are observable and recoverable

## 10. Suggested First Coding Sprint

If implementation starts now, the first sprint should focus on:

1. project scaffold and local infrastructure
2. user/auth schema
3. taxonomy and license schema
4. contributor profile and compliance endpoints
5. family and submission schema migrations

That gives the project a correct foundation before uploads and workers are added.
