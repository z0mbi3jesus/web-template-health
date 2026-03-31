// Health Professional Website JavaScript
function safeInit(initFn, label) {
    try {
        initFn();
    } catch (error) {
        console.error(`Initialization failed for ${label}:`, error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality with isolation so one failure does not block auth/signup.
    safeInit(initNavigation, 'navigation');
    safeInit(initScrollEffects, 'scroll-effects');
    safeInit(initFormValidation, 'form-validation');
    safeInit(initSmoothScrolling, 'smooth-scrolling');
    safeInit(initAnimations, 'animations');
    safeInit(initAccessibility, 'accessibility');
    safeInit(initCookieConsent, 'cookie-consent');
    safeInit(initModals, 'modals');
    safeInit(initAuthForms, 'auth-forms');
    safeInit(initBookingForm, 'booking-form');

    // Small delay to ensure Supabase is initialized
    setTimeout(() => {
        safeInit(checkAuthState, 'auth-state-check');
        safeInit(initAuthStateListener, 'auth-state-listener');
    }, 100);
});

// Navigation functionality
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
            
            // Animate hamburger
            const spans = hamburger.querySelectorAll('span');
            if (hamburger.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });

        // Close mobile menu when clicking on nav links
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
                
                const spans = hamburger.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
                
                const spans = hamburger.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }

    // Navbar scroll effect
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Active nav link highlighting
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', function() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// Smooth scrolling functionality
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.offsetTop - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Form validation and submission
function initFormValidation() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const formObject = {};
            
            // Convert FormData to object
            formData.forEach((value, key) => {
                formObject[key] = value;
            });
            
            // Validate form
            const validation = validateForm(formObject);
            
            if (validation.isValid) {
                submitForm(formObject);
            } else {
                showValidationErrors(validation.errors);
            }
        });

        // Real-time validation
        const inputs = contactForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', function() {
                clearFieldError(this);
            });
        });
    }
}

// Form validation functions
function validateForm(data) {
    const errors = {};
    let isValid = true;

    // Name validation
    if (!data.name || data.name.trim().length < 2) {
        errors.name = 'Please enter your full name (at least 2 characters)';
        isValid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        errors.email = 'Please enter a valid email address';
        isValid = false;
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!data.phone || !phoneRegex.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
        errors.phone = 'Please enter a valid phone number';
        isValid = false;
    }

    // Service selection validation
    if (!data.service) {
        errors.service = 'Please select a service';
        isValid = false;
    }

    return { isValid, errors };
}

function validateField(field) {
    const fieldName = field.name;
    const fieldValue = field.value;
    const formData = {};
    formData[fieldName] = fieldValue;
    
    const validation = validateForm(formData);
    
    if (validation.errors[fieldName]) {
        showFieldError(field, validation.errors[fieldName]);
    } else {
        clearFieldError(field);
    }
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = 'var(--error-color)';
    errorElement.style.fontSize = 'var(--font-size-sm)';
    errorElement.style.marginTop = 'var(--spacing-xs)';
    
    field.parentNode.appendChild(errorElement);
}

function clearFieldError(field) {
    field.classList.remove('error');
    
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

function showValidationErrors(errors) {
    Object.keys(errors).forEach(fieldName => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            showFieldError(field, errors[fieldName]);
        }
    });

    // Show general error message
    showNotification('Please correct the errors below and try again.', 'error');
}

// Form submission
function submitForm(formData) {
    const submitButton = document.querySelector('#contactForm button[type="submit"]');
    
    // Show loading state
    if (submitButton) {
        submitButton.classList.add('loading');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
    }

    // Simulate form submission (replace with actual API call)
    setTimeout(() => {
        // Reset button state
        if (submitButton) {
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            submitButton.textContent = 'Schedule Consultation';
        }

        // Show success message
        showNotification('Thank you! Your consultation request has been submitted. We\'ll contact you within 24 hours to confirm your appointment.', 'success');
        
        // Reset form
        document.getElementById('contactForm').reset();
        
        // Clear any existing errors
        const errorElements = document.querySelectorAll('.field-error');
        errorElements.forEach(error => error.remove());
        
        const errorFields = document.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));
        
    }, 2000);
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '90px',
        right: '20px',
        backgroundColor: type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : 'var(--primary-color)',
        color: 'white',
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: '9999',
        maxWidth: '400px',
        animation: 'slideInRight 0.3s ease-out'
    });
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Close button functionality
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', function() {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Scroll effects and animations
function initScrollEffects() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.service-card, .testimonial-card, .feature, .hero-card');
    animateElements.forEach(element => {
        element.classList.add('animate-on-scroll');
        observer.observe(element);
    });

    // Counter animation for stats
    const stats = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => {
        statsObserver.observe(stat);
    });
}

