import { authService } from '../services/auth';

export class AuthModal {
  private modal: HTMLElement | null = null;
  private isVisible: boolean = false;
  private currentTab: 'signin' | 'signup' = 'signin';

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
    this.modal = document.createElement('div');
    this.modal.className = 'auth-modal hidden';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'auth-modal-title');
    this.modal.innerHTML = `
      <div class="modal-overlay" data-action="close">
        <div class="modal-content" role="document">
          <div class="modal-header">
            <h2 id="auth-modal-title">Welcome to AI Mind Map Generator</h2>
            <button class="close-btn" data-action="close" aria-label="Close authentication modal">&times;</button>
          </div>
          
          <div class="auth-tabs" role="tablist" aria-label="Authentication options">
            <button class="tab-btn active" data-tab="signin" role="tab" aria-selected="true" aria-controls="signin-form">Sign In</button>
            <button class="tab-btn" data-tab="signup" role="tab" aria-selected="false" aria-controls="signup-form">Sign Up</button>
          </div>
          
          <div class="auth-content">
            <!-- Sign In Form -->
            <div class="auth-form" id="signin-form" role="tabpanel" aria-labelledby="signin-tab">
              <div class="social-auth">
                <button class="google-btn" data-action="google-signin" type="button" aria-label="Sign in with Google">
                  <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span class="google-btn-text">Continue with Google</span>
                  <span class="google-btn-loading hidden">
                    <span class="spinner-small"></span>
                    Signing in...
                  </span>
                </button>
              </div>
              
              <div class="divider">
                <span>or</span>
              </div>
              
              <form class="email-form" data-form="signin" novalidate>
                <div class="form-group">
                  <label for="signin-email">Email</label>
                  <input type="email" id="signin-email" name="email" required
                         autocomplete="email" aria-describedby="signin-email-error">
                  <div class="field-error" id="signin-email-error" role="alert"></div>
                </div>
                <div class="form-group">
                  <label for="signin-password">Password</label>
                  <input type="password" id="signin-password" name="password" required
                         autocomplete="current-password" aria-describedby="signin-password-error">
                  <div class="field-error" id="signin-password-error" role="alert"></div>
                </div>
                <button type="submit" class="submit-btn">
                  <span class="btn-text">Sign In</span>
                  <span class="btn-loading hidden">
                    <span class="spinner-small"></span>
                    Signing in...
                  </span>
                </button>
              </form>
              
              <div class="auth-links">
                <button type="button" class="link-btn" data-action="forgot-password">Forgot your password?</button>
              </div>
            </div>

            <!-- Sign Up Form -->
            <div class="auth-form hidden" id="signup-form" role="tabpanel" aria-labelledby="signup-tab">
              <div class="social-auth">
                <button class="google-btn" data-action="google-signin" type="button" aria-label="Sign up with Google">
                  <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span class="google-btn-text">Continue with Google</span>
                  <span class="google-btn-loading hidden">
                    <span class="spinner-small"></span>
                    Signing up...
                  </span>
                </button>
              </div>
              
              <div class="divider">
                <span>or</span>
              </div>
              
              <form class="email-form" data-form="signup" novalidate>
                <div class="form-group">
                  <label for="signup-name">Full Name</label>
                  <input type="text" id="signup-name" name="name" required
                         autocomplete="name" aria-describedby="signup-name-error">
                  <div class="field-error" id="signup-name-error" role="alert"></div>
                </div>
                <div class="form-group">
                  <label for="signup-email">Email</label>
                  <input type="email" id="signup-email" name="email" required
                         autocomplete="email" aria-describedby="signup-email-error">
                  <div class="field-error" id="signup-email-error" role="alert"></div>
                </div>
                <div class="form-group">
                  <label for="signup-password">Password</label>
                  <input type="password" id="signup-password" name="password" required minlength="6"
                         autocomplete="new-password" aria-describedby="signup-password-help signup-password-error">
                  <small id="signup-password-help">At least 6 characters</small>
                  <div class="password-strength" id="password-strength" aria-live="polite"></div>
                  <div class="field-error" id="signup-password-error" role="alert"></div>
                </div>
                <div class="form-group">
                  <label for="signup-confirm">Confirm Password</label>
                  <input type="password" id="signup-confirm" name="confirmPassword" required
                         autocomplete="new-password" aria-describedby="signup-confirm-error">
                  <div class="field-error" id="signup-confirm-error" role="alert"></div>
                </div>
                <button type="submit" class="submit-btn">
                  <span class="btn-text">Create Account</span>
                  <span class="btn-loading hidden">
                    <span class="spinner-small"></span>
                    Creating account...
                  </span>
                </button>
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

    // Close modal - improved event handling
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.action === 'close' || target.classList.contains('modal-overlay')) {
        this.hide();
      }
    });

    // Prevent modal content clicks from closing modal
    const modalContent = this.modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Tab switching
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('tab-btn')) {
        this.switchTab(target.dataset.tab as 'signin' | 'signup');
      }
    });

    // Google sign in - improved button handling
    this.modal.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const googleBtn = target.closest('[data-action="google-signin"]') as HTMLElement;
      if (googleBtn && !googleBtn.disabled) {
        e.preventDefault();
        await this.handleGoogleSignIn(googleBtn);
      }
    });

    // Form submissions with validation
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

    // Forgot password - improved UX
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.action === 'forgot-password') {
        e.preventDefault();
        this.showForgotPasswordForm();
      }
    });

    // Real-time validation
    this.setupFormValidation();

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

  private setupFormValidation(): void {
    if (!this.modal) return;

    // Password strength indicator for signup
    const signupPassword = this.modal.querySelector('#signup-password') as HTMLInputElement;
    if (signupPassword) {
      signupPassword.addEventListener('input', () => {
        this.updatePasswordStrength(signupPassword.value);
      });
    }

    // Confirm password validation
    const confirmPassword = this.modal.querySelector('#signup-confirm') as HTMLInputElement;
    if (confirmPassword && signupPassword) {
      confirmPassword.addEventListener('input', () => {
        this.validatePasswordMatch(signupPassword.value, confirmPassword.value);
      });
    }

    // Email validation
    const emailInputs = this.modal.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateEmail(input as HTMLInputElement);
      });
    });

    // Real-time form validation
    const forms = this.modal.querySelectorAll('.email-form');
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('blur', () => {
          this.validateField(input as HTMLInputElement);
        });
        input.addEventListener('input', () => {
          this.clearFieldError(input as HTMLInputElement);
        });
      });
    });
  }

  private switchTab(tab: 'signin' | 'signup'): void {
    if (!this.modal) return;

    this.currentTab = tab;

    // Update tab buttons with ARIA attributes
    const tabButtons = this.modal.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive.toString());
    });

    // Update forms
    const forms = this.modal.querySelectorAll('.auth-form');
    forms.forEach(form => {
      form.classList.toggle('hidden', form.id !== `${tab}-form`);
    });

    this.clearErrors();
    this.clearAllFieldErrors();

    // Focus first input in active form
    const activeForm = this.modal.querySelector(`#${tab}-form`);
    if (activeForm) {
      const firstInput = activeForm.querySelector('input') as HTMLInputElement;
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }

  private async handleGoogleSignIn(button: HTMLElement): Promise<void> {
    this.setButtonLoading(button, true);
    this.clearErrors();

    try {
      await authService.signInWithGoogle();
      this.hide();
      this.showSuccess('Successfully signed in with Google!');
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Google sign in failed');
    } finally {
      this.setButtonLoading(button, false);
    }
  }

  private async handleEmailSignIn(form: HTMLFormElement): Promise<void> {
    const submitBtn = form.querySelector('.submit-btn') as HTMLElement;
    this.setButtonLoading(submitBtn, true);
    this.clearErrors();
    this.clearAllFieldErrors();

    // Validate form
    const emailInput = form.querySelector('#signin-email') as HTMLInputElement;
    const passwordInput = form.querySelector('#signin-password') as HTMLInputElement;

    let isValid = true;
    if (!this.validateField(emailInput)) isValid = false;
    if (!this.validateField(passwordInput)) isValid = false;

    if (!isValid) {
      this.setButtonLoading(submitBtn, false);
      return;
    }

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
      this.setButtonLoading(submitBtn, false);
    }
  }

  private async handleEmailSignUp(form: HTMLFormElement): Promise<void> {
    const submitBtn = form.querySelector('.submit-btn') as HTMLElement;
    this.setButtonLoading(submitBtn, true);
    this.clearErrors();
    this.clearAllFieldErrors();

    // Validate form
    const nameInput = form.querySelector('#signup-name') as HTMLInputElement;
    const emailInput = form.querySelector('#signup-email') as HTMLInputElement;
    const passwordInput = form.querySelector('#signup-password') as HTMLInputElement;
    const confirmInput = form.querySelector('#signup-confirm') as HTMLInputElement;

    let isValid = true;
    if (!this.validateField(nameInput)) isValid = false;
    if (!this.validateField(emailInput)) isValid = false;
    if (!this.validateField(passwordInput)) isValid = false;
    if (!this.validateField(confirmInput)) isValid = false;

    // Additional password match validation
    if (passwordInput.value !== confirmInput.value) {
      this.setFieldError(confirmInput, 'Passwords do not match');
      isValid = false;
    }

    if (!isValid) {
      this.setButtonLoading(submitBtn, false);
      return;
    }

    try {
      const formData = new FormData(form);
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      await authService.signUp(email, password, name);
      this.hide();
      this.showSuccess('Account created successfully! Please check your email for verification.');
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      this.setButtonLoading(submitBtn, false);
    }
  }

  private showForgotPasswordForm(): void {
    if (!this.modal) return;

    const modalContent = this.modal.querySelector('.modal-content');
    if (!modalContent) return;

    // Create forgot password form
    const forgotPasswordHTML = `
      <div class="forgot-password-form">
        <div class="modal-header">
          <h2>Reset Password</h2>
          <button class="close-btn" data-action="close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Enter your email address and we'll send you a link to reset your password.</p>
          <form class="email-form" data-form="forgot-password" novalidate>
            <div class="form-group">
              <label for="forgot-email">Email</label>
              <input type="email" id="forgot-email" name="email" required
                     autocomplete="email" aria-describedby="forgot-email-error">
              <div class="field-error" id="forgot-email-error" role="alert"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" data-action="back-to-signin">Back to Sign In</button>
              <button type="submit" class="submit-btn">
                <span class="btn-text">Send Reset Link</span>
                <span class="btn-loading hidden">
                  <span class="spinner-small"></span>
                  Sending...
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalContent.innerHTML = forgotPasswordHTML;

    // Add event listeners for the forgot password form
    const form = modalContent.querySelector('[data-form="forgot-password"]') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleForgotPassword(form);
      });
    }

    const backBtn = modalContent.querySelector('[data-action="back-to-signin"]');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.createModal(); // Recreate the original modal
        this.setupEventListeners();
      });
    }

    // Focus the email input
    const emailInput = modalContent.querySelector('#forgot-email') as HTMLInputElement;
    if (emailInput) {
      setTimeout(() => emailInput.focus(), 100);
    }
  }

  private async handleForgotPassword(form: HTMLFormElement): Promise<void> {
    const submitBtn = form.querySelector('.submit-btn') as HTMLElement;
    this.setButtonLoading(submitBtn, true);
    this.clearErrors();

    const emailInput = form.querySelector('#forgot-email') as HTMLInputElement;
    if (!this.validateField(emailInput)) {
      this.setButtonLoading(submitBtn, false);
      return;
    }

    try {
      const formData = new FormData(form);
      const email = formData.get('email') as string;

      await authService.resetPassword(email);
      this.showSuccess('Password reset email sent! Please check your inbox.');

      // Go back to sign in form after success
      setTimeout(() => {
        this.createModal();
        this.setupEventListeners();
      }, 2000);
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      this.setButtonLoading(submitBtn, false);
    }
  }

  private setButtonLoading(button: HTMLElement, loading: boolean): void {
    if (!button) return;

    const btnText = button.querySelector('.btn-text, .google-btn-text');
    const btnLoading = button.querySelector('.btn-loading, .google-btn-loading');

    if (btnText && btnLoading) {
      btnText.classList.toggle('hidden', loading);
      btnLoading.classList.toggle('hidden', !loading);
    }

    (button as HTMLButtonElement).disabled = loading;
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

  private validateField(input: HTMLInputElement): boolean {
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Required field validation
    if (input.required && !value) {
      errorMessage = `${this.getFieldLabel(input)} is required`;
      isValid = false;
    }
    // Email validation
    else if (input.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errorMessage = 'Please enter a valid email address';
        isValid = false;
      }
    }
    // Password validation
    else if (input.type === 'password' && input.name === 'password' && value) {
      if (value.length < 6) {
        errorMessage = 'Password must be at least 6 characters long';
        isValid = false;
      }
    }

    this.setFieldError(input, errorMessage);
    return isValid;
  }

  private validateEmail(input: HTMLInputElement): boolean {
    const value = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (value && !emailRegex.test(value)) {
      this.setFieldError(input, 'Please enter a valid email address');
      return false;
    }

    this.clearFieldError(input);
    return true;
  }

  private validatePasswordMatch(password: string, confirmPassword: string): boolean {
    const confirmInput = this.modal?.querySelector('#signup-confirm') as HTMLInputElement;
    if (!confirmInput) return true;

    if (confirmPassword && password !== confirmPassword) {
      this.setFieldError(confirmInput, 'Passwords do not match');
      return false;
    }

    this.clearFieldError(confirmInput);
    return true;
  }

  private updatePasswordStrength(password: string): void {
    const strengthElement = this.modal?.querySelector('#password-strength');
    if (!strengthElement) return;

    if (!password) {
      strengthElement.textContent = '';
      strengthElement.className = 'password-strength';
      return;
    }

    let strength = 0;
    let feedback = '';

    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Character variety checks
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength < 3) {
      feedback = 'Weak password';
      strengthElement.className = 'password-strength weak';
    } else if (strength < 5) {
      feedback = 'Medium strength';
      strengthElement.className = 'password-strength medium';
    } else {
      feedback = 'Strong password';
      strengthElement.className = 'password-strength strong';
    }

    strengthElement.textContent = feedback;
  }

  private getFieldLabel(input: HTMLInputElement): string {
    const label = this.modal?.querySelector(`label[for="${input.id}"]`);
    return label?.textContent || input.name || 'Field';
  }

  private setFieldError(input: HTMLInputElement, message: string): void {
    const errorElement = this.modal?.querySelector(`#${input.id}-error`);
    if (errorElement) {
      errorElement.textContent = message;
      input.classList.toggle('error', !!message);
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
  }

  private clearFieldError(input: HTMLInputElement): void {
    this.setFieldError(input, '');
  }

  private clearAllFieldErrors(): void {
    if (!this.modal) return;

    const errorElements = this.modal.querySelectorAll('.field-error');
    errorElements.forEach(element => {
      element.textContent = '';
    });

    const inputs = this.modal.querySelectorAll('input');
    inputs.forEach(input => {
      input.classList.remove('error');
      input.setAttribute('aria-invalid', 'false');
    });
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
