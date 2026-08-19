import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../auth';

describe('Auth Zustand Store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isInitialized: false,
    });
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isInitialized).toBe(false);
  });

  it('updates state via setAuth', () => {
    const testUser = { id: '1', email: 'test@acme.com', name: 'Test User', role: 'hr_manager' };
    useAuthStore.getState().setAuth('token123', testUser);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token123');
    expect(state.user).toEqual(testUser);
  });

  it('clears state via clearAuth', () => {
    const testUser = { id: '1', email: 'test@acme.com', name: 'Test User', role: 'hr_manager' };
    useAuthStore.getState().setAuth('token123', testUser);
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('updates isInitialized via setInitialized', () => {
    useAuthStore.getState().setInitialized(true);
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });
});