function animateCounter(element) {
    const target = parseInt(element.textContent.replace(/\D/g, ''));
    const duration = 2000;
    const start = performance.now();
    const suffix = element.textContent.replace(/\d/g, '');

    function updateCounter(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(progress * target);
        element.textContent = current + suffix;

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }

    requestAnimationFrame(updateCounter);
}

// Initialize animations
function initAnimations() {
    // Add CSS for scroll animations
    const style = document.createElement('style');
    style.textContent = `
        .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease-out;
        }
        
        .animate-on-scroll.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: var(--spacing-xs);
            margin-left: auto;
        }
        
        .notification-close:hover {
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);
}

// Accessibility enhancements
function initAccessibility() {
    // Skip to main content link
    const skipLink = document.createElement('a');
    skipLink.href = '#home';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--primary-color);
        color: white;
        padding: 8px;
        text-decoration: none;
        z-index: 9999;
        border-radius: 4px;
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', function() {
        this.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', function() {
        this.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Enhanced keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Escape key closes mobile menu
        if (e.key === 'Escape') {
            const navMenu = document.querySelector('.nav-menu');
            const hamburger = document.querySelector('.hamburger');
            
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
                
                const spans = hamburger.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        }
    });

    // ARIA labels for better screen reader support
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
        hamburger.setAttribute('aria-label', 'Toggle navigation menu');
        hamburger.setAttribute('aria-expanded', 'false');
        
        hamburger.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
        });
    }

    // Form accessibility enhancements
    const formInputs = document.querySelectorAll('#contactForm input, #contactForm select, #contactForm textarea');
    formInputs.forEach(input => {
        // Add aria-describedby for error messages
        input.addEventListener('invalid', function() {
            this.setAttribute('aria-invalid', 'true');
        });
        
        input.addEventListener('input', function() {
            if (this.getAttribute('aria-invalid')) {
                this.removeAttribute('aria-invalid');
            }
        });
    });
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Performance optimizations
window.addEventListener('scroll', throttle(function() {
    // Throttled scroll events
}, 16)); // 60fps

window.addEventListener('resize', debounce(function() {
    // Debounced resize events
}, 250));

// Error handling
window.addEventListener('error', function(e) {
    console.error('Website error:', e.error);
    // In production, you might want to send this to an error tracking service
});

// Service Worker registration (for future PWA functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Uncomment when you have a service worker
        // navigator.serviceWorker.register('/sw.js');
    });
}



// Cookie Consent Management
function initCookieConsent() {
    const cookieConsent = document.getElementById('cookieConsent');
    const cookieModal = document.getElementById('cookieModal');
    const acceptAllBtn = document.getElementById('acceptAll');
    const acceptSelectedBtn = document.getElementById('acceptSelected');
    const cookieSettingsBtn = document.getElementById('cookieSettings');
    const closeCookieModalBtn = document.getElementById('closeCookieModal');
    const saveCookiePreferencesBtn = document.getElementById('saveCookiePreferences');

    // Check if user has already made cookie choices
    if (!getCookie('cookieConsent')) {
        // Show cookie banner after 2 seconds
        setTimeout(() => {
            cookieConsent.classList.add('show');
        }, 2000);
    } else {
        // Apply saved cookie preferences
        applyCookiePreferences();
    }

    // Accept all cookies
    acceptAllBtn.addEventListener('click', function() {
        const preferences = {
            essential: true,
            analytics: true,
            marketing: true,
            timestamp: new Date().toISOString()
        };
        saveCookiePreferences(preferences);
        hideCookieBanner();
    });

    // Accept selected cookies
    acceptSelectedBtn.addEventListener('click', function() {
        const analyticsCookies = document.getElementById('analyticsCookies');
        const marketingCookies = document.getElementById('marketingCookies');
        
        const preferences = {
            essential: true,
            analytics: analyticsCookies ? analyticsCookies.checked : false,
            marketing: marketingCookies ? marketingCookies.checked : false,
            timestamp: new Date().toISOString()
        };
        saveCookiePreferences(preferences);
        hideCookieBanner();
    });

    // Show cookie settings modal
    cookieSettingsBtn.addEventListener('click', function() {
        showCookieModal();
    });

    // Close cookie modal
    closeCookieModalBtn.addEventListener('click', function() {
        hideCookieModal();
    });

    // Save cookie preferences from modal
    saveCookiePreferencesBtn.addEventListener('click', function() {
        const analyticsCookies = document.getElementById('analyticsCookies');
        const marketingCookies = document.getElementById('marketingCookies');
        
        const preferences = {
            essential: true,
            analytics: analyticsCookies.checked,
            marketing: marketingCookies.checked,
            timestamp: new Date().toISOString()
        };
        saveCookiePreferences(preferences);
        hideCookieModal();
        hideCookieBanner();
    });

    // Close modal when clicking outside
    cookieModal.addEventListener('click', function(e) {
        if (e.target === cookieModal) {
            hideCookieModal();
        }
    });
}

// Cookie utility functions
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function saveCookiePreferences(preferences) {
    setCookie('cookieConsent', JSON.stringify(preferences), 365);
    applyCookiePreferences(preferences);
}

function applyCookiePreferences(preferences = null) {
    if (!preferences) {
        const saved = getCookie('cookieConsent');
        preferences = saved ? JSON.parse(saved) : null;
    }
    
    if (preferences) {
        // Apply analytics cookies
        if (preferences.analytics) {
            // Initialize Google Analytics or other analytics tools
            console.log('Analytics cookies enabled');
            // Example: gtag('config', 'GA_MEASUREMENT_ID');
        }
        
        // Apply marketing cookies
        if (preferences.marketing) {
            // Initialize marketing/advertising tools
            console.log('Marketing cookies enabled');
            // Example: Initialize Facebook Pixel, Google Ads, etc.
        }
        
        // Update UI to reflect current preferences
        const analyticsCookies = document.getElementById('analyticsCookies');
        const marketingCookies = document.getElementById('marketingCookies');
        
        if (analyticsCookies) analyticsCookies.checked = preferences.analytics;
        if (marketingCookies) marketingCookies.checked = preferences.marketing;
    }
}

function showCookieModal() {
    const cookieModal = document.getElementById('cookieModal');
    cookieModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideCookieModal() {
    const cookieModal = document.getElementById('cookieModal');
    cookieModal.classList.remove('show');
    document.body.style.overflow = '';
}

function hideCookieBanner() {
    const cookieConsent = document.getElementById('cookieConsent');
    cookieConsent.classList.remove('show');
}

// Modal Management
function initModals() {
    const signinModal = document.getElementById('signinModal');
    const signupModal = document.getElementById('signupModal');
    
    // Navigation buttons
    const signinBtns = document.querySelectorAll('[data-action="signin"]');
    const signupBtns = document.querySelectorAll('[data-action="signup"]');
    
    // Close buttons
    const closeSigninBtn = document.getElementById('closeSigninModal');
    const closeSignupBtn = document.getElementById('closeSignupModal');
    
    // Switch between modals
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToSignin = document.getElementById('switchToSignin');

    // Open signin modal
    signinBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            showModal(signinModal);
        });
    });

    // Open signup modal
    signupBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            showModal(signupModal);
        });
    });

    // Close modals
    closeSigninBtn.addEventListener('click', () => hideModal(signinModal));
    closeSignupBtn.addEventListener('click', () => hideModal(signupModal));

    // Switch between modals
    if (switchToSignup) {
        switchToSignup.addEventListener('click', function(e) {
            e.preventDefault();
            hideModal(signinModal);
            showModal(signupModal);
        });
    }

    if (switchToSignin) {
        switchToSignin.addEventListener('click', function(e) {
            e.preventDefault();
            hideModal(signupModal);
            showModal(signinModal);
        });
    }

    // Close modals when clicking outside
    [signinModal, signupModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    hideModal(modal);
                }
            });
        }
    });

    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideModal(signinModal);
            hideModal(signupModal);
        }
    });
}

function showModal(modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Focus on first input
    const firstInput = modal.querySelector('input');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function hideModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // Reset form
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
        clearFormErrors(form);
    }
}

// Authentication Forms
function initAuthForms() {
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');

    // Signin form submission
    if (signinForm) {
        signinForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleSignin(this);
        });
    }

    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleSignup(this);
        });

        // Real-time password validation
        const password = signupForm.querySelector('#signupPassword');
        const confirmPassword = signupForm.querySelector('#confirmPassword');
        
        if (password && confirmPassword) {
            confirmPassword.addEventListener('input', function() {
                validatePasswordMatch(password, confirmPassword);
            });
            
            password.addEventListener('input', function() {
                validatePasswordStrength(password);
                if (confirmPassword.value) {
                    validatePasswordMatch(password, confirmPassword);
                }
            });
        }
    }
}

async function handleSignin(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Signing In...';
        submitBtn.disabled = true;
        
        clearFormErrors(form);
        
        const formData = new FormData(form);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        // Validate form
        if (!validateEmail(credentials.email)) {
            showFormError(form, 'email', 'Please enter a valid email address');
            return;
        }

        if (!credentials.password) {
            showFormError(form, 'password', 'Password is required');
            return;
        }

        // Authenticate with Supabase
        const authResult = await SupabaseAuth.signIn(credentials.email, credentials.password);
        
        if (authResult.user) {
            // Store the Supabase JWT for backend API calls
            localStorage.setItem('authToken', authResult.session.access_token);
            localStorage.setItem('userId', authResult.user.id);
            localStorage.setItem('userEmail', authResult.user.email);
            
            let userRole = 'client'; // Default role
            let userName = authResult.user.email;
            
            // Try backend login to fetch role/token (uses service role, bypasses RLS)
            try {
                const backendData = await SupabaseAPI.makeRequest('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify(credentials)
                });

                if (backendData?.user) {
                    userRole = backendData.user.role || 'client';
                    userName = backendData.user.name || backendData.user.email || userName;
                    localStorage.setItem('authToken', backendData.token);
                    console.log('✅ Fetched role from backend login:', userRole);
                }
            } catch (error) {
                console.log('Note: Backend login failed, falling back to Supabase', error);
            }

            // Fallback: Try to fetch user profile from Supabase users table
            if (userRole === 'client') {
                try {
                    const { data: userData, error: userError } = await window.supabaseClient
                        .from('users')
                        .select('id, email, name, role')
                        .eq('id', authResult.user.id)
                        .single();
                    
                    console.log('User data fetch result:', { userData, userError });
                    
                    if (userData && !userError) {
                        userRole = userData.role || 'client';
                        userName = userData.name || userData.email;
                        console.log('✅ Fetched role from database:', userRole);
                    } else {
                        console.log('⚠️ Could not fetch role, using default:', userError);
                    }
                } catch (error) {
                    console.log('Note: Could not fetch user profile, using defaults', error);
                    // Continue with default role
                }
            }
            
            console.log('Final user role:', userRole);
            
            // Store user info
            localStorage.setItem('userRole', userRole);
            localStorage.setItem('userName', userName);
            
            // Hide modal
            hideModal(document.getElementById('signinModal'));
            
            // Create user object for UI
            const userData = {
                id: authResult.user.id,
                email: authResult.user.email,
                name: userName,
                role: userRole
            };
            
            // Redirect based on role
            console.log('Checking redirect... Role is:', userRole);
            if (userRole === 'admin' || userRole === 'staff') {
                console.log('🎯 Admin/Staff detected - redirecting to admin panel');
                showSuccessMessage('Welcome back! Redirecting to admin panel...');
                setTimeout(() => {
                    console.log('Redirecting now...');
                    window.location.href = 'admin-panel.html';
                }, 1500);
            } else {
                console.log('Client user detected - staying on logged-in landing page');
                showSuccessMessage('Welcome back! You are now signed in.');
                updateUIForAuthenticatedUser(userData);
            }
        }
    } catch (error) {
        console.error('Signin error:', error);
        let errorMessage = 'Invalid email or password';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Network')) {
            errorMessage = 'Network error. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and confirm your account before signing in.';
        }
        
        showFormError(form, 'general', errorMessage);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleSignup(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;
        
        clearFormErrors(form);
        
        const formData = new FormData(form);
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        // Validate form
        if (!validateSignupForm(form, userData)) {
            return;
        }

        // Create account with Supabase Auth
        console.log('📝 Creating Supabase account for:', userData.email);
        const authResult = await SupabaseAuth.signUp(userData.email, userData.password, {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            role: 'client' // New users default to client role
        });
        
        console.log('✅ Supabase auth created:', authResult.user.id);
        
        // Create user profile in the users table
        try {
            console.log('📊 Creating user profile in database...');
            const { data: profileData, error: profileError } = await window.supabaseClient
                .from('users')
                .insert([{
                    id: authResult.user.id,
                    email: userData.email,
                    name: `${userData.firstName} ${userData.lastName}`,
                    phone: userData.phone,
                    role: 'client',
                    is_active: true
                }])
                .select();
            
            if (profileError) {
                console.error('⚠️ Profile creation error:', profileError);
                // Don't fail signup if profile creation fails - user can still sign in
                // We'll create the profile later if needed
            } else {
                console.log('✅ User profile created successfully');
            }
        } catch (profileErr) {
            console.log('Note: Profile auto-creation skipped (will be created on first login):', profileErr);
            // Continue anyway - sign up was successful
        }
        
        // Show success message
        showSuccessMessage('Account created successfully! Signing you in...');
        
        // Auto sign in the new user
        setTimeout(async () => {
            try {
                const signInResult = await SupabaseAuth.signIn(userData.email, userData.password);
                
                if (signInResult.user) {
                    // Store the Supabase JWT for backend API calls
                    localStorage.setItem('authToken', signInResult.session.access_token);
                    localStorage.setItem('userId', signInResult.user.id);
                    localStorage.setItem('userEmail', signInResult.user.email);
                    localStorage.setItem('userRole', 'client');
                    localStorage.setItem('userName', `${userData.firstName} ${userData.lastName}`);
                    
                    // Hide modal
                    hideModal(document.getElementById('signupModal'));
                    
                    showSuccessMessage('Welcome to our clinic! You can now book your first appointment.');
                    updateUIForAuthenticatedUser({
                        id: signInResult.user.id,
                        email: signInResult.user.email,
                        name: `${userData.firstName} ${userData.lastName}`,
                        role: 'client'
                    });
                }
            } catch (signInError) {
                console.error('Auto sign-in error:', signInError);
                // Fall back to showing signin modal
                hideModal(document.getElementById('signupModal'));
                showModal(document.getElementById('signinModal'));
                
                // Pre-fill email in signin form
                const signinEmail = document.getElementById('signinEmail');
                if (signinEmail) {
                    signinEmail.value = userData.email;
                }
            }
        }, 1500);

    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message.includes('Password') || error.message.includes('password')) {
            errorMessage = 'Password is too weak. Please use at least 8 characters with uppercase, lowercase, and numbers.';
        } else if (error.message.includes('email')) {
            errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('Network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        showFormError(form, 'general', errorMessage);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Form validation functions
function validateSignupForm(form, userData) {
    let isValid = true;

    // Name validation
    if (!userData.firstName.trim()) {
        showFormError(form, 'firstName', 'First name is required');
        isValid = false;
    }

    if (!userData.lastName.trim()) {
        showFormError(form, 'lastName', 'Last name is required');
        isValid = false;
    }

    // Email validation
    if (!validateEmail(userData.email)) {
        showFormError(form, 'signupEmail', 'Please enter a valid email address');
        isValid = false;
    }

    // Phone validation
    if (!validatePhone(userData.phone)) {
        showFormError(form, 'phone', 'Please enter a valid phone number');
        isValid = false;
    }

    // Password validation
    if (!validatePasswordStrength(form.querySelector('#signupPassword'))) {
        isValid = false;
    }

    // Password confirmation
    if (!validatePasswordMatch(form.querySelector('#signupPassword'), form.querySelector('#confirmPassword'))) {
        isValid = false;
    }

    // Terms acceptance
    const termsCheckbox = form.querySelector('#termsAccept');
    if (!termsCheckbox.checked) {
        showFormError(form, 'termsAccept', 'You must accept the Terms of Service');
        isValid = false;
    }

    return isValid;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

function validatePasswordStrength(passwordInput) {
    const password = passwordInput.value;
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (password.length < minLength) {
        showFormError(passwordInput.form, passwordInput.name, 'Password must be at least 8 characters long');
        return false;
    }
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        showFormError(passwordInput.form, passwordInput.name, 'Password must contain uppercase, lowercase, and numbers');
        return false;
    }
    
    clearFormError(passwordInput.form, passwordInput.name);
    return true;
}

function validatePasswordMatch(passwordInput, confirmPasswordInput) {
    if (passwordInput.value !== confirmPasswordInput.value) {
        showFormError(confirmPasswordInput.form, confirmPasswordInput.name, 'Passwords do not match');
        return false;
    }
    
    clearFormError(confirmPasswordInput.form, confirmPasswordInput.name);
    return true;
}

function showFormError(form, fieldName, message) {
    clearFormError(form, fieldName);
    
    const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
    if (field) {
        field.style.borderColor = '#ef4444';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.style.color = '#ef4444';
        errorDiv.style.fontSize = '14px';
        errorDiv.style.marginTop = '4px';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    } else if (fieldName === 'general') {
        // Show general error at top of form
        const existingError = form.querySelector('.form-general-error');
        if (existingError) {
            existingError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-general-error';
        errorDiv.style.background = '#fef2f2';
        errorDiv.style.border = '1px solid #fecaca';
        errorDiv.style.color = '#dc2626';
        errorDiv.style.padding = '12px';
        errorDiv.style.borderRadius = '6px';
        errorDiv.style.marginBottom = '16px';
        errorDiv.textContent = message;
        
        form.insertBefore(errorDiv, form.firstChild);
    }
}

function clearFormError(form, fieldName) {
    const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
    if (field) {
        field.style.borderColor = '';
        const errorDiv = field.parentNode.querySelector('.form-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
}

function clearFormErrors(form) {
    // Clear field errors
    const errors = form.querySelectorAll('.form-error');
    errors.forEach(error => error.remove());
    
    // Clear general errors
    const generalErrors = form.querySelectorAll('.form-general-error');
    generalErrors.forEach(error => error.remove());
    
    // Reset field border colors
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.style.borderColor = '';
    });
}

function showSuccessMessage(message) {
    // Create success notification
    const successDiv = document.createElement('div');
    successDiv.style.position = 'fixed';
    successDiv.style.top = '20px';
    successDiv.style.right = '20px';
    successDiv.style.background = '#10b981';
    successDiv.style.color = 'white';
    successDiv.style.padding = '16px 24px';
    successDiv.style.borderRadius = '8px';
    successDiv.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
    successDiv.style.zIndex = '30000';
    successDiv.style.fontWeight = '500';
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    // Animate in
    successDiv.style.transform = 'translateX(100%)';
    successDiv.style.transition = 'transform 0.3s ease';
    setTimeout(() => {
        successDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        successDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 300);
    }, 5000);
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser(user) {
    // Update navigation menu
    const signinBtn = document.querySelector('[data-action="signin"]');
    const signupBtn = document.querySelector('[data-action="signup"]');
    
    if (signinBtn && signupBtn) {
        // Replace signin/signup buttons with user menu
        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <span class="user-name">Welcome, ${user.name.split(' ')[0]}!</span>
            <button class="btn-secondary" onclick="handleSignOut()">Sign Out</button>
        `;
        
        // Replace the signup button with user menu
        signupBtn.parentNode.replaceChild(userMenu, signupBtn);
        signinBtn.style.display = 'none';
    }
    
    // Update hero section if user is on main page
    const heroButtons = document.querySelector('.hero-buttons');
    if (heroButtons) {
        heroButtons.innerHTML = `
            <button onclick="showModal(document.getElementById('bookingModal'))" class="btn btn-primary">Book Appointment</button>
            <a href="#" class="btn btn-secondary" onclick="loadUserDashboard()">My Dashboard</a>
        `;
    }
}

