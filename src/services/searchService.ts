// import Fuse from 'fuse.js';
import type { MindMapData, MindMapNode, SearchOptions, FilterOptions } from '@types/index';

interface SearchResult {
  item: MindMapData | MindMapNode;
  type: 'mindmap' | 'node';
  score: number;
  matches?: any[];
  mindMapId?: string;
  breadcrumb?: string[];
}

interface NodeSearchResult extends SearchResult {
  item: MindMapNode;
  type: 'node';
  mindMapId: string;
  breadcrumb: string[];
}

class SearchService {
  private mindMapFuse: any | null = null;
  private nodeFuse: any | null = null;
  private mindMapsData: MindMapData[] = [];
  private searchHistory: string[] = [];
  private readonly MAX_HISTORY = 20;

  constructor() {
    this.loadSearchHistory();
  }

  updateSearchIndex(mindMaps: MindMapData[]): void {
    this.mindMapsData = mindMaps;
    this.initializeFuseInstances();
  }

  private initializeFuseInstances(): void {
    // Configure options for mind map search
    const mindMapOptions: any = {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'description', weight: 0.3 },
        { name: 'metadata.tags', weight: 0.2 },
        { name: 'nodes.text', weight: 0.1 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      shouldSort: true
    };

    // Configure options for node search
    const nodeOptions: any = {
      keys: [
        { name: 'text', weight: 0.8 },
        { name: 'metadata.tags', weight: 0.2 }
      ],
      threshold: 0.2,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      shouldSort: true
    };

    // this.mindMapFuse = new Fuse(this.mindMapsData, mindMapOptions);

    // Flatten all nodes for node search
    const allNodes: (MindMapNode & { mindMapId: string })[] = [];
    this.mindMapsData.forEach(mindMap => {
      mindMap.nodes.forEach(node => {
        allNodes.push({ ...node, mindMapId: mindMap.id! });
      });
    });

    // this.nodeFuse = new Fuse(allNodes, nodeOptions);
  }

  async search(
    query: string,
    options: SearchOptions,
    filters?: FilterOptions
  ): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    this.addToSearchHistory(query);

    // Simple search implementation without Fuse.js
    let results: SearchResult[] = [];

