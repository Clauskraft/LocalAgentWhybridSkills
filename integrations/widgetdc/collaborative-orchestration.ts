import { z } from 'zod';
import { WidgetDCMCPBridge } from './mcp-bridge';

// Collaborative Task Orchestration between Local Agent and WidgetDC
// Uses ROMA for high-level planning and coordinates execution across both systems

export interface CollaborativeTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planning' | 'executing' | 'completed' | 'failed';
  participants: {
    'local-agent': TaskRole;
    'widgetdc': TaskRole;
  };
  steps: TaskStep[];
  results: TaskResult[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskRole {
  role: string;
  capabilities: string[];
  status: 'idle' | 'active' | 'completed' | 'error';
  currentStep?: string;
}

export interface TaskStep {
  id: string;
  title: string;
  description: string;
  assignedTo: 'local-agent' | 'widgetdc';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  dependsOn?: string[];
  estimatedDuration?: number; // in seconds
  actualDuration?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskResult {
  stepId: string;
  type: 'data' | 'analysis' | 'action' | 'report';
  content: unknown;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// ROMA-powered task orchestration
export class CollaborativeOrchestrator {
  private bridge: WidgetDCMCPBridge;
  private activeTasks: Map<string, CollaborativeTask> = new Map();

  constructor(bridge?: WidgetDCMCPBridge) {
    this.bridge = bridge || new WidgetDCMCPBridge();
  }

  // Create and orchestrate a collaborative task
  async createCollaborativeTask(
    title: string,
    description: string,
    localAgentRole: string,
    widgetDCRole: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<CollaborativeTask> {
    const taskId = `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Use ROMA to plan the collaborative task
    const romaPlan = await this.planWithROMA(title, description, localAgentRole, widgetDCRole);

    const task: CollaborativeTask = {
      id: taskId,
      title,
      description,
      priority,
      status: 'planning',
      participants: {
        'local-agent': {
          role: localAgentRole,
          capabilities: await this.getLocalAgentCapabilities(),
          status: 'idle'
        },
        'widgetdc': {
          role: widgetDCRole,
          capabilities: await this.getWidgetDCCapabilities(),
          status: 'idle'
        }
      },
      steps: romaPlan.steps.map(step => ({
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: step.title,
        description: step.description,
        assignedTo: step.assignedTo,
        status: 'pending',
        dependsOn: step.dependsOn,
        estimatedDuration: step.estimatedDuration
      })),
      results: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.activeTasks.set(taskId, task);

    // Start execution
    this.executeTask(taskId);

    return task;
  }

  // Plan task using ROMA hierarchical reasoning
  private async planWithROMA(
    title: string,
    description: string,
    localAgentRole: string,
    widgetDCRole: string
  ): Promise<{
    steps: Array<{
      title: string;
      description: string;
      assignedTo: 'local-agent' | 'widgetdc';
      dependsOn?: string[];
      estimatedDuration?: number;
    }>;
  }> {
    // This would call our ROMA bridge service
    // For now, return a structured plan based on the task type

    const taskType = this.inferTaskType(title, description);

    switch (taskType) {
      case 'security-investigation':
        return {
          steps: [
            {
              title: 'OSINT Data Collection',
              description: 'Gather open source intelligence using WidgetDC',
              assignedTo: 'widgetdc',
              estimatedDuration: 300
            },
            {
              title: 'AI Analysis & Pattern Recognition',
              description: 'Analyze collected data using Local Agent AI',
              assignedTo: 'local-agent',
              dependsOn: ['OSINT Data Collection'],
              estimatedDuration: 180
            },
            {
              title: 'Risk Assessment',
              description: 'Evaluate security risks and threats',
              assignedTo: 'widgetdc',
              dependsOn: ['AI Analysis & Pattern Recognition'],
              estimatedDuration: 120
            },
            {
              title: 'Generate Security Report',
              description: 'Create comprehensive security assessment report',
              assignedTo: 'local-agent',
              dependsOn: ['Risk Assessment'],
              estimatedDuration: 240
            }
          ]
        };

      case 'business-intelligence':
        return {
          steps: [
            {
              title: 'Entity Discovery',
              description: 'Identify key entities and relationships',
              assignedTo: 'widgetdc',
              estimatedDuration: 180
            },
            {
              title: 'Market Analysis',
              description: 'Analyze market trends and competitive landscape',
              assignedTo: 'local-agent',
              dependsOn: ['Entity Discovery'],
              estimatedDuration: 300
            },
            {
              title: 'Financial Intelligence',
              description: 'Gather and analyze financial data',
              assignedTo: 'widgetdc',
              dependsOn: ['Market Analysis'],
              estimatedDuration: 240
            },
            {
              title: 'Strategic Recommendations',
              description: 'Generate business strategy recommendations',
              assignedTo: 'local-agent',
              dependsOn: ['Financial Intelligence'],
              estimatedDuration: 180
            }
          ]
        };

      default:
        return {
          steps: [
            {
              title: 'Initial Assessment',
              description: 'Assess task requirements and scope',
              assignedTo: 'local-agent',
              estimatedDuration: 120
            },
            {
              title: 'Data Gathering',
              description: 'Collect relevant data and information',
              assignedTo: 'widgetdc',
              dependsOn: ['Initial Assessment'],
              estimatedDuration: 300
            },
            {
              title: 'Analysis & Processing',
              description: 'Process and analyze collected data',
              assignedTo: 'local-agent',
              dependsOn: ['Data Gathering'],
              estimatedDuration: 240
            },
            {
              title: 'Final Report',
              description: 'Generate comprehensive results report',
              assignedTo: 'widgetdc',
              dependsOn: ['Analysis & Processing'],
              estimatedDuration: 180
            }
          ]
        };
    }
  }

  // Infer task type from title and description
  private inferTaskType(title: string, description: string): string {
    const text = (title + ' ' + description).toLowerCase();

    if (text.includes('security') || text.includes('threat') || text.includes('vulnerability') || text.includes('attack')) {
      return 'security-investigation';
    }

    if (text.includes('business') || text.includes('market') || text.includes('competition') || text.includes('strategy')) {
      return 'business-intelligence';
    }

    if (text.includes('research') || text.includes('analysis') || text.includes('investigation')) {
      return 'research-analysis';
    }

    return 'general-task';
  }

  // Get Local Agent capabilities
  private async getLocalAgentCapabilities(): Promise<string[]> {
    return [
      'Advanced AI Planning (ROMA)',
      'Neural Network Visualization',
      'Multi-modal Input Processing',
      'Smart Suggestions & Predictions',
      'Hierarchical Task Decomposition',
      'Real-time AI Analysis',
      'OpenDeepSearch Integration',
      'Runtime Storage Management'
    ];
  }

  // Get WidgetDC capabilities
  private async getWidgetDCCapabilities(): Promise<string[]> {
    return [
      'OSINT Investigation',
      'Network Graph Analysis',
      'MITRE ATT&CK Framework',
      'Entity Intelligence Search',
      'Security News Monitoring',
      'Threat Intelligence',
      'Compliance Tracking',
      'Real-time Alerts'
    ];
  }

  // Execute collaborative task
  private async executeTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.status = 'executing';
    this.updateTask(task);

    try {
      // Execute steps in dependency order
      const executedSteps = new Set<string>();

      while (executedSteps.size < task.steps.length) {
        const nextStep = task.steps.find(step =>
          !executedSteps.has(step.id) &&
          (!step.dependsOn || step.dependsOn.every(dep => executedSteps.has(dep)))
        );

        if (!nextStep) {
          // No executable steps found - possible circular dependency
          throw new Error('Circular dependency detected in task steps');
        }

        await this.executeStep(task, nextStep);
        executedSteps.add(nextStep.id);
      }

      task.status = 'completed';
    } catch (error) {
      task.status = 'failed';
      console.error('Task execution failed:', error);
    }

    this.updateTask(task);
  }

  // Execute individual step
  private async executeStep(task: CollaborativeTask, step: TaskStep): Promise<void> {
    step.status = 'in-progress';
    step.startedAt = new Date().toISOString();
    task.participants[step.assignedTo].status = 'active';
    task.participants[step.assignedTo].currentStep = step.id;
    this.updateTask(task);

    try {
      let result: unknown;

      if (step.assignedTo === 'local-agent') {
        result = await this.executeLocalAgentStep(step);
      } else {
        result = await this.executeWidgetDCStep(step);
      }

      // Store result
      task.results.push({
        stepId: step.id,
        type: 'data',
        content: result,
        metadata: {
          participant: step.assignedTo,
          duration: step.actualDuration
        },
        timestamp: new Date().toISOString()
      });

      step.status = 'completed';
      step.completedAt = new Date().toISOString();

    } catch (error) {
      step.status = 'failed';
      console.error(`Step ${step.id} failed:`, error);
    }

    task.participants[step.assignedTo].status = 'idle';
    task.participants[step.assignedTo].currentStep = undefined;
    this.updateTask(task);
  }

  // Execute Local Agent step
  private async executeLocalAgentStep(step: TaskStep): Promise<unknown> {
    // This would integrate with our ROMA and search services
    console.log(`Executing Local Agent step: ${step.title}`);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      stepId: step.id,
      participant: 'local-agent',
      analysis: `AI analysis result for: ${step.description}`,
      confidence: 0.85,
      recommendations: ['Action 1', 'Action 2', 'Action 3']
    };
  }

  // Execute WidgetDC step
  private async executeWidgetDCStep(step: TaskStep): Promise<unknown> {
    console.log(`Executing WidgetDC step: ${step.title}`);

    // Use MCP bridge to execute on WidgetDC
    return this.bridge.collaborateTask(
      step.description,
      'Local Agent Coordinator',
      'WidgetDC Executor',
      'high'
    );
  }

  // Update task in storage
  private updateTask(task: CollaborativeTask): void {
    task.updatedAt = new Date().toISOString();
    this.activeTasks.set(task.id, task);
  }

  // Get task status
  getTask(taskId: string): CollaborativeTask | undefined {
    return this.activeTasks.get(taskId);
  }

  // Get all active tasks
  getActiveTasks(): CollaborativeTask[] {
    return Array.from(this.activeTasks.values());
  }

  // Cancel task
  cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (!task || task.status === 'completed') return false;

    task.status = 'failed';
    this.updateTask(task);
    return true;
  }
}

// High-level integration API
export const createCollaborativeSystem = () => {
  const bridge = new WidgetDCMCPBridge();
  const orchestrator = new CollaborativeOrchestrator(bridge);

  return {
    // Quick investigation combining both systems
    async investigateTarget(target: string): Promise<CollaborativeTask> {
      return orchestrator.createCollaborativeTask(
        `Security Investigation: ${target}`,
        `Comprehensive security investigation of ${target} using combined OSINT and AI analysis`,
        'AI Analysis & Threat Assessment',
        'OSINT Data Collection & Intelligence Gathering',
        'high'
      );
    },

    // Business intelligence gathering
    async businessIntelligence(company: string): Promise<CollaborativeTask> {
      return orchestrator.createCollaborativeTask(
        `Business Intelligence: ${company}`,
        `Complete business intelligence analysis of ${company} including market position, competitors, and strategic insights`,
        'Strategic Analysis & Recommendations',
        'Data Collection & Entity Research',
        'medium'
      );
    },

    // Research collaboration
    async researchCollaboration(topic: string): Promise<CollaborativeTask> {
      return orchestrator.createCollaborativeTask(
        `Research: ${topic}`,
        `Collaborative research on ${topic} combining multiple intelligence sources and AI analysis`,
        'AI-powered Research & Synthesis',
        'Multi-source Data Collection',
        'medium'
      );
    },

    // Get system status
    getStatus() {
      return {
        activeTasks: orchestrator.getActiveTasks().length,
        localAgentCapabilities: orchestrator['getLocalAgentCapabilities'](),
        widgetDCCapabilities: orchestrator['getWidgetDCCapabilities'](),
        bridgeConnected: true // Would check actual connection
      };
    }
  };
};
