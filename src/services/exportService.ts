import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ExportOptions, MindMapData, ExportFormat } from '@types/index';

class ExportService {
  async exportMindMap(
    mindMapData: MindMapData, 
    diagramElement: HTMLElement, 
    options: ExportOptions
  ): Promise<void> {
    try {
      switch (options.format) {
        case 'png':
          await this.exportToPNG(diagramElement, mindMapData.title, options);
          break;
        case 'pdf':
          await this.exportToPDF(diagramElement, mindMapData, options);
          break;
        case 'svg':
          await this.exportToSVG(diagramElement, mindMapData.title, options);
          break;
        case 'json':
          this.exportToJSON(mindMapData, options);
          break;
        case 'markdown':
          this.exportToMarkdown(mindMapData, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Failed to export as ${options.format.toUpperCase()}. Please try again.`);
    }
  }

  private async exportToPNG(
    element: HTMLElement, 
    filename: string, 
    options: ExportOptions
  ): Promise<void> {
    const canvas = await html2canvas(element, {
      backgroundColor: options.customStyling?.backgroundColor || '#ffffff',
      scale: options.quality || 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });

    const link = document.createElement('a');
    link.download = `${this.sanitizeFilename(filename)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  private async exportToPDF(
    element: HTMLElement, 
    mindMapData: MindMapData, 
    options: ExportOptions
  ): Promise<void> {
    const canvas = await html2canvas(element, {
      backgroundColor: options.customStyling?.backgroundColor || '#ffffff',
      scale: options.quality || 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Calculate dimensions to fit the page
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margins = options.customStyling?.margins || { top: 10, right: 10, bottom: 10, left: 10 };
    
    const availableWidth = pdfWidth - margins.left - margins.right;
    const availableHeight = pdfHeight - margins.top - margins.bottom;
    
    const imgAspectRatio = canvas.width / canvas.height;
    const availableAspectRatio = availableWidth / availableHeight;
    
    let imgWidth, imgHeight;
    if (imgAspectRatio > availableAspectRatio) {
      imgWidth = availableWidth;
      imgHeight = availableWidth / imgAspectRatio;
    } else {
      imgHeight = availableHeight;
      imgWidth = availableHeight * imgAspectRatio;
    }

    // Add title
    pdf.setFontSize(16);
    pdf.text(mindMapData.title, margins.left, margins.top);

    // Add mind map image
    pdf.addImage(
      imgData, 
      'PNG', 
      margins.left + (availableWidth - imgWidth) / 2, 
      margins.top + 10, 
      imgWidth, 
      imgHeight
    );

    // Add metadata if requested
    if (options.includeMetadata) {
      pdf.addPage();
      this.addMetadataToPDF(pdf, mindMapData, margins);
    }

    pdf.save(`${this.sanitizeFilename(mindMapData.title)}.pdf`);
  }

  private addMetadataToPDF(pdf: jsPDF, mindMapData: MindMapData, margins: any): void {
    let yPosition = margins.top;
    const lineHeight = 7;

    pdf.setFontSize(14);
    pdf.text('Mind Map Details', margins.left, yPosition);
    yPosition += lineHeight * 2;

    pdf.setFontSize(10);
    
    const metadata = [
      `Title: ${mindMapData.title}`,
      `Description: ${mindMapData.description || 'No description'}`,
      `Created: ${new Date(mindMapData.metadata.created).toLocaleDateString()}`,
      `Modified: ${new Date(mindMapData.metadata.modified).toLocaleDateString()}`,
      `Version: ${mindMapData.metadata.version}`,
      `Tags: ${mindMapData.metadata.tags.join(', ') || 'None'}`,
      `Total Nodes: ${mindMapData.nodes.length}`
    ];

    metadata.forEach(line => {
      pdf.text(line, margins.left, yPosition);
      yPosition += lineHeight;
    });

    // Add node structure
    yPosition += lineHeight;
    pdf.setFontSize(12);
    pdf.text('Mind Map Structure:', margins.left, yPosition);
    yPosition += lineHeight;

    pdf.setFontSize(8);
    const rootNodes = mindMapData.nodes.filter(node => !node.parent);
    rootNodes.forEach(rootNode => {
      yPosition = this.addNodeStructureToPDF(pdf, mindMapData.nodes, rootNode, margins.left, yPosition, 0);
    });
  }

  private addNodeStructureToPDF(
    pdf: jsPDF, 
    allNodes: any[], 
    node: any, 
    x: number, 
    y: number, 
    level: number
  ): number {
    const indent = level * 5;
    const maxWidth = pdf.internal.pageSize.getWidth() - x - indent - 10;
    
    const lines = pdf.splitTextToSize(node.text, maxWidth);
    lines.forEach((line: string, index: number) => {
      if (y > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, x + indent, y);
      y += 4;
    });

    // Add children
    const children = allNodes.filter(n => n.parent === node.key);
    children.forEach(child => {
      y = this.addNodeStructureToPDF(pdf, allNodes, child, x, y, level + 1);
    });

    return y;
  }

  private async exportToSVG(
    element: HTMLElement, 
    filename: string, 
    options: ExportOptions
  ): Promise<void> {
    // For GoJS diagrams, we can get SVG directly
    const goJSDiagram = (window as any).mindMapGenerator?.diagram;
    if (goJSDiagram && goJSDiagram.makeSvg) {
      const svg = goJSDiagram.makeSvg({
        scale: options.quality || 1,
        background: options.customStyling?.backgroundColor || 'white'
      });
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${this.sanitizeFilename(filename)}.svg`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    } else {
      throw new Error('SVG export not available for this diagram type');
    }
  }

  private exportToJSON(mindMapData: MindMapData, options: ExportOptions): void {
    const dataToExport = options.includeMetadata 
      ? mindMapData 
      : { 
          title: mindMapData.title, 
          description: mindMapData.description,
          nodes: mindMapData.nodes 
        };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `${this.sanitizeFilename(mindMapData.title)}.json`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  private exportToMarkdown(mindMapData: MindMapData, options: ExportOptions): void {
    let markdown = `# ${mindMapData.title}\n\n`;
    
    if (mindMapData.description) {
      markdown += `${mindMapData.description}\n\n`;
    }

    if (options.includeMetadata) {
      markdown += `## Metadata\n\n`;
      markdown += `- **Created:** ${new Date(mindMapData.metadata.created).toLocaleDateString()}\n`;
      markdown += `- **Modified:** ${new Date(mindMapData.metadata.modified).toLocaleDateString()}\n`;
      markdown += `- **Version:** ${mindMapData.metadata.version}\n`;
      markdown += `- **Tags:** ${mindMapData.metadata.tags.join(', ') || 'None'}\n`;
      markdown += `- **Total Nodes:** ${mindMapData.nodes.length}\n\n`;
    }

    markdown += `## Mind Map Structure\n\n`;

    // Build hierarchical structure
    const rootNodes = mindMapData.nodes.filter(node => !node.parent);
    rootNodes.forEach(rootNode => {
      markdown += this.nodeToMarkdown(mindMapData.nodes, rootNode, 0);
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `${this.sanitizeFilename(mindMapData.title)}.md`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  private nodeToMarkdown(allNodes: any[], node: any, level: number): string {
    const indent = '  '.repeat(level);
    let markdown = `${indent}- ${node.text}\n`;

    // Add children
    const children = allNodes.filter(n => n.parent === node.key);
    children.forEach(child => {
      markdown += this.nodeToMarkdown(allNodes, child, level + 1);
    });

    return markdown;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  async getExportPreview(
    mindMapData: MindMapData, 
    format: ExportFormat
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(mindMapData, null, 2);
      case 'markdown':
        return this.generateMarkdownPreview(mindMapData);
      default:
        return 'Preview not available for this format';
    }
  }

  private generateMarkdownPreview(mindMapData: MindMapData): string {
    let preview = `# ${mindMapData.title}\n\n`;
    
    if (mindMapData.description) {
      preview += `${mindMapData.description}\n\n`;
    }

    preview += `## Structure Preview\n\n`;
    
    const rootNodes = mindMapData.nodes.filter(node => !node.parent).slice(0, 3);
    rootNodes.forEach(rootNode => {
      preview += this.nodeToMarkdown(mindMapData.nodes, rootNode, 0);
    });

    if (mindMapData.nodes.filter(node => !node.parent).length > 3) {
      preview += '\n... (truncated for preview)\n';
    }

    return preview;
  }

  getSupportedFormats(): ExportFormat[] {
    return ['png', 'pdf', 'svg', 'json', 'markdown'];
  }

  getFormatDescription(format: ExportFormat): string {
    const descriptions = {
      png: 'High-quality raster image suitable for presentations and documents',
      pdf: 'Professional document format with optional metadata and structure details',
      svg: 'Scalable vector graphics perfect for web and print',
      json: 'Raw data format for importing into other applications',
      markdown: 'Text-based format ideal for documentation and note-taking'
    };

    return descriptions[format] || 'Unknown format';
  }
}

export const exportService = new ExportService();
export default exportService;
