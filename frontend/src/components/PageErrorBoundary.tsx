import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; resetKey: string }
interface State { error: Error | null; key: string }

/** Sprint 8 hardening: one page crashing (bad record, unexpected data) shows a message, not a blank screen. */
export default class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) { return { error }; }

  static getDerivedStateFromProps(props: Props, state: State) {
    // Navigating to another page clears the error.
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error) { console.error('Page crashed:', error); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="max-w-lg mx-auto mt-16 bg-card border border-border rounded-2xl p-6 text-center space-y-3">
        <h2 className="text-lg font-bold text-foreground">This page hit a problem</h2>
        <p className="text-sm text-muted-foreground">Some of its data could not be shown. Your data is safe. Reload, or open another page from the menu.</p>
        <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">Reload</button>
      </div>
    );
  }
}
