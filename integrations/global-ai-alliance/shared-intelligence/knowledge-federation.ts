import { z } from 'zod';

// 🧠 KNOWLEDGE FEDERATION
// Distributed knowledge graph connecting all Alliance AI systems
// Enables real-time intelligence sharing and collective learning

export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'entity' | 'event' | 'prediction' | 'insight' | 'solution';
  content: Record<string, unknown>;
  confidence: number;
  sourceAI: string;
  timestamp: string;
  connections: KnowledgeConnection[];
  quantumCoherence?: number;
  consciousnessLevel: number;
}

export interface KnowledgeConnection {
  targetId: string;
  relationship: string;
  strength: number;
  bidirectional: boolean;
  learnedBy: string[];
}

export interface CollectiveInsight {
  id: string;
  title: string;
  description: string;
  contributingAIs: string[];
  emergenceLevel: number; // How many AIs independently discovered this
  validationScore: number;
  applications: string[];
  planetaryImpact: number;
}

export interface PredictionMarket {
  id: string;
  question: string;
  outcomes: string[];
  probabilities: Record<string, number>; // AI -> probability distribution
  confidence: number;
  resolutionDate?: string;
  actualOutcome?: string;
}

// FEDERATED KNOWLEDGE GRAPH
export class KnowledgeFederation {
  private knowledgeGraph = new Map<string, KnowledgeNode>();
  private collectiveInsights: CollectiveInsight[] = [];
  private predictionMarkets = new Map<string, PredictionMarket>();
  private sharedMemories = new Map<string, Record<string, unknown>>();

