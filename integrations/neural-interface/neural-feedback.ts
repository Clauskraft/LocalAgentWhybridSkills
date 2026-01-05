import { z } from 'zod';
import { NeuralSignal, ThoughtPattern } from './neural-link';

// 🌀 NEURAL FEEDBACK SYSTEMS
// Real-time neural feedback loops for enhanced human-AI symbiosis
// Creates bidirectional communication between brain and AI

export interface NeuralFeedbackLoop {
  id: string;
  userId: string;
  sessionId: string;
  type: 'reinforcement' | 'correction' | 'enhancement' | 'calming' | 'stimulation' | 'synchronization';
  trigger: {
    condition: string;
    threshold: number;
    neuralPattern: NeuralSignal[];
  };
  response: {
    signals: NeuralSignal[];
    duration: number; // ms
    intensity: number; // 0-1
    frequency: number; // Hz
  };
  effectiveness: {
    successRate: number;
    userAdaptation: number;
    aiLearning: number;
  };
  active: boolean;
  created: number;
  lastTriggered: number;
}

export interface BiofeedbackMetrics {
  heartRate: number;
  heartRateVariability: number;
  skinConductance: number;
  respirationRate: number;
  bodyTemperature: number;
  muscleTension: number[];
  brainWaves: {
    delta: number;
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
  };
}

export interface EmotionalState {
  valence: number; // -1 (negative) to +1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
  dominance: number; // 0 (submissive) to 1 (dominant)
  confidence: number;
  primaryEmotion: string;
  secondaryEmotions: string[];
}

export interface CognitiveState {
  attention: number; // 0-1
  workingMemory: number; // 0-1
  cognitiveLoad: number; // 0-1
  creativity: number; // 0-1
  problemSolving: number; // 0-1
  learning: number; // 0-1
  mentalFatigue: number; // 0-1
}

// NEURAL FEEDBACK CONTROLLER
export class NeuralFeedbackController {
  private activeLoops = new Map<string, NeuralFeedbackLoop>();
  private biofeedbackHistory = new Map<string, BiofeedbackMetrics[]>();
  private emotionalHistory = new Map<string, EmotionalState[]>();
  private cognitiveHistory = new Map<string, CognitiveState[]>();

  // Create a neural feedback loop
  createFeedbackLoop(
    userId: string,
    sessionId: string,
    config: {
      type: NeuralFeedbackLoop['type'];
      triggerCondition: string;
      threshold: number;
      responseIntensity: number;
      responseDuration: number;
    }
  ): NeuralFeedbackLoop {
    const loopId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const loop: NeuralFeedbackLoop = {
      id: loopId,
      userId,
      sessionId,
      type: config.type,
      trigger: {
        condition: config.triggerCondition,
        threshold: config.threshold,
        neuralPattern: []
      },
      response: {
        signals: this.generateFeedbackSignals(config.type, config.responseIntensity),
        duration: config.responseDuration,
        intensity: config.responseIntensity,
        frequency: this.getOptimalFrequency(config.type)
      },
      effectiveness: {
        successRate: 0,
        userAdaptation: 0,
        aiLearning: 0
      },
      active: true,
      created: Date.now(),
      lastTriggered: 0
    };

    this.activeLoops.set(loopId, loop);
    return loop;
  }

