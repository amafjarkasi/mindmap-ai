import { aiService } from '../services/aiService';
import { mindMapStorageService } from '../services/mindMapStorage';
import { exportService } from '../services/exportService';
import { searchService } from '../services/searchService';
import { templateService } from '../services/templateService';
import { authService } from '../services/auth';
import { analyticsService } from '../services/analyticsService';
import { collaborationService } from '../services/collaborationService';
import { ShareModal } from './ShareModal';
import type {
  MindMapData,
  MindMapNode,
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
  private shareModal: ShareModal;

  constructor() {
    this.shareModal = new ShareModal();
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
        // Basic layout configuration
        arrangement: go.TreeLayout.ArrangementVertical,
        angle: 0,
        compaction: go.TreeLayout.CompactionNone,
        sorting: go.TreeLayout.SortingAscending,

        // Spacing configuration for optimal node separation
        layerSpacing: 120,  // Distance between parent and child layers
        layerSpacingParentOverlap: 0.5,  // Reduced overlap between layers
        nodeSpacing: 50,  // Distance between sibling nodes

        // Port configuration for link connections
        setsPortSpot: false,
        setsChildPortSpot: false,

        // Advanced spacing properties (all valid GoJS TreeLayout properties)
        breadthLimit: 0,  // No limit on breadth (0 = unlimited)
        rowSpacing: 30   // Extra spacing between rows when breadthLimit is used
        // Note: columnSpacing is NOT a valid TreeLayout property and was removed
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
              margin: 16,  // Increased margin for better spacing
              font: "14px 'Segoe UI', sans-serif",
              stroke: "#2d3748",
              maxSize: new go.Size(280, NaN),  // Increased max width
              minSize: new go.Size(120, 40),   // Minimum size to prevent tiny nodes
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

    // Enhanced link template with better spacing
    this.diagram.linkTemplate =
      $(go.Link,
        {
          selectable: false,
          routing: go.Link.Orthogonal,
          corner: 15,  // Increased corner radius for smoother curves
          fromSpot: go.Spot.RightSide,
          toSpot: go.Spot.LeftSide,
          // Add some spacing from nodes
          fromEndSegmentLength: 20,
          toEndSegmentLength: 20
        },
        $(go.Shape,
          {
            stroke: "#90cdf4",
            strokeWidth: 2.5  // Slightly thicker for better visibility
          }),
        $(go.Shape,
          {
            toArrow: "Standard",
            fill: "#90cdf4",
            stroke: null,
            scale: 1.2  // Slightly larger arrow
          })
      );

    // Add diagram event listeners
    this.diagram.addDiagramListener("Modified", (e: any) => {
      if (this.autoSaveEnabled && this.currentMindMapId) {
        this.scheduleAutoSave();
      }
    });

    // Add layout completed listener to ensure proper spacing
    this.diagram.addDiagramListener("LayoutCompleted", (e: any) => {
      // Ensure nodes don't overlap after layout
      this.ensureNoOverlaps();
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
      const nodeDataArray = data.nodes.map(node => {
        const nodeData: any = {
          key: node.key,
          text: node.text,
          color: node.color || this.getNodeColor(node.level || 0),
          borderColor: node.borderColor || this.getBorderColor(node.level || 0),
          textColor: node.textColor || '#ffffff',
          font: node.font || '14px "Segoe UI", sans-serif',
          level: node.level || 0,
          isTreeExpanded: node.isTreeExpanded !== false
        };

        // Only set parent if it's not null/undefined (GoJS TreeModel requirement)
        if (node.parent != null) {
          nodeData.parent = node.parent;
        }

        return nodeData;
      });

      // Create the model
      this.diagram.model = new go.TreeModel(nodeDataArray);

      // Auto-layout with proper spacing
      this.diagram.layoutDiagram(true);

      // Allow layout to complete before centering
      setTimeout(() => {
        // Ensure root node is properly positioned
        this.positionRootNode();
        this.zoomToFit();
        this.centerDiagram();
      }, 100);

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

    // Apply layout with better spacing
    this.diagram.layoutDiagram(true);

    // Ensure proper spacing and centering
    setTimeout(() => {
      this.centerDiagram();
    }, 200);

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
    this.createTemplateModal();
  }

  private createTemplateModal(): void {
    // Remove existing modal if it exists
    const existingModal = document.getElementById('templateModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create template modal
    const modal = document.createElement('div');
    modal.id = 'templateModal';
    modal.className = 'template-modal hidden';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.closest('.template-modal').classList.add('hidden')">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h2>Choose a Template</h2>
            <button class="close-btn" onclick="this.closest('.template-modal').classList.add('hidden')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="template-grid">
              <div class="template-card" data-template="business">
                <div class="template-preview">📊</div>
                <h3>Business Strategy</h3>
                <p>Comprehensive business planning and strategy development</p>
              </div>
              <div class="template-card" data-template="project">
                <div class="template-preview">🚀</div>
                <h3>Project Planning</h3>
                <p>Project management and milestone tracking</p>
              </div>
              <div class="template-card" data-template="learning">
                <div class="template-preview">📚</div>
                <h3>Learning & Education</h3>
                <p>Educational content and knowledge mapping</p>
              </div>
              <div class="template-card" data-template="research">
                <div class="template-preview">🔬</div>
                <h3>Research & Analysis</h3>
                <p>Research methodology and data analysis</p>
              </div>
              <div class="template-card" data-template="creative">
                <div class="template-preview">🎨</div>
                <h3>Creative Process</h3>
                <p>Creative brainstorming and ideation</p>
              </div>
              <div class="template-card" data-template="personal">
                <div class="template-preview">👤</div>
                <h3>Personal Development</h3>
                <p>Goal setting and personal growth planning</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners for template selection
    const templateCards = modal.querySelectorAll('.template-card');
    templateCards.forEach(card => {
      card.addEventListener('click', () => {
        const templateType = card.getAttribute('data-template');
        this.applyTemplate(templateType);
        modal.classList.add('hidden');
      });
    });

    // Show modal
    modal.classList.remove('hidden');
  }

  private applyTemplate(templateType: string): void {
    const templates = {
      business: {
        name: 'Business Strategy',
        data: this.createTemplateData('Business Strategy', [
          {
            text: 'Market Analysis',
            children: [
              { text: 'Target Audience' },
              { text: 'Competitor Analysis' },
              { text: 'Market Size' }
            ]
          },
          {
            text: 'Product Strategy',
            children: [
              { text: 'Value Proposition' },
              { text: 'Features & Benefits' },
              { text: 'Pricing Strategy' }
            ]
          },
          {
            text: 'Operations',
            children: [
              { text: 'Supply Chain' },
              { text: 'Quality Control' },
              { text: 'Cost Management' }
            ]
          },
          {
            text: 'Financial Planning',
            children: [
              { text: 'Revenue Projections' },
              { text: 'Budget Allocation' },
              { text: 'ROI Analysis' }
            ]
          }
        ], 'business')
      },
      project: {
        name: 'Project Planning',
        data: this.createTemplateData('Project Planning', [
          {
            text: 'Project Scope',
            children: [
              { text: 'Objectives' },
              { text: 'Deliverables' },
              { text: 'Requirements' }
            ]
          },
          {
            text: 'Timeline',
            children: [
              { text: 'Milestones' },
              { text: 'Dependencies' },
              { text: 'Critical Path' }
            ]
          },
          {
            text: 'Resources',
            children: [
              { text: 'Team Members' },
              { text: 'Budget' },
              { text: 'Tools & Equipment' }
            ]
          },
          {
            text: 'Risk Management',
            children: [
              { text: 'Risk Assessment' },
              { text: 'Mitigation Strategies' },
              { text: 'Contingency Plans' }
            ]
          }
        ], 'project')
      },
      learning: {
        name: 'Learning & Education',
        data: this.createTemplateData('Learning Topic', [
          {
            text: 'Core Concepts',
            children: [
              { text: 'Fundamental Principles' },
              { text: 'Key Terminology' },
              { text: 'Basic Theory' }
            ]
          },
          {
            text: 'Practical Applications',
            children: [
              { text: 'Real-world Examples' },
              { text: 'Case Studies' },
              { text: 'Hands-on Practice' }
            ]
          },
          {
            text: 'Advanced Topics',
            children: [
              { text: 'Complex Scenarios' },
              { text: 'Expert Techniques' },
              { text: 'Latest Developments' }
            ]
          },
          {
            text: 'Assessment',
            children: [
              { text: 'Knowledge Check' },
              { text: 'Skill Evaluation' },
              { text: 'Progress Tracking' }
            ]
          }
        ], 'learning')
      },
      research: {
        name: 'Research & Analysis',
        data: this.createTemplateData('Research Project', [
          {
            text: 'Research Question',
            children: [
              { text: 'Problem Statement' },
              { text: 'Hypothesis' },
              { text: 'Objectives' }
            ]
          },
          {
            text: 'Methodology',
            children: [
              { text: 'Data Collection' },
              { text: 'Analysis Methods' },
              { text: 'Sample Size' }
            ]
          },
          {
            text: 'Literature Review',
            children: [
              { text: 'Previous Studies' },
              { text: 'Theoretical Framework' },
              { text: 'Knowledge Gaps' }
            ]
          },
          {
            text: 'Results & Conclusions',
            children: [
              { text: 'Findings' },
              { text: 'Implications' },
              { text: 'Future Research' }
            ]
          }
        ], 'research')
      },
      creative: {
        name: 'Creative Process',
        data: this.createTemplateData('Creative Project', [
          {
            text: 'Inspiration',
            children: [
              { text: 'Mood Board' },
              { text: 'References' },
              { text: 'Brainstorming' }
            ]
          },
          {
            text: 'Concept Development',
            children: [
              { text: 'Initial Ideas' },
              { text: 'Sketches' },
              { text: 'Refinement' }
            ]
          },
          {
            text: 'Execution',
            children: [
              { text: 'Tools & Materials' },
              { text: 'Techniques' },
              { text: 'Iterations' }
            ]
          },
          {
            text: 'Evaluation',
            children: [
              { text: 'Feedback' },
              { text: 'Improvements' },
              { text: 'Final Output' }
            ]
          }
        ], 'creative')
      },
      personal: {
        name: 'Personal Development',
        data: this.createTemplateData('Personal Growth', [
          {
            text: 'Self Assessment',
            children: [
              { text: 'Strengths' },
              { text: 'Areas for Improvement' },
              { text: 'Values & Priorities' }
            ]
          },
          {
            text: 'Goal Setting',
            children: [
              { text: 'Short-term Goals' },
              { text: 'Long-term Vision' },
              { text: 'Action Plans' }
            ]
          },
          {
            text: 'Skill Development',
            children: [
              { text: 'Learning Opportunities' },
              { text: 'Practice & Application' },
              { text: 'Mentorship' }
            ]
          },
          {
            text: 'Progress Tracking',
            children: [
              { text: 'Milestones' },
              { text: 'Regular Reviews' },
              { text: 'Adjustments' }
            ]
          }
        ], 'personal')
      }
    };

    const template = templates[templateType as keyof typeof templates];
    if (template) {
      this.createMindMap(template.data);
      this.addMessage(`Applied ${template.name} template successfully!`, 'bot');

      // Track template usage if analytics service is available
      if (typeof analyticsService !== 'undefined') {
        analyticsService.trackTemplateUsed(templateType);
      }
    }
  }

  private createTemplateData(title: string, hierarchicalData: any[], templateType: string): MindMapData {
    const nodes: MindMapNode[] = [];
    const now = new Date().toISOString();

    // Create root node
    const rootKey = 'root';
    nodes.push({
      key: rootKey,
      text: title,
      // Don't set parent for root node - GoJS TreeModel expects undefined for root nodes
      level: 0,
      color: this.getNodeColor(0),
      borderColor: this.getBorderColor(0),
      textColor: '#ffffff',
      metadata: {
        created: now,
        modified: now
      }
    });

    // Convert hierarchical data to flat node structure
    this.convertHierarchicalToNodes(hierarchicalData, nodes, rootKey, 1);

    return {
      title,
      description: `Template: ${title}`,
      nodes,
      metadata: {
        created: now,
        modified: now,
        author: '',
        version: 1,
        tags: ['template', templateType],
        isPublic: false
      }
    };
  }

  private convertHierarchicalToNodes(
    data: any[],
    nodes: MindMapNode[],
    parentKey: string,
    level: number
  ): void {
    data.forEach((item, index) => {
      const nodeKey = `${parentKey}_${level}_${index}`;

      nodes.push({
        key: nodeKey,
        text: item.text,
        parent: parentKey,
        level,
        color: this.getNodeColor(level),
        borderColor: this.getBorderColor(level),
        textColor: '#ffffff',
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      });

      if (item.children && item.children.length > 0) {
        this.convertHierarchicalToNodes(item.children, nodes, nodeKey, level + 1);
      }
    });
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
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('hidden');
      this.loadSettingsToModal();
      this.setupSettingsModalEventListeners();
    }
  }

  private loadSettingsToModal(): void {
    // Load API key
    const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
    if (apiKeyInput) {
      apiKeyInput.value = localStorage.getItem('openai_api_key') || '';
    }

    // Load selected model
    const selectedModel = localStorage.getItem('openai_model') || 'gpt-3.5-turbo';
    const modelRadio = document.querySelector(`input[name="modelSelect"][value="${selectedModel}"]`) as HTMLInputElement;
    if (modelRadio) {
      modelRadio.checked = true;
    }

    // Load temperature
    const temperatureSlider = document.getElementById('temperatureSlider') as HTMLInputElement;
    const tempValue = document.getElementById('tempValue');
    if (temperatureSlider && tempValue) {
      const temperature = localStorage.getItem('openai_temperature') || '0.8';
      temperatureSlider.value = temperature;
      tempValue.textContent = temperature;
    }

    // Load max tokens
    const maxTokensSlider = document.getElementById('maxTokensSlider') as HTMLInputElement;
    const tokensValue = document.getElementById('tokensValue');
    if (maxTokensSlider && tokensValue) {
      const maxTokens = localStorage.getItem('openai_max_tokens') || '3500';
      maxTokensSlider.value = maxTokens;
      tokensValue.textContent = maxTokens;
    }
  }

  private setupSettingsModalEventListeners(): void {
    // Close modal button
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeSettingsModal();
    }

    // Temperature slider
    const temperatureSlider = document.getElementById('temperatureSlider') as HTMLInputElement;
    const tempValue = document.getElementById('tempValue');
    if (temperatureSlider && tempValue) {
      temperatureSlider.oninput = () => {
        tempValue.textContent = temperatureSlider.value;
      };
    }

    // Max tokens slider
    const maxTokensSlider = document.getElementById('maxTokensSlider') as HTMLInputElement;
    const tokensValue = document.getElementById('tokensValue');
    if (maxTokensSlider && tokensValue) {
      maxTokensSlider.oninput = () => {
        tokensValue.textContent = maxTokensSlider.value;
      };
    }

    // Save settings button
    const saveBtn = document.getElementById('saveSettings');
    if (saveBtn) {
      saveBtn.onclick = () => this.saveSettings();
    }

    // Reset settings button
    const resetBtn = document.getElementById('resetSettings');
    if (resetBtn) {
      resetBtn.onclick = () => this.resetSettings();
    }

    // Close modal when clicking outside
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) {
          this.closeSettingsModal();
        }
      };
    }
  }

  private closeSettingsModal(): void {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  private saveSettings(): void {
    try {
      // Save API key
      const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
      if (apiKeyInput) {
        localStorage.setItem('openai_api_key', apiKeyInput.value);
      }

      // Save selected model
      const selectedModel = document.querySelector('input[name="modelSelect"]:checked') as HTMLInputElement;
      if (selectedModel) {
        localStorage.setItem('openai_model', selectedModel.value);
      }

      // Save temperature
      const temperatureSlider = document.getElementById('temperatureSlider') as HTMLInputElement;
      if (temperatureSlider) {
        localStorage.setItem('openai_temperature', temperatureSlider.value);
      }

      // Save max tokens
      const maxTokensSlider = document.getElementById('maxTokensSlider') as HTMLInputElement;
      if (maxTokensSlider) {
        localStorage.setItem('openai_max_tokens', maxTokensSlider.value);
      }

      this.closeSettingsModal();
      this.showSuccess('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Failed to save settings. Please try again.');
    }
  }

  private resetSettings(): void {
    // Reset to default values
    localStorage.removeItem('openai_api_key');
    localStorage.setItem('openai_model', 'gpt-3.5-turbo');
    localStorage.setItem('openai_temperature', '0.8');
    localStorage.setItem('openai_max_tokens', '3500');

    // Reload the modal with default values
    this.loadSettingsToModal();
    this.showSuccess('Settings reset to defaults!');
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

    this.shareModal.show(this.currentMindMap);
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
      // Apply layout with animation
      this.diagram.layoutDiagram(true);

      // Ensure proper spacing after layout
      this.diagram.commitTransaction("auto-organize");

      // Center the diagram after reorganizing
      setTimeout(() => {
        this.centerDiagram();
      }, 300);
    }
  }

  private centerDiagram(): void {
    if (this.diagram) {
      this.diagram.centerRect(this.diagram.documentBounds);
    }
  }

  private positionRootNode(): void {
    if (this.diagram) {
      // Find and position the root node optimally
      const rootNodes = this.diagram.findTreeRoots();
      rootNodes.each((rootNode: any) => {
        // Position root node at a good starting point
        rootNode.location = new go.Point(100, 100);
      });
    }
  }

  private ensureNoOverlaps(): void {
    if (!this.diagram) return;

    // Check for overlapping nodes and adjust if necessary
    const nodes = this.diagram.nodes;
    const nodeArray: any[] = [];

    nodes.each((node: any) => {
      nodeArray.push(node);
    });

    // Simple overlap detection and resolution
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const node1 = nodeArray[i];
        const node2 = nodeArray[j];

        if (this.nodesOverlap(node1, node2)) {
          // If nodes overlap, trigger a layout refresh
          this.diagram.layoutDiagram(false);
          break;
        }
      }
    }
  }

  private nodesOverlap(node1: any, node2: any): boolean {
    const bounds1 = node1.actualBounds;
    const bounds2 = node2.actualBounds;

    return bounds1.intersectsRect(bounds2);
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
