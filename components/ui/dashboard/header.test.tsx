/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './header';

// Mock Stack Auth
jest.mock('@stackframe/stack', () => ({
  useUser: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockUser = {
  displayName: 'John Doe',
  primaryEmail: 'john@example.com',
  profileImageUrl: null,
  signOut: jest.fn(),
};

describe('Header Component', () => {
  const mockOnMenuClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user profile dropdown when user is authenticated', () => {
    const { useUser } = require('@stackframe/stack');
    useUser.mockReturnValue(mockUser);

    render(<Header onMenuClick={mockOnMenuClick} />);

    // Check if user avatar is displayed
    const avatarButton = screen.getByRole('button', { name: 'J' });
    expect(avatarButton).toBeInTheDocument();

    // Check if user initial is displayed in avatar fallback
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders sign in/up buttons when user is not authenticated', () => {
    const { useUser } = require('@stackframe/stack');
    useUser.mockReturnValue(null);

    render(<Header onMenuClick={mockOnMenuClick} />);

    // Check if sign in/up buttons are displayed
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('opens user dropdown menu and allows sign out', () => {
    const { useUser } = require('@stackframe/stack');
    useUser.mockReturnValue(mockUser);

    render(<Header onMenuClick={mockOnMenuClick} />);

    // Click on user avatar to open dropdown
    const avatarButton = screen.getByRole('button', { name: 'J' });
    fireEvent.click(avatarButton);

    // Check if dropdown menu items are visible
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();

    // Click sign out button
    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);

    // Verify sign out was called
    expect(mockUser.signOut).toHaveBeenCalledTimes(1);
  });

  it('displays notifications badge when there are unread notifications', () => {
    const { useUser } = require('@stackframe/stack');
    useUser.mockReturnValue(mockUser);

    render(<Header onMenuClick={mockOnMenuClick} />);

    // Check if notification badge is visible
    const notificationBadge = screen.getByText('2'); // unread count
    expect(notificationBadge).toBeInTheDocument();
  });

  it('has proper keyboard navigation support', () => {
    const { useUser } = require('@stackframe/stack');
    useUser.mockReturnValue(mockUser);

    render(<Header onMenuClick={mockOnMenuClick} />);

    // Check if all interactive elements are focusable
    const searchInput = screen.getByPlaceholderText(/search/i);
    const languageButton = screen.getByRole('button', { name: /switch language/i });
    const themeButton = screen.getByRole('button', { name: /switch theme/i });
    const avatarButton = screen.getByRole('button', { name: 'J' });

    expect(searchInput).toHaveAttribute('type', 'search');
    expect(languageButton).toBeInTheDocument();
    expect(themeButton).toBeInTheDocument();
    expect(avatarButton).toBeInTheDocument();

    // Test tab navigation order
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);
  });

  it('displays user information correctly in dropdown', () => {
    const { useUser } = require('@stackframe/stack');
    useUser.mockReturnValue(mockUser);

    render(<Header onMenuClick={mockOnMenuClick} />);

    // Open dropdown
    const avatarButton = screen.getByRole('button', { name: 'J' });
    fireEvent.click(avatarButton);

    // Check if user info is displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});