// Handle sign out
async function handleSignOut() {
    try {
        await SupabaseAuth.signOut();
        
        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        
        // Show success message
        showSuccessMessage('You have been signed out successfully.');
        
        // Reload page to reset UI
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Sign out error:', error);
        showSuccessMessage('You have been signed out.');
        window.location.reload();
    }
}

// Load user dashboard (placeholder)
function loadUserDashboard() {
    window.location.href = 'patient-hub.html';
}

// Check authentication state on page load
async function checkAuthState() {
    const fromDashboard = new URLSearchParams(window.location.search).get('fromDashboard') === '1';
    const storedUser = {
        id: localStorage.getItem('userId'),
        email: localStorage.getItem('userEmail'),
        name: localStorage.getItem('userName'),
        role: localStorage.getItem('userRole') || 'client',
        token: localStorage.getItem('authToken')
    };

    // Use real stored fields (not the defaulted role) for identity check.
    const hasStoredIdentity = Boolean(storedUser.email || storedUser.name || storedUser.id);
    const hasStoredAuth = Boolean(storedUser.token && hasStoredIdentity);

    const fallbackUser = {
        id: storedUser.id || '',
        email: storedUser.email || 'patient@local',
        name: storedUser.name || storedUser.email || 'Patient',
        role: storedUser.role
    };

    // Synchronous fast-path: returning from dashboard + stored identity → restore UI
    // immediately without waiting for any async operations that may be slow or fail.
    if (fromDashboard && hasStoredIdentity) {
        updateUIForAuthenticatedUser(fallbackUser);
        return;
    }

    try {
        const session = await SupabaseAuth.getCurrentSession();
        if (session?.user) {
            try {
                const userProfile = await SupabaseAPI.makeRequest('/api/auth/me');
                updateUIForAuthenticatedUser(userProfile.user);
            } catch (_apiErr) {
                // Backend unreachable — fall back to local identity
                updateUIForAuthenticatedUser(fallbackUser);
            }
            return;
        }

        if (hasStoredAuth) {
            updateUIForAuthenticatedUser(fallbackUser);
            return;
        }
    } catch (error) {
        console.log('No active session');

        if (hasStoredAuth) {
            updateUIForAuthenticatedUser(fallbackUser);
            return;
        }

        // Clear any stale tokens when no usable auth context exists.
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
    }
}

