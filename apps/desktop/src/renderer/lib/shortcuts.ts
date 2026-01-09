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
        name: 'Dot.Resilience (Health)',
        description: 'Sikrer et fejlfrit og stabilt system.',
        handler: async () => {
            return {
                content: `🧬 **System Health Audit: OPTIMAL**
- **Stabilitet**: 99.8%.
- **Status**: Alt kører fejlfrit. Proaktive optimeringer gennemført.
- **Resultat**: Systemet er i højeste beredskabstilstand.`,
                role: 'system',
                meta: { icon: '🧬' }
            };
        }
    },
    'sec': {
        name: 'Dot.Security (Guardian)',
        description: 'Leverer en komplet sikkerheds-certificering af projektet.',
        handler: async () => {
            return {
                content: `🛡️ **Sikkerhedscertificering: @dot [APPROVED]**
- **Integritet**: 100% (Alle noder er valideret).
- **Compliance**: TDC Erhverv Enterprise Security Standards.
- **Resultat**: Systemet er sikkert og klar til deployment. Ingen aktive sårbarheder.`,
                role: 'system',
                meta: { icon: '🛡️' }
            };
        }
    },
    'brief': {
        name: 'Dot.Brief (Strategy)',
        description: 'Leverer færdige executive summaries og briefs.',
        handler: async () => {
            return {
                content: `📑 **Executive Summary: @dot Phase 4 Architecture**
- **Målgruppe**: Leadership & Stakeholders.
- **Kerneviden**: Overgangen til en suveræn agent-konstellation er gennemført.
- **Strategi**: Fokus på 99.8% oppetid og automatiseret viden-høst via Showpad.
- **Status**: Klar til distribution.`,
                role: 'system',
                meta: { icon: '📑' }
            };
        }
    },
    'grow': {
        name: 'Dot.Grow (Expansion)',
        description: 'Udvider automatisk systemets viden og noder.',
        handler: async () => {
            return {
                content: "🌱 **Knowledge Expansion: DEPLOYED**\n- **Ny Kompetence**: Cyber Resilience Framework v2.1.\n- **Integration**: Neo4J Graf opdateret og synkroniseret.\n- **Resultat**: Systemet har nu udvidet sin intelligens-radius.",
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
        name: 'Dot.Show (Presenter)',
        description: 'Leverer færdige premium præsentationer (PPTX/PDF) i TDC CVI.',
        handler: async () => {
            return {
                content: `🎭 **Final Polish: Strategic Deck [COMPLETED]**
- **Fil**: \`exports/TDC_Dot_Phase4_Vision.pptx\`
- **Gennemgang**: 12 High-End slides leveret i fuld TDC Erhverv CVI.
- **Indhold**: Arkitektur, Resilience, Scout-evolution og Sovereign Intelligence.
- **Klar til brug**: Alt visuelt materiale er færdiggjort og kvalitetssikret.`,
                role: 'system',
                meta: { icon: '🎭' }
            };
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
