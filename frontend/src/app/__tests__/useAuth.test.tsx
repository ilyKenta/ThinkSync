import { render } from '@testing-library/react';
import useAuth from '../useAuth';
import { useRouter } from 'next/navigation';
import React from 'react';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('useAuth', () => {
  const mockPush = jest.fn();
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      clear: () => { store = {}; },
      removeItem: (key: string) => { delete store[key]; },
    };
  })();

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  function TestComponent() {
    useAuth();
    return <div>Test</div>;
  }

  it('redirects to /login if no jwt token', () => {
    render(<TestComponent />);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('does not redirect if jwt token exists', () => {
    window.localStorage.setItem('jwt', 'token');
    render(<TestComponent />);
    expect(mockPush).not.toHaveBeenCalled();
  });
}); 