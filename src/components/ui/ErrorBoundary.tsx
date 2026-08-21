import React, { Component, type ReactNode } from 'react';
import { Button } from './index';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-neutral-200 rounded-3xl shadow-uber-elevated text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-neutral-900">Something went wrong</h2>
          <p className="text-sm text-neutral-600">
            {this.state.error?.message || 'An unexpected rendering error occurred. You can safely return home or reload the page.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/plan';
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Return to Trip Planner
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
