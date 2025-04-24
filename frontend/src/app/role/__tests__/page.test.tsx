import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Page from '../page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('Role Selection Page', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders the role selection page correctly', () => {
    render(<Page />);

    // Check for title
    expect(screen.getByText('Use of platform')).toBeInTheDocument();

    // Check for role buttons
    expect(screen.getByText('researcher')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('reviewer')).toBeInTheDocument();

    // Check for continue button
    expect(screen.getByText('Continue →')).toBeInTheDocument();

    // Verify researcher is selected by default
    const researcherButton = screen.getByText('researcher');
    expect(researcherButton).toHaveClass('selected');
  });

  it('allows selecting different roles', () => {
    render(<Page />);

    // Select admin role
    const adminButton = screen.getByText('admin');
    fireEvent.click(adminButton);
    expect(adminButton).toHaveClass('selected');

    // Select reviewer role
    const reviewerButton = screen.getByText('reviewer');
    fireEvent.click(reviewerButton);
    expect(reviewerButton).toHaveClass('selected');

    // Select researcher role
    const researcherButton = screen.getByText('researcher');
    fireEvent.click(researcherButton);
    expect(researcherButton).toHaveClass('selected');
  });

  it('navigates to the selected role when continue is clicked', () => {
    render(<Page />);

    // Click continue with default researcher role
    const continueButton = screen.getByText('Continue →');
    fireEvent.click(continueButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/researcher');

    // Select and continue with admin role
    const adminButton = screen.getByText('admin');
    fireEvent.click(adminButton);
    fireEvent.click(continueButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/admin');

    // Select and continue with reviewer role
    const reviewerButton = screen.getByText('reviewer');
    fireEvent.click(reviewerButton);
    fireEvent.click(continueButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/reviewer');
  });

  it('maintains selected role state between selections', () => {
    render(<Page />);

    // Select admin role
    const adminButton = screen.getByText('admin');
    fireEvent.click(adminButton);
    expect(adminButton).toHaveClass('selected');

    // Select reviewer role
    const reviewerButton = screen.getByText('reviewer');
    fireEvent.click(reviewerButton);
    expect(reviewerButton).toHaveClass('selected');
    expect(adminButton).not.toHaveClass('selected');

    // Select admin role again
    fireEvent.click(adminButton);
    expect(adminButton).toHaveClass('selected');
    expect(reviewerButton).not.toHaveClass('selected');
  });

  it('handles multiple role selections correctly', () => {
    render(<Page />);

    const roles = ['researcher', 'admin', 'reviewer'];
    const buttons = roles.map(role => screen.getByText(role));

    // Test multiple selections
    buttons.forEach((button, index) => {
      fireEvent.click(button);
      expect(button).toHaveClass('selected');
      buttons.forEach((otherButton, otherIndex) => {
        if (otherIndex !== index) {
          expect(otherButton).not.toHaveClass('selected');
        }
      });
    });
  });
}); 