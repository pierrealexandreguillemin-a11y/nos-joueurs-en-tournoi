// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ViewToggle from './ViewToggle';

describe('ViewToggle', () => {
  it('renders both buttons', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings />);

    expect(screen.getByRole('button', { name: /Résultats/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Appariements/i })).toBeInTheDocument();
  });

  it('marks the active button with aria-pressed', () => {
    render(<ViewToggle viewMode="pairings" onChange={vi.fn()} hasPairings />);

    expect(screen.getByRole('button', { name: /Résultats/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Appariements/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange when clicking inactive button', () => {
    const onChange = vi.fn();
    render(<ViewToggle viewMode="results" onChange={onChange} hasPairings />);

    fireEvent.click(screen.getByRole('button', { name: /Appariements/i }));
    expect(onChange).toHaveBeenCalledWith('pairings');
  });

  it('disables Appariements button when hasPairings is false', () => {
    const onChange = vi.fn();
    render(<ViewToggle viewMode="results" onChange={onChange} hasPairings={false} />);

    const btn = screen.getByRole('button', { name: /Appariements/i });
    expect(btn).toBeDisabled();

    fireEvent.click(btn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows text badge when showBadge is true and hasPairings', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings showBadge />);

    expect(screen.getByText(/nouvelle ronde/i)).toBeInTheDocument();
  });

  it('does not show badge when showBadge is false', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings showBadge={false} />);

    expect(screen.queryByText(/nouvelle ronde/i)).not.toBeInTheDocument();
  });

  it('calls onChange with results when clicking Résultats from pairings mode', () => {
    const onChange = vi.fn();
    render(<ViewToggle viewMode="pairings" onChange={onChange} hasPairings />);

    fireEvent.click(screen.getByRole('button', { name: /Résultats/i }));
    expect(onChange).toHaveBeenCalledWith('results');
  });

  it('has role=group on container', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings />);

    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('has focus-visible ring class on buttons', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings />);

    const btn = screen.getByRole('button', { name: /Résultats/i });
    expect(btn.className).toContain('focus-visible:ring-2');
  });

  it('shows tooltip on disabled Appariements button', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings={false} />);

    const btn = screen.getByRole('button', { name: /Appariements/i });
    expect(btn).toHaveAttribute('title', expect.stringContaining('pas encore publiés'));
  });

  it('badge has role=status for screen reader announcement', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings showBadge />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
  });

  it('shows visible text badge when new pairings are available', () => {
    render(
      <ViewToggle viewMode="results" onChange={vi.fn()} hasPairings={true} showBadge={true} />
    );
    expect(screen.getByText(/nouvelle ronde/i)).toBeInTheDocument();
  });
});
