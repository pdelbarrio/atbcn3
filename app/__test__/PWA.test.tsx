import { render, waitFor } from '@testing-library/react';
import PWA from '../pwa';
import { shouldRegisterServiceWorker } from '@/lib/pwa-registration';

jest.mock('@khmyznikov/pwa-install', () => ({}));
jest.mock('@/lib/pwa-registration', () => ({
  shouldRegisterServiceWorker: jest.fn(),
}));

const mockShouldRegister = shouldRegisterServiceWorker as jest.Mock;

type Listener = () => void;

type ServiceWorkerMock = {
  register: jest.Mock;
  getRegistrations: jest.Mock;
  controller: unknown;
};

const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
  window.navigator,
  'serviceWorker',
);

type MockResult = {
  serviceWorker: ServiceWorkerMock;
  registration: {
    scope: string;
    addEventListener: jest.Mock;
    installing: { state: string; addEventListener: jest.Mock } | undefined;
  };
  listeners: { updateFound?: Listener; stateChange?: Listener };
};

function mockServiceWorker(overrides: Partial<ServiceWorkerMock> = {}): MockResult {
  const listeners: { updateFound?: Listener; stateChange?: Listener } = {};
  const registration = {
    scope: '/',
    addEventListener: jest.fn((event: string, listener: Listener) => {
      if (event === 'updatefound') listeners.updateFound = listener;
    }),
    installing: undefined as MockResult['registration']['installing'],
  };
  const serviceWorker = {
    register: jest.fn().mockResolvedValue(registration),
    getRegistrations: jest.fn().mockResolvedValue([]),
    controller: null,
    ...overrides,
  };

  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: serviceWorker,
  });

  return { serviceWorker, registration, listeners };
}

afterEach(() => {
  if (serviceWorkerDescriptor) {
    Object.defineProperty(
      window.navigator,
      'serviceWorker',
      serviceWorkerDescriptor,
    );
  } else {
    Reflect.deleteProperty(window.navigator, 'serviceWorker');
  }
  jest.clearAllMocks();
});

describe('PWA service worker registration', () => {
  it('does not register in development and unregisters old workers', async () => {
    mockShouldRegister.mockReturnValue(false);
    const unregister = jest.fn().mockResolvedValue(undefined);
    const { serviceWorker } = mockServiceWorker({
      getRegistrations: jest.fn().mockResolvedValue([{ unregister }]),
    });

    render(<PWA />);

    await waitFor(() => expect(serviceWorker.getRegistrations).toHaveBeenCalled());
    expect(unregister).toHaveBeenCalled();
    expect(serviceWorker.register).not.toHaveBeenCalled();
  });

  it('registers in production', async () => {
    mockShouldRegister.mockReturnValue(true);
    const { serviceWorker } = mockServiceWorker();

    render(<PWA />);

    await waitFor(() =>
      expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js'),
    );
    expect(serviceWorker.getRegistrations).not.toHaveBeenCalled();
  });

  it('does nothing when service workers are not supported', () => {
    mockShouldRegister.mockReturnValue(true);
    Reflect.deleteProperty(window.navigator, 'serviceWorker');

    expect(() => render(<PWA />)).not.toThrow();
  });

  it('prompts to reload when a new worker is installed', async () => {
    mockShouldRegister.mockReturnValue(true);
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const { serviceWorker, registration, listeners } = mockServiceWorker({
      controller: {},
    });

    render(<PWA />);

    await waitFor(() => expect(serviceWorker.register).toHaveBeenCalled());

    const newWorker = {
      state: 'installing',
      addEventListener: jest.fn((event: string, listener: Listener) => {
        if (event === 'statechange') listeners.stateChange = listener;
      }),
    };
    registration.installing = newWorker;

    listeners.updateFound?.();
    newWorker.state = 'installed';
    listeners.stateChange?.();

    expect(confirmMock).toHaveBeenCalledWith(
      'Nova versió disponible. Actualitzar ara?',
    );
  });
});
