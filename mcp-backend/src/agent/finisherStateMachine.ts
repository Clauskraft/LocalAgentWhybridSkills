import { StateMachine, type StateName } from "./stateMachine.js";

export const READ = "READ" as StateName;
export const PLAN = "PLAN" as StateName;
export const WAIT_FOR_APPROVAL = "WAIT_FOR_APPROVAL" as StateName;
export const ACT = "ACT" as StateName;
export const TEST = "TEST" as StateName;
export const REPORT = "REPORT" as StateName;
export const ERROR = "ERROR" as StateName;
export const DONE = "DONE" as StateName;

export interface FinisherContext {
  requiresApproval: boolean;
  acted: boolean;
  testsPassed: boolean;
  abort?: boolean;
  hasToolCalls: boolean;
  turn: number;
  maxTurns: number;
}

export function createFinisherStateMachine(): StateMachine<FinisherContext> {
  return new StateMachine<FinisherContext>({
    initialState: READ,
    states: [
      { name: READ, transitions: [{ to: PLAN, condition: () => true }] },
      {
        name: PLAN,
        transitions: [
          { to: WAIT_FOR_APPROVAL, condition: (ctx) => ctx.requiresApproval === true },
          { to: REPORT, condition: (ctx) => ctx.requiresApproval === false && ctx.hasToolCalls === false },
          { to: ACT, condition: (ctx) => ctx.requiresApproval === false && ctx.hasToolCalls === true },
        ],
      },
      {
        name: WAIT_FOR_APPROVAL,
        transitions: [
          { to: ACT, condition: (ctx) => ctx.requiresApproval === false },
          { to: DONE, condition: (ctx) => ctx.abort === true },
        ],
      },
      { name: ACT, transitions: [{ to: TEST, condition: (ctx) => ctx.acted === true }] },
      {
        name: TEST,
        transitions: [
          { to: REPORT, condition: (ctx) => ctx.testsPassed === true },
          { to: ERROR, condition: (ctx) => ctx.testsPassed === false },
        ],
      },
      {
        name: REPORT,
        transitions: [
          { to: DONE, condition: (ctx) => ctx.hasToolCalls === false || ctx.turn >= ctx.maxTurns },
          { to: PLAN, condition: (ctx) => ctx.hasToolCalls === true && ctx.turn < ctx.maxTurns },
        ],
      },
      {
        name: ERROR,
        transitions: [
          { to: DONE, condition: (ctx) => ctx.abort === true },
          { to: PLAN, condition: (ctx) => ctx.abort !== true },
        ],
      },
      { name: DONE, transitions: [] },
    ],
  });
}

export function generateFinisherMermaid(): string {
  return createFinisherStateMachine().toMermaid();
}


