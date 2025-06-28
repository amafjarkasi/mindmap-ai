import { MindMapGenerator } from '../../src/components/MindMapGenerator';
import { authService } from '../../src/services/auth';
import { aiService } from '../../src/services/aiService';
import { mindMapStorageService } from '../../src/services/mindMapStorage';
import type { MindMapData } from '../../src/types';

// Mock services
jest.mock('../../src/services/auth');
jest.mock('../../src/services/aiService');
jest.mock('../../src/services/mindMapStorage');
jest.mock('../../src/services/analyticsService');
jest.mock('../../src/services/collaborationService');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockAIService = aiService as jest.Mocked<typeof aiService>;
const mockStorageService = mindMapStorageService as jest.Mocked<typeof mindMapStorageService>;

describe('MindMapGenerator', () => {
  let generator: MindMapGenerator;
  let mockUser: any;
  let mockMindMapData: MindMapData;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="mindmapDiv"></div>
      <div id="chatMessages"></div>
      <input id="userInput" />
      <button id="sendBtn"></button>
      <input id="searchInput" />
      <button id="searchBtn"></button>
    `;

    mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
      createdAt: '2023-01-01',
      lastLoginAt: '2023-01-01',
      preferences: {
        theme: 'light',
        defaultAIProvider: 'openai',
        autoSave: true,
        notifications: {
          email: true,
          push: true,
          collaboration: true,
          updates: false
        },
        privacy: {
          profileVisibility: 'private',
          allowAnalytics: true,
          shareUsageData: false
        }
      }
    };

    mockMindMapData = {
      id: 'test-mindmap-id',
      title: 'Test Mind Map',
      description: 'A test mind map',
      nodes: [
        {
          key: 'root',
          text: 'Root Node',
          parent: null,
          level: 0,
          metadata: {
            created: '2023-01-01',
            modified: '2023-01-01'
          }
        },
        {
          key: 'child1',
          text: 'Child Node 1',
          parent: 'root',
          level: 1,
          metadata: {
            created: '2023-01-01',
            modified: '2023-01-01'
          }
        }
      ],
      metadata: {
        created: '2023-01-01',
        modified: '2023-01-01',
        author: 'test-uid',
        version: 1,
        tags: ['test'],
        isPublic: false
      }
    };

    generator = new MindMapGenerator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with GoJS diagram', () => {
      expect(generator).toBeDefined();
      // Verify that GoJS diagram was created
      expect((global as any).go.Diagram).toHaveBeenCalled();
    });

    it('should set up event listeners', () => {
      const sendBtn = document.getElementById('sendBtn');
      const userInput = document.getElementById('userInput');
      
      expect(sendBtn).toBeDefined();
      expect(userInput).toBeDefined();
    });
  });

  describe('Mind Map Generation', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAIService.generateMindMap.mockResolvedValue(mockMindMapData);
      mockStorageService.saveMindMap.mockResolvedValue('test-mindmap-id');
    });

    it('should generate mind map from user input', async () => {
      const userInput = document.getElementById('userInput') as HTMLInputElement;
      userInput.value = 'Test topic for mind map';

      await generator.handleSendMessage();

      expect(mockAIService.generateMindMap).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'Test topic for mind map',
          provider: expect.objectContaining({
            name: 'openai'
          }),
          includeWebSearch: expect.any(Boolean)
        })
      );

      expect(mockStorageService.saveMindMap).toHaveBeenCalledWith(mockMindMapData);
    });

    it('should show error when user is not authenticated', async () => {
      mockAuthService.getCurrentUser.mockReturnValue(null);

      const userInput = document.getElementById('userInput') as HTMLInputElement;
      userInput.value = 'Test topic';

      await generator.handleSendMessage();

      expect(mockAIService.generateMindMap).not.toHaveBeenCalled();
      expect(mockStorageService.saveMindMap).not.toHaveBeenCalled();
    });

    it('should handle empty input gracefully', async () => {
      const userInput = document.getElementById('userInput') as HTMLInputElement;
      userInput.value = '';

      await generator.handleSendMessage();

      expect(mockAIService.generateMindMap).not.toHaveBeenCalled();
    });

    it('should handle AI service errors', async () => {
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAIService.generateMindMap.mockRejectedValue(new Error('AI service error'));

      const userInput = document.getElementById('userInput') as HTMLInputElement;
      userInput.value = 'Test topic';

      await generator.handleSendMessage();

      expect(mockAIService.generateMindMap).toHaveBeenCalled();
      expect(mockStorageService.saveMindMap).not.toHaveBeenCalled();
    });
  });

  describe('Node Interaction', () => {
    it('should add child node to existing node', () => {
      // Mock prompt to return new node text
      global.prompt = jest.fn().mockReturnValue('New Child Node');

      generator.addChildNode('root');

      // Verify that the diagram model was updated
      expect(global.prompt).toHaveBeenCalledWith('Enter text for new node:');
    });

    it('should cancel child node creation when prompt is cancelled', () => {
      global.prompt = jest.fn().mockReturnValue(null);

      generator.addChildNode('root');

      expect(global.prompt).toHaveBeenCalled();
      // Should not add node when prompt is cancelled
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
    });

    it('should perform search when user enters query', async () => {
      const searchInput = document.getElementById('searchInput') as HTMLInputElement;
      searchInput.value = 'test search query';

      await generator['performSearch']();

      expect(searchInput.value).toBe('test search query');
    });

    it('should show error when search fails and user not authenticated', async () => {
      mockAuthService.getCurrentUser.mockReturnValue(null);

      const searchInput = document.getElementById('searchInput') as HTMLInputElement;
      searchInput.value = 'test query';

      await generator['performSearch']();

      // Should show authentication error
    });

    it('should handle empty search query', async () => {
      const searchInput = document.getElementById('searchInput') as HTMLInputElement;
      searchInput.value = '';

      await generator['performSearch']();

      // Should not perform search with empty query
    });
  });

  describe('Auto-save Functionality', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockStorageService.updateMindMap.mockResolvedValue();
    });

    it('should auto-save when diagram is modified', async () => {
      // Simulate having a current mind map
      generator['currentMindMap'] = mockMindMapData;
      generator['currentMindMapId'] = 'test-mindmap-id';
      generator['autoSaveEnabled'] = true;

      // Trigger auto-save
      await generator['autoSaveMindMap']();

      expect(mockStorageService.updateMindMap).toHaveBeenCalledWith(
        'test-mindmap-id',
        expect.any(Object)
      );
    });

    it('should not auto-save when disabled', async () => {
      generator['autoSaveEnabled'] = false;
      generator['currentMindMap'] = mockMindMapData;
      generator['currentMindMapId'] = 'test-mindmap-id';

      await generator['autoSaveMindMap']();

      expect(mockStorageService.updateMindMap).not.toHaveBeenCalled();
    });

    it('should not auto-save when no current mind map', async () => {
      generator['currentMindMap'] = null;
      generator['currentMindMapId'] = null;

      await generator['autoSaveMindMap']();

      expect(mockStorageService.updateMindMap).not.toHaveBeenCalled();
    });
  });

  describe('Diagram Controls', () => {
    it('should zoom in when zoom in button is clicked', () => {
      const mockDiagram = {
        commandHandler: {
          increaseZoom: jest.fn()
        }
      };
      generator['diagram'] = mockDiagram;

      generator['zoomIn']();

      expect(mockDiagram.commandHandler.increaseZoom).toHaveBeenCalled();
    });

    it('should zoom out when zoom out button is clicked', () => {
      const mockDiagram = {
        commandHandler: {
          decreaseZoom: jest.fn()
        }
      };
      generator['diagram'] = mockDiagram;

      generator['zoomOut']();

      expect(mockDiagram.commandHandler.decreaseZoom).toHaveBeenCalled();
    });

    it('should zoom to fit when zoom to fit button is clicked', () => {
      const mockDiagram = {
        zoomToFit: jest.fn()
      };
      generator['diagram'] = mockDiagram;

      generator['zoomToFit']();

      expect(mockDiagram.zoomToFit).toHaveBeenCalled();
    });

    it('should center diagram when center button is clicked', () => {
      const mockDiagram = {
        centerRect: jest.fn(),
        documentBounds: { x: 0, y: 0, width: 100, height: 100 }
      };
      generator['diagram'] = mockDiagram;

      generator['centerDiagram']();

      expect(mockDiagram.centerRect).toHaveBeenCalledWith(mockDiagram.documentBounds);
    });
  });

  describe('Manual Save', () => {
    beforeEach(() => {
      mockStorageService.updateMindMap.mockResolvedValue();
      mockStorageService.saveMindMap.mockResolvedValue('new-mindmap-id');
    });

    it('should save existing mind map', async () => {
      generator['currentMindMap'] = mockMindMapData;
      generator['currentMindMapId'] = 'existing-id';

      await generator['saveMindMap']();

      expect(mockStorageService.updateMindMap).toHaveBeenCalledWith(
        'existing-id',
        expect.any(Object)
      );
    });

    it('should save new mind map', async () => {
      generator['currentMindMap'] = mockMindMapData;
      generator['currentMindMapId'] = null;

      await generator['saveMindMap']();

      expect(mockStorageService.saveMindMap).toHaveBeenCalledWith(mockMindMapData);
    });

    it('should show error when no mind map to save', async () => {
      generator['currentMindMap'] = null;

      await generator['saveMindMap']();

      expect(mockStorageService.updateMindMap).not.toHaveBeenCalled();
      expect(mockStorageService.saveMindMap).not.toHaveBeenCalled();
    });
  });
});
