import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('../src/services/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
    signInWithEmailAndPassword: jest.fn().mockImplementation((email, password) => {
      if (email === 'nonexistent@example.com') {
        const error = new Error('Firebase: Error (auth/user-not-found).');
        (error as any).code = 'auth/user-not-found';
        return Promise.reject(error);
      }
      if (email === 'invalid@example.com') {
        const error = new Error('Firebase: Error (auth/invalid-email).');
        (error as any).code = 'auth/invalid-email';
        return Promise.reject(error);
      }
      return Promise.resolve({ uid: 'test-uid', email });
    }),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    updateProfile: jest.fn(),
    signInWithPopup: jest.fn()
  },
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn()
  },
  storage: {
    ref: jest.fn(),
    uploadBytes: jest.fn(),
    getDownloadURL: jest.fn()
  },
  analytics: null
}));

// Mock GoJS
const mockGoJSObject = jest.fn().mockReturnValue({});

(global as any).go = {
  GraphObject: {
    make: mockGoJSObject
  },
  Diagram: jest.fn().mockImplementation(() => ({
    model: {
      nodeDataArray: [],
      addNodeData: jest.fn(),
      setDataProperty: jest.fn(),
      findNodeDataForKey: jest.fn().mockImplementation((key) => {
        if (key === 'root') {
          return { key: 'root', text: 'Root Node', level: 0 };
        }
        return { key, text: `Node ${key}`, level: 1 };
      })
    },
    layoutDiagram: jest.fn(),
    zoomToFit: jest.fn(),
    centerRect: jest.fn(),
    commandHandler: {
      increaseZoom: jest.fn(),
      decreaseZoom: jest.fn()
    },
    addDiagramListener: jest.fn(),
    select: jest.fn(),
    findNodeForKey: jest.fn(),
    findNodeDataForKey: jest.fn(),
    makeSvg: jest.fn(),
    nodeTemplate: null,
    linkTemplate: null,
    layout: null
  })),
  TreeModel: jest.fn().mockImplementation((data) => ({
    nodeDataArray: data || [],
    addNodeData: jest.fn(),
    setDataProperty: jest.fn(),
    findNodeDataForKey: jest.fn().mockImplementation((key) => {
      // Return a mock node for testing
      if (key === 'root') {
        return { key: 'root', text: 'Root Node', level: 0 };
      }
      return { key, text: `Node ${key}`, level: 1 };
    })
  })),
  TreeLayout: jest.fn().mockImplementation(() => ({
    ArrangementVertical: 'vertical',
    CompactionNone: 'none',
    SortingAscending: 'asc'
  })),
  Binding: jest.fn().mockImplementation((property, source) => ({
    property,
    source,
    converter: null
  })),
  Node: jest.fn().mockReturnValue({}),
  Shape: jest.fn().mockReturnValue({}),
  TextBlock: jest.fn().mockReturnValue({}),
  Panel: jest.fn().mockReturnValue({}),
  Link: jest.fn().mockReturnValue({}),
  Spot: {
    Center: 'center',
    TopRight: 'topright',
    RightSide: 'rightside',
    LeftSide: 'leftside'
  },
  Size: jest.fn().mockReturnValue({}),
  ToolManager: {
    WheelZoom: 'wheelzoom'
  },
  Margin: jest.fn().mockReturnValue({}),
  Brush: jest.fn().mockReturnValue({})
};

// Mock the $ function used by GoJS
(global as any).$ = mockGoJSObject;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
global.fetch = jest.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock URL constructor
global.URL = class URL {
  constructor(url: string) {
    this.href = url;
    this.hostname = url.split('/')[2] || '';
    this.pathname = url.split('/').slice(3).join('/') || '/';
  }
  href: string;
  hostname: string;
  pathname: string;
};

// Mock Blob
global.Blob = class Blob {
  constructor(parts: any[], options?: any) {
    this.size = 0;
    this.type = options?.type || '';
  }
  size: number;
  type: string;
};

// Mock FileReader
global.FileReader = class FileReader {
  readAsText = jest.fn();
  result: string | null = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup DOM environment
document.body.innerHTML = `
  <div id="mindmapDiv"></div>
  <div id="chatMessages"></div>
  <input id="userInput" />
  <button id="sendBtn"></button>
  <input id="searchInput" />
  <button id="searchBtn"></button>
`;

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_FIREBASE_API_KEY = 'test-api-key';
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project';
process.env.VITE_OPENAI_API_KEY = 'test-openai-key';
process.env.VITE_TAVILY_API_KEY = 'test-tavily-key';
process.env.VITE_ANTHROPIC_API_KEY = 'test-anthropic-key';

// Mock import.meta.env
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        VITE_FIREBASE_APP_ID: 'test-app-id',
        VITE_OPENAI_API_KEY: 'test-openai-key',
        VITE_TAVILY_API_KEY: 'test-tavily-key',
        VITE_ANTHROPIC_API_KEY: 'test-anthropic-key',
        MODE: 'test',
        DEV: false,
        PROD: false
      }
    }
  }
});

// Mock Response for Firebase
global.Response = class Response {
  constructor(body?: any, init?: ResponseInit) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
  }
  body: any;
  status: number;
  statusText: string;
  ok: boolean;
  headers = new Map();

  json() {
    return Promise.resolve(this.body);
  }

  text() {
    return Promise.resolve(String(this.body));
  }
};
