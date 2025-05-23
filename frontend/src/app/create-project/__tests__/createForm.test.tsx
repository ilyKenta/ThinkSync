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
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fireEvent.click(screen.getByText('X'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('validates empty project name', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates project name length', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'a'.repeat(101) } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates project name special characters', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Test@#$%' } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates empty description', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Project Description'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates description length', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Project Description'), { target: { value: 'a'.repeat(1001) } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates empty goals', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Goals'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates goals length', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Goals'), { target: { value: 'a'.repeat(501) } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates empty research area', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Research Area'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates research area length', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Research Area'), { target: { value: 'a'.repeat(201) } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates start date is not in the past', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: yesterdayStr } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates end date is not in the past', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: yesterdayStr } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates end date is after start date', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2099-12-31' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2099-01-01' } });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('validates funding selection', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.click(screen.getByLabelText('submit information'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('submits form with correct values when all validations pass', async () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.click(screen.getByLabelText('submit information'));
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

  it('handles funding change correctly', () => {
    render(<CreateForm onClose={onClose} onCreate={onCreate} forceMounted />);
    fillForm();
    const yesRadio = screen.getByLabelText('Yes');
    const noRadio = screen.getByLabelText('No');
    
    fireEvent.click(yesRadio);
    expect(yesRadio).toBeChecked();
    expect(noRadio).not.toBeChecked();
    
    fireEvent.click(noRadio);
    expect(noRadio).toBeChecked();
    expect(yesRadio).not.toBeChecked();
  });
}); 