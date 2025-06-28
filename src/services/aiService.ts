import type { 
  AIProvider, 
  GenerationRequest, 
  MindMapData, 
  SearchResult,
  Template 
} from '@types/index';

interface WebSearchProvider {
  search(query: string, maxResults?: number): Promise<SearchResult[]>;
}

class TavilySearchProvider implements WebSearchProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          max_results: maxResults,
          search_depth: 'basic',
          include_images: false,
          include_answer: false
        })
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results?.map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.content,
        source: new URL(result.url).hostname
      })) || [];
    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }
}

class AIService {
  private webSearchProvider: WebSearchProvider | null = null;

  constructor() {
    // Initialize web search if API key is available
    const tavilyApiKey = localStorage.getItem('tavily_api_key') || import.meta.env.VITE_TAVILY_API_KEY;
    if (tavilyApiKey) {
      this.webSearchProvider = new TavilySearchProvider(tavilyApiKey);
    }
  }

  setWebSearchApiKey(apiKey: string): void {
    localStorage.setItem('tavily_api_key', apiKey);
    this.webSearchProvider = new TavilySearchProvider(apiKey);
  }

  async generateMindMap(request: GenerationRequest): Promise<MindMapData> {
    try {
      let enhancedPrompt = this.buildBasePrompt(request.topic, request.template);
      let sources: string[] = [];

      // Add web search results if enabled
      if (request.includeWebSearch && this.webSearchProvider) {
        const searchResults = await this.performWebSearch(request.topic);
        if (searchResults.length > 0) {
          enhancedPrompt += this.buildSearchContext(searchResults);
          sources = searchResults.map(r => r.url);
        }
      }

      // Add custom prompt if provided
      if (request.customPrompt) {
        enhancedPrompt += `\n\nAdditional Instructions: ${request.customPrompt}`;
      }

      const response = await this.callAIProvider(request.provider, enhancedPrompt);
      const mindMapData = this.parseAIResponse(response);

      // Add metadata
      const now = new Date().toISOString();
      return {
        title: request.topic,
        description: `AI-generated mind map for: ${request.topic}`,
        nodes: mindMapData.nodes.map(node => ({
          ...node,
          metadata: {
            created: now,
            modified: now,
            sources: sources.length > 0 ? sources : undefined
          }
        })),
        metadata: {
          created: now,
          modified: now,
          author: '', // Will be set by storage service
          version: 1,
          tags: this.extractTags(request.topic),
          isPublic: false
        },
        settings: {
          layout: 'vertical',
          theme: 'default',
          autoSave: true,
          exportFormat: 'png'
        }
      };
    } catch (error) {
      console.error('Error generating mind map:', error);
      throw new Error('Failed to generate mind map. Please check your API keys and try again.');
    }
  }

