import React from 'react';
import { render } from '@testing-library/react';
import ScrollIndicator from '../ScrollIndicator';

jest.mock('../page.module.css', () => ({
  scrollIndicatorWrapper: 'scrollIndicatorWrapper',
  scrollIndicator: 'scrollIndicator',
}));

describe('ScrollIndicator', () => {
  it('renders the scroll indicator wrapper and SVG', () => {
    const { container } = render(<ScrollIndicator />);
    // Check for wrapper
    expect(container.querySelector('.scrollIndicatorWrapper')).toBeInTheDocument();
    // Check for indicator span
    expect(container.querySelector('.scrollIndicator')).toBeInTheDocument();
    // Check for SVG
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
