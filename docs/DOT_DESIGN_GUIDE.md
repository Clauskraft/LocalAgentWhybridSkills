# 🛡️ @dot Design- & Immutable Architecture Guide

Denne guide definerer de ufravigelige principper for videreudvikling af **@dot** og det **Neurale Resonance Grid**. Formålet er at sikre, at systemet kun kan forbedres, aldrig degraderes.

## 1. Kerneprincipper (The Immutable Laws)

1. **Atomic Integrity**: Ingen kode må introducere "støj" eller "bloat". Én funktion = ét atomart formål.
2. **Resonance Continuity**: Enhver ny agent (Dot) skal forbindes til WidgetDC/Neo4J viden-loopet. Vi tillader ikke "statiske" eller isolerede værktøjer.
3. **Minimalist Authority**: UI'en skal forblive ren og autoritativ. Kompleksitet skal gemmes bag `/sc:` kommandoer eller Command Palette.
4. **Sovereign Privacy**: Ingen hemmeligheder eller data må forlade den lokale maskine uden eksplicit godkendelse via Policy Engine.

## 2. Commit & Validation Protocol (The Sentinel Gate)

For at sikre kvaliteten skal alle fremtidige commits evalueres mod denne matrix:

| Tjekpunkt | Krav | Handling ved fejl |
| :--- | :--- | :--- |
| **Atomic Check** | Er funktionen fokuseret og uden side-effekter? | Reject (Refactor to Atom) |
| **Branding Sync** | Bruger koden @dot terminologi og minimalistisk UI? | Reject (Rebrand UI) |
| **Resonance Link** | Er der brugt WidgetDC til viden-opslag/lagring? | Warning (Knowledge Loss) |
| **Security Audit** | Er alle nye indlæsningspunkter valideret af Zod? | Block (Critical Risk) |

## 3. Arkitektonisk Beskyttelse: Agent-in-the-Loop

Fremtidig udvikling skal foregå gennem **Dot.Guardian**:

- Enhver foreslået ændring analyseres automatisk af Dot.Security og Dot.Architect.
- Hvis ændringen bryder med denne designguide (f.eks. ved at tilføje tunge visuelle effekter uden for Ghost Mode), blokeres commit'et automatisk.

## 4. Udvidelses-mønster (The Dot Pattern)

Når en ny funktion tilføjes:

1. **Definition**: Opret en ny `/sc:` kommando i `lib/shortcuts.ts`.
2. **Integration**: Registrér kommandoen i Command Palette.
3. **Viden**: Forbind kommandoen til en specifik videns-node i Neo4J via WidgetDC.
4. **Validering**: Kør `npm run release` for at sikre systemets integritet.

---

## 🏛️ /sc:spec-panel Godkendelse

- **CTO**: "Denne guide gør arkitekturen selv-healende. Ved at kræve 'Atomic Integrity' i hver commit, undgår vi den tekniske gæld, der normalt dræber vækstprojekter."
- **Sentinel (System AI)**: "Denne guide er lagt ind i min primære hukommelse. Jeg vil nu betragte ethvert brud på disse regler som en fejl og blokere destruktive forslag."

**Beslutning**: LÅST OG IMPLEMENTERET.
**Kurs**: "Pure intelligence through discipline."
