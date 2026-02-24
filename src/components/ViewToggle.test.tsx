// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ViewToggle from './ViewToggle';

describe('ViewToggle', () => {
  it('renders both buttons', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings />);

    expect(screen.getByRole('radio', { name: /Résultats/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Appariements/i })).toBeInTheDocument();
  });

  it('marks the active button with aria-checked', () => {
    render(<ViewToggle viewMode="pairings" onChange={vi.fn()} hasPairings />);

    expect(screen.getByRole('radio', { name: /Résultats/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /Appariements/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicking inactive button', () => {
    const onChange = vi.fn();
    render(<ViewToggle viewMode="results" onChange={onChange} hasPairings />);

    fireEvent.click(screen.getByRole('radio', { name: /Appariements/i }));
    expect(onChange).toHaveBeenCalledWith('pairings');
  });

  it('disables Appariements button when hasPairings is false', () => {
    const onChange = vi.fn();
    render(<ViewToggle viewMode="results" onChange={onChange} hasPairings={false} />);

    const btn = screen.getByRole('radio', { name: /Appariements/i });
    expect(btn).toBeDisabled();

    fireEvent.click(btn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows orange badge when showBadge is true and hasPairings', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings showBadge />);

    expect(screen.getByLabelText(/Nouveaux appariements disponibles/i)).toBeInTheDocument();
  });

  it('does not show badge when showBadge is false', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings showBadge={false} />);

    expect(screen.queryByLabelText(/Nouveaux appariements disponibles/i)).not.toBeInTheDocument();
  });

  it('calls onChange with results when clicking Résultats from pairings mode', () => {
    const onChange = vi.fn();
    render(<ViewToggle viewMode="pairings" onChange={onChange} hasPairings />);

    fireEvent.click(screen.getByRole('radio', { name: /Résultats/i }));
    expect(onChange).toHaveBeenCalledWith('results');
  });

  it('has role=group on container', () => {
    render(<ViewToggle viewMode="results" onChange={vi.fn()} hasPairings />);

    expect(screen.getByRole('group')).toBeInTheDocument();
  });
});
