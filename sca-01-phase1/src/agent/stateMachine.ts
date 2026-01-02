/**
 * Generic finite state machine implementation for SCA‑01 agents.
 *
 * This module defines a generic state machine that can be configured
 * with named states and conditional transitions. It is designed to be
 * future‑proof and strictly typed: each transition evaluates against a
 * typed context object, and the state diagram can be exported as
 * Mermaid for graphical visualisation.
 */

export type StateName = string & { readonly brand: unique symbol };

export interface StateTransition<TContext> {
  to: StateName;
  condition: (context: TContext) => boolean;
}

export interface StateDefinition<TContext> {
  name: StateName;
  onEnter?: (context: TContext) => Promise<void> | void;
  onExit?: (context: TContext) => Promise<void> | void;
  transitions: Array<StateTransition<TContext>>;
}

export interface StateMachineConfig<TContext> {
  initialState: StateName;
  states: Array<StateDefinition<TContext>>;
}

export class StateMachine<TContext extends Record<string, unknown>> {
  private current: StateName;
  private readonly stateMap: Map<StateName, StateDefinition<TContext>>;
  private readonly initial: StateName;

  constructor(config: StateMachineConfig<TContext>) {
    if (config.states.length === 0) {
      throw new Error("StateMachine: at least one state must be defined");
    }
    const found = config.states.find((s) => s.name === config.initialState);
    if (!found) {
      throw new Error(`StateMachine: initial state '${String(config.initialState)}' not found in states array`);
    }
    this.initial = config.initialState;
    this.current = config.initialState;
    this.stateMap = new Map(config.states.map((s) => [s.name, s]));
  }

  public get state(): StateName {
    return this.current;
  }

  public reset(): void {
    this.current = this.initial;
  }

  public async run(context: TContext): Promise<void> {
    await this.enterState(this.initial, context);
  }

  private async enterState(name: StateName, context: TContext): Promise<void> {
    this.current = name;
    const stateDef = this.stateMap.get(name);
    if (!stateDef) throw new Error(`StateMachine: unknown state '${String(name)}'`);
    if (stateDef.onEnter) {
      await stateDef.onEnter(context);
    }
    await this.evaluateTransitions(context);
  }

  private async exitState(name: StateName, context: TContext): Promise<void> {
    const stateDef = this.stateMap.get(name);
    if (stateDef && stateDef.onExit) {
      await stateDef.onExit(context);
    }
  }

  private async evaluateTransitions(context: TContext): Promise<void> {
    const stateDef = this.stateMap.get(this.current);
    if (!stateDef) return;
    for (const transition of stateDef.transitions) {
      if (transition.condition(context)) {
        await this.exitState(this.current, context);
        await this.enterState(transition.to, context);
        return;
      }
    }
    // remain in current state
  }

  public toMermaid(): string {
    const lines: string[] = [];
    lines.push('stateDiagram-v2');
    lines.push(`    [*] --> ${String(this.initial)}`);
    for (const stateDef of this.stateMap.values()) {
      if (stateDef.transitions.length === 0) {
        lines.push(`    ${String(stateDef.name)}`);
      }
      for (const transition of stateDef.transitions) {
        lines.push(`    ${String(stateDef.name)} --> ${String(transition.to)}`);
      }
    }
    return lines.join('\n');
  }
}