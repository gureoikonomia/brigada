import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContext } from 'react';

const authServiceMock = vi.hoisted(() => ({
  getProfile: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../src/services/auth.service', () => authServiceMock);

import { AuthProvider } from '../src/context/AuthContext.jsx';
import AuthContext from '../src/context/auth-context.js';

function AuthState() {
  const { user, sessionCheckFailed } = useContext(AuthContext);
  return <output data-testid="auth-state">{JSON.stringify({ user, sessionCheckFailed })}</output>;
}

function storedUser() {
  return { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'user' };
}

beforeEach(() => {
  localStorage.clear();
  authServiceMock.getProfile.mockReset();
  localStorage.setItem('user', JSON.stringify(storedUser()));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthProvider session restoration', () => {
  it('preserves the profile on a transient refresh failure and retries when online', async () => {
    authServiceMock.getProfile
      .mockRejectedValueOnce({
        response: { status: 503 },
        isSessionRefreshUnavailable: true,
      })
      .mockResolvedValueOnce(storedUser());
    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    const readState = () => JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
    await waitFor(() => expect(readState().sessionCheckFailed).toBe(true));

    expect(readState().user.id).toBe('user-1');
    expect(localStorage.getItem('user')).toContain('"user-1"');
    expect(authServiceMock.getProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(authServiceMock.getProfile).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => expect(readState().sessionCheckFailed).toBe(false));
  });
});
