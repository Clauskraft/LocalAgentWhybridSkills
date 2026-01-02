/**
 * FinisherStateMachine
 *
 * This module defines a concrete state machine for the SCA‑01 Finisher agent.
 * It encodes the agent's operational loop (READ → PLAN → ACT → TEST → REPORT → DONE)
 * and includes branching for approval gates and error handling. The machine is
 * expressed using the generic `StateMachine` class defined in `stateMachine.ts`.
 *
 * A helper function is provided to construct the machine, and another helper
 * produces a Mermaid state diagram for visualisation. You can import these
 * into your CLI or server to inspect or render the agent flow.
 */

import { StateMachine, StateName } from './stateMachine';

// Define distinct state names as branded strings. The branding with
// `as StateName` prevents accidental mixing of arbitrary strings with
// legitimate state identifiers.
export const READ = 'READ' as StateName;
export const PLAN = 'PLAN' as StateName;
export const WAIT_FOR_APPROVAL = 'WAIT_FOR_APPROVAL' as StateName;
export const ACT = 'ACT' as StateName;
export const TEST = 'TEST' as StateName;
export const REPORT = 'REPORT' as StateName;
export const ERROR = 'ERROR' as StateName;
export const DONE = 'DONE' as StateName;

// Context carried through state transitions. This type can be extended
// with more fields as the Finisher agent evolves. Each transition
// predicate evaluates against this context to decide next state.
export interface FinisherContext {
  /**
   * Does the current plan require human approval before acting? If true,
   * the machine transitions to WAIT_FOR_APPROVAL after PLAN.
   */
  requiresApproval: boolean;
  /**
   * Has the agent completed the ACT phase? This flag controls the
   * transition from ACT to TEST.
   */
  acted: boolean;
  /**
   * Do the executed tests pass? Determines whether to proceed to REPORT
   * or branch to ERROR.
   */
  testsPassed: boolean;
  /**
   * Set this to true to abort the run due to an unrecoverable error.
   */
  abort?: boolean;
}

/**
 * Construct a state machine instance configured for the Finisher agent. The
 * initial state is READ. Each state has a simple onEnter hook that
 * currently does nothing; in a real implementation these would trigger
 * functions such as reading the blackboard, planning, acting, etc.
 */
export function createFinisherStateMachine(): StateMachine<FinisherContext> {
  return new StateMachine<FinisherContext>({
    initialState: READ,
    states: [
      {
        name: READ,
        transitions: [
          { to: PLAN, condition: () => true }
        ]
      },
      {
        name: PLAN,
        transitions: [
          // If the plan requires approval, branch to WAIT_FOR_APPROVAL
          { to: WAIT_FOR_APPROVAL, condition: (ctx) => ctx.requiresApproval === true },
          // Otherwise proceed directly to ACT
          { to: ACT, condition: (ctx) => ctx.requiresApproval === false }
        ]
      },
      {
        name: WAIT_FOR_APPROVAL,
        transitions: [
          // In this simplified example we always proceed to ACT once approval is obtained.
          // Real logic would update context upon human approval.
          { to: ACT, condition: () => true }
        ]
      },
      {
        name: ACT,
        transitions: [
          // If the agent has acted (e.g. executed tool calls), move to TEST
          { to: TEST, condition: (ctx) => ctx.acted === true },
          // Otherwise stay in ACT until action completes
          { to: ACT, condition: (ctx) => ctx.acted === false }
        ]
      },
      {
        name: TEST,
        transitions: [
          // On test success, proceed to REPORT
          { to: REPORT, condition: (ctx) => ctx.testsPassed === true },
          // On test failure, proceed to ERROR
          { to: ERROR, condition: (ctx) => ctx.testsPassed === false }
        ]
      },
      {
        name: REPORT,
        transitions: [
          { to: DONE, condition: () => true }
        ]
      },
      {
        name: ERROR,
        transitions: [
          // If abort is requested, finish the run
          { to: DONE, condition: (ctx) => ctx.abort === true },
          // Otherwise return to PLAN to allow recovery or replan
          { to: PLAN, condition: (ctx) => ctx.abort !== true }
        ]
      },
      {
        name: DONE,
        transitions: []
      }
    ]
  });
}

/**
 * Helper to generate a Mermaid representation of the Finisher state machine.
 * This function instantiates a machine and returns its diagram. It can be
 * invoked in CLI commands or tests to produce visual documentation.
 */
export function generateFinisherMermaid(): string {
  const sm = createFinisherStateMachine();
  return sm.toMermaid();
}

// If this file is run directly via `node` or `tsx`, print the diagram.
if (typeof require !== 'undefined' && require.main === module) {
  console.log(generateFinisherMermaid());
}