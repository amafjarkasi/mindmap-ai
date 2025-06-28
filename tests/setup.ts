import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('../src/services/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
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
(global as any).go = {
  GraphObject: {
    make: jest.fn()
  },
  Diagram: jest.fn().mockImplementation(() => ({
    model: null,
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
    makeSvg: jest.fn()
  })),
  TreeModel: jest.fn().mockImplementation((data) => ({
    nodeDataArray: data || [],
    addNodeData: jest.fn(),
    setDataProperty: jest.fn(),
    findNodeDataForKey: jest.fn()
  })),
  TreeLayout: {
    ArrangementVertical: 'vertical',
    CompactionNone: 'none',
    SortingAscending: 'asc'
  },
  Node: jest.fn(),
  Shape: jest.fn(),
  TextBlock: jest.fn(),
  Panel: jest.fn(),
  Link: jest.fn(),
  Spot: {
    Center: 'center',
    TopRight: 'topright',
    RightSide: 'rightside',
    LeftSide: 'leftside'
  },
  Size: jest.fn(),
  ToolManager: {
    WheelZoom: 'wheelzoom'
  }
};

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
process.env.VITE_FIREBASE_API_KEY = 'test-api-key';
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project';
process.env.VITE_OPENAI_API_KEY = 'test-openai-key';
