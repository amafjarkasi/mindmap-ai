// import Papa from 'papaparse';
import type { MindMapData, MindMapNode } from '../types';

interface ImportResult {
  success: boolean;
  mindMapData?: MindMapData;
  error?: string;
  warnings?: string[];
}

interface ExternalDataSource {
  type: 'csv' | 'json' | 'excel' | 'google-sheets' | 'notion' | 'airtable';
  name: string;
  description: string;
  requiresAuth: boolean;
}

interface DataMapping {
  sourceField: string;
  targetField: 'text' | 'parent' | 'level' | 'metadata';
  transform?: (value: any) => any;
}

class DataIntegrationService {
  private supportedSources: ExternalDataSource[] = [
    {
      type: 'csv',
      name: 'CSV File',
      description: 'Import structured data from CSV files',
      requiresAuth: false
    },
    {
      type: 'json',
      name: 'JSON File',
      description: 'Import mind map data from JSON files',
      requiresAuth: false
    },
    {
      type: 'google-sheets',
      name: 'Google Sheets',
      description: 'Import data directly from Google Sheets',
      requiresAuth: true
    },
    {
      type: 'notion',
      name: 'Notion Database',
      description: 'Import structured data from Notion databases',
      requiresAuth: true
    },
    {
      type: 'airtable',
      name: 'Airtable Base',
      description: 'Import data from Airtable bases',
      requiresAuth: true
    }
  ];

  getSupportedSources(): ExternalDataSource[] {
    return this.supportedSources;
  }