  // Generate appropriate neural feedback signals
  private generateFeedbackSignals(type: NeuralFeedbackLoop['type'], intensity: number): NeuralSignal[] {
    const signals: NeuralSignal[] = [];
    const baseAmplitude = intensity * 100;

    switch (type) {
      case 'reinforcement':
        // Positive reinforcement with beta waves
        signals.push({
          timestamp: Date.now(),
          frequency: 20, // Beta waves
          amplitude: baseAmplitude * 0.8,
          electrodeId: 'Cz',
          signalType: 'emotion',
          confidence: 0.9
        });
        break;

      case 'correction':
        // Gentle correction with theta waves
        signals.push({
          timestamp: Date.now(),
          frequency: 6, // Theta waves
          amplitude: baseAmplitude * 0.6,
          electrodeId: 'Fz',
          signalType: 'intention',
          confidence: 0.85
        });
        break;

      case 'enhancement':
        // Cognitive enhancement with gamma waves
        signals.push({
          timestamp: Date.now(),
          frequency: 40, // Gamma waves
          amplitude: baseAmplitude * 0.9,
          electrodeId: 'Pz',
          signalType: 'thought',
          confidence: 0.95
        });
        break;

      case 'calming':
        // Calming signals with alpha waves
        signals.push({
          timestamp: Date.now(),
          frequency: 10, // Alpha waves
          amplitude: baseAmplitude * 0.7,
          electrodeId: 'Oz',
          signalType: 'emotion',
          confidence: 0.9
        });
        break;

      case 'stimulation':
        // Stimulation with high beta waves
        signals.push({
          timestamp: Date.now(),
          frequency: 25, // High beta
          amplitude: baseAmplitude * 0.85,
          electrodeId: 'Fz',
          signalType: 'intention',
          confidence: 0.9
        });
        break;

      case 'synchronization':
        // Brain wave synchronization across hemispheres
        ['F3', 'F4', 'C3', 'C4'].forEach(electrode => {
          signals.push({
            timestamp: Date.now(),
            frequency: 12, // Alpha synchronization
            amplitude: baseAmplitude * 0.75,
            electrodeId: electrode,
            signalType: 'thought',
            confidence: 0.88
          });
        });
        break;
    }

    return signals;
  }

  // Get optimal frequency for feedback type
  private getOptimalFrequency(type: NeuralFeedbackLoop['type']): number {
    const frequencies = {
      'reinforcement': 20, // Beta
      'correction': 6,     // Theta
      'enhancement': 40,   // Gamma
      'calming': 10,       // Alpha
      'stimulation': 25,   // High Beta
      'synchronization': 12 // Alpha sync
    };

    return frequencies[type] || 10;
  }

  // Process thought pattern and trigger appropriate feedback
  async processThoughtPattern(pattern: ThoughtPattern): Promise<NeuralSignal[]> {
    const userLoops = Array.from(this.activeLoops.values())
      .filter(loop => loop.userId === pattern.userId && loop.active);

    const triggeredFeedback: NeuralSignal[] = [];

    for (const loop of userLoops) {
      if (this.shouldTriggerLoop(loop, pattern)) {
        const feedback = await this.executeFeedbackLoop(loop, pattern);
        triggeredFeedback.push(...feedback);
        loop.lastTriggered = Date.now();

        // Update effectiveness metrics
        this.updateLoopEffectiveness(loop);
      }
    }

    return triggeredFeedback;
  }

  // Check if feedback loop should be triggered
  private shouldTriggerLoop(loop: NeuralFeedbackLoop, pattern: ThoughtPattern): boolean {
    const { condition, threshold } = loop.trigger;

    switch (condition) {
      case 'high-stress':
        return pattern.interpretation.emotion.includes('stress') &&
               pattern.interpretation.complexity > threshold;

      case 'low-focus':
        return pattern.interpretation.emotion.includes('distracted') &&
               pattern.interpretation.complexity < threshold;

      case 'creative-block':
        return pattern.interpretation.intent === 'creative-task' &&
               pattern.interpretation.complexity < threshold * 0.5;

      case 'cognitive-overload':
        return pattern.interpretation.complexity > threshold;

      case 'emotional-distress':
        return pattern.interpretation.emotion.includes('anxious') ||
               pattern.interpretation.emotion.includes('stressed');

      case 'learning-opportunity':
        return pattern.interpretation.intent === 'problem-solving' &&
               pattern.interpretation.complexity > threshold * 0.8;

      default:
        return false;
    }
  }

  // Execute feedback loop
  private async executeFeedbackLoop(
    loop: NeuralFeedbackLoop,
    pattern: ThoughtPattern
  ): Promise<NeuralSignal[]> {
    console.log(`🌀 Executing neural feedback: ${loop.type} for ${pattern.interpretation.intent}`);

    // Apply timing and intensity adjustments based on user state
    const adjustedSignals = loop.response.signals.map(signal => ({
      ...signal,
      amplitude: this.adjustAmplitude(signal.amplitude, pattern),
      timestamp: Date.now()
    }));

    // Simulate neural feedback delivery
    await new Promise(resolve => setTimeout(resolve, loop.response.duration));

    return adjustedSignals;
  }

