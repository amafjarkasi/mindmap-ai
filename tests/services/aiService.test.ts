import { aiService } from '../../src/services/aiService';
import type { GenerationRequest, AIProvider } from '../../src/types';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

describe('AIService', () => {
  const mockAIProvider: AIProvider = {
    name: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: 'test-api-key',
    settings: {
      temperature: 0.8,
      maxTokens: 3500
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMindMap', () => {
    it('should generate mind map from topic', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              nodes: [
                {
                  key: 'root',
                  text: 'Test Topic',
                  parent: null,
                  color: '#667eea',
                  level: 0
                },
                {
                  key: 'child1',
                  text: 'Subtopic 1',
                  parent: 'root',
                  color: '#48bb78',
                  level: 1
                }
              ]
            })
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: GenerationRequest = {
        topic: 'Test Topic',
        provider: mockAIProvider,
        includeWebSearch: false
      };

      const result = await aiService.generateMindMap(request);

      expect(result.title).toBe('Test Topic');
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].text).toBe('Test Topic');
      expect(result.nodes[1].text).toBe('Subtopic 1');
    });

    it('should include web search results when enabled', async () => {
      // Mock Tavily API response
      const mockSearchResponse = {
        results: [
          {
            title: 'Test Article',
            url: 'https://example.com/test',
            content: 'Test content about the topic',
            source: 'example.com'
          }
        ]
      };

      // Mock OpenAI response
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              nodes: [
                {
                  key: 'root',
                  text: 'Test Topic with Research',
                  parent: null,
                  color: '#667eea',
                  level: 0
                }
              ]
            })
          }
        }]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAIResponse)
        });

      // Set up web search API key
      aiService.setWebSearchApiKey('test-tavily-key');

      const request: GenerationRequest = {
        topic: 'Test Topic',
        provider: mockAIProvider,
        includeWebSearch: true
      };

      const result = await aiService.generateMindMap(request);

      expect(result.nodes[0].metadata?.sources).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2); // Search + AI calls
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const request: GenerationRequest = {
        topic: 'Test Topic',
        provider: mockAIProvider,
        includeWebSearch: false
      };

      await expect(aiService.generateMindMap(request)).rejects.toThrow(
        'Failed to generate mind map. Please check your API keys and try again.'
      );
    });

    it('should handle invalid JSON responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: GenerationRequest = {
        topic: 'Test Topic',
        provider: mockAIProvider,
        includeWebSearch: false
      };

      await expect(aiService.generateMindMap(request)).rejects.toThrow(
        'Failed to generate mind map. Please check your API keys and try again.'
      );
    });
  });

  describe('AI Provider Support', () => {
    it('should support OpenAI provider', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              nodes: [{ key: 'test', text: 'Test', parent: null, level: 0 }]
            })
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: GenerationRequest = {
        topic: 'Test',
        provider: { ...mockAIProvider, name: 'openai' },
        includeWebSearch: false
      };

      await aiService.generateMindMap(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    it('should support Anthropic provider', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            nodes: [{ key: 'test', text: 'Test', parent: null, level: 0 }]
          })
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: GenerationRequest = {
        topic: 'Test',
        provider: { ...mockAIProvider, name: 'anthropic' },
        includeWebSearch: false
      };

      await aiService.generateMindMap(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key'
          })
        })
      );
    });

    it('should support Google Gemini provider', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                nodes: [{ key: 'test', text: 'Test', parent: null, level: 0 }]
              })
            }]
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: GenerationRequest = {
        topic: 'Test',
        provider: { ...mockAIProvider, name: 'google' },
        includeWebSearch: false
      };

      await aiService.generateMindMap(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should throw error for unsupported provider', async () => {
      const request: GenerationRequest = {
        topic: 'Test',
        provider: { ...mockAIProvider, name: 'unsupported' as any },
        includeWebSearch: false
      };

      await expect(aiService.generateMindMap(request)).rejects.toThrow(
        'Failed to generate mind map. Please check your API keys and try again.'
      );
    });
  });

  describe('suggestRelatedTopics', () => {
    it('should suggest related topics using web search', async () => {
      const mockSearchResponse = {
        results: [
          { title: 'Related Topic 1' },
          { title: 'Related Topic 2' },
          { title: 'Related Topic 3' }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      });

      aiService.setWebSearchApiKey('test-tavily-key');

      const suggestions = await aiService.suggestRelatedTopics('Test Topic');

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toBe('Related Topic 1');
    });

    it('should return empty array when web search is not available', async () => {
      const suggestions = await aiService.suggestRelatedTopics('Test Topic');
      expect(suggestions).toEqual([]);
    });
  });
});