  async importFromFile(file: File, mapping?: DataMapping[]): Promise<ImportResult> {
    try {
      const fileType = this.detectFileType(file);
      
      switch (fileType) {
        case 'csv':
          return await this.importFromCSV(file, mapping);
        case 'json':
          return await this.importFromJSON(file);
        case 'excel':
          return await this.importFromExcel(file, mapping);
        default:
          return {
            success: false,
            error: `Unsupported file type: ${fileType}`
          };
      }
    } catch (error) {
      console.error('Import error:', error);
      return {
        success: false,
        error: `Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private detectFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'csv':
        return 'csv';
      case 'json':
        return 'json';
      case 'xlsx':
      case 'xls':
        return 'excel';
      default:
        return 'unknown';
    }
  }

  private async importFromCSV(file: File, mapping?: DataMapping[]): Promise<ImportResult> {
    // Simple CSV parsing without Papa Parse
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        return {
          success: false,
          error: 'CSV file is empty'
        };
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      // Parse data rows
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      const mindMapData = this.convertCSVToMindMap(data, mapping);
      return {
        success: true,
        mindMapData,
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async importFromJSON(file: File): Promise<ImportResult> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Check if it's already a mind map format
      if (this.isValidMindMapFormat(data)) {
        return {
          success: true,
          mindMapData: data as MindMapData
        };
      }
      
      // Try to convert generic JSON to mind map
      const mindMapData = this.convertJSONToMindMap(data, file.name);
      return {
        success: true,
        mindMapData
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async importFromExcel(file: File, mapping?: DataMapping[]): Promise<ImportResult> {
    // This would require a library like SheetJS
    // For now, return a placeholder implementation
    return {
      success: false,
      error: 'Excel import not yet implemented. Please convert to CSV format.'
    };
  }

  private convertCSVToMindMap(data: any[], mapping?: DataMapping[]): MindMapData {
    const nodes: MindMapNode[] = [];
    const warnings: string[] = [];

    // Default mapping if none provided
    const defaultMapping: DataMapping[] = [
      { sourceField: 'title', targetField: 'text' },
      { sourceField: 'parent', targetField: 'parent' },
      { sourceField: 'level', targetField: 'level', transform: (val) => parseInt(val) || 0 }
    ];

    const activeMapping = mapping || defaultMapping;

    data.forEach((row, index) => {
      try {
        const node: MindMapNode = {
          key: `imported_${index}`,
          text: '',
          metadata: {
            created: new Date().toISOString(),
            modified: new Date().toISOString()
          }
        };

        // Apply mapping
        activeMapping.forEach(map => {
          const sourceValue = row[map.sourceField];
          if (sourceValue !== undefined && sourceValue !== '') {
            const transformedValue = map.transform ? map.transform(sourceValue) : sourceValue;
            
            switch (map.targetField) {
              case 'text':
                node.text = String(transformedValue);
                break;
              case 'parent':
                node.parent = String(transformedValue);
                break;
              case 'level':
                node.level = Number(transformedValue);
                break;
              case 'metadata':
                if (!node.metadata) node.metadata = { created: '', modified: '' };
                Object.assign(node.metadata, transformedValue);
                break;
            }
          }
        });

        // Validate required fields
        if (!node.text) {
          warnings.push(`Row ${index + 1}: Missing text field`);
          return;
        }

        nodes.push(node);
      } catch (error) {
        warnings.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Processing error'}`);
      }
    });

    // Create hierarchical structure if no parent relationships exist
    if (!nodes.some(node => node.parent)) {
      this.createHierarchyFromLevels(nodes);
    }

    const now = new Date().toISOString();
    return {
      title: 'Imported Mind Map',
      description: `Imported from CSV with ${nodes.length} nodes`,
      nodes,
      metadata: {
        created: now,
        modified: now,
        author: '',
        version: 1,
        tags: ['imported', 'csv'],
        isPublic: false
      }
    };
  }

  private convertJSONToMindMap(data: any, filename: string): MindMapData {
    const nodes: MindMapNode[] = [];
    
    if (Array.isArray(data)) {
      // Handle array of objects
      data.forEach((item, index) => {
        const node = this.createNodeFromObject(item, `item_${index}`);
        nodes.push(node);
      });
    } else if (typeof data === 'object') {
      // Handle single object - create hierarchy from nested structure
      this.createNodesFromNestedObject(data, nodes);
    }

    const now = new Date().toISOString();
    return {
      title: filename.replace(/\.[^/.]+$/, ''),
      description: `Imported from JSON with ${nodes.length} nodes`,
      nodes,
      metadata: {
        created: now,
        modified: now,
        author: '',
        version: 1,
        tags: ['imported', 'json'],
        isPublic: false
      }
    };
  }

  private createNodeFromObject(obj: any, key: string): MindMapNode {
    const text = obj.title || obj.name || obj.text || String(obj);
    
    return {
      key,
      text,
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        ...obj.metadata
      }
    };
  }

  private createNodesFromNestedObject(
    obj: any, 
    nodes: MindMapNode[], 
    parentKey?: string, 
    level: number = 0
  ): void {
    Object.entries(obj).forEach(([key, value], index) => {
      const nodeKey = parentKey ? `${parentKey}_${key}` : key;
      
      const node: MindMapNode = {
        key: nodeKey,
        text: key,
        parent: parentKey || null,
        level,
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      };

      nodes.push(node);

      // If value is an object, create child nodes
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.createNodesFromNestedObject(value, nodes, nodeKey, level + 1);
      } else if (Array.isArray(value)) {
        // Handle arrays
        value.forEach((item, arrayIndex) => {
          const arrayKey = `${nodeKey}_${arrayIndex}`;
          if (typeof item === 'object') {
            this.createNodesFromNestedObject(item, nodes, arrayKey, level + 1);
          } else {
            nodes.push({
              key: arrayKey,
              text: String(item),
              parent: nodeKey,
              level: level + 1,
              metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString()
              }
            });
          }
        });
      } else {
        // Add value as child node if it's not empty
        if (value !== null && value !== undefined && value !== '') {
          nodes.push({
            key: `${nodeKey}_value`,
            text: String(value),
            parent: nodeKey,
            level: level + 1,
            metadata: {
              created: new Date().toISOString(),
              modified: new Date().toISOString()
            }
          });
        }
      }
    });
  }

  private createHierarchyFromLevels(nodes: MindMapNode[]): void {
    // Sort by level
    nodes.sort((a, b) => (a.level || 0) - (b.level || 0));

    // Create parent-child relationships based on levels
    for (let i = 0; i < nodes.length; i++) {
      const currentNode = nodes[i];
      const currentLevel = currentNode.level || 0;

      if (currentLevel > 0) {
        // Find the most recent node at the previous level
        for (let j = i - 1; j >= 0; j--) {
          const potentialParent = nodes[j];
          const parentLevel = potentialParent.level || 0;

          if (parentLevel === currentLevel - 1) {
            currentNode.parent = potentialParent.key;
            break;
          }
        }
      }
    }
  }

  private isValidMindMapFormat(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.nodes &&
      Array.isArray(data.nodes) &&
      data.metadata &&
      typeof data.metadata === 'object'
    );
  }

  async exportToFormat(mindMapData: MindMapData, format: 'csv' | 'json'): Promise<Blob> {
    switch (format) {
      case 'csv':
        return this.exportToCSV(mindMapData);
      case 'json':
        return this.exportToJSON(mindMapData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCSV(mindMapData: MindMapData): Blob {
    const csvData = mindMapData.nodes.map(node => ({
      key: node.key,
      text: node.text,
      parent: node.parent || '',
      level: node.level || 0,
      color: node.color || '',
      created: node.metadata?.created || '',
      modified: node.metadata?.modified || ''
    }));

    // Simple CSV generation
    const headers = Object.keys(csvData[0] || {});
    const csvLines = [
      headers.join(','),
      ...csvData.map(row =>
        headers.map(header => `"${(row as any)[header] || ''}"`).join(',')
      )
    ];

    const csv = csvLines.join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }

  private exportToJSON(mindMapData: MindMapData): Blob {
    const jsonString = JSON.stringify(mindMapData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  // Google Sheets integration (placeholder)
  async importFromGoogleSheets(sheetId: string, range?: string): Promise<ImportResult> {
    // This would require Google Sheets API integration
    return {
      success: false,
      error: 'Google Sheets integration not yet implemented'
    };
  }

  // Notion integration (placeholder)
  async importFromNotion(databaseId: string): Promise<ImportResult> {
    // This would require Notion API integration
    return {
      success: false,
      error: 'Notion integration not yet implemented'
    };
  }

  // Airtable integration (placeholder)
  async importFromAirtable(baseId: string, tableId: string): Promise<ImportResult> {
    // This would require Airtable API integration
    return {
      success: false,
      error: 'Airtable integration not yet implemented'
    };
  }

  validateImportData(data: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { isValid: false, errors };
    }

    if (data.length === 0) {
      errors.push('Data array is empty');
      return { isValid: false, errors };
    }

    // Check for required fields
    data.forEach((row, index) => {
      if (!row.text && !row.title && !row.name) {
        errors.push(`Row ${index + 1}: Missing text/title/name field`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  generateMappingSuggestions(sampleData: any): DataMapping[] {
    const suggestions: DataMapping[] = [];
    
    if (!sampleData || typeof sampleData !== 'object') {
      return suggestions;
    }

    const fields = Object.keys(sampleData);

    // Suggest text field mapping
    const textFields = ['title', 'name', 'text', 'label', 'description'];
    const textField = fields.find(field => 
      textFields.some(tf => field.toLowerCase().includes(tf))
    );
    if (textField) {
      suggestions.push({ sourceField: textField, targetField: 'text' });
    }

    // Suggest parent field mapping
    const parentFields = ['parent', 'parent_id', 'parentId'];
    const parentField = fields.find(field => 
      parentFields.some(pf => field.toLowerCase().includes(pf))
    );
    if (parentField) {
      suggestions.push({ sourceField: parentField, targetField: 'parent' });
    }

    // Suggest level field mapping
    const levelFields = ['level', 'depth', 'tier'];
    const levelField = fields.find(field => 
      levelFields.some(lf => field.toLowerCase().includes(lf))
    );
    if (levelField) {
      suggestions.push({ 
        sourceField: levelField, 
        targetField: 'level',
        transform: (val) => parseInt(val) || 0
      });
    }

    return suggestions;
  }
}

export const dataIntegrationService = new DataIntegrationService();
export default dataIntegrationService;
