// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />
  },
}))

// Suppress noisy console output
const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;

const suppressedMessages = [
  'Authentication error',
  'Submission error',
  'validateDOMNesting',
  'Warning: An update to',
  'inside a test was not wrapped in act',
  'Error loading data',
  'Cannot read properties',
  'Login error',
  'MSAL initialization error',
  'Error during registration',
  'at Object.<anonymous>',
  'at console.originalError',
  'at printWarning',
  'at error',
  'at validateDOMNesting',
  'at createInstance',
  'at completeWork',
  'at completeUnitOfWork',
  'at performUnitOfWork',
  'at workLoopSync',
  'at renderRootSync',
  'at performConcurrentWorkOnRoot',
  'at flushActQueue',
  'at act',
  'at renderRoot',
  'at render'
];

const shouldSuppress = (args) => {
  if (!args || !args[0]) return false;
  const message = typeof args[0] === 'string' ? args[0] : args[0].toString();
  return suppressedMessages.some(pattern => message.includes(pattern));
};

beforeAll(() => {
  console.error = jest.fn((...args) => {
    if (shouldSuppress(args)) return;
    originalError(...args);
  });

  console.log = jest.fn((...args) => {
    if (shouldSuppress(args)) return;
    originalLog(...args);
  });

  console.warn = jest.fn((...args) => {
    if (shouldSuppress(args)) return;
    originalWarn(...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
  console.warn = originalWarn;
});

// Mock console methods for all test files
jest.spyOn(console, 'error').mockImplementation((...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Authentication error') || args[0].includes('Submission error'))
  ) {
    return;
  }
  originalError(...args);
});

jest.spyOn(console, 'log').mockImplementation((...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Authentication error') || args[0].includes('Submission error'))
  ) {
    return;
  }
  originalLog(...args);
});

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}; 