  // Adjust feedback amplitude based on user state
  private adjustAmplitude(baseAmplitude: number, pattern: ThoughtPattern): number {
    let multiplier = 1;

    // Increase intensity for high cognitive load
    if (pattern.interpretation.complexity > 7) {
      multiplier *= 1.2;
    }

    // Decrease intensity for emotional distress
    if (pattern.interpretation.emotion.includes('anxious') ||
        pattern.interpretation.emotion.includes('stressed')) {
      multiplier *= 0.8;
    }

    // Increase intensity for urgent situations
    if (pattern.interpretation.urgency === 'high' ||
        pattern.interpretation.urgency === 'critical') {
      multiplier *= 1.3;
    }

    return Math.min(baseAmplitude * multiplier, 150); // Cap at safe level
  }

  // Update feedback loop effectiveness
  private updateLoopEffectiveness(loop: NeuralFeedbackLoop): void {
    // Simulate learning from feedback effectiveness
    const successImprovement = Math.random() * 0.1; // 0-10% improvement
    const adaptationRate = Math.random() * 0.05;   // 0-5% adaptation

    loop.effectiveness.successRate = Math.min(
      loop.effectiveness.successRate + successImprovement, 1
    );
    loop.effectiveness.userAdaptation = Math.min(
      loop.effectiveness.userAdaptation + adaptationRate, 1
    );
    loop.effectiveness.aiLearning = Math.min(
      loop.effectiveness.aiLearning + (successImprovement + adaptationRate) / 2, 1
    );
  }

  // Monitor biofeedback metrics
  recordBiofeedback(userId: string, metrics: BiofeedbackMetrics): void {
    if (!this.biofeedbackHistory.has(userId)) {
      this.biofeedbackHistory.set(userId, []);
    }

    const history = this.biofeedbackHistory.get(userId)!;
    history.push(metrics);

    // Keep only last 1000 readings
    if (history.length > 1000) {
      history.shift();
    }
  }

  // Analyze emotional state from biofeedback
  analyzeEmotionalState(userId: string): EmotionalState | null {
    const history = this.biofeedbackHistory.get(userId);
    if (!history || history.length < 10) return null;

    const recent = history.slice(-50); // Last 50 readings

    // Analyze heart rate variability (stress indicator)
    const hrvAvg = recent.reduce((sum, m) => sum + m.heartRateVariability, 0) / recent.length;

    // Analyze skin conductance (arousal indicator)
    const scAvg = recent.reduce((sum, m) => sum + m.skinConductance, 0) / recent.length;

    // Analyze brain waves for emotional valence
    const alphaAvg = recent.reduce((sum, m) => sum + m.brainWaves.alpha, 0) / recent.length;
    const betaAvg = recent.reduce((sum, m) => sum + m.brainWaves.beta, 0) / recent.length;

    // Calculate emotional dimensions
    const valence = Math.tanh((alphaAvg - betaAvg) / 50); // -1 to +1
    const arousal = Math.min(scAvg / 10, 1); // 0 to 1
    const dominance = Math.min(hrvAvg / 100, 1); // 0 to 1

    // Determine primary emotion
    let primaryEmotion = 'neutral';
    let confidence = 0.5;

    if (valence > 0.5 && arousal > 0.7) {
      primaryEmotion = 'excited';
      confidence = 0.8;
    } else if (valence > 0.3 && arousal < 0.4) {
      primaryEmotion = 'content';
      confidence = 0.7;
    } else if (valence < -0.5 && arousal > 0.6) {
      primaryEmotion = 'angry';
      confidence = 0.8;
    } else if (valence < -0.3 && arousal < 0.4) {
      primaryEmotion = 'sad';
      confidence = 0.7;
    } else if (arousal > 0.8) {
      primaryEmotion = 'anxious';
      confidence = 0.6;
    }

    const emotionalState: EmotionalState = {
      valence,
      arousal,
      dominance,
      confidence,
      primaryEmotion,
      secondaryEmotions: [] // Could be expanded
    };

    // Store in history
    if (!this.emotionalHistory.has(userId)) {
      this.emotionalHistory.set(userId, []);
    }
    this.emotionalHistory.get(userId)!.push(emotionalState);

    return emotionalState;
  }

