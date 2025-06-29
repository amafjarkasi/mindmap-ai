import type { MindMapData } from '../types';

export class ShareModal {
  private modal: HTMLElement | null = null;
  private mindMapData: MindMapData | null = null;

  constructor() {
    // Ensure DOM is ready before creating modal
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.createModal();
        this.setupEventListeners();
      });
    } else {
      this.createModal();
      this.setupEventListeners();
    }
  }

  private createModal(): void {
    // Check if modal already exists
    const existingModal = document.getElementById('shareModal');
    if (existingModal) {
      this.modal = existingModal;
      return;
    }

    // Create modal HTML
    const modalHTML = `
      <div id="shareModal" class="modal hidden">
        <div class="modal-overlay" data-action="close"></div>
        <div class="modal-content share-modal-content">
          <div class="modal-header">
            <h2>Share Mind Map</h2>
            <button class="modal-close" data-action="close" aria-label="Close modal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="share-options">
              <div class="share-section">
                <h3>Share Link</h3>
                <div class="share-link-container">
                  <input type="text" id="shareLink" class="share-link-input" readonly placeholder="Generating share link...">
                  <button id="copyLinkBtn" class="btn btn-secondary" title="Copy link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="m5 15-4-4 4-4"></path>
                    </svg>
                    Copy
                  </button>
                </div>
                <p class="share-description">Anyone with this link can view your mind map</p>
              </div>

              <div class="share-section">
                <h3>Privacy Settings</h3>
                <div class="privacy-options">
                  <label class="privacy-option">
                    <input type="radio" name="privacy" value="public" checked>
                    <span class="privacy-label">
                      <strong>Public</strong>
                      <small>Anyone with the link can view</small>
                    </span>
                  </label>
                  <label class="privacy-option">
                    <input type="radio" name="privacy" value="private">
                    <span class="privacy-label">
                      <strong>Private</strong>
                      <small>Only you can view</small>
                    </span>
                  </label>
                </div>
              </div>

              <div class="share-section">
                <h3>Export Options</h3>
                <div class="export-buttons">
                  <button id="exportPngBtn" class="btn btn-outline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                    </svg>
                    Export as PNG
                  </button>
                  <button id="exportPdfBtn" class="btn btn-outline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                    </svg>
                    Export as PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="close">Cancel</button>
            <button id="shareBtn" class="btn btn-primary">Share</button>
          </div>
        </div>
      </div>
    `;

    // Insert modal into DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('shareModal');
  }

  private setupEventListeners(): void {
    // Wait for modal to be created
    setTimeout(() => {
      if (!this.modal) {
        console.warn('ShareModal: Modal element not found during event listener setup');
        return;
      }

      // Close modal events
      this.modal.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        try {
          if (target.dataset.action === 'close' ||
              (target.closest && target.closest('[data-action="close"]'))) {
            this.hide();
          }
        } catch (error) {
          console.debug('ShareModal click handler error:', error);
        }
      });

      try {
        // Copy link button
        const copyLinkBtn = this.modal.querySelector('#copyLinkBtn');
        if (copyLinkBtn) {
          copyLinkBtn.addEventListener('click', () => this.copyShareLink());
        }

        // Export buttons
        const exportPngBtn = this.modal.querySelector('#exportPngBtn');
        if (exportPngBtn) {
          exportPngBtn.addEventListener('click', () => this.exportAsPng());
        }

        const exportPdfBtn = this.modal.querySelector('#exportPdfBtn');
        if (exportPdfBtn) {
          exportPdfBtn.addEventListener('click', () => this.exportAsPdf());
        }

        // Share button
        const shareBtn = this.modal.querySelector('#shareBtn');
        if (shareBtn) {
          shareBtn.addEventListener('click', () => this.handleShare());
        }

        // Privacy option changes
        const privacyOptions = this.modal.querySelectorAll('input[name="privacy"]');
        privacyOptions.forEach(option => {
          if (option) {
            option.addEventListener('change', () => this.updateShareLink());
          }
        });
      } catch (error) {
        console.error('ShareModal: Error setting up event listeners:', error);
      }

      // Escape key to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.modal?.classList.contains('hidden')) {
          this.hide();
        }
      });
    }, 100);
  }

  public show(mindMapData: MindMapData): void {
    if (!this.modal) {
      console.error('Share modal not initialized');
      return;
    }

    this.mindMapData = mindMapData;
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Generate and display share link
    this.updateShareLink();
  }

  public hide(): void {
    if (!this.modal) return;

    this.modal.classList.add('hidden');
    document.body.style.overflow = '';
    this.mindMapData = null;
  }

  private updateShareLink(): void {
    if (!this.mindMapData || !this.modal) return;

    const shareInput = this.modal.querySelector('#shareLink') as HTMLInputElement;
    if (!shareInput) return;

    const privacyOption = this.modal.querySelector('input[name="privacy"]:checked') as HTMLInputElement;
    const isPublic = privacyOption?.value === 'public';

    // Generate share link based on privacy setting
    const baseUrl = window.location.origin;
    const shareUrl = isPublic 
      ? `${baseUrl}/share/${this.mindMapData.id}`
      : `${baseUrl}/private/${this.mindMapData.id}`;

    shareInput.value = shareUrl;
  }

  private async copyShareLink(): Promise<void> {
    if (!this.modal) return;

    const shareInput = this.modal.querySelector('#shareLink') as HTMLInputElement;
    if (!shareInput || !shareInput.value) return;

    try {
      await navigator.clipboard.writeText(shareInput.value);
      this.showSuccess('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      shareInput.select();
      document.execCommand('copy');
      this.showSuccess('Link copied to clipboard!');
    }
  }

  private exportAsPng(): void {
    if (!this.mindMapData) return;
    
    // Trigger export functionality
    const event = new CustomEvent('export-mindmap', {
      detail: { format: 'png', mindMapData: this.mindMapData }
    });
    document.dispatchEvent(event);
    
    this.hide();
  }

  private exportAsPdf(): void {
    if (!this.mindMapData) return;
    
    // Trigger export functionality
    const event = new CustomEvent('export-mindmap', {
      detail: { format: 'pdf', mindMapData: this.mindMapData }
    });
    document.dispatchEvent(event);
    
    this.hide();
  }

  private handleShare(): void {
    if (!this.mindMapData) return;

    // Here you would implement the actual sharing logic
    // For now, just copy the link and show success
    this.copyShareLink();
    
    setTimeout(() => {
      this.hide();
    }, 1000);
  }

  private showSuccess(message: string): void {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'share-success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10001;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    document.body.appendChild(successDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 3000);
  }
}
