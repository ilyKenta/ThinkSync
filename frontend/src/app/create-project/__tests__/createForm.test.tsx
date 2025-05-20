import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CreateForm, { CreateFormProps } from '../createForm';

jest.mock('../page.module.css', () => new Proxy({}, { get: (target, prop) => prop }));

describe('CreateForm', () => {
  let onClose: jest.Mock;
  let onCreate: jest.Mock;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    onClose = jest.fn();
    onCreate = jest.fn();
  });

  function fillForm() {
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Test Project' } });
    fireEvent.change(screen.getByLabelText('Project Description'), { target: { value: 'A description' } });
    fireEvent.change(screen.getByLabelText('Goals'), { target: { value: 'Some goals' } });
    fireEvent.change(screen.getByLabelText('Research Area'), { target: { value: 'AI' } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2099-12-31' } });
  }

  it('renders all form fields and buttons', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    expect(screen.getByLabelText('Project name')).toBeInTheDocument();
    expect(screen.getByLabelText('Project Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Goals')).toBeInTheDocument();
    expect(screen.getByLabelText('Research Area')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByText('Funding Available *')).toBeInTheDocument();
    expect(screen.getByLabelText('Yes')).toBeInTheDocument();
    expect(screen.getByLabelText('No')).toBeInTheDocument();
    expect(screen.getByLabelText('submit information')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} />);
    fireEvent.click(screen.getByText('X'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows validation if funding is not selected and does not submit', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} />);
    fillForm();
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('clears custom validity when funding is selected', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} />);
    fillForm();
    // Simulate error first
    fireEvent.click(screen.getByLabelText('submit information'));
    // Now select funding
    const yesRadio = screen.getByLabelText('Yes');
    fireEvent.click(yesRadio);
    // No error should be thrown
    expect(yesRadio).toBeChecked();
  });

  it('submits form with correct values when all fields are filled and funding is Yes', async () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    await waitFor(() => expect(screen.getByLabelText('Project name')).toBeInTheDocument());
    fillForm();
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    // Debug: log all calls
    console.log('onCreate calls (Yes):', onCreate.mock.calls);
    expect(onCreate).toHaveBeenCalledWith(
      'Test Project',
      'A description',
      'Some goals',
      'AI',
      '2099-01-01',
      '2099-12-31',
      true
    );
  });

  it('submits form with correct values when all fields are filled and funding is No', async () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    await waitFor(() => expect(screen.getByLabelText('Project name')).toBeInTheDocument());
    fillForm();
    fireEvent.click(screen.getByLabelText('No'));
    fireEvent.click(screen.getByLabelText('submit information'));
    // Debug: log all calls
    console.log('onCreate calls (No):', onCreate.mock.calls);
    expect(onCreate).toHaveBeenCalledWith(
      'Test Project',
      'A description',
      'Some goals',
      'AI',
      '2099-01-01',
      '2099-12-31',
      false
    );
  });

  it('handles input changes for all fields', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} />);
    const nameInput = screen.getByLabelText('Project name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(nameInput).toHaveValue('New Name');
    const descInput = screen.getByLabelText('Project Description');
    fireEvent.change(descInput, { target: { value: 'New Desc' } });
    expect(descInput).toHaveValue('New Desc');
    const goalsInput = screen.getByLabelText('Goals');
    fireEvent.change(goalsInput, { target: { value: 'New Goals' } });
    expect(goalsInput).toHaveValue('New Goals');
    const areaInput = screen.getByLabelText('Research Area');
    fireEvent.change(areaInput, { target: { value: 'New Area' } });
    expect(areaInput).toHaveValue('New Area');
    const startInput = screen.getByLabelText('Start Date');
    fireEvent.change(startInput, { target: { value: '2024-05-01' } });
    expect(startInput).toHaveValue('2024-05-01');
    const endInput = screen.getByLabelText('End Date');
    fireEvent.change(endInput, { target: { value: '2024-06-01' } });
    expect(endInput).toHaveValue('2024-06-01');
  });
}); 