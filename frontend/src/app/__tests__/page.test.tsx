import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../page';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../ScrollIndicator', () => () => <div data-testid="scroll-indicator" />);
jest.mock('../page.module.css', () => new Proxy({}, { get: (target, prop) => prop }));

describe('Home page', () => {
  const mockPush = jest.fn();
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    jest.clearAllMocks();
  });

  it('renders main sections and footer', () => {
    render(<Home />);
    expect(screen.getByText('ThinkSync')).toBeInTheDocument();
    expect(screen.getByText('Connect, Collaborate, Manage Resources with Ease')).toBeInTheDocument();
    expect(screen.getByText('Key Features')).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByTestId('scroll-indicator')).toBeInTheDocument();
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
  });

  it('navigates to /login on login and signup button click', () => {
    render(<Home />);
    fireEvent.click(screen.getByText('login'));
    expect(mockPush).toHaveBeenCalledWith('/login');
    fireEvent.click(screen.getByText('sign up'));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('scrolls to features and how it works sections on button click', () => {
    render(<Home />);
    // Mock scrollIntoView
    const featuresSection = screen.getByText('Key Features').parentElement;
    const howItWorksSection = screen.getByText('How It Works').parentElement;
    if (featuresSection) featuresSection.scrollIntoView = jest.fn();
    if (howItWorksSection) howItWorksSection.scrollIntoView = jest.fn();
    // Learn more
    fireEvent.click(screen.getByText('Learn more ↓'));
    if (featuresSection) expect(featuresSection.scrollIntoView).toHaveBeenCalled();
    // How it works
    fireEvent.click(screen.getByText('How it works ↓'));
    if (howItWorksSection) expect(howItWorksSection.scrollIntoView).toHaveBeenCalled();
  });
}); 