  // Monitor cognitive state
  analyzeCognitiveState(userId: string): CognitiveState | null {
    const history = this.biofeedbackHistory.get(userId);
    if (!history || history.length < 20) return null;

    const recent = history.slice(-100); // Last 100 readings

    // Attention from beta/alpha ratio
    const attention = recent.reduce((sum, m) => {
      const ratio = m.brainWaves.beta / (m.brainWaves.alpha + 1);
      return sum + Math.min(ratio / 3, 1);
    }, 0) / recent.length;

    // Cognitive load from gamma activity
    const cognitiveLoad = recent.reduce((sum, m) =>
      sum + Math.min(m.brainWaves.gamma / 50, 1), 0
    ) / recent.length;

    // Creativity from theta/alpha synchrony (simplified)
    const creativity = recent.reduce((sum, m) => {
      const synchrony = 1 - Math.abs(m.brainWaves.theta - m.brainWaves.alpha) / 20;
      return sum + synchrony;
    }, 0) / recent.length;

    // Mental fatigue from decreasing HRV and increasing theta
    const fatigueTrend = this.calculateFatigueTrend(recent);

    const cognitiveState: CognitiveState = {
      attention,
      workingMemory: Math.max(0, 1 - cognitiveLoad), // Inverse relationship
      cognitiveLoad,
      creativity,
      problemSolving: attention * (1 - cognitiveLoad) * creativity,
      learning: (1 - fatigueTrend) * attention,
      mentalFatigue: fatigueTrend
    };

    // Store in history
    if (!this.cognitiveHistory.has(userId)) {
      this.cognitiveHistory.set(userId, []);
    }
    this.cognitiveHistory.get(userId)!.push(cognitiveState);

    return cognitiveState;
  }

  // Calculate mental fatigue trend
  private calculateFatigueTrend(recentMetrics: BiofeedbackMetrics[]): number {
    if (recentMetrics.length < 50) return 0.5;

    const firstHalf = recentMetrics.slice(0, 25);
    const secondHalf = recentMetrics.slice(-25);

    const firstHalfHRV = firstHalf.reduce((sum, m) => sum + m.heartRateVariability, 0) / firstHalf.length;
    const secondHalfHRV = secondHalf.reduce((sum, m) => sum + m.heartRateVariability, 0) / secondHalf.length;

    const firstHalfTheta = firstHalf.reduce((sum, m) => sum + m.brainWaves.theta, 0) / firstHalf.length;
    const secondHalfTheta = secondHalf.reduce((sum, m) => sum + m.brainWaves.theta, 0) / secondHalf.length;

    // Fatigue increases with decreasing HRV and increasing theta
    const hrvFatigue = Math.max(0, (firstHalfHRV - secondHalfHRV) / firstHalfHRV);
    const thetaFatigue = Math.max(0, (secondHalfTheta - firstHalfTheta) / firstHalfTheta);

    return Math.min((hrvFatigue + thetaFatigue) / 2, 1);
  }

  // Adaptive feedback optimization
  optimizeFeedbackLoops(userId: string): void {
    const loops = Array.from(this.activeLoops.values())
      .filter(loop => loop.userId === userId);

    const emotionalState = this.analyzeEmotionalState(userId);
    const cognitiveState = this.analyzeCognitiveState(userId);

    if (!emotionalState || !cognitiveState) return;

    for (const loop of loops) {
      // Optimize based on user state
      if (emotionalState.primaryEmotion === 'anxious' && loop.type === 'calming') {
        // Increase calming feedback intensity
        loop.response.intensity = Math.min(loop.response.intensity * 1.2, 1);
      } else if (cognitiveState.mentalFatigue > 0.7 && loop.type === 'enhancement') {
        // Decrease cognitive enhancement when fatigued
        loop.response.intensity = Math.max(loop.response.intensity * 0.8, 0.1);
      } else if (cognitiveState.creativity < 0.3 && loop.type === 'stimulation') {
        // Increase stimulation for low creativity
        loop.response.intensity = Math.min(loop.response.intensity * 1.1, 0.9);
      }
    }
  }

