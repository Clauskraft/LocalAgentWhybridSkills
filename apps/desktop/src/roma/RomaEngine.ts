
export type PlanningStrategy = "react" | "cot" | "code_act";

export interface RomaContext {
    [key: string]: unknown;
}

export class RomaEngine {
    constructor(
        private chatFn: (messages: { role: string; content: string }[]) => Promise<string>
    ) { }

    async plan(goal: string, strategy: PlanningStrategy = "react", context: RomaContext = {}): Promise<any> {
        // Construct System Prompt based on strategy
        let systemPrompt = "You are ROMA, a strategic planning engine. Your purpose is to break down high-level goals into executable plans.";

        if (strategy === "react") {
            systemPrompt += `
      Use the ReAct (Reasoning + Action) pattern.
      1. THOUGHT: Analyze the user's request.
      2. ACTION: Determine the necessary steps.
      
      Output strictly valid JSON with this structure:
      {
        "strategy": "react",
        "reasoning": "your analysis here",
        "plan": [
            { "step": 1, "description": "...", "tool_hint": "..." }
        ]
      }
      `;
        } else if (strategy === "cot") {
            systemPrompt += `
       Use Chain of Thought reasoning.
       Think step-by-step about dependencies, risks, and prerequisites.
       
       Output strictly valid JSON with this structure:
       {
         "strategy": "cot",
         "thoughts": [ "thought 1", "thought 2" ],
         "final_plan": [ "step 1", "step 2" ]
       }
       `;
        } else {
            // CodeAct / default
            systemPrompt += `
        Output a simple execution plan in JSON:
        { "steps": ["..."] }
        `;
        }

        const start = Date.now();

        // Call LLM
        const content = await this.chatFn([
            { role: "system", content: systemPrompt },
            { role: "user", content: `Goal: ${goal}\nContext: ${JSON.stringify(context)}` }
        ]);

        const duration = Date.now() - start;

        try {
            // Try to parse JSON (handle potential markdown fences)
            const match = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
            const jsonStr = match ? (match[1] || match[0]) : content;

            const parsed = JSON.parse(jsonStr);
            return {
                ...parsed,
                meta: {
                    engine: "RomaTS",
                    duration_ms: duration,
                    strategy
                }
            };
        } catch (e) {
            return {
                raw: content,
                meta: {
                    engine: "RomaTS",
                    duration_ms: duration,
                    strategy,
                    parse_error: true
                }
            };
        }
    }

    async health(): Promise<any> {
        return {
            status: "ok",
            version: "1.0.0-integrated",
            roma_version: "1.0.0 (TypeScript Internal)",
            roma_available: true
        };
    }

    async schema(which: "plan" | "act"): Promise<any> {
        if (which === "plan") {
            return {
                name: "roma.plan",
                description: "Plan a complex task using hierarchical reasoning (Integrated)",
                inputSchema: {
                    type: "object",
                    properties: {
                        goal: { type: "string" },
                        strategy: { type: "string", enum: ["react", "cot"] }
                    },
                    required: ["goal"]
                }
            };
        }
        return {
            name: "roma.act",
            description: "Execute a task (Stub)",
            inputSchema: {}
        };
    }

    async act(payload: { task: string; context?: Record<string, unknown>; tools?: unknown[] }): Promise<any> {
        // Act implementation would go here - for now return a stub acknowledging the task
        return {
            status: "executed",
            task: payload.task,
            result: "RomaEngine (TS) received the task. 'Act' phase is fully delegated to DesktopAgent in this version.",
            timestamp: new Date().toISOString()
        };
    }
}
