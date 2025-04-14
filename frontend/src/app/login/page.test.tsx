import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import LoginPage from './page'

jest.mock('@azure/msal-browser', () => ({
  PublicClientApplication: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    loginPopup: jest.fn().mockResolvedValue({
      accessToken: 'mock-token'
    })
  }))
}))

describe('LoginPage', () => {
  it('renders login button', () => {
    render(<LoginPage />)
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