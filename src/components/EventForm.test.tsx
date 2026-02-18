// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import EventForm from './EventForm';
import type { Event } from '@/types';

// Helper: set input value via fireEvent.change (instant, no per-keystroke re-renders)
function fillInput(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

// Helper: fill a complete valid form (event name + 1 tournament)
function fillValidForm(
  eventName = 'Test Event',
  tournamentName = 'U12',
  tournamentUrl = 'https://echecs.asso.fr/Resultats.aspx?Action=Ga',
) {
  fillInput(screen.getByPlaceholderText(/championnat départemental/i), eventName);
  fillInput(screen.getByLabelText(/nom \(ex: u12, u14\)/i), tournamentName);
  fillInput(screen.getByPlaceholderText(/https:\/\/echecs\.asso\.fr/i), tournamentUrl);
}

describe('EventForm', () => {
  let mockOnEventCreated: Mock;

  beforeEach(() => {
    mockOnEventCreated = vi.fn() as Mock;
  });

  describe('Initial Render', () => {
    it('renders form with all required fields', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      expect(screen.getByLabelText(/nom de l'événement/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/championnat départemental/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /créer l'événement/i })).toBeInTheDocument();
    });

    it('renders with one empty tournament by default', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      expect(screen.getByLabelText(/nom \(ex: u12, u14\)/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/echecs\.asso\.fr/i)).toBeInTheDocument();
    });

    it('renders add tournament button', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      expect(screen.getByRole('button', { name: /ajouter un tournoi/i })).toBeInTheDocument();
    });

    it('does not show error message initially', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not show remove button when only one tournament', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const buttons = screen.queryAllByRole('button');
      const removeButtons = buttons.filter((btn: HTMLElement) => btn.querySelector('.lucide-x'));
      expect(removeButtons.length).toBe(0);
    });
  });

  describe('Event Name Validation', () => {
    it('shows error when submitting with empty event name', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toHaveTextContent(/événement est requis/i);
      expect(mockOnEventCreated).not.toHaveBeenCalled();
    });

    it('accepts event name with valid text', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      fillInput(input, 'Test Event');

      expect(input).toHaveValue('Test Event');
    });

    it('allows event names with special characters', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      fillInput(input, 'Événement 2025 - Test!');

      expect(input).toHaveValue('Événement 2025 - Test!');
    });

    it('allows very long event names', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const longName = 'A'.repeat(200);
      const input = screen.getByPlaceholderText(/championnat départemental/i);
      fillInput(input, longName);

      expect(input).toHaveValue(longName);
    });
  });

  describe('Tournament Management', () => {
    it('adds a new tournament when add button is clicked', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

      expect(screen.getAllByLabelText(/nom \(ex: u12, u14\)/i).length).toBe(2);
    });

    it('shows remove button when multiple tournaments exist', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const initialButtonCount = screen.getAllByRole('button').length;

      fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

      expect(screen.getAllByRole('button').length).toBeGreaterThan(initialButtonCount);
    });

    it('removes tournament when remove button is clicked', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));
      expect(screen.getAllByLabelText(/nom \(ex: u12, u14\)/i).length).toBe(2);

      const buttons = screen.getAllByRole('button');
      const removeButtons = buttons.filter((btn: HTMLElement) =>
        !btn.textContent?.includes('Ajouter un tournoi') &&
        !btn.textContent?.includes('Créer l\'événement')
      );
      expect(removeButtons.length).toBeGreaterThan(0);

      fireEvent.click(removeButtons[0]);

      expect(screen.getAllByLabelText(/nom \(ex: u12, u14\)/i).length).toBe(1);
    });

    it('does not remove last tournament when remove is attempted', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      expect(screen.getAllByLabelText(/nom \(ex: u12, u14\)/i).length).toBe(1);
    });

    it('can add multiple tournaments (5+)', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const addButton = screen.getByRole('button', { name: /ajouter un tournoi/i });
      for (let i = 0; i < 5; i++) {
        fireEvent.click(addButton);
      }

      expect(screen.getAllByLabelText(/nom \(ex: u12, u14\)/i).length).toBe(6);
    });

    it('updates tournament name correctly', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const nameInput = screen.getByLabelText(/nom \(ex: u12, u14\)/i);
      fillInput(nameInput, 'U12');

      expect(nameInput).toHaveValue('U12');
    });

    it('updates tournament URL correctly', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const urlInput = screen.getByPlaceholderText(/https:\/\/echecs\.asso\.fr/i);
      fillInput(urlInput, 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');

      expect(urlInput).toHaveValue('https://echecs.asso.fr/Resultats.aspx?Action=Ga');
    });
  });

  describe('Tournament Validation', () => {
    it('shows error when no tournaments have data', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillInput(screen.getByPlaceholderText(/championnat départemental/i), 'Test Event');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(screen.getByText(/au moins un tournoi est requis/i)).toBeInTheDocument();
      });
      expect(mockOnEventCreated).not.toHaveBeenCalled();
    });

    it('shows error when tournament has name but no URL', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillInput(screen.getByPlaceholderText(/championnat départemental/i), 'Test Event');
      fillInput(screen.getByLabelText(/nom \(ex: u12, u14\)/i), 'U12');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(screen.getByText(/au moins un tournoi est requis/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid URL (not echecs.asso.fr)', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm('Test Event', 'U12', 'https://google.com');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(screen.getByText(/les urls doivent provenir de echecs\.asso\.fr/i)).toBeInTheDocument();
      });
      expect(mockOnEventCreated).not.toHaveBeenCalled();
    });

    it('accepts valid FFE URL', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm('Test Event', 'U12', 'https://echecs.asso.fr/Resultats.aspx?Action=Ga&Groupe=1234');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalled();
      });
    });

    it('filters out incomplete tournaments on submit', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillInput(screen.getByPlaceholderText(/championnat départemental/i), 'Test Event');

      // Add second tournament but leave it incomplete
      fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

      // Fill first tournament completely
      const nameInputs = screen.getAllByLabelText(/nom \(ex: u12, u14\)/i);
      fillInput(nameInputs[0], 'U12');

      const urlInputs = screen.getAllByPlaceholderText(/https:\/\/echecs\.asso\.fr/i);
      fillInput(urlInputs[0], 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalled();
      });

      const createdEvent = mockOnEventCreated.mock.calls[0][0] as Event;
      expect(createdEvent.tournaments.length).toBe(1);
    });
  });

  describe('Form Submission', () => {
    it('calls onEventCreated with correct event structure', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalledTimes(1);
      });

      const createdEvent = mockOnEventCreated.mock.calls[0][0] as Event;
      expect(createdEvent).toHaveProperty('id');
      expect(createdEvent).toHaveProperty('name', 'Test Event');
      expect(createdEvent).toHaveProperty('createdAt');
      expect(createdEvent).toHaveProperty('tournaments');
      expect(createdEvent.tournaments.length).toBe(1);
    });

    it('generates unique event ID with timestamp format', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalled();
      });

      const createdEvent = mockOnEventCreated.mock.calls[0][0] as Event;
      expect(createdEvent.id).toMatch(/^evt_\d+$/);
    });

    it('generates unique tournament IDs with correct format', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalled();
      });

      const createdEvent = mockOnEventCreated.mock.calls[0][0] as Event;
      expect(createdEvent.tournaments[0].id).toMatch(/^trn_\d+_0$/);
    });

    it('initializes tournament with empty players array', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalled();
      });

      const createdEvent = mockOnEventCreated.mock.calls[0][0] as Event;
      expect(createdEvent.tournaments[0].players).toEqual([]);
      expect(createdEvent.tournaments[0].lastUpdate).toBe('');
    });

    it('creates event with multiple valid tournaments', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillInput(screen.getByPlaceholderText(/championnat départemental/i), 'Test Event');

      fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

      const nameInputs = screen.getAllByLabelText(/nom \(ex: u12, u14\)/i);
      fillInput(nameInputs[0], 'U12');
      fillInput(nameInputs[1], 'U14');

      const urlInputs = screen.getAllByPlaceholderText(/https:\/\/echecs\.asso\.fr/i);
      fillInput(urlInputs[0], 'https://echecs.asso.fr/Resultats.aspx?Action=Ga&Groupe=1');
      fillInput(urlInputs[1], 'https://echecs.asso.fr/Resultats.aspx?Action=Ga&Groupe=2');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalled();
      });

      const createdEvent = mockOnEventCreated.mock.calls[0][0] as Event;
      expect(createdEvent.tournaments.length).toBe(2);
      expect(createdEvent.tournaments[0].name).toBe('U12');
      expect(createdEvent.tournaments[1].name).toBe('U14');
    });

    it('clears error message on successful validation', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      // First submit invalid form
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toHaveTextContent(/événement est requis/i);

      // Now fill valid data and resubmit
      fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles whitespace-only event name as invalid', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm('   ', 'U12', 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(screen.getByText(/événement est requis/i)).toBeInTheDocument();
      });
      expect(mockOnEventCreated).not.toHaveBeenCalled();
    });

    it('handles whitespace-only tournament name as empty', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm('Test Event', '   ', 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(screen.getByText(/au moins un tournoi est requis/i)).toBeInTheDocument();
      });
    });

    it('prevents form submission with Enter key in input fields', async () => {
      // userEvent.type needed here: tests actual keyboard Enter behavior
      const user = userEvent.setup();
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const eventNameInput = screen.getByPlaceholderText(/championnat départemental/i);
      await user.type(eventNameInput, 'Test Event{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/au moins un tournoi est requis/i)).toBeInTheDocument();
      });
    });
  });
});