// Listen for auth state changes
function initAuthStateListener() {
    if (typeof SupabaseAuth !== 'undefined') {
        SupabaseAuth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            
            if (event === 'SIGNED_IN' && session?.user) {
                // User signed in - the UI will be updated by the sign in handler
                console.log('User signed in');
            } else if (event === 'SIGNED_OUT') {
                // User signed out
                console.log('User signed out');
                // UI reset will be handled by sign out handler
            }
        });
    }
}

// Appointment Booking
function initBookingForm() {
    const bookingForm = document.getElementById('bookingForm');
    const bookingModal = document.getElementById('bookingModal');
    const closeBookingBtn = document.getElementById('closeBookingModal');
    const serviceSelect = document.getElementById('appointmentService');
    const availableSlotsContainer = document.getElementById('availableSlotsContainer');
    
    if (!bookingForm) return;

    // Load appointment services on modal init
    loadAppointmentServices();

    // Close booking modal
    if (closeBookingBtn) {
        closeBookingBtn.addEventListener('click', () => hideModal(bookingModal));
    }

    // Close modal when clicking outside
    if (bookingModal) {
        bookingModal.addEventListener('click', function(e) {
            if (e.target === bookingModal) {
                hideModal(bookingModal);
            }
        });
    }

    // Service selection - load available slots
    if (serviceSelect) {
        serviceSelect.addEventListener('change', async function() {
            const serviceId = this.value;
            availableSlotsContainer.style.display = serviceId ? 'block' : 'none';
            
            if (serviceId) {
                await loadAvailableSlots(serviceId);
            }
        });
    }

    // Form submission
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleBooking(this);
    });
}

