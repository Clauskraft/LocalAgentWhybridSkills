import { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';

import { ToastProvider } from './components/Toast';

// Error Boundary to catch and display React errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'red', background: '#111', minHeight: '100vh' }}>
          <h1>⚠️ App Crashed</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#f88' }}>{this.state.error?.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#888', fontSize: 12 }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);

