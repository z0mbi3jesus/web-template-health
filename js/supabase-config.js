// Frontend Supabase Configuration
// This file should be included in your HTML before script.js

// Inject these values from deployment config before loading this script.
const SUPABASE_CONFIG = {
    url: window.__APP_CONFIG__?.SUPABASE_URL,
    anonKey: window.__APP_CONFIG__?.SUPABASE_ANON_KEY
};

const BACKEND_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : (window.__APP_CONFIG__?.BACKEND_URL || 'https://web-template-health.onrender.com');

// Create Supabase client instance
let supabaseClient;

// Initialize Supabase client when script loads
(function initSupabase() {
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
        console.error('Missing frontend Supabase configuration. Set window.__APP_CONFIG__.SUPABASE_URL and SUPABASE_ANON_KEY.');
        return;
    }

    if (typeof window !== 'undefined' && window.supabase) {
        supabaseClient = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        // Attach to window for global access
        window.supabaseClient = supabaseClient;
        console.log('Supabase client initialized');
    } else {
        console.warn('Supabase library not loaded. Please include the CDN script.');
    }
})();

// Auth helper functions
const SupabaseAuth = {
    // Get current user session
    async getCurrentUser() {
        if (!supabaseClient) return null;
        
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) {
            console.error('Error getting current user:', error);
            return null;
        }
        return user;
    },

    // Get current session
    async getCurrentSession() {
        if (!supabaseClient) return null;
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error('Error getting session:', error);
            return null;
        }
        return session;
    },

    // Sign up new user
    async signUp(email, password, metadata = {}) {
        if (!supabaseClient) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });
        
        if (error) throw error;
        return data;
    },

    // Sign in user
    async signIn(email, password) {
        if (!supabaseClient) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        return data;
    },

    // Sign out user
    async signOut() {
        if (!supabaseClient) throw new Error('Supabase not initialized');
        
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    },

    // Listen to auth state changes
    onAuthStateChange(callback) {
        if (!supabaseClient) return () => {};
        
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(callback);
        return subscription;
    }
};

// API helper functions
const SupabaseAPI = {
    // Make authenticated API request
    async makeRequest(endpoint, options = {}) {
        const session = await SupabaseAuth.getCurrentSession();
        const token = session?.access_token;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        if (!BACKEND_BASE_URL) {
            throw new Error('Missing backend configuration. Set window.__APP_CONFIG__.BACKEND_URL.');
        }
            
        const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, finalOptions);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        return response.json();
    },

    // Get appointment types
    async getAppointmentTypes() {
        return this.makeRequest('/api/appointment-types');
    },

    // Get available slots
    async getAvailableSlots(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.makeRequest(`/api/available-slots?${params}`);
    },

    // Create appointment
    async createAppointment(appointmentData) {
        return this.makeRequest('/api/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    },

    // Get user appointments
    async getUserAppointments() {
        return this.makeRequest('/api/appointments');
    },

    // Update appointment status
    async updateAppointmentStatus(appointmentId, status, notes = '') {
        return this.makeRequest(`/api/appointments/${appointmentId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, staff_notes: notes })
        });
    }
};

// Export for use in other scripts
window.SupabaseAuth = SupabaseAuth;
window.SupabaseAPI = SupabaseAPI;