async function loadAppointmentServices() {
    try {
        const data = await SupabaseAPI.makeRequest('/api/appointments/types');

        if (!data.success || !data.appointmentTypes) {
            console.error('Failed to load appointment types');
            return;
        }

        const serviceSelect = document.getElementById('appointmentService');
        serviceSelect.innerHTML = '<option value="">Choose a service...</option>';

        data.appointmentTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            option.dataset.duration = type.duration_minutes;
            serviceSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading services:', error);
    }
}

async function loadAvailableSlots(serviceId) {
    try {
        console.log('Loading available slots for service:', serviceId);
        
        const data = await SupabaseAPI.makeRequest(`/api/appointments/available?service_id=${serviceId}`);

        if (!data.success) {
            console.error('Failed to load slots:', data.error);
            return;
        }

        const dateSelect = document.getElementById('appointmentDate');
        const timeSelect = document.getElementById('appointmentTime');
        const providerSelect = document.getElementById('appointmentProvider');

        dateSelect.innerHTML = '<option value="">Choose a date...</option>';
        timeSelect.innerHTML = '<option value="">Choose a time...</option>';
        providerSelect.innerHTML = '<option value="">Select a provider...</option>';

        if (data.availableSlots.length === 0) {
            dateSelect.innerHTML = '<option value="">No available slots</option>';
            return;
        }

        // Populate dates
        data.availableSlots.forEach(daySlots => {
            const option = document.createElement('option');
            option.value = daySlots.date;
            option.textContent = `${daySlots.day_name} - ${new Date(daySlots.date).toLocaleDateString()}`;
            dateSelect.appendChild(option);
        });

        // Store slots for later use
        window.availableSlotsData = data.availableSlots;

        // Add change listener to date select
        dateSelect.addEventListener('change', function() {
            populateTimeSlots(this.value, serviceId);
        });

    } catch (error) {
        console.error('Error loading slots:', error);
        showSuccessMessage('Failed to load available slots. Please try again.');
    }
}

