# ADR 0001 – One FastAPI modular monolith in one Docker image

* **Status:** accepted · **Date:** 2026-10-06 · **Deciders:** team (HW4) · **Feature(s):** all

## Context
Course rule: simplest and cheapest. 7 students, 8 weeks, ≈ €485/yr. Microservices and
Kubernetes add ops work and cost without benefit at pilot size.

## Decision
One FastAPI application with 10 modules (accounts, zones, visits, feedback, trust,
prediction, reasoning, analytics, ingest, media), one image, one Postgres + PostGIS,
APScheduler + a Postgres job table instead of Redis/Celery. Modules talk only through
each other's `service.py`.

## Consequences
One deploy, one backup, cheap. Module boundaries must be respected in review, otherwise
extraction later (future F6) gets expensive. A second container with `ROLE=worker` is the
scale-out path.