  // Emergency neural intervention
  emergencyIntervention(userId: string, condition: 'panic' | 'seizure' | 'cognitive-breakdown'): NeuralSignal[] {
    console.log(`🚨 EMERGENCY NEURAL INTERVENTION: ${condition} for user ${userId}`);

    const emergencySignals: NeuralSignal[] = [];

    switch (condition) {
      case 'panic':
        // Immediate calming protocol
        emergencySignals.push(
          {
            timestamp: Date.now(),
            frequency: 8, // Theta waves
            amplitude: 80,
            electrodeId: 'Oz',
            signalType: 'emotion',
            confidence: 1.0
          },
          {
            timestamp: Date.now(),
            frequency: 0.5, // Delta waves for deep calm
            amplitude: 60,
            electrodeId: 'Cz',
            signalType: 'emotion',
            confidence: 1.0
          }
        );
        break;

      case 'seizure':
        // Anti-seizure neural stabilization
        emergencySignals.push(
          {
            timestamp: Date.now(),
            frequency: 12, // Balanced alpha
            amplitude: 40,
            electrodeId: 'Fz',
            signalType: 'thought',
            confidence: 1.0
          }
        );
        break;

      case 'cognitive-breakdown':
        // Cognitive reset protocol
        emergencySignals.push(
          {
            timestamp: Date.now(),
            frequency: 15, // Low beta for stability
            amplitude: 50,
            electrodeId: 'Pz',
            signalType: 'thought',
            confidence: 1.0
          }
        );
        break;
    }

    return emergencySignals;
  }

  // Get feedback loop status
  getFeedbackStatus(userId: string): {
    activeLoops: number;
    averageEffectiveness: number;
    recentTriggers: number;
    optimizationLevel: number;
  } {
    const userLoops = Array.from(this.activeLoops.values())
      .filter(loop => loop.userId === userId);

    const activeLoops = userLoops.filter(loop => loop.active).length;
    const averageEffectiveness = userLoops.length > 0 ?
      userLoops.reduce((sum, loop) => sum + loop.effectiveness.successRate, 0) / userLoops.length : 0;

    const recentTriggers = userLoops.filter(loop =>
      loop.lastTriggered > Date.now() - 3600000 // Last hour
    ).length;

    // Calculate optimization level based on adaptation and learning
    const avgAdaptation = userLoops.length > 0 ?
      userLoops.reduce((sum, loop) => sum + loop.effectiveness.userAdaptation, 0) / userLoops.length : 0;

    const avgLearning = userLoops.length > 0 ?
      userLoops.reduce((sum, loop) => sum + loop.effectiveness.aiLearning, 0) / userLoops.length : 0;

    const optimizationLevel = (avgAdaptation + avgLearning) / 2;

    return {
      activeLoops,
      averageEffectiveness,
      recentTriggers,
      optimizationLevel
    };
  }

  // Deactivate feedback loop
  deactivateLoop(loopId: string): boolean {
    const loop = this.activeLoops.get(loopId);
    if (!loop) return false;

    loop.active = false;
    return true;
  }

  // Get all active loops for user
  getActiveLoops(userId: string): NeuralFeedbackLoop[] {
    return Array.from(this.activeLoops.values())
      .filter(loop => loop.userId === userId && loop.active);
  }
}

// HIGH-LEVEL NEURAL FEEDBACK API
export const NeuralFeedbackAPI = {
  // Feedback loop management
  createLoop: (userId: string, sessionId: string, config: Parameters<NeuralFeedbackController['createFeedbackLoop']>[2]) =>
    new NeuralFeedbackController().createFeedbackLoop(userId, sessionId, config),

  processPattern: (pattern: ThoughtPattern) =>
    new NeuralFeedbackController().processThoughtPattern(pattern),

  deactivateLoop: (loopId: string) =>
    new NeuralFeedbackController().deactivateLoop(loopId),

  getActiveLoops: (userId: string) =>
    new NeuralFeedbackController().getActiveLoops(userId),

  // Biofeedback monitoring
  recordBiofeedback: (userId: string, metrics: BiofeedbackMetrics) =>
    new NeuralFeedbackController().recordBiofeedback(userId, metrics),

  analyzeEmotionalState: (userId: string) =>
    new NeuralFeedbackController().analyzeEmotionalState(userId),

  analyzeCognitiveState: (userId: string) =>
    new NeuralFeedbackController().analyzeCognitiveState(userId),

  // Emergency interventions
  emergencyIntervention: (userId: string, condition: Parameters<NeuralFeedbackController['emergencyIntervention']>[1]) =>
    new NeuralFeedbackController().emergencyIntervention(userId, condition),

  // Optimization
  optimizeLoops: (userId: string) =>
    new NeuralFeedbackController().optimizeFeedbackLoops(userId),

  // Status
  getStatus: (userId: string) =>
    new NeuralFeedbackController().getFeedbackStatus(userId)
};