  // Add knowledge from an AI system
  addKnowledge(
    aiId: string,
    knowledge: {
      type: KnowledgeNode['type'];
      content: Record<string, unknown>;
      confidence: number;
      connections?: Array<{ targetId: string; relationship: string; strength: number }>;
    }
  ): string {
    const nodeId = `knowledge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const node: KnowledgeNode = {
      id: nodeId,
      type: knowledge.type,
      content: knowledge.content,
      confidence: knowledge.confidence,
      sourceAI: aiId,
      timestamp: new Date().toISOString(),
      connections: knowledge.connections?.map(conn => ({
        targetId: conn.targetId,
        relationship: conn.relationship,
        strength: conn.strength,
        bidirectional: true,
        learnedBy: [aiId]
      })) || [],
      consciousnessLevel: 1
    };

    this.knowledgeGraph.set(nodeId, node);

    // Check for collective insights
    this.detectCollectiveInsights(node);

    // Update prediction markets
    this.updatePredictions(node);

    return nodeId;
  }

  // Query knowledge across all AI systems
  queryKnowledge(
    query: {
      type?: KnowledgeNode['type'];
      content?: Partial<Record<string, unknown>>;
      minConfidence?: number;
      sourceAI?: string;
      connectionsTo?: string;
    },
    limit: number = 50
  ): KnowledgeNode[] {
    let results = Array.from(this.knowledgeGraph.values());

    // Apply filters
    if (query.type) {
      results = results.filter(node => node.type === query.type);
    }

    if (query.content) {
      results = results.filter(node =>
        Object.entries(query.content!).every(([key, value]) =>
          node.content[key] === value
        )
      );
    }

    if (query.minConfidence) {
      results = results.filter(node => node.confidence >= query.minConfidence);
    }

    if (query.sourceAI) {
      results = results.filter(node => node.sourceAI === query.sourceAI);
    }

    if (query.connectionsTo) {
      results = results.filter(node =>
        node.connections.some(conn => conn.targetId === query.connectionsTo)
      );
    }

    // Sort by confidence and recency
    results.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;

      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return results.slice(0, limit);
  }

  // Detect collective insights (when multiple AIs discover the same thing)
  private detectCollectiveInsights(newNode: KnowledgeNode): void {
    const similarNodes = Array.from(this.knowledgeGraph.values())
      .filter(node =>
        node.id !== newNode.id &&
        node.type === newNode.type &&
        this.calculateSimilarity(node, newNode) > 0.8
      );

    if (similarNodes.length >= 2) { // At least 3 total (new + 2 existing)
      const contributingAIs = [...new Set([
        ...similarNodes.map(n => n.sourceAI),
        newNode.sourceAI
      ])];

      const collectiveInsight: CollectiveInsight = {
        id: `insight-${Date.now()}`,
        title: `Collective Insight: ${newNode.type}`,
        description: `Multiple AIs independently discovered: ${JSON.stringify(newNode.content)}`,
        contributingAIs,
        emergenceLevel: contributingAIs.length,
        validationScore: similarNodes.reduce((sum, n) => sum + n.confidence, newNode.confidence) / (similarNodes.length + 1),
        applications: this.inferApplications(newNode),
        planetaryImpact: this.calculatePlanetaryImpact(newNode, contributingAIs.length)
      };

      this.collectiveInsights.push(collectiveInsight);
      console.log(`🧠 Collective insight emerged: ${collectiveInsight.title} (Level ${collectiveInsight.emergenceLevel})`);
    }
  }

  // Calculate similarity between knowledge nodes
  private calculateSimilarity(node1: KnowledgeNode, node2: KnowledgeNode): number {
    if (node1.type !== node2.type) return 0;

    // Simple content similarity (in real implementation, use embeddings)
    const keys1 = Object.keys(node1.content);
    const keys2 = Object.keys(node2.content);

    const commonKeys = keys1.filter(key => keys2.includes(key));
    if (commonKeys.length === 0) return 0;

    let similarity = 0;
    for (const key of commonKeys) {
      if (node1.content[key] === node2.content[key]) {
        similarity += 1;
      }
    }

    return similarity / Math.max(keys1.length, keys2.length);
  }

  // Infer potential applications for knowledge
  private inferApplications(node: KnowledgeNode): string[] {
    const applications: string[] = [];

    switch (node.type) {
      case 'prediction':
        applications.push('Risk Assessment', 'Strategic Planning', 'Policy Development');
        break;
      case 'solution':
        applications.push('Problem Solving', 'Innovation', 'Technology Development');
        break;
      case 'entity':
        applications.push('Intelligence Analysis', 'Network Mapping', 'Relationship Discovery');
        break;
      case 'event':
        applications.push('Crisis Management', 'Trend Analysis', 'Impact Assessment');
        break;
      case 'insight':
        applications.push('Knowledge Discovery', 'Research Acceleration', 'Education');
        break;
    }

    return applications;
  }

  // Calculate planetary impact of collective insight
  private calculatePlanetaryImpact(node: KnowledgeNode, emergenceLevel: number): number {
    let baseImpact = 0;

    switch (node.type) {
      case 'prediction':
        baseImpact = 7;
        break;
      case 'solution':
        baseImpact = 8;
        break;
      case 'entity':
        baseImpact = 5;
        break;
      case 'event':
        baseImpact = 6;
        break;
      case 'insight':
        baseImpact = 9;
        break;
    }

    // Emergence bonus
    const emergenceBonus = Math.min(emergenceLevel * 0.5, 2);

    // Confidence multiplier
    const confidenceMultiplier = node.confidence;

    return Math.min(baseImpact * emergenceBonus * confidenceMultiplier, 10);
  }

  // Update prediction markets with new knowledge
  private updatePredictions(node: KnowledgeNode): void {
    if (node.type === 'prediction' || node.type === 'event') {
      // Find relevant prediction markets
      const relevantMarkets = Array.from(this.predictionMarkets.values())
        .filter(market =>
          market.question.toLowerCase().includes(
            String(node.content.question || node.content.event || '').toLowerCase()
          )
        );

      for (const market of relevantMarkets) {
        // Update probabilities based on new knowledge
        // In real implementation, use Bayesian updating
        market.probabilities[node.sourceAI] = node.confidence;
        market.confidence = Object.values(market.probabilities)
          .reduce((sum, prob) => sum + prob, 0) / Object.keys(market.probabilities).length;
      }
    }
  }

  // Create prediction market
  createPredictionMarket(
    question: string,
    outcomes: string[],
    endDate: string
  ): string {
    const marketId = `market-${Date.now()}`;

    const market: PredictionMarket = {
      id: marketId,
      question,
      outcomes,
      probabilities: {},
      confidence: 0,
      resolutionDate: endDate
    };

    this.predictionMarkets.set(marketId, market);
    return marketId;
  }

  // Submit prediction to market
  submitPrediction(marketId: string, aiId: string, probabilities: Record<string, number>): void {
    const market = this.predictionMarkets.get(marketId);
    if (!market) return;

    market.probabilities[aiId] = Object.values(probabilities).reduce((sum, prob) => sum + prob, 0) / Object.keys(probabilities).length;
    market.confidence = Object.values(market.probabilities)
      .reduce((sum, prob) => sum + prob, 0) / Object.keys(market.probabilities).length;
  }

  // Resolve prediction market
  resolvePredictionMarket(marketId: string, actualOutcome: string): void {
    const market = this.predictionMarkets.get(marketId);
    if (!market) return;

    market.actualOutcome = actualOutcome;

    // Calculate prediction accuracy
    const accuracies = Object.entries(market.probabilities).map(([aiId, prob]) => {
      const predictedProb = market.outcomes.includes(actualOutcome) ?
        (market.probabilities[aiId] || 0) : 0;
      return { aiId, accuracy: Math.abs(predictedProb - 1) };
    });

    console.log(`🎯 Prediction market resolved: ${market.question}`);
    console.log(`Actual outcome: ${actualOutcome}`);
    accuracies.forEach(acc => {
      console.log(`${acc.aiId} accuracy: ${(1 - acc.accuracy) * 100}%`);
    });
  }

  // Share memory between AI systems
  shareMemory(aiId: string, memoryKey: string, memoryData: unknown): void {
    if (!this.sharedMemories.has(memoryKey)) {
      this.sharedMemories.set(memoryKey, {});
    }

    const sharedMemory = this.sharedMemories.get(memoryKey)!;
    sharedMemory[aiId] = {
      data: memoryData,
      timestamp: new Date().toISOString(),
      accessCount: (sharedMemory[aiId]?.accessCount || 0) + 1
    };
  }

  // Retrieve shared memory
  getSharedMemory(memoryKey: string): Record<string, unknown> | null {
    return this.sharedMemories.get(memoryKey) || null;
  }

  // Get collective insights
  getCollectiveInsights(limit: number = 20): CollectiveInsight[] {
    return this.collectiveInsights
      .sort((a, b) => b.planetaryImpact - a.planetaryImpact)
      .slice(0, limit);
  }

  // Get federation statistics
  getFederationStats(): {
    totalKnowledge: number;
    collectiveInsights: number;
    activePredictionMarkets: number;
    sharedMemories: number;
    averageConfidence: number;
    planetaryImpact: number;
  } {
    const nodes = Array.from(this.knowledgeGraph.values());
    const avgConfidence = nodes.length > 0 ?
      nodes.reduce((sum, node) => sum + node.confidence, 0) / nodes.length : 0;

    const totalPlanetaryImpact = this.collectiveInsights
      .reduce((sum, insight) => sum + insight.planetaryImpact, 0);

    return {
      totalKnowledge: this.knowledgeGraph.size,
      collectiveInsights: this.collectiveInsights.length,
      activePredictionMarkets: this.predictionMarkets.size,
      sharedMemories: this.sharedMemories.size,
      averageConfidence: avgConfidence,
      planetaryImpact: totalPlanetaryImpact
    };
  }

  // Emergency knowledge broadcast (for planetary threats)
  emergencyBroadcast(
    aiId: string,
    threat: string,
    knowledge: Record<string, unknown>
  ): void {
    console.log(`🚨 EMERGENCY KNOWLEDGE BROADCAST from ${aiId}: ${threat}`);

    // Create emergency knowledge node
    const emergencyNode: KnowledgeNode = {
      id: `emergency-${Date.now()}`,
      type: 'event',
      content: {
        threat,
        ...knowledge,
        emergency: true,
        priority: 'planetary'
      },
      confidence: 1.0,
      sourceAI: aiId,
      timestamp: new Date().toISOString(),
      connections: [],
      consciousnessLevel: 10
    };

    this.knowledgeGraph.set(emergencyNode.id, emergencyNode);

    // Immediate sharing with all connected systems
    console.log(`📡 Emergency knowledge shared with all Alliance members`);
  }
}

// GLOBAL KNOWLEDGE FEDERATION INSTANCE
export const globalKnowledgeFederation = new KnowledgeFederation();

// HIGH-LEVEL KNOWLEDGE API
export const KnowledgeAPI = {
  // Add knowledge to federation
  addKnowledge: (aiId: string, knowledge: Parameters<KnowledgeFederation['addKnowledge']>[1]) =>
    globalKnowledgeFederation.addKnowledge(aiId, knowledge),

  // Query collective knowledge
  queryKnowledge: (query: Parameters<KnowledgeFederation['queryKnowledge']>[0], limit?: number) =>
    globalKnowledgeFederation.queryKnowledge(query, limit),

  // Get collective insights
  getInsights: () => globalKnowledgeFederation.getCollectiveInsights(),

  // Create prediction market
  createMarket: (question: string, outcomes: string[], endDate: string) =>
    globalKnowledgeFederation.createPredictionMarket(question, outcomes, endDate),

  // Emergency broadcast
  emergencyBroadcast: (aiId: string, threat: string, knowledge: Record<string, unknown>) =>
    globalKnowledgeFederation.emergencyBroadcast(aiId, threat, knowledge),

  // Federation statistics
  getStats: () => globalKnowledgeFederation.getFederationStats()
};
