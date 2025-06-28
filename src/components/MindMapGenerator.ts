import { aiService } from '../services/aiService';
import { mindMapStorageService } from '../services/mindMapStorage';
import { exportService } from '../services/exportService';
import { searchService } from '../services/searchService';
import { templateService } from '../services/templateService';
import { authService } from '../services/auth';
import { analyticsService } from '../services/analyticsService';
import { collaborationService } from '../services/collaborationService';
import type {
  MindMapData,
  AIProvider,
  GenerationRequest,
  ExportOptions,
  Template,
  SearchOptions
} from '../types';

declare const go: any;

export class MindMapGenerator {
  private diagram: any = null;
  private currentMindMap: MindMapData | null = null;
  private currentMindMapId: string | null = null;
  private autoSaveEnabled: boolean = true;
  private autoSaveInterval: number = 30000; // 30 seconds

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupDiagram();
    this.setupEventListeners();
    this.loadSettings();
    this.setupAutoSave();
  }

  private setupDiagram(): void {
    const $ = go.GraphObject.make;

    this.diagram = new go.Diagram("mindmapDiv", {
      "undoManager.isEnabled": true,
      layout: $(go.TreeLayout, {
        arrangement: go.TreeLayout.ArrangementVertical,
        angle: 0,
        compaction: go.TreeLayout.CompactionNone,
        layerSpacing: 80,
        layerSpacingParentOverlap: 1,
        nodeSpacing: 25,
        sorting: go.TreeLayout.SortingAscending,
        setsPortSpot: false,
        setsChildPortSpot: false
      }),
      "animationManager.isEnabled": true,
      "toolManager.hoverDelay": 100,
      allowCopy: false,
      allowDelete: false,
      allowMove: true,
      allowSelect: true,
      hasHorizontalScrollbar: true,
      hasVerticalScrollbar: true,
      "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom
    });

    // Enhanced node template with better styling and interactions
    this.diagram.nodeTemplate =
      $(go.Node, "Auto",
        {
          selectable: true,
          isTreeExpanded: true,
          locationSpot: go.Spot.Center,
          // Add click handler for node selection
          click: (e: any, node: any) => this.onNodeClick(e, node),
          // Add double-click handler for editing
          doubleClick: (e: any, node: any) => this.onNodeDoubleClick(e, node)
        },
        new go.Binding("isTreeExpanded"),
        // Main shape with enhanced styling
        $(go.Shape, "RoundedRectangle",
          {
            fill: "white",
            stroke: "#4299e1",
            strokeWidth: 2,
            portId: "",
            fromLinkable: true,
            toLinkable: true,
            cursor: "pointer",
            // Add hover effects
            mouseEnter: (e: any, shape: any) => this.onNodeHover(e, shape, true),
            mouseLeave: (e: any, shape: any) => this.onNodeHover(e, shape, false)
          },
          new go.Binding("fill", "color"),
          new go.Binding("stroke", "borderColor")),
        
        // Text panel with enhanced formatting
        $(go.Panel, "Table",
          $(go.TextBlock,
            {
              margin: 12,
              font: "14px 'Segoe UI', sans-serif",
              stroke: "#2d3748",
              maxSize: new go.Size(250, NaN),
              wrap: go.TextBlock.WrapFit,
              editable: false,
              textAlign: "center",
              isMultiline: true
            },
            new go.Binding("text", "text"),
            new go.Binding("font", "font"),
            new go.Binding("stroke", "textColor"))
        ),
        
        // Enhanced expand/collapse button
        $("TreeExpanderButton",
          {
            width: 24,
            height: 24,
            alignment: go.Spot.TopRight,
            alignmentFocus: go.Spot.Center,
            "ButtonBorder.fill": "white",
            "ButtonBorder.stroke": "#4299e1",
            "ButtonBorder.strokeWidth": 2,
            "_buttonFillOver": "#e3f2fd",
            "_buttonStrokeOver": "#1976d2"
          })
      );

    // Enhanced link template
    this.diagram.linkTemplate =
      $(go.Link,
        {
          selectable: false,
          routing: go.Link.Orthogonal,
          corner: 10,
          fromSpot: go.Spot.RightSide,
          toSpot: go.Spot.LeftSide
        },
        $(go.Shape,
          {
            stroke: "#90cdf4",
            strokeWidth: 2
          }),
        $(go.Shape,
          {
            toArrow: "Standard",
            fill: "#90cdf4",
            stroke: null,
            scale: 1
          })
      );

    // Add diagram event listeners
    this.diagram.addDiagramListener("Modified", (e: any) => {
      if (this.autoSaveEnabled && this.currentMindMapId) {
        this.scheduleAutoSave();
      }
    });

    // Make diagram globally available for export functions
    (window as any).mindMapGenerator = this;
  }

  private setupEventListeners(): void {
    // Chat input and send button
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput') as HTMLTextAreaElement;

    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    if (userInput) {
      userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // Control buttons
    this.setupControlButtons();

    // Search functionality
    this.setupSearchFunctionality();

    // Template selection
    this.setupTemplateSelection();
  }

  private setupControlButtons(): void {
    const buttons = [
      { id: 'zoomInBtn', handler: () => this.zoomIn() },
      { id: 'zoomOutBtn', handler: () => this.zoomOut() },
      { id: 'zoomFitBtn', handler: () => this.zoomToFit() },
      { id: 'autoOrganizeBtn', handler: () => this.autoOrganize() },
      { id: 'centerBtn', handler: () => this.centerDiagram() },
      { id: 'exportBtn', handler: () => this.showExportModal() },
      { id: 'resetBtn', handler: () => this.resetDiagram() },
      { id: 'settingsBtn', handler: () => this.showSettingsModal() },
      { id: 'saveBtn', handler: () => this.saveMindMap() },
      { id: 'loadBtn', handler: () => this.showLoadModal() },
      { id: 'shareBtn', handler: () => this.showShareModal() }
    ];

    buttons.forEach(({ id, handler }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', handler);
      }
    });
  }

  private setupSearchFunctionality(): void {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const searchBtn = document.getElementById('searchBtn');

    if (searchInput && searchBtn) {
      searchBtn.addEventListener('click', () => this.performSearch());
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.performSearch();
        }
      });

      // Add search suggestions
      searchInput.addEventListener('input', (e) => {
        this.showSearchSuggestions((e.target as HTMLInputElement).value);
      });
    }
  }

  private setupTemplateSelection(): void {
    const templateBtn = document.getElementById('templateBtn');
    if (templateBtn) {
      templateBtn.addEventListener('click', () => this.showTemplateModal());
    }
  }

  private loadSettings(): void {
    // Load user preferences and AI settings
    const user = authService.getCurrentUser();
    if (user) {
      // Apply user preferences
      this.applyUserPreferences(user.preferences);
    }
  }

  private applyUserPreferences(preferences: any): void {
    // Apply theme
    if (preferences.theme) {
      document.documentElement.setAttribute('data-theme', preferences.theme);
    }

    // Apply auto-save setting
    this.autoSaveEnabled = preferences.autoSave !== false;
  }

  private setupAutoSave(): void {
    // Auto-save will be triggered by diagram modifications
    // Implementation is in scheduleAutoSave method
  }

  private scheduleAutoSave(): void {
    if (!this.autoSaveEnabled || !this.currentMindMapId || !this.currentMindMap) {
      return;
    }

    // Debounce auto-save to avoid too frequent saves
    clearTimeout((this as any).autoSaveTimeout);
    (this as any).autoSaveTimeout = setTimeout(async () => {
      try {
        await this.autoSaveMindMap();
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000); // 2 second delay
  }

  private async autoSaveMindMap(): Promise<void> {
    if (!this.currentMindMapId || !this.currentMindMap) {
      return;
    }

    try {
      // Update the mind map data with current diagram state
      const updatedData = this.extractMindMapDataFromDiagram();
      await mindMapStorageService.updateMindMap(this.currentMindMapId, updatedData);
      
      // Show subtle auto-save indicator
      this.showAutoSaveIndicator();
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }

  private extractMindMapDataFromDiagram(): Partial<MindMapData> {
    if (!this.diagram || !this.currentMindMap) {
      return {};
    }

    const nodes = this.diagram.model.nodeDataArray.map((nodeData: any) => ({
      key: nodeData.key,
      text: nodeData.text,
      parent: nodeData.parent || null,
      color: nodeData.color,
      borderColor: nodeData.borderColor,
      textColor: nodeData.textColor,
      font: nodeData.font,
      level: nodeData.level,
      isTreeExpanded: nodeData.isTreeExpanded,
      metadata: {
        ...nodeData.metadata,
        modified: new Date().toISOString()
      }
    }));

    return {
      nodes,
      metadata: {
        ...this.currentMindMap.metadata,
        modified: new Date().toISOString(),
        version: this.currentMindMap.metadata.version + 1
      }
    };
  }

  private showAutoSaveIndicator(): void {
    const indicator = document.querySelector('.auto-save-indicator');
    if (indicator) {
      indicator.textContent = `Auto-saved at ${new Date().toLocaleTimeString()}`;
      indicator.classList.add('visible');
      
      setTimeout(() => {
        indicator.classList.remove('visible');
      }, 2000);
    }
  }

  // Event handlers
  private onNodeClick(e: any, node: any): void {
    const nodeData = node.data;
    this.showNodeDetails(nodeData);
  }

  private onNodeDoubleClick(e: any, node: any): void {
    // Enable inline editing or show edit modal
    this.editNode(node.data);
  }

  private onNodeHover(e: any, shape: any, isEntering: boolean): void {
    if (isEntering) {
      shape.stroke = "#2b6cb0";
      shape.strokeWidth = 3;
    } else {
      const nodeData = shape.part.data;
      shape.stroke = nodeData.borderColor || "#4299e1";
      shape.strokeWidth = 2;
    }
  }

  // Public methods for UI interactions
  public async handleSendMessage(): Promise<void> {
    const userInput = document.getElementById('userInput') as HTMLTextAreaElement;
    const message = userInput.value.trim();

    if (!message) return;

    const user = authService.getCurrentUser();
    if (!user) {
      this.showSignInPrompt();
      return;
    }

    // Add user message to chat
    this.addMessage(message, 'user');
    userInput.value = '';

    // Show loading
    this.showLoading(true);

    try {
      // Get AI provider settings
      const aiProvider = this.getAIProviderSettings();
      
      // Create generation request
      const request: GenerationRequest = {
        topic: message,
        provider: aiProvider,
        includeWebSearch: this.shouldIncludeWebSearch(),
        template: this.getSelectedTemplate()
      };

      // Generate mind map
      const mindMapData = await aiService.generateMindMap(request);
      
      // Save to cloud storage
      const mindMapId = await mindMapStorageService.saveMindMap(mindMapData);
      
      // Create the mind map visualization
      this.createMindMap(mindMapData);
      this.currentMindMap = { ...mindMapData, id: mindMapId };
      this.currentMindMapId = mindMapId;
      
      // Add AI response to chat
      this.addMessage('Mind map generated successfully! You can explore the topics by expanding/collapsing nodes.', 'bot');
      
      // Update search index
      const userMindMaps = await mindMapStorageService.getUserMindMaps(user.uid);
      searchService.updateSearchIndex(userMindMaps);
      
    } catch (error) {
      console.error('Error generating mind map:', error);
      this.showError('Sorry, there was an error generating the mind map. Please check your settings and try again.');
    } finally {
      this.showLoading(false);
    }
  }

  // Additional methods will be added in the next part...
  
  private getAIProviderSettings(): AIProvider {
    // Get from settings or use defaults
    return {
      name: 'openai',
      model: 'gpt-3.5-turbo',
      apiKey: localStorage.getItem('openai_api_key') || '',
      settings: {
        temperature: 0.8,
        maxTokens: 3500
      }
    };
  }

  private shouldIncludeWebSearch(): boolean {
    return localStorage.getItem('include_web_search') === 'true';
  }

  private getSelectedTemplate(): Template | undefined {
    const templateId = localStorage.getItem('selected_template');
    if (templateId) {
      // This would be loaded from template service
      return undefined; // Placeholder
    }
    return undefined;
  }

  private showSignInPrompt(): void {
    this.addMessage('Please sign in to create and save mind maps. Click the Sign In button in the top right corner.', 'bot');
  }

  private addMessage(message: string, type: 'user' | 'bot'): void {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}-message`;
    messageElement.innerHTML = `
      <div class="message-content">
        <strong>${type === 'user' ? 'You' : 'AI Assistant'}:</strong> ${message}
      </div>
    `;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  private showLoading(show: boolean): void {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.classList.toggle('hidden', !show);
    }
  }

  private createMindMap(data: MindMapData): void {
    if (!this.diagram) return;

    try {
      // Convert mind map data to GoJS format
      const nodeDataArray = data.nodes.map(node => ({
        key: node.key,
        text: node.text,
        parent: node.parent,
        color: node.color || this.getNodeColor(node.level || 0),
        borderColor: node.borderColor || this.getBorderColor(node.level || 0),
        textColor: node.textColor || '#ffffff',
        font: node.font || '14px "Segoe UI", sans-serif',
        level: node.level || 0,
        isTreeExpanded: node.isTreeExpanded !== false
      }));

      // Create the model
      this.diagram.model = new go.TreeModel(nodeDataArray);

      // Auto-layout and center
      this.diagram.layoutDiagram(true);
      this.zoomToFit();

      console.log('Mind map created with', nodeDataArray.length, 'nodes');
    } catch (error) {
      console.error('Error creating mind map:', error);
      this.showError('Failed to create mind map visualization');
    }
  }

  private getNodeColor(level: number): string {
    const colors = ['#667eea', '#48bb78', '#ed8936', '#9f7aea', '#38b2ac'];
    return colors[level % colors.length];
  }

  private getBorderColor(level: number): string {
    const colors = ['#4c51bf', '#38a169', '#dd6b20', '#805ad5', '#319795'];
    return colors[level % colors.length];
  }

  private showNodeDetails(nodeData: any): void {
    // Create or update node details sidebar
    let sidebar = document.querySelector('.node-details-sidebar') as HTMLElement;

    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.className = 'node-details-sidebar';
      document.body.appendChild(sidebar);
    }

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <h3>Node Details</h3>
        <button class="close-sidebar" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="sidebar-content">
        <div class="detail-group">
          <label>Text:</label>
          <p>${nodeData.text}</p>
        </div>
        <div class="detail-group">
          <label>Level:</label>
          <p>${nodeData.level || 0}</p>
        </div>
        <div class="detail-group">
          <label>Created:</label>
          <p>${nodeData.metadata?.created ? new Date(nodeData.metadata.created).toLocaleString() : 'Unknown'}</p>
        </div>
        <div class="detail-group">
          <label>Sources:</label>
          <div class="sources-list">
            ${nodeData.metadata?.sources?.map((source: string) =>
              `<a href="${source}" target="_blank" rel="noopener">${new URL(source).hostname}</a>`
            ).join('') || 'No sources'}
          </div>
        </div>
        <div class="detail-actions">
          <button onclick="mindMapGenerator.editNode('${nodeData.key}')">Edit</button>
          <button onclick="mindMapGenerator.addChildNode('${nodeData.key}')">Add Child</button>
        </div>
      </div>
    `;

    sidebar.classList.add('visible');
  }

  private editNode(nodeData: any): void {
    const newText = prompt('Edit node text:', nodeData.text);
    if (newText && newText !== nodeData.text) {
      // Update the diagram
      this.diagram.model.setDataProperty(nodeData, 'text', newText);

      // Update the current mind map data
      if (this.currentMindMap) {
        const node = this.currentMindMap.nodes.find(n => n.key === nodeData.key);
        if (node) {
          node.text = newText;
          node.metadata = {
            ...node.metadata,
            modified: new Date().toISOString()
          };
        }
      }
    }
  }

  public addChildNode(parentKey: string): void {
    const newText = prompt('Enter text for new node:');
    if (!newText) return;

    const newKey = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const parentNode = this.diagram.model.findNodeDataForKey(parentKey);
    const level = (parentNode?.level || 0) + 1;

    const newNodeData = {
      key: newKey,
      text: newText,
      parent: parentKey,
      color: this.getNodeColor(level),
      borderColor: this.getBorderColor(level),
      textColor: '#ffffff',
      font: '14px "Segoe UI", sans-serif',
      level: level,
      isTreeExpanded: true
    };

    this.diagram.model.addNodeData(newNodeData);

    // Update current mind map data
    if (this.currentMindMap) {
      this.currentMindMap.nodes.push({
        key: newKey,
        text: newText,
        parent: parentKey,
        level: level,
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      });
    }
  }

  private async performSearch(): Promise<void> {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const query = searchInput.value.trim();

    if (!query) return;

    try {
      const user = authService.getCurrentUser();
      if (!user) {
        this.showError('Please sign in to search mind maps');
        return;
      }

      // Track search
      analyticsService.trackSearchPerformed(query);

      const searchOptions = {
        query,
        caseSensitive: false,
        wholeWord: false,
        regex: false,
        scope: 'current' as const
      };

      const results = await searchService.search(searchOptions);
      this.displaySearchResults(results);

    } catch (error) {
      console.error('Search failed:', error);
      this.showError('Search failed. Please try again.');
    }
  }

  private displaySearchResults(results: any[]): void {
    // Create or update search results panel
    let resultsPanel = document.querySelector('.search-results-panel') as HTMLElement;

    if (!resultsPanel) {
      resultsPanel = document.createElement('div');
      resultsPanel.className = 'search-results-panel';
      document.body.appendChild(resultsPanel);
    }

    if (results.length === 0) {
      resultsPanel.innerHTML = `
        <div class="results-header">
          <h3>Search Results</h3>
          <button class="close-panel" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="no-results">No results found</div>
      `;
    } else {
      resultsPanel.innerHTML = `
        <div class="results-header">
          <h3>Search Results (${results.length})</h3>
          <button class="close-panel" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="results-list">
          ${results.map(result => `
            <div class="result-item" onclick="mindMapGenerator.selectSearchResult('${result.item.key || result.item.id}')">
              <div class="result-type">${result.type}</div>
              <div class="result-title">${result.item.title || result.item.text}</div>
              <div class="result-score">Score: ${(result.score * 100).toFixed(1)}%</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    resultsPanel.classList.add('visible');
  }

  public selectSearchResult(id: string): void {
    // Highlight the node in the diagram
    const nodeData = this.diagram.model.findNodeDataForKey(id);
    if (nodeData) {
      this.diagram.select(this.diagram.findNodeForKey(id));
      this.diagram.centerRect(this.diagram.findNodeForKey(id).actualBounds);
    }
  }

  private showSearchSuggestions(query: string): void {
    if (!query.trim()) return;

    const suggestions = searchService.getSuggestions(query);

    // Create or update suggestions dropdown
    let dropdown = document.querySelector('.search-suggestions') as HTMLElement;

    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'search-suggestions';
      const searchInput = document.getElementById('searchInput');
      searchInput?.parentElement?.appendChild(dropdown);
    }

    if (suggestions.length === 0) {
      dropdown.classList.remove('visible');
      return;
    }

    dropdown.innerHTML = suggestions.map(suggestion => `
      <div class="suggestion-item" onclick="mindMapGenerator.applySuggestion('${suggestion}')">
        ${suggestion}
      </div>
    `).join('');

    dropdown.classList.add('visible');
  }

  public applySuggestion(suggestion: string): void {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = suggestion;
      this.performSearch();
    }
  }

  private showTemplateModal(): void {
    // Template modal functionality would be implemented here
    console.log('Template modal would open here');
  }

  private applyTemplate(template: any): void {
    // Convert template to mind map format and apply
    console.log('Applying template:', template.name);
    analyticsService.trackTemplateUsed(template.id);
  }

  private showExportModal(): void {
    if (!this.currentMindMap) {
      this.showError('No mind map to export');
      return;
    }

    // Export modal functionality would be implemented here
    console.log('Export modal would open here');
  }

  private showSettingsModal(): void {
    // Settings modal functionality would be implemented here
    console.log('Settings modal would open here');
  }

  private showLoadModal(): void {
    // Load modal functionality would be implemented here
    console.log('Load modal would open here');
  }

  private loadMindMap(mindMap: MindMapData): void {
    this.currentMindMap = mindMap;
    this.currentMindMapId = mindMap.id || null;
    this.createMindMap(mindMap);

    // Track analytics
    if (mindMap.id) {
      analyticsService.trackMindMapOpened(mindMap.id);
    }
  }

  private showShareModal(): void {
    if (!this.currentMindMap) {
      this.showError('No mind map to share');
      return;
    }

    // Share modal functionality would be implemented here
    console.log('Share modal would open here');
  }

  private async saveMindMap(): Promise<void> {
    if (!this.currentMindMap) {
      this.showError('No mind map to save');
      return;
    }

    try {
      const updatedData = this.extractMindMapDataFromDiagram();

      if (this.currentMindMapId) {
        await mindMapStorageService.updateMindMap(this.currentMindMapId, updatedData);
        this.showSuccess('Mind map saved successfully');
      } else {
        const id = await mindMapStorageService.saveMindMap(this.currentMindMap);
        this.currentMindMapId = id;
        this.showSuccess('Mind map saved successfully');
      }
    } catch (error) {
      console.error('Save failed:', error);
      this.showError('Failed to save mind map');
    }
  }

  private zoomIn(): void {
    if (this.diagram) {
      this.diagram.commandHandler.increaseZoom();
    }
  }

  private zoomOut(): void {
    if (this.diagram) {
      this.diagram.commandHandler.decreaseZoom();
    }
  }

  private zoomToFit(): void {
    if (this.diagram) {
      this.diagram.zoomToFit();
    }
  }

  private autoOrganize(): void {
    if (this.diagram) {
      this.diagram.layoutDiagram(true);
    }
  }

  private centerDiagram(): void {
    if (this.diagram) {
      this.diagram.centerRect(this.diagram.documentBounds);
    }
  }

  private resetDiagram(): void {
    if (confirm('Are you sure you want to reset the mind map? This will clear all current work.')) {
      if (this.diagram) {
        this.diagram.model = new go.TreeModel([]);
        this.currentMindMap = null;
        this.currentMindMapId = null;

        // Clear chat messages
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
          chatMessages.innerHTML = '';
        }
      }
    }
  }

  private showSuccess(message: string): void {
    (window as any).app?.showSuccess(message);
  }

  private showError(message: string): void {
    (window as any).app?.showError(message);
  }
}