function populateTimeSlots(selectedDate, serviceId) {
    const timeSelect = document.getElementById('appointmentTime');
    const providerSelect = document.getElementById('appointmentProvider');
    const slots = window.availableSlotsData.find(d => d.date === selectedDate);

    timeSelect.innerHTML = '<option value="">Choose a time...</option>';
    providerSelect.innerHTML = '<option value="">Select a provider...</option>';

    if (!slots) return;

    // Use a Set to avoid duplicate times
    const timesSet = new Set();
    const providersMap = new Map();

    slots.slots.forEach(slot => {
        const timeStr = `${slot.start_time} - ${slot.end_time}`;
        timesSet.add(timeStr);
        
        // Store provider info
        if (!providersMap.has(slot.staff_id)) {
            providersMap.set(slot.staff_id, {
                id: slot.staff_id,
                name: `${slot.staff_first_name} ${slot.staff_last_name}`,
                availableTimes: []
            });
        }
        providersMap.get(slot.staff_id).availableTimes.push(timeStr);
    });

    // Populate time slots
    timesSet.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        timeSelect.appendChild(option);
    });

    // Populate providers
    providersMap.forEach((provider, staffId) => {
        const option = document.createElement('option');
        option.value = staffId;
        option.textContent = provider.name;
        option.dataset.availableTimes = JSON.stringify(provider.availableTimes);
        providerSelect.appendChild(option);
    });
}

