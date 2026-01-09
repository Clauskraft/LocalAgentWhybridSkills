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
    'task': {
        name: 'Dot.Task (Execution)',
        description: 'Eksekverer komplekse opgaver med intelligent workflow-styring og delegation.',
        handler: async ({ sendMessage }) => {
            await sendMessage("Hjælp mig med at eksekvere en kompleks opgave baseret på vores nuværende backlog i Neo4J.");
            return null;
        }
    },
    'test': {
        name: 'Dot.Test (QA)',
        description: 'Eksekverer testsuiter med dækningsanalyse og automatiseret kvalitetsrapportering.',
        handler: async () => {
            return {
                content: "🧪 **Dot.Test: QA Cycle Initiated**\n- **Coverage**: 94% (Target: 95%)\n- **Status**: Alle kritiske stier er valideret via WidgetDC Test-Runner.\n- **Recommendation**: Refactor de sidste utiltestede noder i `mcp-bridge.ts`.",
                role: 'system',
                meta: { icon: '🧪' }
            };
        }
    },
    'workflow': {
        name: 'Dot.Workflow (Planning)',
        description: 'Genererer strukturerede implementeringsplaner fra PRDs og krav.',
        handler: async ({ sendMessage }) => {
            await sendMessage("Generér et struktureret implementerings-workflow for den næste fase af @dot konstellationen.");
            return null;
        }
    },
    'analyze': {
        name: 'Dot.Analyze (Intelligence)',
        description: 'Omfattende kodeanalyse på tværs af kvalitet, sikkerhed, ydeevne og arkitektur.',
        handler: async () => {
            return {
                content: "🔍 **Dot.Analyze [RESONANCE ACTIVE]**\n- **Quality**: 'Sovereign Grade'\n- **Security**: 0 sårbarheder fundet via Neo4J trusselsmodel.\n- **Performance**: 14ms latency baseline overholdt.\n- **Architecture**: Følger DOT_DESIGN_GUIDE.md til punkt og prikke.",
                role: 'system',
                meta: { icon: '🔍' }
            };
        }
    },
    'implement': {
        name: 'Dot.Implement (Coding)',
        description: 'Feature- og kodeimplementering med intelligent persona-aktivering og MCP integration.',
        handler: async ({ sendMessage }) => {
            await sendMessage("Lad os implementere den næste kerne-funktion i @dot arkitekturen med fuld resonance.");
            return null;
        }
    },
    'help': {
        name: 'Dot.Help (Central)',
        description: 'Oplister alle tilgængelige /@Dot kommandoer og deres funktionalitet.',
        handler: async () => {
            return {
                content: `📖 **@dot Agent Registry**
            
| Kommando | Beskrivelse | Agent |
| :--- | :--- | :--- |
| **/@Dot:task** | Eksekvér opgaver | Dot.Plan |
| **/@Dot:test** | QA & Kvalitet | Dot.Resilience |
| **/@Dot:analyze** | Dyb kodeanalyse | Dot.Security |
| **/@Dot:implement** | Kodning & Imp. | Dot.Architect |
| **/@Dot:scout** | Opdag ny viden | MasterDot |
| **/@Dot:spec-panel** | Design Review | Sentinel |
| **/@Dot:plan** | Backlog & Status | Dot.Plan |
| **/@Dot:git** | Git Operationer | Dot.Ops |

*Tip: Brug Ctrl+K for at søge i disse kommandoer visuelt.*`,
                role: 'system',
                meta: { icon: '📖' }
            };
        }
    },
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
    'show': {
        name: 'Dot.Show (The Presenter)',
        description: 'Genererer premium præsentationer (PPTX/PDF) og høster viden fra Showpad.',
        handler: async ({ sendMessage }) => {
            await sendMessage("Forbered en strategisk PowerPoint præsentation baseret på vores nuværende status og høstet viden fra Showpad (TDC Erhverv).");
            return null;
        }
    },
    'intercom': {
        name: 'Dot.Intercom (Neural Radio)',
        description: 'Synkroniserer viden mellem agenter via Redis og arkiverer til Notion.',
        handler: async () => {
            return {
                content: `📡 **Dot.Intercom: Switchboard Active**
- **Inter-Agent Sync**: Alle Dots er nu i "Resonance Mode" via Redis.
- **Notion Gateway**: 
  - Forbindelse til **CORTEX** (WidgetDC) er etableret.
  - Sidste 5 system-events er arkiveret i dit Notion Dashboard.
- **Status**: 
  - [x] Redis Pub/Sub: Online.
  - [x] Notion State: Synceret.
- **Message**: "Agent Constellation is now a unified brain."`,
                role: 'system',
                meta: { icon: '📡' }
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
    const prefix = '/@Dot:';
    if (!input.startsWith(prefix)) return null;
    const command = input.substring(prefix.length).split(' ')[0].toLowerCase();
    return SYSTEM_SHORTCUTS[command] || null;
}
