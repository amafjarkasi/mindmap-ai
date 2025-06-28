class MindMapGenerator {
    constructor() {
        this.diagram = null;
        this.apiKey = localStorage.getItem('openai_api_key') || '';
        this.settings = {
            model: localStorage.getItem('openai_model') || 'gpt-3.5-turbo',
            temperature: parseFloat(localStorage.getItem('openai_temperature')) || 0.8,
            maxTokens: parseInt(localStorage.getItem('openai_max_tokens')) || 3500
        };
        this.init();
    }

    init() {
        this.setupDiagram();
        this.setupEventListeners();
        this.loadApiKey();
        this.loadSettings();
    }

    setupDiagram() {
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
            "animationManager.isEnabled": false,
            "toolManager.hoverDelay": 100,
            allowCopy: false,
            allowDelete: false,
            allowMove: true,
            allowSelect: true,
            hasHorizontalScrollbar: true,
            hasVerticalScrollbar: true,
            "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom
        });

        // Define the node template
        this.diagram.nodeTemplate =
            $(go.Node, "Auto",
                {
                    selectable: true,
                    isTreeExpanded: true,
                    locationSpot: go.Spot.Center
                },
                new go.Binding("isTreeExpanded"),
                // Define the main shape and text
                $(go.Shape, "RoundedRectangle",
                    {
                        fill: "white",
                        stroke: "#4299e1",
                        strokeWidth: 2,
                        portId: "",
                        fromLinkable: true,
                        toLinkable: true,
                        cursor: "pointer"
                    },
                    new go.Binding("fill", "color"),
                    new go.Binding("stroke", "borderColor")),
                $(go.Panel, "Table",
                    $(go.TextBlock,
                        {
                            margin: 12,
                            font: "14px sans-serif",
                            stroke: "#2d3748",
                            maxSize: new go.Size(200, NaN),
                            wrap: go.TextBlock.WrapFit,
                            editable: false,
                            textAlign: "center"
                        },
                        new go.Binding("text", "text"),
                        new go.Binding("font", "font"),
                        new go.Binding("stroke", "textColor"))
                ),
                // Add expand/collapse button for nodes with children
                $("TreeExpanderButton",
                    {
                        width: 20,
                        height: 20,
                        alignment: go.Spot.TopRight,
                        alignmentFocus: go.Spot.Center,
                        "ButtonBorder.fill": "white",
                        "ButtonBorder.stroke": "#4299e1",
                        "_buttonFillOver": "#e3f2fd",
                        "_buttonStrokeOver": "#1976d2"
                    })
            );

        // Define the link template
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
                        scale: 0.8
                    })
            );

        // Set root visual properties
        this.diagram.findTreeRoots().each(root => {
            root.location = new go.Point(0, 0);
        });
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendBtn');
        const userInput = document.getElementById('userInput');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const exportBtn = document.getElementById('exportBtn');
        const resetBtn = document.getElementById('resetBtn');
        const centerBtn = document.getElementById('centerBtn');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomFitBtn = document.getElementById('zoomFitBtn');
        const autoOrganizeBtn = document.getElementById('autoOrganizeBtn');

        // Settings modal
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeModal = document.getElementById('closeModal');
        const saveSettings = document.getElementById('saveSettings');
        const resetSettings = document.getElementById('resetSettings');

        sendBtn.addEventListener('click', () => this.handleSendMessage());
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        if (apiKeyInput) {
            apiKeyInput.addEventListener('change', () => this.saveApiKey());
        }
        exportBtn.addEventListener('click', () => this.exportImage());
        resetBtn.addEventListener('click', () => this.resetDiagram());
        centerBtn.addEventListener('click', () => this.centerDiagram());
        
        // Zoom and layout controls
        zoomInBtn.addEventListener('click', () => this.zoomIn());
        zoomOutBtn.addEventListener('click', () => this.zoomOut());
        zoomFitBtn.addEventListener('click', () => this.zoomToFit());
        autoOrganizeBtn.addEventListener('click', () => this.autoOrganize());

        // Modal event listeners
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettingsModal());
        }
        
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeSettingsModal());
        }
        
        if (saveSettings) {
            saveSettings.addEventListener('click', () => this.saveSettingsFromModal());
        }
        
        if (resetSettings) {
            resetSettings.addEventListener('click', () => this.resetSettingsToDefaults());
        }

        // Close modal when clicking outside
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.closeSettingsModal();
                }
            });
        }

        // Close modal with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettingsModal();
            }
        });

        // Setup table sorting
        this.setupTableSorting();

        // Setup sliders
        this.setupSliders();
    }

    loadApiKey() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        if (this.apiKey) {
            apiKeyInput.value = this.apiKey;
        }
    }

    saveApiKey() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        this.apiKey = apiKeyInput.value.trim();
        localStorage.setItem('openai_api_key', this.apiKey);
    }

    async handleSendMessage() {
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();

        if (!message) return;

        if (!this.apiKey) {
            this.showError('Please enter your OpenAI API key first.');
            return;
        }

        // Add user message to chat
        this.addMessage(message, 'user');
        userInput.value = '';

        // Show loading
        this.showLoading(true);

        try {
            // Generate mind map data using AI
            const mindMapData = await this.generateMindMap(message);
            
            // Create the mind map
            this.createMindMap(mindMapData);
            
            // Add AI response to chat
            this.addMessage('Mind map generated successfully! You can explore the topics by expanding/collapsing nodes.', 'bot');
            
        } catch (error) {
            console.error('Error generating mind map:', error);
            this.showError('Sorry, there was an error generating the mind map. Please check your API key and try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async generateMindMap(topic) {
        const prompt = `As an expert researcher and knowledge architect, create a comprehensive, multi-dimensional mind map for: "${topic}"

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
        - Consider multiple perspectives and schools of thought

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

        COLOR HIERARCHY:
        - Root (Level 0): color="#667eea", borderColor="#4c51bf", font="bold 16px Arial"
        - Major Categories (Level 1): color="#48bb78", borderColor="#38a169", font="bold 14px Arial"  
        - Sub-categories (Level 2): color="#ed8936", borderColor="#dd6b20", font="13px Arial"
        - Specific Topics (Level 3): color="#9f7aea", borderColor="#805ad5", font="12px Arial"
        - Details (Level 4+): color="#e53e3e", borderColor="#c53030", font="11px Arial"

        CREATIVITY GUIDELINES:
        - Be intellectually curious and explore unexpected connections
        - Include emerging trends and disruptive innovations
        - Add philosophical and ethical considerations
        - Consider global perspectives and cultural variations
        - Include measurement frameworks and success metrics
        - Add risk factors, challenges, and mitigation strategies
        - Consider scalability, sustainability, and long-term implications

        Return ONLY the JSON object with no additional text, markdown, or explanations.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.settings.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a world-class researcher and knowledge architect. Create sophisticated, interconnected mind maps with deep insights and creative connections. Think like a subject matter expert with years of experience in the field.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: this.settings.temperature,
                max_tokens: this.settings.maxTokens
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            // Handle markdown code blocks if present
            let jsonContent = content.trim();
            
            // Remove markdown code block markers if present
            if (jsonContent.startsWith('```json')) {
                jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonContent.startsWith('```')) {
                jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            return JSON.parse(jsonContent);
        } catch (e) {
            console.error('Failed to parse JSON response:', content);
            throw new Error('Invalid response format from AI');
        }
    }

    createMindMap(data) {
        if (!data || !data.nodes || !Array.isArray(data.nodes)) {
            throw new Error('Invalid mind map data structure');
        }

        // Hide the placeholder
        const placeholder = document.querySelector('.mindmap-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Transform the data for GoJS
        const nodeDataArray = data.nodes.map(node => {
            const nodeData = {
                key: node.key,
                text: node.text,
                color: node.color || "#f7fafc",
                borderColor: node.borderColor || "#4299e1",
                textColor: node.textColor || "#2d3748",
                font: node.font || "14px sans-serif"
            };
            
            // Only add parent property if it's not null (root nodes should not have parent property)
            if (node.parent !== null && node.parent !== undefined) {
                nodeData.parent = node.parent;
            }
            
            return nodeData;
        });

        // Set the model data
        this.diagram.model = new go.TreeModel(nodeDataArray);

        // Auto-layout and fit to screen
        setTimeout(() => {
            this.diagram.layoutDiagram(true);
            this.centerDiagram();
        }, 100);
    }

    addMessage(text, type) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (type === 'bot') {
            contentDiv.innerHTML = `<strong>AI Assistant:</strong> ${text}`;
        } else {
            contentDiv.textContent = text;
        }
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const sendBtn = document.getElementById('sendBtn');
        
        if (show) {
            loadingOverlay.classList.remove('hidden');
            sendBtn.disabled = true;
        } else {
            loadingOverlay.classList.add('hidden');
            sendBtn.disabled = false;
        }
    }

    showError(message) {
        this.addMessage(message, 'bot');
    }

    exportImage() {
        if (!this.diagram.model || this.diagram.model.nodeDataArray.length === 0) {
            this.showError('No mind map to export. Please generate a mind map first.');
            return;
        }

        const blob = this.diagram.makeImageData({
            background: "white",
            returnType: "blob",
            type: "image/png"
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.addMessage('Mind map exported as PNG image!', 'bot');
    }

    resetDiagram() {
        this.diagram.model = new go.TreeModel([]);
        
        // Show the placeholder again
        const placeholder = document.querySelector('.mindmap-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
        
        this.addMessage('Mind map cleared. You can now create a new one!', 'bot');
    }

    centerDiagram() {
        if (this.diagram.model && this.diagram.model.nodeDataArray.length > 0) {
            this.diagram.zoomToFit();
        }
    }

    // Settings Modal Methods
    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('hidden');
        this.loadSettingsToModal();
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('hidden');
    }

    loadSettings() {
        // Load from localStorage or use defaults
        this.settings = {
            model: localStorage.getItem('openai_model') || 'gpt-3.5-turbo',
            temperature: parseFloat(localStorage.getItem('openai_temperature')) || 0.8,
            maxTokens: parseInt(localStorage.getItem('openai_max_tokens')) || 3500
        };
    }

    loadSettingsToModal() {
        // Set selected model
        const modelRadios = document.querySelectorAll('input[name="modelSelect"]');
        modelRadios.forEach(radio => {
            radio.checked = radio.value === this.settings.model;
        });

        // Set sliders
        const tempSlider = document.getElementById('temperatureSlider');
        const tokensSlider = document.getElementById('maxTokensSlider');
        const tempValue = document.getElementById('tempValue');
        const tokensValue = document.getElementById('tokensValue');

        if (tempSlider) {
            tempSlider.value = this.settings.temperature;
            tempValue.textContent = this.settings.temperature;
        }

        if (tokensSlider) {
            tokensSlider.value = this.settings.maxTokens;
            tokensValue.textContent = this.settings.maxTokens;
        }
    }

    saveSettingsFromModal() {
        // Get selected model
        const selectedModel = document.querySelector('input[name="modelSelect"]:checked');
        if (selectedModel) {
            this.settings.model = selectedModel.value;
        }

        // Get slider values
        const tempSlider = document.getElementById('temperatureSlider');
        const tokensSlider = document.getElementById('maxTokensSlider');

        if (tempSlider) {
            this.settings.temperature = parseFloat(tempSlider.value);
        }

        if (tokensSlider) {
            this.settings.maxTokens = parseInt(tokensSlider.value);
        }

        // Save to localStorage
        localStorage.setItem('openai_model', this.settings.model);
        localStorage.setItem('openai_temperature', this.settings.temperature);
        localStorage.setItem('openai_max_tokens', this.settings.maxTokens);

        this.closeSettingsModal();
        this.addMessage(`Settings saved! Using ${this.settings.model} with creativity level ${this.settings.temperature} and ${this.settings.maxTokens} tokens.`, 'bot');
    }

    resetSettingsToDefaults() {
        this.settings = {
            model: 'gpt-3.5-turbo',
            temperature: 0.8,
            maxTokens: 3500
        };

        this.loadSettingsToModal();
    }

    setupTableSorting() {
        const table = document.getElementById('modelTable');
        if (!table) return;

        const headers = table.querySelectorAll('th.sortable');
        
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.sortTable(table, column, header);
            });
        });
    }

    sortTable(table, column, header) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // Determine sort direction
        const currentSort = header.classList.contains('sort-asc') ? 'asc' : 
                           header.classList.contains('sort-desc') ? 'desc' : null;
        
        let newSort = currentSort === 'asc' ? 'desc' : 'asc';
        
        // Clear all sort classes
        table.querySelectorAll('th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Add sort class to current header
        header.classList.add(`sort-${newSort}`);
        
        // Sort rows
        rows.sort((a, b) => {
            let aVal, bVal;
            
            if (column === 'select') return 0; // Don't sort select column
            
            const aCell = a.querySelector(`td:nth-child(${this.getColumnIndex(column)})`);
            const bCell = b.querySelector(`td:nth-child(${this.getColumnIndex(column)})`);
            
            if (aCell.dataset.sort && bCell.dataset.sort) {
                aVal = parseInt(aCell.dataset.sort);
                bVal = parseInt(bCell.dataset.sort);
            } else {
                aVal = aCell.textContent.trim();
                bVal = bCell.textContent.trim();
            }
            
            if (aVal < bVal) return newSort === 'asc' ? -1 : 1;
            if (aVal > bVal) return newSort === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Re-append sorted rows
        rows.forEach(row => tbody.appendChild(row));
    }

    getColumnIndex(column) {
        const columnMap = {
            'select': 1,
            'model': 2,
            'speed': 3,
            'cost': 4,
            'context': 5,
            'capability': 6,
            'bestFor': 7
        };
        return columnMap[column] || 1;
    }

    setupSliders() {
        const tempSlider = document.getElementById('temperatureSlider');
        const tokensSlider = document.getElementById('maxTokensSlider');
        const tempValue = document.getElementById('tempValue');
        const tokensValue = document.getElementById('tokensValue');

        if (tempSlider && tempValue) {
            tempSlider.addEventListener('input', (e) => {
                tempValue.textContent = e.target.value;
            });
        }

        if (tokensSlider && tokensValue) {
            tokensSlider.addEventListener('input', (e) => {
                tokensValue.textContent = e.target.value;
            });
        }
    }

    // Zoom and Layout Control Methods
    zoomIn() {
        if (!this.diagram) return;
        
        const currentScale = this.diagram.scale;
        const newScale = Math.min(currentScale * 1.2, 3.0); // Max zoom 300%
        this.diagram.scale = newScale;
        
        this.addMessage(`Zoomed in to ${Math.round(newScale * 100)}%`, 'bot');
    }

    zoomOut() {
        if (!this.diagram) return;
        
        const currentScale = this.diagram.scale;
        const newScale = Math.max(currentScale / 1.2, 0.1); // Min zoom 10%
        this.diagram.scale = newScale;
        
        this.addMessage(`Zoomed out to ${Math.round(newScale * 100)}%`, 'bot');
    }

    zoomToFit() {
        if (!this.diagram || !this.diagram.model || this.diagram.model.nodeDataArray.length === 0) {
            this.addMessage('No mind map to fit. Please generate a mind map first.', 'bot');
            return;
        }
        
        this.diagram.zoomToFit();
        const currentScale = this.diagram.scale;
        this.addMessage(`Zoomed to fit window at ${Math.round(currentScale * 100)}%`, 'bot');
    }

    autoOrganize() {
        if (!this.diagram || !this.diagram.model || this.diagram.model.nodeDataArray.length === 0) {
            this.addMessage('No mind map to organize. Please generate a mind map first.', 'bot');
            return;
        }

        // Show loading for auto-organize
        this.addMessage('Auto-organizing mind map layout...', 'bot');
        
        // Store current layout settings
        const currentLayout = this.diagram.layout;
        
        // Apply optimized layout settings for better organization
        const $ = go.GraphObject.make;
        
        // Create different layout options and find the best fit
        const layoutOptions = [
            // Vertical Tree Layout (current)
            $(go.TreeLayout, {
                arrangement: go.TreeLayout.ArrangementVertical,
                angle: 0,
                compaction: go.TreeLayout.CompactionNone,
                layerSpacing: 100,
                nodeSpacing: 30,
                sorting: go.TreeLayout.SortingAscending
            }),
            // Horizontal Tree Layout
            $(go.TreeLayout, {
                arrangement: go.TreeLayout.ArrangementHorizontal,
                angle: 90,
                compaction: go.TreeLayout.CompactionNone,
                layerSpacing: 120,
                nodeSpacing: 25,
                sorting: go.TreeLayout.SortingAscending
            }),
            // Radial Layout
            $(go.TreeLayout, {
                arrangement: go.TreeLayout.ArrangementFixedRoots,
                angle: 0,
                compaction: go.TreeLayout.CompactionNone,
                layerSpacing: 80,
                nodeSpacing: 40,
                sorting: go.TreeLayout.SortingAscending
            })
        ];

        // Get diagram dimensions
        const containerRect = this.diagram.div.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // Choose layout based on aspect ratio and node count
        const nodeCount = this.diagram.model.nodeDataArray.length;
        let selectedLayout;
        
        if (containerWidth > containerHeight * 1.5 && nodeCount > 15) {
            // Wide container with many nodes - use horizontal layout
            selectedLayout = layoutOptions[1];
            this.addMessage('Applied horizontal layout for wide display', 'bot');
        } else if (nodeCount > 25) {
            // Many nodes - use radial layout
            selectedLayout = layoutOptions[2];
            this.addMessage('Applied radial layout for complex structure', 'bot');
        } else {
            // Default vertical layout with optimized spacing
            selectedLayout = layoutOptions[0];
            this.addMessage('Applied optimized vertical layout', 'bot');
        }

        // Apply the selected layout
        this.diagram.layout = selectedLayout;
        
        // Perform layout animation
        this.diagram.animationManager.isEnabled = true;
        this.diagram.layoutDiagram(true);
        
        // Auto-fit after layout
        setTimeout(() => {
            this.diagram.zoomToFit();
            this.diagram.animationManager.isEnabled = false;
            
            const finalScale = this.diagram.scale;
            this.addMessage(`Layout optimized and fitted to ${Math.round(finalScale * 100)}% zoom`, 'bot');
        }, 500);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MindMapGenerator();
});
