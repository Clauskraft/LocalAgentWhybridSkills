import { useState, useRef, memo } from 'react';
import { IconBolt, IconCircle, IconX } from './icons';

interface MultiModalInputProps {
  onTextInput: (text: string) => void;
  onVoiceInput: (audioBlob: Blob) => void;
  onDrawingInput: (imageData: string) => void;
  isLoading: boolean;
}

export const MultiModalInput = memo(function MultiModalInput({
  onTextInput,
  onVoiceInput,
  onDrawingInput,
  isLoading
}: MultiModalInputProps) {
  const [mode, setMode] = useState<'text' | 'voice' | 'drawing'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingData, setDrawingData] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // LOOP 4: Voice Recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onVoiceInput(blob);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start voice recording:', error);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    }
  };

  // LOOP 4: Drawing Canvas
  const startDrawing = () => {
    setIsDrawing(true);
    setDrawingData('');
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      [lastX, lastY] = [clientX - rect.left, clientY - rect.top];
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const [x, y] = [clientX - rect.left, clientY - rect.top];

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#E20074';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      [lastX, lastY] = [x, y];
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
  };

  const finishDrawing = () => {
    if (canvasRef.current) {
      const imageData = canvasRef.current.toDataURL('image/png');
      setDrawingData(imageData);
      onDrawingInput(imageData);
    }
    setIsDrawing(false);
  };

  return (
    <div className="flex items-center gap-2 mb-3">
      {/* Mode Toggle Buttons */}
      <div className="flex bg-bg-tertiary rounded-lg p-1">
        <button
          onClick={() => setMode('text')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            mode === 'text'
              ? 'bg-accent text-white shadow-md'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          ✏️ Text
        </button>
        <button
          onClick={() => setMode('voice')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            mode === 'voice'
              ? 'bg-accent text-white shadow-md'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          🎤 Voice
        </button>
        <button
          onClick={() => setMode('drawing')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            mode === 'drawing'
              ? 'bg-accent text-white shadow-md'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          🎨 Draw
        </button>
      </div>

      {/* Mode-specific Controls */}
      {mode === 'voice' && (
        <div className="flex items-center gap-2">
          <button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-accent text-white hover:bg-accent-hover'
            } disabled:opacity-50`}
          >
            {isRecording ? <IconX className="w-4 h-4" /> : <IconBolt className="w-4 h-4" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          {isRecording && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="text-sm text-red-500 font-medium">Recording...</span>
            </div>
          )}
        </div>
      )}

      {mode === 'drawing' && (
        <div className="flex items-center gap-2">
          {!isDrawing ? (
            <button
              onClick={startDrawing}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-all disabled:opacity-50"
            >
              <IconCircle className="w-4 h-4" />
              Start Drawing
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={finishDrawing}
                className="px-4 py-2 bg-success text-white rounded-lg font-medium hover:bg-green-600 transition-all"
              >
                ✓ Finish Drawing
              </button>
              <button
                onClick={() => setIsDrawing(false)}
                className="px-3 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-all"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drawing Canvas */}
      {isDrawing && (
        <div className="absolute bottom-full left-0 right-0 mb-4 p-4 bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl">
          <canvas
            ref={canvasRef}
            width={600}
            height={300}
            className="border border-border-primary rounded-lg cursor-crosshair bg-white"
            style={{ touchAction: 'none' }}
          />
          <div className="mt-2 text-sm text-text-muted text-center">
            Draw with your mouse or finger. Click "Finish Drawing" when done.
          </div>
        </div>
      )}
    </div>
  );
});
