import { exportService } from '../services/exportService';
import type { ExportOptions, ExportFormat, MindMapData } from '../types';

export class ExportModal {
  private modal: HTMLElement | null = null;
  private mindMapData: MindMapData | null = null;
  private diagramElement: HTMLElement | null = null;

  constructor() {
    this.createModal();
    this.setupEventListeners();
  }

  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.className = 'export-modal hidden';
    this.modal.innerHTML = `
      <div class="modal-overlay" data-action="close">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Export Mind Map</h2>
            <button class="close-btn" data-action="close">&times;</button>
          </div>
          
          <div class="export-content">
            <div class="format-selection">
              <h3>Choose Export Format</h3>
              <div class="format-grid">
                <div class="format-option" data-format="png">
                  <div class="format-icon">🖼️</div>
                  <div class="format-info">
                    <h4>PNG Image</h4>
                    <p>High-quality raster image for presentations</p>
                  </div>
                </div>
                <div class="format-option" data-format="pdf">
                  <div class="format-icon">📄</div>
                  <div class="format-info">
                    <h4>PDF Document</h4>
                    <p>Professional document with optional metadata</p>
                  </div>
                </div>
                <div class="format-option" data-format="svg">
                  <div class="format-icon">🎨</div>
                  <div class="format-info">
                    <h4>SVG Vector</h4>
                    <p>Scalable vector graphics for web and print</p>
                  </div>
                </div>
                <div class="format-option" data-format="json">
                  <div class="format-icon">📊</div>
                  <div class="format-info">
                    <h4>JSON Data</h4>
                    <p>Raw data for importing into other applications</p>
                  </div>
                </div>
                <div class="format-option" data-format="markdown">
                  <div class="format-icon">📝</div>
                  <div class="format-info">
                    <h4>Markdown</h4>
                    <p>Text format for documentation and notes</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="export-options">
              <h3>Export Options</h3>
              
              <div class="option-group">
                <label for="export-quality">Quality/Scale</label>
                <select id="export-quality">
                  <option value="1">Standard (1x)</option>
                  <option value="2" selected>High (2x)</option>
                  <option value="3">Ultra (3x)</option>
                </select>
              </div>
              
              <div class="option-group">
                <label>
                  <input type="checkbox" id="include-metadata" checked>
                  Include metadata and details
                </label>
              </div>
              
              <div class="option-group styling-options">
                <h4>Styling Options</h4>
                <div class="styling-grid">
                  <div class="styling-item">
                    <label for="bg-color">Background Color</label>
                    <input type="color" id="bg-color" value="#ffffff">
                  </div>
                  <div class="styling-item">
                    <label for="font-size">Font Size</label>
                    <input type="range" id="font-size" min="8" max="24" value="14">
                    <span class="range-value">14px</span>
                  </div>
                </div>
              </div>
              
              <div class="option-group margins-options">
                <h4>Margins (PDF only)</h4>
                <div class="margins-grid">
                  <div class="margin-item">
                    <label for="margin-top">Top</label>
                    <input type="number" id="margin-top" value="10" min="0" max="50">
                  </div>
                  <div class="margin-item">
                    <label for="margin-right">Right</label>
                    <input type="number" id="margin-right" value="10" min="0" max="50">
                  </div>
                  <div class="margin-item">
                    <label for="margin-bottom">Bottom</label>
                    <input type="number" id="margin-bottom" value="10" min="0" max="50">
                  </div>
                  <div class="margin-item">
                    <label for="margin-left">Left</label>
                    <input type="number" id="margin-left" value="10" min="0" max="50">
                  </div>
                </div>
              </div>
            </div>
            
            <div class="preview-section">
              <h3>Preview</h3>
              <div class="preview-container">
                <div class="preview-placeholder">
                  Select a format to see preview
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="cancel-btn" data-action="close">Cancel</button>
            <button class="export-btn" disabled>Export</button>
          </div>
          
          <div class="export-progress hidden">
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            <p class="progress-text">Preparing export...</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
  }

  private setupEventListeners(): void {
    if (!this.modal) return;

    // Close modal
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.action === 'close') {
        this.hide();
      }
    });

    // Format selection
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const formatOption = target.closest('.format-option') as HTMLElement;
      if (formatOption) {
        this.selectFormat(formatOption.dataset.format as ExportFormat);
      }
    });

    // Export button
    this.modal.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('export-btn')) {
        await this.performExport();
      }
    });

    // Option changes
    this.modal.addEventListener('change', () => {
      this.updatePreview();
    });

    this.modal.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'range') {
        const valueSpan = target.parentElement?.querySelector('.range-value');
        if (valueSpan) {
          valueSpan.textContent = `${target.value}px`;
        }
      }
      this.updatePreview();
    });
  }

  show(mindMapData: MindMapData, diagramElement: HTMLElement): void {
    if (!this.modal) return;

    this.mindMapData = mindMapData;
    this.diagramElement = diagramElement;
    
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Reset state
    this.clearSelection();
    this.updatePreview();
  }

  hide(): void {
    if (!this.modal) return;
    
    this.modal.classList.add('hidden');
    document.body.style.overflow = '';
    this.mindMapData = null;
    this.diagramElement = null;
  }

  private selectFormat(format: ExportFormat): void {
    if (!this.modal) return;

    // Update visual selection
    const options = this.modal.querySelectorAll('.format-option');
    options.forEach(option => {
      option.classList.toggle('selected', option.dataset.format === format);
    });

    // Enable export button
    const exportBtn = this.modal.querySelector('.export-btn') as HTMLButtonElement;
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.dataset.format = format;
    }

    // Show/hide relevant options
    this.updateOptionsVisibility(format);
    this.updatePreview();
  }

  private updateOptionsVisibility(format: ExportFormat): void {
    if (!this.modal) return;

    const stylingOptions = this.modal.querySelector('.styling-options');
    const marginsOptions = this.modal.querySelector('.margins-options');

    // Show styling options for image formats
    if (stylingOptions) {
      stylingOptions.classList.toggle('hidden', !['png', 'pdf', 'svg'].includes(format));
    }

    // Show margins only for PDF
    if (marginsOptions) {
      marginsOptions.classList.toggle('hidden', format !== 'pdf');
    }
  }

  private async updatePreview(): Promise<void> {
    if (!this.modal || !this.mindMapData) return;

    const previewContainer = this.modal.querySelector('.preview-container');
    if (!previewContainer) return;

    const selectedFormat = this.getSelectedFormat();
    if (!selectedFormat) {
      previewContainer.innerHTML = '<div class="preview-placeholder">Select a format to see preview</div>';
      return;
    }

    try {
      if (selectedFormat === 'json' || selectedFormat === 'markdown') {
        const preview = await exportService.getExportPreview(this.mindMapData, selectedFormat);
        previewContainer.innerHTML = `
          <div class="text-preview">
            <pre><code>${this.escapeHtml(preview.substring(0, 500))}${preview.length > 500 ? '...' : ''}</code></pre>
          </div>
        `;
      } else {
        previewContainer.innerHTML = `
          <div class="image-preview">
            <div class="preview-placeholder">
              ${this.getFormatIcon(selectedFormat)} ${selectedFormat.toUpperCase()} Preview
              <br><small>Preview will be generated during export</small>
            </div>
          </div>
        `;
      }
    } catch (error) {
      previewContainer.innerHTML = '<div class="preview-error">Preview not available</div>';
    }
  }

  private getSelectedFormat(): ExportFormat | null {
    if (!this.modal) return null;

    const selected = this.modal.querySelector('.format-option.selected');
    return selected?.getAttribute('data-format') as ExportFormat || null;
  }

  private getExportOptions(): ExportOptions {
    if (!this.modal) {
      return { format: 'png' };
    }

    const format = this.getSelectedFormat() || 'png';
    const quality = parseInt((this.modal.querySelector('#export-quality') as HTMLSelectElement)?.value || '2');
    const includeMetadata = (this.modal.querySelector('#include-metadata') as HTMLInputElement)?.checked || false;
    const backgroundColor = (this.modal.querySelector('#bg-color') as HTMLInputElement)?.value || '#ffffff';
    const fontSize = parseInt((this.modal.querySelector('#font-size') as HTMLInputElement)?.value || '14');

    const margins = {
      top: parseInt((this.modal.querySelector('#margin-top') as HTMLInputElement)?.value || '10'),
      right: parseInt((this.modal.querySelector('#margin-right') as HTMLInputElement)?.value || '10'),
      bottom: parseInt((this.modal.querySelector('#margin-bottom') as HTMLInputElement)?.value || '10'),
      left: parseInt((this.modal.querySelector('#margin-left') as HTMLInputElement)?.value || '10')
    };

    return {
      format,
      quality,
      includeMetadata,
      customStyling: {
        backgroundColor,
        fontSize,
        margins
      }
    };
  }

  private async performExport(): Promise<void> {
    if (!this.mindMapData || !this.diagramElement) return;

    const options = this.getExportOptions();
    
    this.showProgress(true);
    this.updateProgress(0, 'Preparing export...');

    try {
      this.updateProgress(25, 'Generating export...');
      
      await exportService.exportMindMap(this.mindMapData, this.diagramElement, options);
      
      this.updateProgress(100, 'Export complete!');
      
      // Track analytics
      (window as any).app?.getMindMapGenerator()?.trackMindMapExported(
        this.mindMapData.id || 'unknown',
        options.format
      );
      
      setTimeout(() => {
        this.hide();
        this.showSuccess(`Mind map exported as ${options.format.toUpperCase()}`);
      }, 1000);
      
    } catch (error) {
      console.error('Export failed:', error);
      this.showError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        this.showProgress(false);
      }, 1500);
    }
  }

  private showProgress(show: boolean): void {
    if (!this.modal) return;

    const progress = this.modal.querySelector('.export-progress');
    const content = this.modal.querySelector('.export-content');
    const footer = this.modal.querySelector('.modal-footer');

    if (progress && content && footer) {
      progress.classList.toggle('hidden', !show);
      content.classList.toggle('hidden', show);
      footer.classList.toggle('hidden', show);
    }
  }

  private updateProgress(percent: number, text: string): void {
    if (!this.modal) return;

    const progressFill = this.modal.querySelector('.progress-fill') as HTMLElement;
    const progressText = this.modal.querySelector('.progress-text');

    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }

    if (progressText) {
      progressText.textContent = text;
    }
  }

  private clearSelection(): void {
    if (!this.modal) return;

    const options = this.modal.querySelectorAll('.format-option');
    options.forEach(option => option.classList.remove('selected'));

    const exportBtn = this.modal.querySelector('.export-btn') as HTMLButtonElement;
    if (exportBtn) {
      exportBtn.disabled = true;
    }
  }

  private getFormatIcon(format: ExportFormat): string {
    const icons = {
      png: '🖼️',
      pdf: '📄',
      svg: '🎨',
      json: '📊',
      markdown: '📝'
    };
    return icons[format] || '📄';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private showSuccess(message: string): void {
    (window as any).app?.showSuccess(message);
  }

  private showError(message: string): void {
    (window as any).app?.showError(message);
  }
}

export default ExportModal;
