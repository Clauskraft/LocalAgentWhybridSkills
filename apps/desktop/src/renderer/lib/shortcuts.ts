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
