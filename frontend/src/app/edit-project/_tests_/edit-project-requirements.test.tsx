import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Page from '../edit-project-requirements';

// Mock EditReqForm
const mockEditReqForm = jest.fn();
jest.mock('../editReqForm', () => (props: any) => {
  mockEditReqForm(props);
  return (
    <div data-testid="edit-req-form">
      EditReqForm
      <button onClick={props.onClose} data-testid="close-btn">Close</button>
      <button onClick={() => props.onEdit && props.onEdit('edited')} data-testid="edit-btn">Edit</button>
    </div>
  );
});

describe('EditProjectRequirements Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders EditReqForm with correct props', () => {
    const projectId = 1;
    const requirements = [{ id: 1, name: 'Req1' }];
    const projectData = { title: 'Test Project' };
    render(
      <Page
        projectId={projectId}
        requirements={requirements}
        projectData={projectData}
        onClose={jest.fn()}
        onEdit={jest.fn()}
      />
    );
    expect(screen.getByTestId('edit-req-form')).toBeInTheDocument();
    expect(mockEditReqForm).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        requirements,
        projectData,
        onClose: expect.any(Function),
        onEdit: expect.any(Function),
      })
    );
  });

  it('hides form and calls onClose when closed', () => {
    const onClose = jest.fn();
    render(
      <Page
        projectId={1}
        requirements={[]}
        projectData={{}}
        onClose={onClose}
        onEdit={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalled();
    // Form should not be in the document after closing
    expect(screen.queryByTestId('edit-req-form')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit is triggered', () => {
    const onEdit = jest.fn();
    render(
      <Page
        projectId={1}
        requirements={[]}
        projectData={{}}
        onClose={jest.fn()}
        onEdit={onEdit}
      />
    );
    fireEvent.click(screen.getByTestId('edit-btn'));
    expect(onEdit).toHaveBeenCalledWith('edited');
  });

  it('does not render form after closing', () => {
    render(
      <Page
        projectId={1}
        requirements={[]}
        projectData={{}}
        onClose={jest.fn()}
        onEdit={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('close-btn'));
    expect(screen.queryByTestId('edit-req-form')).not.toBeInTheDocument();
  });
}); 
