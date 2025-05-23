import { render, screen, fireEvent } from '@testing-library/react';
import AddWidgetButton from '../AddWidgetButton';
import '@testing-library/jest-dom';

describe('AddWidgetButton', () => {
  const mockOnAddWidget = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the add widget button', () => {
    render(<AddWidgetButton onAddWidget={mockOnAddWidget} />);
    expect(screen.getByText('Add Widget')).toBeInTheDocument();
  });

  it('shows dropdown when button is clicked', () => {
    render(<AddWidgetButton onAddWidget={mockOnAddWidget} />);
    
    // Initially dropdown should not be visible
    expect(screen.queryByText('My Projects')).not.toBeInTheDocument();
    
    // Click the button
    fireEvent.click(screen.getByText('Add Widget'));
    
    // Dropdown should now be visible with all options
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('Milestones')).toBeInTheDocument();
    expect(screen.getByText('Funding')).toBeInTheDocument();
  });

  it('calls onAddWidget with correct type when option is selected', () => {
    render(<AddWidgetButton onAddWidget={mockOnAddWidget} />);
    
    // Open dropdown
    fireEvent.click(screen.getByText('Add Widget'));
    
    // Click on Projects option
    fireEvent.click(screen.getByText('My Projects'));
    
    // Verify callback was called with correct type
    expect(mockOnAddWidget).toHaveBeenCalledWith('projects');
    
    // Dropdown should be closed
    expect(screen.queryByText('My Projects')).not.toBeInTheDocument();
  });

  it('handles all widget types correctly', () => {
    render(<AddWidgetButton onAddWidget={mockOnAddWidget} />);
    
    // Open dropdown
    fireEvent.click(screen.getByText('Add Widget'));
    
    // Test each widget type
    const widgetTypes = ['My Projects', 'Milestones', 'Funding'];
    const expectedTypes = ['projects', 'milestones', 'funding'];
    
    widgetTypes.forEach((label, index) => {
      fireEvent.click(screen.getByText(label));
      expect(mockOnAddWidget).toHaveBeenCalledWith(expectedTypes[index]);
      
      // Reopen dropdown for next test
      if (index < widgetTypes.length - 1) {
        fireEvent.click(screen.getByText('Add Widget'));
      }
    });
  });
}); 