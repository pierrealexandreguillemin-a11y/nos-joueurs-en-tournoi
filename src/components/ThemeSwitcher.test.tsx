// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeSwitcher from './ThemeSwitcher';

const mockSetTheme = vi.fn();
const mockToggleMode = vi.fn();
let mockTheme = 'miami';
let mockMode = 'dark';

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    mode: mockMode,
    setTheme: mockSetTheme,
    setMode: vi.fn(),
    toggleMode: mockToggleMode,
  }),
}));

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'miami';
    mockMode = 'dark';
  });

  it('renders mode toggle and theme toggle buttons', () => {
    render(<ThemeSwitcher />);
    expect(screen.getByLabelText('Passer en mode clair')).toBeInTheDocument();
    expect(screen.getByLabelText(/Changer de thème/)).toBeInTheDocument();
  });

  it('calls toggleMode when mode button clicked', async () => {
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByLabelText('Passer en mode clair'));
    expect(mockToggleMode).toHaveBeenCalledOnce();
  });

  it('calls setTheme with neutral when theme is miami', async () => {
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByLabelText(/Changer de thème/));
    expect(mockSetTheme).toHaveBeenCalledWith('neutral');
  });

  it('calls setTheme with miami when theme is neutral', async () => {
    mockTheme = 'neutral';
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByLabelText(/Changer de thème/));
    expect(mockSetTheme).toHaveBeenCalledWith('miami');
  });

  it('shows Sun icon in dark mode and Moon icon in light mode', () => {
    const { unmount } = render(<ThemeSwitcher />);
    expect(screen.getByLabelText('Passer en mode clair')).toBeInTheDocument();
    unmount();

    mockMode = 'light';
    render(<ThemeSwitcher />);
    expect(screen.getByLabelText('Passer en mode sombre')).toBeInTheDocument();
  });
});
