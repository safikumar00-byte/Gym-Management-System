import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from './Button';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (Component as new (props: ErrorBoundaryProps) => Component<ErrorBoundaryProps, ErrorBoundaryState>) {
  public props!: ErrorBoundaryProps;
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught React ErrorBoundary exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white border border-[#e5e5ea] rounded-[24px] p-6 sm:p-8 shadow-sm text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#ff3b30]/10 text-[#ff3b30] flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-[20px] font-bold tracking-tight text-[#1d1d1f]">
                Application Error
              </h2>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                An unexpected interface error occurred. You can reload the page or clear the local session cache.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-[#f5f5f7] rounded-[12px] text-[12px] font-mono text-[#ff3b30] text-left break-words overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={this.handleReload}
                className="w-full justify-center gap-2 text-[13px]"
              >
                <RefreshCw size={14} />
                <span>Reload Application</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={this.handleReset}
                className="w-full justify-center gap-2 text-[13px] text-[#ff3b30] hover:bg-[#ff3b30]/5"
              >
                <Trash2 size={14} />
                <span>Clear Cache & Restart</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
