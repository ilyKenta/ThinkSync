import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import LoginPage from './page'

// Mock MSAL
jest.mock('@azure/msal-browser', () => ({
  PublicClientApplication: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    loginRedirect: jest.fn()
  }))
}))

describe('LoginPage', () => {
  it('renders login button', async () => {
    await act(async () => {
      render(<LoginPage />)
    })
    
    const button = screen.getByRole('button', { name: /sign in with microsoft/i })
    expect(button).toBeInTheDocument()
  })

  // it('shows loading state when clicked', async () => {
  //   render(<LoginPage />)
  //   const button = screen.getByRole('button', { name: /sign in with microsoft/i })
    
  //   await act(async () => {
  //     fireEvent.click(button)
  //   })

  //   await waitFor(() => {
  //     expect(screen.getByText('Logging in...')).toBeInTheDocument()
  //   })
  // })
}) 