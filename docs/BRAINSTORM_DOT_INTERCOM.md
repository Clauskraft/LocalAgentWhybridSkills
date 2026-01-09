# 📡 Brainstorm: Dot.Intercom - The Neural Switchboard

Dot.Intercom fungerer som det centrale kommunikationslag i konstellationen. Dens primære opgave er at sikre lynhurtig viden-synkronisering mellem agenterne (via Redis) og ekstern viden-arkivering (via Notion & WidgetDC).

## 1. Konceptet: Inter-Agent Resonance

I stedet for at agenterne arbejder i siloer, skaber Dot.Intercom en "Shared Consciousness".

- **Redis Broadcast**: Når en Dot (f.eks. Dot.Security) finder noget kritisk, skriver Dot.Intercom det øjeblikkeligt til Redis. Alle andre Dots "hører" det og opdaterer deres interne kontekst.
- **Notion Gateway**: Dot.Intercom overvåger alle kognitive loops og sikrer, at vigtige konklusioner og backlog-emner bliver pushet til Notion via WidgetDC CORTEX integrationen.

## 2. Arkitekturen: The Knowledge Bridge

### Trin 1: Data Harvesting (WidgetDC -> Notion)

- Dot.Intercom bruger WidgetDC's `neural_chat_bridge.md` mønster til at spejle chatten og system-events direkte i Notion.
- Den sikrer, at de rigtige Database IDs (fra `notion_systems_integration`) bliver brugt, så ingen data går tabt.

### Trin 2: Semantic Routing

- Når du kører en kommando, vurderer Dot.Intercom hvilke agenter der skal adviseres.
- Eksempel: En `/sc:analyze` trigger ikke bare Dot.Security, men Dot.Intercom adviserer også **Dot.Plan** om at gøre plads i backloggen til eventuelle fund.

### Trin 3: The Persistent Memory loop

- Alt hvad der sker i @dot, bliver via Dot.Intercom gemt som "Kendskabs-artefakter" i Notion.
- Dette gør dit Notion-workspace til en voksende, søgbar hjerne af alt hvad dine Dots har udført.

## 3. Integration Status (Hardware/Platform)

- **Redis Online**: ✅ (Brugt til real-time inter-agent messaging).
- **Postgres Online**: ✅ (Brugt til historisk kendskabs-tracking).
- **Notion integration**: ✅ (Verificeret med CORTEX Full Access token).

---

## 🏛️ /sc:spec-panel Validering

- **CTO**: "Dot.Intercom løser 'The Silo Problem'. Ved at bruge Redis som en central nervebane, kan vi køre ægte asynkron multi-agent orkestrering."
- **CMO**: "Integrationen til Notion betyder, at vi har et automatiseret 'Proof of Work'. Enhver tanke @dot har, bliver til et aktiv i vores Notion database."
- **CEO**: "Dette er limen, der holder hele Phase 4 sammen. Uden Intercom er det bare agenter; med Intercom er det en organisation."

**Status**: Klar til arkitektering i `shortcuts.ts`.
**Vision**: "Speech is silver, synchronization is gold."