async function handleBooking(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Check if user is logged in
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showFormError(form, 'general', 'Please sign in first to book an appointment');
            return;
        }

        submitBtn.textContent = 'Booking Appointment...';
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const selectedDate = formData.get('date');
        const selectedTime = formData.get('time');
        const staffId = formData.get('provider');
        const notes = formData.get('notes');
        const serviceId = formData.get('service');

        // Validate all fields
        if (!selectedDate || !selectedTime || !staffId || !serviceId) {
            showFormError(form, 'general', 'Please select all required fields');
            return;
        }

        // Parse start and end times
        const [startTime, endTime] = selectedTime.split(' - ');

        const bookingData = {
            appointment_type_id: serviceId,
            staff_id: staffId,
            appointment_date: selectedDate,
            start_time: startTime.trim(),
            end_time: endTime.trim(),
            notes: notes || null
        };

        console.log('Booking appointment:', bookingData);

        // Call backend API
        const result = await SupabaseAPI.makeRequest('/api/appointments', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });

        showSuccessMessage('Appointment booked successfully! It is pending staff approval.');
        
        // Clear form and close modal
        setTimeout(() => {
            form.reset();
            hideModal(document.getElementById('bookingModal'));
            // Reload appointments if on dashboard
            if (typeof loadAppointments === 'function') {
                loadAppointments();
            }
        }, 2000);

    } catch (error) {
        console.error('Booking error:', error);
        showFormError(form, 'general', error.message || 'Failed to book appointment');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Initialize privacy compliance and authentication
console.log('Privacy compliance and authentication initialized');

// Auth initialization is handled by the unified DOMContentLoaded listener above.