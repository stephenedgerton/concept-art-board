import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', 
          width: '100vw',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999
        }}>
          <h1 style={{ marginBottom: '1rem' }}>Something went wrong.</h1>
          <p style={{ color: '#888', marginBottom: '2rem' }}>{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '0.8rem 1.5rem',
              backgroundColor: 'hsl(var(--primary))',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
