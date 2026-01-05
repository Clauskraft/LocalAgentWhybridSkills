import { useState, useEffect, memo } from 'react';
import { IconBolt, IconSettings, IconCircle, IconSend } from './icons';

interface CuttingEdgeFeaturesProps {
  isActive: boolean;
  messages: any[];
  onFeatureActivate: (feature: string, data?: any) => void;
}

export const CuttingEdgeFeatures = memo(function CuttingEdgeFeatures({
  isActive,
  messages,
  onFeatureActivate
}: CuttingEdgeFeaturesProps) {
  const [activeFeatures, setActiveFeatures] = useState<Set<string>>(new Set());
  const [systemLoad, setSystemLoad] = useState(0);

  // LOOP 10: Cutting-Edge Features
  useEffect(() => {
    if (!isActive) return;

    // Simulate system monitoring
    const interval = setInterval(() => {
      setSystemLoad(Math.random() * 100);
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive]);

  const features = [
    {
      id: 'neural-link',
      name: 'Neural Link',
      description: 'Direct brain-computer interface simulation',
      icon: <IconCircle className="w-5 h-5" />,
      status: 'experimental',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'quantum-compute',
      name: 'Quantum Compute',
      description: 'Harness quantum superposition for parallel processing',
      icon: <IconBolt className="w-5 h-5" />,
      status: 'beta',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      id: 'predictive-vision',
      name: 'Predictive Vision',
      description: 'See possible futures and choose optimal paths',
      icon: <IconSettings className="w-5 h-5" />,
      status: 'alpha',
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'hyper-speed',
      name: 'Hyper-Speed Mode',
      description: 'Accelerate processing to near-light speeds',
      icon: <IconSend className="w-5 h-5" />,
      status: 'stable',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const toggleFeature = (featureId: string) => {
    const newActive = new Set(activeFeatures);
    if (newActive.has(featureId)) {
      newActive.delete(featureId);
    } else {
      newActive.add(featureId);
    }
    setActiveFeatures(newActive);
    onFeatureActivate(featureId, { active: newActive.has(featureId) });
  };

  if (!isActive) return null;

  return (
    <div className="absolute top-20 right-4 w-80 bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl animate-quantum-collapse z-50">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-accent/20 to-accent/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            🚀 Cutting-Edge Lab
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          </h3>
          <div className="text-xs text-text-muted">
            System Load: {systemLoad.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* System Monitor */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Neural Activity</span>
          <span className="text-xs text-accent">{messages.length} thoughts processed</span>
        </div>
        <div className="w-full bg-bg-tertiary rounded-full h-2">
          <div
            className="bg-gradient-to-r from-accent to-accent-hover h-2 rounded-full transition-all duration-1000 animate-volumetric-light"
            style={{ width: `${Math.min(systemLoad + 20, 100)}%` }}
          />
        </div>
      </div>

      {/* Features Grid */}
      <div className="p-4 space-y-3">
        {features.map((feature) => (
          <div
            key={feature.id}
            className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer group ${
              activeFeatures.has(feature.id)
                ? 'bg-accent/10 border-accent/30 shadow-lg animate-holographic-shimmer'
                : 'bg-bg-tertiary/50 border-white/10 hover:border-accent/20 hover:bg-accent/5'
            }`}
            onClick={() => toggleFeature(feature.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${feature.color} text-white group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary group-hover:text-accent transition-colors">
                    {feature.name}
                  </h4>
                  <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                    feature.status === 'stable' ? 'bg-success/20 text-success' :
                    feature.status === 'beta' ? 'bg-warning/20 text-warning' :
                    'bg-error/20 text-error'
                  }`}>
                    {feature.status.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                activeFeatures.has(feature.id)
                  ? 'bg-accent border-accent'
                  : 'border-text-muted group-hover:border-accent'
              }`}>
                {activeFeatures.has(feature.id) && (
                  <div className="w-full h-full rounded-full bg-white scale-50 animate-micro-bounce" />
                )}
              </div>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              {feature.description}
            </p>

            {/* Feature-specific UI */}
            {activeFeatures.has(feature.id) && feature.id === 'hyper-speed' && (
              <div className="mt-3 p-2 bg-orange-500/10 rounded-lg animate-pulse">
                <div className="text-xs text-orange-600 font-medium">
                  ⚡ Hyper-Speed engaged! Processing at 10x normal speed
                </div>
              </div>
            )}

            {activeFeatures.has(feature.id) && feature.id === 'quantum-compute' && (
              <div className="mt-3 flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-cyan-400 rounded-full animate-quantum-wave"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 bg-bg-tertiary/30 border-t border-white/20">
        <div className="text-center">
          <div className="text-xs text-text-muted mb-2">
            Active Features: {activeFeatures.size}/{features.length}
          </div>
          <button
            onClick={() => setActiveFeatures(new Set())}
            className="text-xs px-3 py-1 bg-bg-tertiary hover:bg-bg-hover rounded-lg transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
});
