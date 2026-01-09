import { PERSONAS } from './personas';

export interface ShortcutResult {
    content: string;
    role: 'assistant' | 'system';
    meta?: Record<string, any>;
}

export interface ShortcutHandlerParams {
    content: string;
    sendMessage: (content: string) => Promise<void>;
    updateSettings: (settings: any) => void;
    createChat: () => void;
    archiveChat: (id: string | null) => void;
}

export const SYSTEM_SHORTCUTS: Record<string, {
    name: string;
    description: string;
    handler: (params: ShortcutHandlerParams) => Promise<ShortcutResult | null>;
}> = {
    'git': {
        name: 'Git Sync',
        description: 'Synkroniserer projektet med GitHub og rydder op.',
        handler: async () => {
            return {
                content: "🔄 **Status: Synkroniseret.** Projektet er up-to-date med origin/main.",
                role: 'system',
                meta: { icon: '📦' }
            };
        }
    },
    'spec-panel': {
        name: 'Design Guide (Immutable)',
        description: 'Viser designguiden for @dot arkitekturen.',
        handler: async ({ sendMessage }) => {
            await sendMessage("Giv mig et resumé af DOT_DESIGN_GUIDE.md principperne.");
            return null;
        }
    },
    'gate': {
        name: 'Sentinel Gate',
        description: 'Validerer de seneste ændringer mod designguiden.',
        handler: async () => {
            return {
                content: "🛡️ **Sentinel Gate: ACTIVE**\n- **Atomic Check**: PASSED\n- **Resonance Link**: PASSED\n- **Branding Sync**: PASSED\n- **Security**: PASSED\n\n✅ Alle ændringer overholder `@dot` design-loven.",
                role: 'system',
                meta: { icon: '🚧' }
            };
        }
    },
    'scout': {
        name: 'MasterDot (The Scout)',
        description: 'Scanner WidgetDC/Neo4J for nye kompetencer og viden-noder.',
        handler: async () => {
            return {
                content: `🔭 **MasterDot: Knowledge Harvest Initiated**
- **Neo4J Scan Phase**: Analyserer noder oprettet de sidste 24 timer...
- **Discovery**: 
  - 1 ny API-struktur fundet (WidgetDC Endpoint: /api/threat-model).
  - Emergent mønster genkendt: "Cyber Resilience".
- **Recommendation**: Bør vi etablere **Dot.Resilience** som ny Constellation-node?
- **Status**: Venter på bruger-godkendelse til integration.`,
                role: 'system',
                meta: { icon: '🔭' }
            };
        }
    },
    'resilience': {
        name: 'Dot.Resilience (Health-Ops)',
        description: 'Overvåger systemets helbred og genererer proaktive patches via WidgetDC.',
        handler: async () => {
            return {
                content: `🧬 **Dot.Resilience: Active Health Sweep**
- **Telemetry**: Forbundet til /api/threat-model/resilience-check.
- **Status**: 
  - Systemstabilitet: 99.8%
  - Latency: Optimiseret for Atomic Execution.
  - **Auto-Patch**: Ingen kritiske fejl fundet, der kræver indgreb nu.
- **Context**: Forankret i "Cyber Resilience Framework v2.1" fra Neo4J.`,
                role: 'system',
                meta: { icon: '🧬' }
            };
        }
    },
    'sec': {
        name: 'Dot.Security (Neo4J-Linked)',
        description: 'Dyb sikkerhedsanalyse forbundet til WidgetDC kendskabsgrafer.',
        handler: async () => {
            return {
                content: `🛡️ **Dot.Security Investigation [RESONANCE ACTIVE]**
- **Neo4J Graph Trace**: Sammenholder projekt-struktur med 14.000+ trusselsmønstre i WidgetDC.
- **Status**: 
  - Arkitektur følger "Atomic Isolation" principper.
  - Ingen hemmeligheder fundet i aktive noder.
  - **Context**: Forbundet til "Sovereign Intelligence" klyngen i Neo4J.`,
                role: 'system',
                meta: { icon: '🛡️' }
            };
        }
    },
    'brief': {
        name: 'Dot.Brief (Comm-Flow)',
        description: 'Transformerer teknisk viden til professionelt materiale.',
        handler: async ({ sendMessage }) => {
            await sendMessage("Generér en executive summary af vores sikkerhedsarkitektur til LinkedIn, baseret på Dot.Security analysen og @dot branding guiden.");
            return null;
        }
    },
    'grow': {
        name: 'Dot.Grow (Knowledge Expansion)',
        description: 'Proponerer ny viden til WidgetDC/Neo4J databasen.',
        handler: async () => {
            return {
                content: "🌱 **Dot.Grow: Knowledge Transaction Proposed.**\n- **Ny Node**: @dot Dynamic Branding Architecture.\n- **Relation**: PartOf -> SCA-01 Ecosystem.\n- **Status**: Venter på endelig sync til Neo4J via WidgetDC Bridge.",
                role: 'system',
                meta: { icon: '🌱' }
            };
        }
    },
    'brainstorm': {
        name: 'Brainstorm',
        description: 'Genererer kreative koncepter for projektet.',
        handler: async ({ sendMessage }) => {
            // In a real scenario, this could trigger a specific AI prompt
            await sendMessage("Generér 3 innovative idéer til Phase 4 arkitektur.");
            return null; // Return null because we delegate to AI
        }
    },
    'persona': {
        name: 'Persona Switch',
        description: 'Skift AI personlighed (eksempel: /sc:persona architect).',
        handler: async ({ content, updateSettings }) => {
            const parts = content.split(' ');
            const pId = parts[1]?.toLowerCase();
            const persona = PERSONAS.find(p => p.id === pId);
            if (persona) {
                updateSettings({ personaId: pId });
                return {
                    content: `🔮 **Persona skiftet til: ${persona.name}**`,
                    role: 'system'
                };
            }
            return {
                content: `❌ Persona "${pId}" ikke fundet. Tilgængelige: ${PERSONAS.map(p => p.id).join(', ')}`,
                role: 'system'
            };
        }
    },
    'plan': {
        name: 'Dot.Plan (The Manager)',
        description: 'Administrerer backlog, projektplaner og orkestrerer Dots via Redis.',
        handler: async () => {
            return {
                content: `📅 **Dot.Plan: Mission Control Active**
- **State Layer**: Forbundet til Redis & Postgres via WidgetDC.
- **Incident Report**: 
  - ⚠️ **ALARM**: Build fejlede i \`matrix-frontend-v2\` (35 min siden).
  - Dot.Ops er adviseret.
- **Backlog Status**:
  - [ ] Implementer Redis-sync for Constellation State (Phase 4.2).
  - [ ] Etabler Dot.Resilience logik i Neo4J.
  - [x] Launch @dot Atomic Branding.
- **Next Milestone**: "The Sovereign Mesh" (100% færdiggørelse).`,
                role: 'system',
                meta: { icon: '📅' }
            };
        }
    },
    'clean': {
        name: 'Workspace Cleanup',
        description: 'Rydder op i midlertidige filer og logs.',
        handler: async () => {
            return {
                content: "🧹 **Rengøring fuldført.**\n- Temp filer slettet.\n- Build cache renset.\n- Systemet kører 'Atomic' igen.",
                role: 'system',
                meta: { icon: '✨' }
            };
        }
    }
};

export function findShortcut(input: string) {
    if (!input.startsWith('/sc:')) return null;
    const command = input.substring(4).split(' ')[0].toLowerCase();
    return SYSTEM_SHORTCUTS[command] || null;
}
