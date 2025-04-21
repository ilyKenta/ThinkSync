import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import LoginPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { unoptimized, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} alt={props.alt} />;
  },
}));

// Mock MSAL
jest.mock('@azure/msal-browser', () => ({
  PublicClientApplication: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    loginPopup: jest.fn(),
    getAllAccounts: jest.fn().mockReturnValue([]),
    handleRedirectPromise: jest.fn().mockResolvedValue(null),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('LoginPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockReset();
    localStorage.clear();
  });

  it('renders login button', async () => {
    await act(async () => {
      render(<LoginPage />);
    });
    
    const button = screen.getByRole('button', { name: /sign in with microsoft/i });
    expect(button).toBeInTheDocument();
  });

  it('initializes MSAL on mount', async () => {
    await act(async () => {
      render(<LoginPage />);
    });

    const { PublicClientApplication } = require('@azure/msal-browser');
    expect(PublicClientApplication).toHaveBeenCalled();
  });

  it('handles successful login and redirects to dashboard', async () => {
    const mockToken = 'mock-access-token';
    const mockResponse = { message: 'User authenticated successfully' };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    const { PublicClientApplication } = require('@azure/msal-browser');
    const mockMsalInstance = {
      initialize: jest.fn().mockResolvedValue(undefined),
      loginPopup: jest.fn().mockResolvedValue({ accessToken: mockToken }),
      getAllAccounts: jest.fn().mockReturnValue([]),
      handleRedirectPromise: jest.fn().mockResolvedValue(null),
    };
    PublicClientApplication.mockImplementation(() => mockMsalInstance);

    await act(async () => {
      render(<LoginPage />);
    });

    const loginButton = screen.getByRole('button', { name: /sign in with microsoft/i });
    await act(async () => {
      fireEvent.click(loginButton);
    });

    expect(mockMsalInstance.loginPopup).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://thinksyncapi.azurewebsites.net/api/auth/microsoft',
      expect.any(Object)
    );
    expect(localStorage.getItem('jwt')).toBe(mockToken);
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('handles successful registration and redirects to role selection', async () => {
    const mockToken = 'mock-access-token';
    const mockUserId = '123';
    const mockResponse = { 
      message: 'User registered successfully',
      user_ID: mockUserId
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    const { PublicClientApplication } = require('@azure/msal-browser');
    const mockMsalInstance = {
      initialize: jest.fn().mockResolvedValue(undefined),
      loginPopup: jest.fn().mockResolvedValue({ accessToken: mockToken }),
      getAllAccounts: jest.fn().mockReturnValue([]),
      handleRedirectPromise: jest.fn().mockResolvedValue(null),
    };
    PublicClientApplication.mockImplementation(() => mockMsalInstance);

    await act(async () => {
      render(<LoginPage />);
    });

    const loginButton = screen.getByRole('button', { name: /sign in with microsoft/i });
    await act(async () => {
      fireEvent.click(loginButton);
    });

    expect(localStorage.getItem('user_ID')).toBe(mockUserId);
    expect(mockRouter.push).toHaveBeenCalledWith('/role');
  });

  it('handles login error and shows alert', async () => {
    const mockError = new Error('Login failed');
    const { PublicClientApplication } = require('@azure/msal-browser');
    const mockMsalInstance = {
      initialize: jest.fn().mockResolvedValue(undefined),
      loginPopup: jest.fn().mockRejectedValue(mockError),
      getAllAccounts: jest.fn().mockReturnValue([]),
      handleRedirectPromise: jest.fn().mockResolvedValue(null),
    };
    PublicClientApplication.mockImplementation(() => mockMsalInstance);

    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(<LoginPage />);
    });

    const loginButton = screen.getByRole('button', { name: /sign in with microsoft/i });
    await act(async () => {
      fireEvent.click(loginButton);
    });

    expect(mockAlert).toHaveBeenCalledWith('Login failed.');
    expect(mockConsoleError).toHaveBeenCalledWith('Login error:', mockError);
    mockAlert.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('handles API error and shows alert', async () => {
    const mockToken = 'mock-access-token';
    const mockError = { error: 'Authentication failed' };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve(mockError),
    });

    const { PublicClientApplication } = require('@azure/msal-browser');
    const mockMsalInstance = {
      initialize: jest.fn().mockResolvedValue(undefined),
      loginPopup: jest.fn().mockResolvedValue({ accessToken: mockToken }),
      getAllAccounts: jest.fn().mockReturnValue([]),
      handleRedirectPromise: jest.fn().mockResolvedValue(null),
    };
    PublicClientApplication.mockImplementation(() => mockMsalInstance);

    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => {
      render(<LoginPage />);
    });

    const loginButton = screen.getByRole('button', { name: /sign in with microsoft/i });
    await act(async () => {
      fireEvent.click(loginButton);
    });

    expect(mockAlert).toHaveBeenCalledWith('Error: Authentication failed');
    mockAlert.mockRestore();
  });

  it('disables login button when MSAL initialization fails', async () => {
    const { PublicClientApplication } = require('@azure/msal-browser');
    const mockMsalInstance = {
      initialize: jest.fn().mockRejectedValue(new Error('Initialization failed')),
      loginPopup: jest.fn(),
      getAllAccounts: jest.fn().mockReturnValue([]),
      handleRedirectPromise: jest.fn().mockResolvedValue(null),
    };
    PublicClientApplication.mockImplementation(() => mockMsalInstance);

    await act(async () => {
      render(<LoginPage />);
    });

    const loginButton = screen.getByRole('button', { name: /sign in with microsoft/i });
    expect(loginButton).toBeDisabled();
  });

  it('navigates to home page when logo is clicked', async () => {
    const { PublicClientApplication } = require('@azure/msal-browser');
    const mockMsalInstance = {
      initialize: jest.fn().mockResolvedValue(undefined),
      loginPopup: jest.fn(),
      getAllAccounts: jest.fn().mockReturnValue([]),
      handleRedirectPromise: jest.fn().mockResolvedValue(null),
    };
    PublicClientApplication.mockImplementation(() => mockMsalInstance);

    await act(async () => {
      render(<LoginPage />);
    });

    const logoButton = screen.getByText('ThinkSync');
    fireEvent.click(logoButton);

    expect(window.location.href).toBe('http://localhost/');
  });
}); 