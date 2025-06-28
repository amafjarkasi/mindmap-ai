import { authService } from '../services/auth';

export class AuthModal {
  private modal: HTMLElement | null = null;
  private isVisible: boolean = false;

  constructor() {
    this.createModal();
    this.setupEventListeners();
  }

  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.className = 'auth-modal hidden';
    this.modal.innerHTML = `
      <div class="modal-overlay" data-action="close">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Welcome to AI Mind Map Generator</h2>
            <button class="close-btn" data-action="close">&times;</button>
          </div>
          
          <div class="auth-tabs">
            <button class="tab-btn active" data-tab="signin">Sign In</button>
            <button class="tab-btn" data-tab="signup">Sign Up</button>
          </div>
          
          <div class="auth-content">
            <!-- Sign In Form -->
            <div class="auth-form" id="signin-form">
              <div class="social-auth">
                <button class="google-btn" data-action="google-signin">
                  <svg class="google-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
              
              <div class="divider">
                <span>or</span>
              </div>
              
              <form class="email-form" data-form="signin">
                <div class="form-group">
                  <label for="signin-email">Email</label>
                  <input type="email" id="signin-email" name="email" required>
                </div>
                <div class="form-group">
                  <label for="signin-password">Password</label>
                  <input type="password" id="signin-password" name="password" required>
                </div>
                <button type="submit" class="submit-btn">Sign In</button>
              </form>
              
              <div class="auth-links">
                <a href="#" data-action="forgot-password">Forgot your password?</a>
              </div>
            </div>
            
            <!-- Sign Up Form -->
            <div class="auth-form hidden" id="signup-form">
              <div class="social-auth">
                <button class="google-btn" data-action="google-signin">
                  <svg class="google-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
              
              <div class="divider">
                <span>or</span>
              </div>
              
              <form class="email-form" data-form="signup">
                <div class="form-group">
                  <label for="signup-name">Full Name</label>
                  <input type="text" id="signup-name" name="name" required>
                </div>
                <div class="form-group">
                  <label for="signup-email">Email</label>
                  <input type="email" id="signup-email" name="email" required>
                </div>
                <div class="form-group">
                  <label for="signup-password">Password</label>
                  <input type="password" id="signup-password" name="password" required minlength="6">
                  <small>At least 6 characters</small>
                </div>
                <div class="form-group">
                  <label for="signup-confirm">Confirm Password</label>
                  <input type="password" id="signup-confirm" name="confirmPassword" required>
                </div>
                <button type="submit" class="submit-btn">Create Account</button>
              </form>
              
              <div class="auth-links">
                <small>By signing up, you agree to our Terms of Service and Privacy Policy.</small>
              </div>
            </div>
          </div>
          
          <div class="auth-loading hidden">
            <div class="spinner"></div>
            <p>Please wait...</p>
          </div>
          
          <div class="auth-error hidden">
            <div class="error-message"></div>
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

    // Tab switching
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('tab-btn')) {
        this.switchTab(target.dataset.tab!);
      }
    });

    // Google sign in
    this.modal.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.action === 'google-signin' || target.closest('[data-action="google-signin"]')) {
        await this.handleGoogleSignIn();
      }
    });

    // Form submissions
    this.modal.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formType = form.dataset.form;
      
      if (formType === 'signin') {
        await this.handleEmailSignIn(form);
      } else if (formType === 'signup') {
        await this.handleEmailSignUp(form);
      }
    });

    // Forgot password
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.action === 'forgot-password') {
        e.preventDefault();
        this.handleForgotPassword();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  show(): void {
    if (!this.modal) return;
    
    this.modal.classList.remove('hidden');
    this.isVisible = true;
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    const firstInput = this.modal.querySelector('input') as HTMLInputElement;
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  hide(): void {
    if (!this.modal) return;
    
    this.modal.classList.add('hidden');
    this.isVisible = false;
    document.body.style.overflow = '';
    this.clearErrors();
  }

  private switchTab(tab: string): void {
    if (!this.modal) return;

    // Update tab buttons
    const tabButtons = this.modal.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update forms
    const forms = this.modal.querySelectorAll('.auth-form');
    forms.forEach(form => {
      form.classList.toggle('hidden', form.id !== `${tab}-form`);
    });

    this.clearErrors();
  }

  private async handleGoogleSignIn(): Promise<void> {
    this.showLoading(true);
    this.clearErrors();

    try {
      await authService.signInWithGoogle();
      this.hide();
      this.showSuccess('Successfully signed in with Google!');
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Google sign in failed');
    } finally {
      this.showLoading(false);
    }
  }

  private async handleEmailSignIn(form: HTMLFormElement): Promise<void> {
    this.showLoading(true);
    this.clearErrors();

    try {
      const formData = new FormData(form);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      await authService.signIn(email, password);
      this.hide();
      this.showSuccess('Successfully signed in!');
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      this.showLoading(false);
    }
  }

  private async handleEmailSignUp(form: HTMLFormElement): Promise<void> {
    this.showLoading(true);
    this.clearErrors();

    try {
      const formData = new FormData(form);
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      await authService.signUp(email, password, name);
      this.hide();
      this.showSuccess('Account created successfully! Please check your email for verification.');
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      this.showLoading(false);
    }
  }

  private async handleForgotPassword(): Promise<void> {
    const email = prompt('Enter your email address:');
    if (!email) return;

    try {
      await authService.resetPassword(email);
      this.showSuccess('Password reset email sent! Check your inbox.');
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Failed to send reset email');
    }
  }

  private showLoading(show: boolean): void {
    if (!this.modal) return;

    const loading = this.modal.querySelector('.auth-loading');
    const content = this.modal.querySelector('.auth-content');
    
    if (loading && content) {
      loading.classList.toggle('hidden', !show);
      content.classList.toggle('hidden', show);
    }
  }

  private showError(message: string): void {
    if (!this.modal) return;

    const errorDiv = this.modal.querySelector('.auth-error');
    const errorMessage = this.modal.querySelector('.error-message');
    
    if (errorDiv && errorMessage) {
      errorMessage.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  private clearErrors(): void {
    if (!this.modal) return;

    const errorDiv = this.modal.querySelector('.auth-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }

  private showSuccess(message: string): void {
    // Use the global notification system
    (window as any).app?.showSuccess(message);
  }
}

export default AuthModal;
