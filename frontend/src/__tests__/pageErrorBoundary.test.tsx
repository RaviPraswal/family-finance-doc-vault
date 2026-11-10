import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageErrorBoundary from '../components/PageErrorBoundary';

// Sprint 8 hardening: a page that crashes shows a message and a way out, not a blank screen.
function Boom(): never { throw new Error('bad data'); }

describe('PageErrorBoundary', () => {
  it('shows a recoverable message instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PageErrorBoundary resetKey="/a"><Boom /></PageErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent(/this page hit a problem/i);
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
  it('renders children normally', () => {
    render(<PageErrorBoundary resetKey="/a"><p>fine</p></PageErrorBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
  });
});
