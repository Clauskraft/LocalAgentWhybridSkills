export type StateName = string & { readonly brand: unique symbol };

export interface StateTransition<TContext> {
  to: StateName;
  condition: (context: TContext) => boolean;
}

export interface StateDefinition<TContext> {
  name: StateName;
  transitions: Array<StateTransition<TContext>>;
}

export interface StateMachineConfig<TContext> {
  initialState: StateName;
  states: Array<StateDefinition<TContext>>;
}

export class StateMachine<TContext extends object> {
  private current: StateName;
  private readonly stateMap: Map<StateName, StateDefinition<TContext>>;
  private readonly initial: StateName;

  constructor(config: StateMachineConfig<TContext>) {
    if (config.states.length === 0) throw new Error("StateMachine: at least one state must be defined");
    const found = config.states.find((s) => s.name === config.initialState);
    if (!found) throw new Error(`StateMachine: initial state '${String(config.initialState)}' not found`);

    this.initial = config.initialState;
    this.current = config.initialState;
    this.stateMap = new Map(config.states.map((s) => [s.name, s]));
  }

  public get state(): StateName {
    return this.current;
  }

  public async start(): Promise<void> {
    this.current = this.initial;
  }

  public async step(context: TContext): Promise<boolean> {
    const stateDef = this.stateMap.get(this.current);
    if (!stateDef) return false;

    for (const transition of stateDef.transitions) {
      if (transition.condition(context)) {
        if (transition.to === this.current) return false;
        this.current = transition.to;
        return true;
      }
    }
    return false;
  }

  public toMermaid(): string {
    const lines: string[] = [];
    lines.push("stateDiagram-v2");
    lines.push(`    [*] --> ${String(this.initial)}`);
    for (const s of this.stateMap.values()) {
      if (s.transitions.length === 0) lines.push(`    ${String(s.name)}`);
      for (const t of s.transitions) lines.push(`    ${String(s.name)} --> ${String(t.to)}`);
    }
    return lines.join("\n");
  }
}


