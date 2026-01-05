import { useEffect, useRef, useState, memo } from 'react';

interface Node {
  id: string;
  x: number;
  y: number;
  type: 'input' | 'hidden' | 'output';
  activation: number;
  label: string;
}

interface Connection {
  from: string;
  to: string;
  weight: number;
  active: boolean;
}

interface NeuralVisualizerProps {
  isActive: boolean;
  inputData?: any;
  outputData?: any;
}

export const NeuralVisualizer = memo(function NeuralVisualizer({
  isActive,
  inputData,
  outputData
}: NeuralVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  // LOOP 6: Neural Network Initialization
  useEffect(() => {
    if (!isActive) return;

    // Create a simple neural network structure
    const networkNodes: Node[] = [];
    const networkConnections: Connection[] = [];

    // Input layer
    for (let i = 0; i < 4; i++) {
      networkNodes.push({
        id: `input-${i}`,
        x: 100,
        y: 100 + i * 80,
        type: 'input',
        activation: Math.random(),
        label: `Input ${i + 1}`
      });
    }

    // Hidden layer
    for (let i = 0; i < 6; i++) {
      networkNodes.push({
        id: `hidden-${i}`,
        x: 300,
        y: 80 + i * 60,
        type: 'hidden',
        activation: Math.random(),
        label: `Hidden ${i + 1}`
      });
    }

    // Output layer
    for (let i = 0; i < 3; i++) {
      networkNodes.push({
        id: `output-${i}`,
        x: 500,
        y: 150 + i * 80,
        type: 'output',
        activation: Math.random(),
        label: `Output ${i + 1}`
      });
    }

    // Create connections
    networkNodes.forEach(fromNode => {
      if (fromNode.type === 'input') {
        // Connect input to hidden
        networkNodes.filter(n => n.type === 'hidden').forEach(toNode => {
          networkConnections.push({
            from: fromNode.id,
            to: toNode.id,
            weight: (Math.random() - 0.5) * 2,
            active: Math.random() > 0.7
          });
        });
      } else if (fromNode.type === 'hidden') {
        // Connect hidden to output
        networkNodes.filter(n => n.type === 'output').forEach(toNode => {
          networkConnections.push({
            from: fromNode.id,
            to: toNode.id,
            weight: (Math.random() - 0.5) * 2,
            active: Math.random() > 0.7
          });
        });
      }
    });

    setNodes(networkNodes);
    setConnections(networkConnections);
  }, [isActive]);

  // LOOP 6: Real-time Animation
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const animate = () => {
      time += 0.02;

      // Clear canvas with glassmorphism effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update node activations based on input/output data
      setNodes(prevNodes =>
        prevNodes.map(node => ({
          ...node,
          activation: node.type === 'input'
            ? (inputData ? Math.sin(time + node.x * 0.01) * 0.5 + 0.5 : Math.random())
            : node.type === 'output'
            ? (outputData ? Math.cos(time + node.y * 0.01) * 0.5 + 0.5 : Math.random())
            : Math.sin(time + node.x * 0.005 + node.y * 0.005) * 0.5 + 0.5
        }))
      );

      // Update connection activity
      setConnections(prevConnections =>
        prevConnections.map(conn => ({
          ...conn,
          active: Math.random() > 0.8, // Random activity for visualization
          weight: conn.weight + Math.sin(time) * 0.01
        }))
      );

      // Draw connections
      connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (!fromNode || !toNode) return;

        const gradient = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);
        gradient.addColorStop(0, `rgba(226, 0, 116, ${conn.active ? 0.8 : 0.2})`);
        gradient.addColorStop(1, `rgba(226, 0, 116, ${conn.active ? 0.4 : 0.1})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.abs(conn.weight) * 3 + 1;
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();

        // Draw signal pulse
        if (conn.active) {
          const pulseX = fromNode.x + (toNode.x - fromNode.x) * ((time * 2) % 1);
          const pulseY = fromNode.y + (toNode.y - fromNode.y) * ((time * 2) % 1);

          ctx.fillStyle = '#E20074';
          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        const radius = 20 + node.activation * 15;

        // Node glow effect
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 2);
        glowGradient.addColorStop(0, `rgba(226, 0, 116, ${node.activation * 0.3})`);
        glowGradient.addColorStop(1, 'rgba(226, 0, 116, 0)');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Node body
        const nodeGradient = ctx.createRadialGradient(node.x - radius/2, node.y - radius/2, 0, node.x, node.y, radius);
        if (node.type === 'input') {
          nodeGradient.addColorStop(0, '#4CAF50');
          nodeGradient.addColorStop(1, '#2E7D32');
        } else if (node.type === 'hidden') {
          nodeGradient.addColorStop(0, '#2196F3');
          nodeGradient.addColorStop(1, '#0D47A1');
        } else {
          nodeGradient.addColorStop(0, '#FF9800');
          nodeGradient.addColorStop(1, '#E65100');
        }

        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Node border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node label
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + radius + 20);

        // Activation indicator
        ctx.fillStyle = `rgba(255, 255, 255, ${node.activation})`;
        ctx.font = '10px monospace';
        ctx.fillText(node.activation.toFixed(2), node.x, node.y + 4);
      });

      // Draw info overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 80);
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.fillText('🧠 Neural Network Visualizer', 20, 30);
      ctx.fillText(`Nodes: ${nodes.length}`, 20, 45);
      ctx.fillText(`Connections: ${connections.length}`, 20, 60);
      ctx.fillText(`Active Signals: ${connections.filter(c => c.active).length}`, 20, 75);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, nodes, connections, inputData, outputData]);

  if (!isActive) return null;

  return (
    <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-accent/10 to-transparent">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          🧠 Neural Network
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
        </h3>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="block"
      />
    </div>
  );
});
