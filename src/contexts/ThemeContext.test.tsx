// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

function TestConsumer() {
  const { theme, mode, setTheme, setMode, toggleMode } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setTheme('neutral')}>set-neutral</button>
      <button onClick={() => setTheme('miami')}>set-miami</button>
      <button onClick={() => setMode('light')}>set-light</button>
      <button onClick={() => setMode('dark')}>set-dark</button>
      <button onClick={toggleMode}>toggle-mode</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.mode;
  });

  it('provides default values miami/dark', () => {
    render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('miami');
    expect(screen.getByTestId('mode').textContent).toBe('dark');
  });

  it('reads saved theme from localStorage', () => {
    localStorage.setItem('njt-theme', 'neutral');
    localStorage.setItem('njt-mode', 'light');
    render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('neutral');
    expect(screen.getByTestId('mode').textContent).toBe('light');
  });

  it('ignores invalid localStorage values', () => {
    localStorage.setItem('njt-theme', 'invalid');
    localStorage.setItem('njt-mode', 'bogus');
    render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('miami');
    expect(screen.getByTestId('mode').textContent).toBe('dark');
  });

  it('setTheme updates state and localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    await user.click(screen.getByText('set-neutral'));
    expect(screen.getByTestId('theme').textContent).toBe('neutral');
    expect(localStorage.getItem('njt-theme')).toBe('neutral');
  });

  it('setMode updates state and localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    await user.click(screen.getByText('set-light'));
    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(localStorage.getItem('njt-mode')).toBe('light');
  });

  it('toggleMode switches dark to light and back', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('mode').textContent).toBe('dark');

    await user.click(screen.getByText('toggle-mode'));
    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(localStorage.getItem('njt-mode')).toBe('light');

    await user.click(screen.getByText('toggle-mode'));
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(localStorage.getItem('njt-mode')).toBe('dark');
  });

  it('applies data-theme and data-mode to document element', () => {
    localStorage.setItem('njt-theme', 'neutral');
    localStorage.setItem('njt-mode', 'light');
    render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    expect(document.documentElement.dataset.theme).toBe('neutral');
    expect(document.documentElement.dataset.mode).toBe('light');
  });

  it('updates DOM attributes when theme/mode change', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    await user.click(screen.getByText('set-neutral'));
    expect(document.documentElement.dataset.theme).toBe('neutral');

    await user.click(screen.getByText('set-light'));
    expect(document.documentElement.dataset.mode).toBe('light');
  });

  it('useTheme throws outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );
    spy.mockRestore();
  });
});
