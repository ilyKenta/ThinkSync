import { render, screen, fireEvent } from '@testing-library/react';
import Page from '../page';
import '@testing-library/jest-dom';

// Mock the CreateForm component
jest.mock('../../create-project/createForm', () => {
  return function MockCreateForm({ onClose, onCreate }: { onClose: () => void, onCreate: (name: string) => void }) {
    return (
      <div data-testid="mock-create-form">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onCreate('Test Project')}>Create</button>
      </div>
    );
  };
});

describe('Create Requirements Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the create form component', () => {
    render(<Page />);
    expect(screen.getByTestId('mock-create-form')).toBeInTheDocument();
  });

  it('handles close action', () => {
    render(<Page />);
    fireEvent.click(screen.getByText('Close'));
    expect(console.log).toHaveBeenCalledWith('Modal closed');
  });

  it('handles create action', () => {
    render(<Page />);
    fireEvent.click(screen.getByText('Create'));
    expect(console.log).toHaveBeenCalledWith('Create Requirements:', 'Test Project');
  });
}); 