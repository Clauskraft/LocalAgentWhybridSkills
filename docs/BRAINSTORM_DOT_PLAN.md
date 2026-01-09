# 🏗️ Brainstorm: Dot.Plan - The Constellation Manager

Dette koncept introducerer **Dot.Plan** (eller **@manager**), arkitekten bag systemets backlog, orkestrering og projektplaner. Som set i infrastrukturoversigten, er vi nu klar til at bruge **Redis** og **Postgres** som den centrale "Single Source of Truth".

## 1. Konceptet: Distributed State Management

Dot.Plan fungerer som bindeleddet mellem dine Dots og systemets faktiske status.

- **Redis Hook (Real-time State)**: Dot.Plan bruger Redis (fra din WidgetDC stack) til at gemme den aktive "Task Stack". Dette gør det muligt for Dots at arbejde asynkront uden at miste overblikket.
- **Postgres Persistence (Backlog)**: Projektplaner og historiske milestolpe gemmes i Postgres for langsigtede analyser.
- **Notion Sync**: Dot.Plan kan (via WidgetDC) automatisk opdatere din Notion Backlog, når en Dot færdiggører en opgave.

## 2. Arkitekturen: The Orchestration Layer

### Trin 1: Backlog Management (`/sc:plan`)

- Brugeren kan se den aktuelle projektstatus.
- Dot.Plan prioriterer opgaver baseret på input fra Dot.Security og Dot.Resilience (f.eks. "Fix build failure in matrix-frontend-v2" bliver prioriteret højt).

### Trin 2: Inter-Agent Coordination

- Når MasterDot opdager en ny kompetence, opretter Dot.Plan automatisk en "Onboarding Task" i backshoggen.
- Den koordinerer afhængigheder mellem Dots (f.eks. Dot.Brief kan ikke køre før Dot.Security er færdig).

### Trin 3: Performance Tracking

- Dot.Plan monitorerer "Atomic Efficiency". Hvis en agent begynder at producere "støj", markerer Dot.Plan den til en refactoring-session.

## 3. Integration med Infrastruktur (fra Image)

Baseret på din oversigt, vil Dot.Plan:

1. **Monitorere Build Status**: Den ser at `matrix-frontend-v2` fejlede buildet for 35 minutter siden.
2. **Auto-Assign**: Den opretter øjeblikkeligt en opgave til **Dot.Ops** (eller dig) om at tjekke logs.
3. **Synchronize**: Den sikrer at Redis altid har den seneste "State" af samtalen og opgaverne.

---

## 🏛️ /sc:spec-panel Validering

- **CTO**: "At bruge Redis som state-layer er præcis hvad vi har brug for til at skalere Phase 4. Det gør systemet robust og fjerner race-conditions mellem Dots."
- **CMO**: "Dot.Plan giver os et 'Mission Control' overblik. Nu er det ikke bare små kommandoer, men et samlet projektflow."
- **CEO**: "Dette er hjernen i organisationen. Den sikrer, at alt vi bygger med @dot, rent faktisk bliver leveret og dokumenteret."

**Status**: Konstruktionsfase Begyndt.
**Vision**: "Orchestrating intelligence through shared state."