  private async performWebSearch(topic: string): Promise<SearchResult[]> {
    if (!this.webSearchProvider) {
      return [];
    }

    try {
      // Create search queries for different aspects
      const searchQueries = [
        topic,
        `${topic} latest developments 2024`,
        `${topic} research trends`,
        `${topic} applications examples`
      ];

      const allResults: SearchResult[] = [];
      
      for (const query of searchQueries) {
        const results = await this.webSearchProvider.search(query, 3);
        allResults.push(...results);
      }

      // Remove duplicates and limit results
      const uniqueResults = allResults.filter((result, index, self) => 
        index === self.findIndex(r => r.url === result.url)
      );

      return uniqueResults.slice(0, 10);
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }

  private buildBasePrompt(topic: string, template?: Template): string {
    let prompt = `As an expert researcher and knowledge architect, create a comprehensive, multi-dimensional mind map for: "${topic}"

RESEARCH REQUIREMENTS:
- Think like a subject matter expert with deep domain knowledge
- Include cutting-edge developments, historical context, and future trends
- Connect interdisciplinary insights and cross-pollinate ideas
- Add specific examples, case studies, methodologies, and real-world applications
- Include both theoretical frameworks and practical implementations
- Consider economic, social, technological, and environmental implications
- Add quantitative data, key metrics, and performance indicators where relevant

STRUCTURAL REQUIREMENTS:
- Create 25-35 nodes with 4-5 levels of depth
- Each branch should tell a complete story with logical progression
- Include innovative connections between different branches
- Add specific technologies, methodologies, tools, and frameworks
- Include key players, organizations, research institutions, and thought leaders
- Add timelines, milestones, and evolutionary stages
- Consider multiple perspectives and schools of thought`;

    if (template) {
      prompt += `\n\nTEMPLATE STRUCTURE:
Use this template structure as a foundation and expand upon it:
${this.templateToPrompt(template)}`;
    }

    prompt += `

JSON STRUCTURE:
{
    "nodes": [
        {
            "key": "unique_id",
            "text": "Specific, descriptive node text",
            "parent": "parent_id_or_null_for_root",
            "color": "#hex_color",
            "borderColor": "#hex_color", 
            "textColor": "#ffffff",
            "font": "font_specification",
            "level": number
        }
    ]
}

COLOR SCHEME:
- Root node: #667eea background, #4c51bf border
- Level 1: #48bb78 background, #38a169 border  
- Level 2: #ed8936 background, #dd6b20 border
- Level 3+: #9f7aea background, #805ad5 border

Return ONLY the JSON object, no additional text.`;

    return prompt;
  }

  private buildSearchContext(searchResults: SearchResult[]): string {
    const context = searchResults.map(result => 
      `Source: ${result.source}\nTitle: ${result.title}\nContent: ${result.snippet}`
    ).join('\n\n');

    return `\n\nCURRENT RESEARCH CONTEXT:
Use the following current information to enhance the mind map with up-to-date insights:

${context}

Integrate these findings naturally into the mind map structure and cite sources where relevant.`;
  }

  private templateToPrompt(template: Template): string {
    const structureText = template.structure.map(node => {
      const indent = '  '.repeat(node.level);
      return `${indent}- ${node.text}${node.placeholder ? ' (expand this)' : ''}`;
    }).join('\n');

    return `Template: ${template.name}
Description: ${template.description}
Structure:
${structureText}`;
  }

  private async callAIProvider(provider: AIProvider, prompt: string): Promise<string> {
    switch (provider.name.toLowerCase()) {
      case 'openai':
        return this.callOpenAI(provider, prompt);
      case 'anthropic':
        return this.callAnthropic(provider, prompt);
      case 'google':
        return this.callGemini(provider, prompt);
      default:
        throw new Error(`Unsupported AI provider: ${provider.name}`);
    }
  }

  private async callOpenAI(provider: AIProvider, prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'You are a world-class researcher and knowledge architect. Create sophisticated, interconnected mind maps with deep insights and creative connections. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: provider.settings.temperature,
        max_tokens: provider.settings.maxTokens,
        top_p: provider.settings.topP,
        frequency_penalty: provider.settings.frequencyPenalty,
        presence_penalty: provider.settings.presencePenalty
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callAnthropic(provider: AIProvider, prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: provider.settings.maxTokens,
        temperature: provider.settings.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  private async callGemini(provider: AIProvider, prompt: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: provider.settings.temperature,
          maxOutputTokens: provider.settings.maxTokens,
          topP: provider.settings.topP
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  private parseAIResponse(response: string): { nodes: any[] } {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        throw new Error('Invalid mind map structure');
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  private extractTags(topic: string): string[] {
    // Simple tag extraction - can be enhanced with NLP
    const words = topic.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return words
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5);
  }

  async suggestRelatedTopics(topic: string): Promise<string[]> {
    if (!this.webSearchProvider) {
      return [];
    }

    try {
      const searchResults = await this.webSearchProvider.search(`${topic} related topics`, 5);
      // Extract potential topics from search results
      // This is a simplified implementation
      return searchResults.map(result => result.title).slice(0, 5);
    } catch (error) {
      console.error('Error suggesting related topics:', error);
      return [];
    }
  }
}

export const aiService = new AIService();
export default aiService;