    // Search mind maps
    this.mindMapsData.forEach(mindMap => {
      if (mindMap.title.toLowerCase().includes(query.toLowerCase()) ||
          mindMap.description?.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          item: mindMap,
          type: 'mindmap' as const,
          score: 0.8,
          matches: []
        });
      }
    });

    // Search nodes
    this.mindMapsData.forEach(mindMap => {
      mindMap.nodes.forEach(node => {
        if (node.text.toLowerCase().includes(query.toLowerCase())) {
          const breadcrumb = this.buildBreadcrumb(mindMap, node);
          results.push({
            item: node,
            type: 'node' as const,
            score: 0.9,
            matches: [],
            mindMapId: mindMap.id,
            breadcrumb
          });
        }
      });
    });

    // Apply additional filtering
    if (filters) {
      results = this.applyFilters(results, filters);
    }

    // Apply search options
    results = this.applySearchOptions(results, query, options);

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  private buildBreadcrumb(mindMap: MindMapData, node: MindMapNode): string[] {
    const breadcrumb: string[] = [mindMap.title];
    let currentNode = node;

    // Build path from node to root
    const path: string[] = [];
    while (currentNode.parent) {
      const parentNode = mindMap.nodes.find(n => n.key === currentNode.parent);
      if (parentNode) {
        path.unshift(parentNode.text);
        currentNode = parentNode;
      } else {
        break;
      }
    }

    breadcrumb.push(...path, node.text);
    return breadcrumb;
  }

  private applyFilters(results: SearchResult[], filters: FilterOptions): SearchResult[] {
    return results.filter(result => {
      const mindMap = result.type === 'mindmap' 
        ? result.item as MindMapData
        : this.mindMapsData.find(mm => mm.id === (result as NodeSearchResult).mindMapId);

      if (!mindMap) return false;

      // Filter by tags
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          mindMap.metadata.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      // Filter by date range
      if (filters.dateRange) {
        const createdDate = new Date(mindMap.metadata.created);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        
        if (createdDate < startDate || createdDate > endDate) {
          return false;
        }
      }

      // Filter by author
      if (filters.author.length > 0) {
        if (!filters.author.includes(mindMap.metadata.author)) {
          return false;
        }
      }

      // Filter by public/private
      if (filters.isPublic !== undefined) {
        if (mindMap.metadata.isPublic !== filters.isPublic) {
          return false;
        }
      }

      return true;
    });
  }

  private applySearchOptions(results: SearchResult[], query: string, options: SearchOptions): SearchResult[] {
    if (options.regex || options.wholeWord || options.caseSensitive) {
      // Apply custom search logic for advanced options
      return results.filter(result => {
        const text = result.type === 'mindmap'
          ? `${(result.item as MindMapData).title} ${(result.item as MindMapData).description || ''}`
          : (result.item as MindMapNode).text;

        return this.matchesAdvancedSearch(text, query, options);
      });
    }

    return results;
  }

  private matchesAdvancedSearch(text: string, query: string, options: SearchOptions): boolean {
    const searchText = options.caseSensitive ? text : text.toLowerCase();
    const searchQuery = options.caseSensitive ? query : query.toLowerCase();

    if (options.regex) {
      try {
        const flags = options.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(searchQuery, flags);
        return regex.test(searchText);
      } catch {
        return false;
      }
    }

    if (options.wholeWord) {
      const flags = options.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`\\b${this.escapeRegExp(searchQuery)}\\b`, flags);
      return regex.test(searchText);
    }

    return searchText.includes(searchQuery);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  searchInMindMap(mindMap: MindMapData, query: string, options: SearchOptions): MindMapNode[] {
    if (!query.trim()) {
      return [];
    }

    // Simple search implementation
    return mindMap.nodes.filter(node =>
      node.text.toLowerCase().includes(query.toLowerCase())
    );
  }

  highlightSearchTerms(text: string, query: string, options: SearchOptions): string {
    if (!query.trim()) {
      return text;
    }

    const searchQuery = options.caseSensitive ? query : query.toLowerCase();
    const searchText = options.caseSensitive ? text : text.toLowerCase();

    let regex: RegExp;
    
    if (options.regex) {
      try {
        const flags = options.caseSensitive ? 'g' : 'gi';
        regex = new RegExp(searchQuery, flags);
      } catch {
        return text;
      }
    } else if (options.wholeWord) {
      const flags = options.caseSensitive ? 'g' : 'gi';
      regex = new RegExp(`\\b${this.escapeRegExp(searchQuery)}\\b`, flags);
    } else {
      const flags = options.caseSensitive ? 'g' : 'gi';
      regex = new RegExp(this.escapeRegExp(searchQuery), flags);
    }

    return text.replace(regex, '<mark>$&</mark>');
  }

  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  clearSearchHistory(): void {
    this.searchHistory = [];
    this.saveSearchHistory();
  }

  removeFromSearchHistory(query: string): void {
    const index = this.searchHistory.indexOf(query);
    if (index > -1) {
      this.searchHistory.splice(index, 1);
      this.saveSearchHistory();
    }
  }

  private addToSearchHistory(query: string): void {
    // Remove if already exists
    const existingIndex = this.searchHistory.indexOf(query);
    if (existingIndex > -1) {
      this.searchHistory.splice(existingIndex, 1);
    }

    // Add to beginning
    this.searchHistory.unshift(query);

    // Limit history size
    if (this.searchHistory.length > this.MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);
    }

    this.saveSearchHistory();
  }

  private saveSearchHistory(): void {
    try {
      localStorage.setItem('mindmap_search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  private loadSearchHistory(): void {
    try {
      const saved = localStorage.getItem('mindmap_search_history');
      if (saved) {
        this.searchHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  getSuggestions(query: string): string[] {
    if (!query.trim()) {
      return this.searchHistory.slice(0, 5);
    }

    // Get suggestions from search history
    const historySuggestions = this.searchHistory
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3);

    // Get suggestions from mind map titles and node text
    const contentSuggestions: string[] = [];
    this.mindMapsData.forEach(mindMap => {
      if (mindMap.title.toLowerCase().includes(query.toLowerCase())) {
        contentSuggestions.push(mindMap.title);
      }
      
      mindMap.nodes.forEach(node => {
        if (node.text.toLowerCase().includes(query.toLowerCase()) && 
            !contentSuggestions.includes(node.text)) {
          contentSuggestions.push(node.text);
        }
      });
    });

    return [...historySuggestions, ...contentSuggestions.slice(0, 5)].slice(0, 8);
  }
}

export const searchService = new SearchService();
export default searchService;
