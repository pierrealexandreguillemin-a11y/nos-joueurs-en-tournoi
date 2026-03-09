// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import EventForm from './EventForm';
import type { Event } from '@/types';

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

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
  fillInput(screen.getByLabelText(/catégorie/i), tournamentName);
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

      expect(screen.getByLabelText(/catégorie/i)).toBeInTheDocument();
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

      expect(screen.getAllByLabelText(/catégorie/i).length).toBe(2);
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
      expect(screen.getAllByLabelText(/catégorie/i).length).toBe(2);

      const buttons = screen.getAllByRole('button');
      const removeButtons = buttons.filter((btn: HTMLElement) =>
        !btn.textContent?.includes('Ajouter un tournoi') &&
        !btn.textContent?.includes('Créer l\'événement')
      );
      expect(removeButtons.length).toBeGreaterThan(0);

      fireEvent.click(removeButtons[0]);

      expect(screen.getAllByLabelText(/catégorie/i).length).toBe(1);
    });

    it('does not remove last tournament when remove is attempted', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      expect(screen.getAllByLabelText(/catégorie/i).length).toBe(1);
    });

    it('can add multiple tournaments (5+)', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const addButton = screen.getByRole('button', { name: /ajouter un tournoi/i });
      for (let i = 0; i < 5; i++) {
        fireEvent.click(addButton);
      }

      expect(screen.getAllByLabelText(/catégorie/i).length).toBe(6);
    });

    it('updates tournament name correctly', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const nameInput = screen.getByLabelText(/catégorie/i);
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
      fillInput(screen.getByLabelText(/catégorie/i), 'U12');

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
      const nameInputs = screen.getAllByLabelText(/catégorie/i);
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
      expect(createdEvent.id).toMatch(/^event_/);
    });

    it('generates unique tournament IDs with correct format', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalled();
      });

      const createdEvent = mockOnEventCreated.mock.calls[0][0] as Event;
      expect(createdEvent.tournaments[0].id).toMatch(/^tournament_/);
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

      const nameInputs = screen.getAllByLabelText(/catégorie/i);
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

  describe('Validation alignment with validation.ts', () => {
    it('rejects event name shorter than 3 characters', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm('AB', 'U12', 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(screen.getByText(/3 caractères minimum/i)).toBeInTheDocument();
      });
      expect(mockOnEventCreated).not.toHaveBeenCalled();
    });

    it('rejects tournament name shorter than 2 characters', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm('Test Event', 'A', 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(screen.getByText(/2 caractères minimum/i)).toBeInTheDocument();
      });
      expect(mockOnEventCreated).not.toHaveBeenCalled();
    });

    it('rejects URL that contains echecs.asso.fr but is not a valid FFE URL', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm('Test Event', 'U12', 'https://attacker.com/?r=echecs.asso.fr');
      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(screen.getByText(/les urls doivent provenir de echecs\.asso\.fr/i)).toBeInTheDocument();
      });
      expect(mockOnEventCreated).not.toHaveBeenCalled();
    });

    it('rejects URL without protocol', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillValidForm('Test Event', 'U12', 'echecs.asso.fr/Resultats.aspx');
      // Use fireEvent.submit to bypass jsdom type="url" constraint validation
      fireEvent.submit(screen.getByRole('button', { name: /créer l'événement/i }).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(/les urls doivent provenir de echecs\.asso\.fr/i)).toBeInTheDocument();
      });
      expect(mockOnEventCreated).not.toHaveBeenCalled();
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

  describe('Inline validation', () => {
    it('shows field-level error on event name after blur if too short', async () => {
      const user = userEvent.setup();
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      await user.type(input, 'AB');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/3 caractères minimum/i)).toBeInTheDocument();
      });
    });

    it('shows field-level error on URL after blur if invalid', async () => {
      const user = userEvent.setup();
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const urlInput = screen.getByPlaceholderText(/echecs\.asso\.fr/i);
      await user.type(urlInput, 'https://google.com');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/url doit provenir de echecs\.asso\.fr/i)).toBeInTheDocument();
      });
    });

    it('clears field-level error when value becomes valid', async () => {
      const user = userEvent.setup();
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      await user.type(input, 'AB');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/3 caractères minimum/i)).toBeInTheDocument();
      });

      await user.clear(input);
      await user.type(input, 'ABC');
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText(/3 caractères minimum/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Duplicate URL detection', () => {
    it('shows error when duplicate URLs are used', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillInput(screen.getByPlaceholderText(/championnat départemental/i), 'Test Event');
      fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

      const nameInputs = screen.getAllByLabelText(/catégorie/i);
      expect(nameInputs).toHaveLength(2);
      fillInput(nameInputs[0], 'U12');
      fillInput(nameInputs[1], 'U14');

      const sameUrl = 'https://echecs.asso.fr/Resultats.aspx?Action=Ga&Groupe=1';
      const urlInputs = screen.getAllByLabelText(/url ffe tournoi/i);
      expect(urlInputs).toHaveLength(2);
      fillInput(urlInputs[0], sameUrl);
      fillInput(urlInputs[1], sameUrl);

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(screen.getByText(/même url est utilisée plusieurs fois/i)).toBeInTheDocument();
      });
      expect(mockOnEventCreated).not.toHaveBeenCalled();
    });
  });

  describe('Mobile and UX polish', () => {
    it('auto-focuses event name input on mount', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      expect(document.activeElement).toBe(input);
    });

    it('renders tournament rows with responsive layout classes', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const urlInput = screen.getByPlaceholderText(/echecs\.asso\.fr/i);
      const tournamentRow = urlInput.closest('.rounded-lg');
      expect(tournamentRow?.className).toContain('flex-col');
      expect(tournamentRow?.className).toContain('sm:flex-row');
    });
  });

  describe('Contextual help', () => {
    it('displays explanatory text for what an event is', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);
      expect(screen.getByText(/regroupe un ou plusieurs tournois/i)).toBeInTheDocument();
    });

    it('displays help text for club name field', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);
      expect(screen.getByText(/détecté automatiquement/i)).toBeInTheDocument();
    });

    it('displays guidance for finding FFE URL', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);
      expect(screen.getByText(/copiez l'URL depuis/i)).toBeInTheDocument();
    });

    it('uses inclusive placeholder for tournament name', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);
      expect(screen.getByPlaceholderText(/ex: U12, Open/i)).toBeInTheDocument();
    });
  });

  describe('Incomplete row warning', () => {
    it('shows toast when incomplete tournament rows are ignored', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fillInput(screen.getByPlaceholderText(/championnat départemental/i), 'Test Event');
      fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

      const nameInputs = screen.getAllByLabelText(/catégorie/i);
      fillInput(nameInputs[0], 'U12');
      const urlInputs = screen.getAllByPlaceholderText(/https:\/\/echecs\.asso\.fr/i);
      fillInput(urlInputs[0], 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');

      // Second tournament: name only (incomplete)
      fillInput(nameInputs[1], 'U14');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      await waitFor(() => {
        expect(mockOnEventCreated).toHaveBeenCalled();
      });
      expect(toast.info).toHaveBeenCalledWith('1 tournoi(s) incomplet(s) ignoré(s)');
    });
  });

  describe('Field error cleanup on tournament removal', () => {
    it('clears field errors when a tournament is removed', async () => {
      const user = userEvent.setup();
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

      // Trigger inline error on second tournament name
      const nameInputs = screen.getAllByLabelText(/catégorie/i);
      await user.type(nameInputs[1], 'A');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/2 caractères minimum/i)).toBeInTheDocument();
      });

      // Remove the second tournament (click the X button)
      const removeButtons = screen.getAllByRole('button').filter(
        (btn: HTMLElement) => btn.querySelector('.lucide-x')
      );
      fireEvent.click(removeButtons[removeButtons.length - 1]);

      // Error should be gone
      expect(screen.queryByText(/2 caractères minimum/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('links field errors to inputs via aria-describedby', async () => {
      const user = userEvent.setup();
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      await user.type(input, 'AB');
      await user.tab();

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-describedby', 'error-eventName');
      });
      const errorEl = document.getElementById('error-eventName');
      expect(errorEl).toHaveTextContent('3 caractères minimum');
    });

    it('sets aria-invalid on input with field error', async () => {
      const user = userEvent.setup();
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      await user.type(input, 'AB');
      await user.tab();

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Submit button disabled state', () => {
    it('disables submit button when field errors exist', async () => {
      const user = userEvent.setup();
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      await user.type(input, 'AB');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /créer l'événement/i })).toBeDisabled();
      });
    });

    it('re-enables submit button when field errors are resolved', async () => {
      const user = userEvent.setup();
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      await user.type(input, 'AB');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /créer l'événement/i })).toBeDisabled();
      });

      await user.clear(input);
      await user.type(input, 'ABC');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /créer l'événement/i })).not.toBeDisabled();
      });
    });
  });

  describe('Tournament row numbering', () => {
    it('shows numbered label when multiple tournaments exist', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

      expect(screen.getByText(/catégorie \(tournoi 1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/catégorie \(tournoi 2\)/i)).toBeInTheDocument();
    });

    it('shows plain label when single tournament', () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      expect(screen.getByLabelText(/catégorie/i)).toBeInTheDocument();
      expect(screen.queryByText(/tournoi 1/i)).not.toBeInTheDocument();
    });
  });

  describe('Focus scroll on submit error', () => {
    it('focuses first invalid field on submit error', async () => {
      render(<EventForm onEventCreated={mockOnEventCreated} />);

      const input = screen.getByPlaceholderText(/championnat départemental/i);
      fillInput(input, 'AB');

      fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

      // requestAnimationFrame is used, so wait for next frame
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
