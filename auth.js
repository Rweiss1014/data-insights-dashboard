// =============================================
// Auth & Dashboard Persistence Module
// =============================================

// Initialize Supabase client (fetched from server)
let supabaseClient = null;
let currentUser = null;

// Fetch config from server and initialize Supabase
async function initSupabase() {
    try {
        console.log('Fetching config from server...');
        const response = await fetch('/api/config');

        if (!response.ok) {
            console.error('Config fetch failed with status:', response.status);
            return false;
        }

        const config = await response.json();
        console.log('Config received:', { authEnabled: config.authEnabled, hasUrl: !!config.supabaseUrl, hasKey: !!config.supabaseAnonKey });

        if (!window.supabase) {
            console.error('Supabase library not loaded - window.supabase is:', window.supabase);
            // Still return true if auth is enabled - button should show even if library fails
            return config.authEnabled;
        }

        if (config.authEnabled && config.supabaseUrl && config.supabaseAnonKey) {
            supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
            console.log('Supabase client initialized successfully');
            return true;
        } else {
            console.log('Supabase not configured - auth features disabled', config);
            return false;
        }
    } catch (err) {
        console.error('Failed to fetch config:', err);
        return false;
    }
}

// DOM Elements
const authBtn = document.getElementById('auth-btn');
const authModal = document.getElementById('auth-modal');
const closeAuth = document.getElementById('close-auth');
const authEmail = document.getElementById('auth-email');
const authSendMagicLink = document.getElementById('auth-send-magic-link');
const authMessage = document.getElementById('auth-message');
const authFormContainer = document.getElementById('auth-form-container');
const authLoggedIn = document.getElementById('auth-logged-in');
const authUserEmail = document.getElementById('auth-user-email');
const authSignOut = document.getElementById('auth-sign-out');

const myDashboardsBtn = document.getElementById('my-dashboards-btn');
const dashboardsModal = document.getElementById('dashboards-modal');
const closeDashboards = document.getElementById('close-dashboards');
const dashboardsLoading = document.getElementById('dashboards-loading');
const dashboardsEmpty = document.getElementById('dashboards-empty');
const dashboardsItems = document.getElementById('dashboards-items');

const saveDashboardBtn = document.getElementById('save-dashboard-btn');
const saveDashboardModal = document.getElementById('save-dashboard-modal');
const closeSaveDashboard = document.getElementById('close-save-dashboard');
const saveDashboardName = document.getElementById('save-dashboard-name');
const saveDashboardDescription = document.getElementById('save-dashboard-description');
const saveDashboardInfo = document.getElementById('save-dashboard-info');
const saveDashboardConfirm = document.getElementById('save-dashboard-confirm');

// =============================================
// Auth Functions
// =============================================

async function initAuth() {
    // Initialize Supabase first
    const initialized = await initSupabase();

    if (!initialized) {
        // Hide auth-related buttons if Supabase isn't configured on server
        console.log('Hiding auth button - auth not enabled on server');
        if (authBtn) authBtn.style.display = 'none';
        return;
    }

    // Make sure auth button is visible when auth IS enabled
    console.log('Auth enabled - showing auth button');
    if (authBtn) authBtn.style.display = '';

    if (!supabaseClient) {
        // Auth is enabled but client failed to initialize - button is visible but will show error on click
        console.warn('Supabase client not initialized - auth button visible but may not work');
        return;
    }

    // Check for existing session
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        currentUser = session.user;
        updateAuthUI(true);
    }

    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            updateAuthUI(true);
            showAuthMessage('Signed in successfully!', 'success');
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            updateAuthUI(false);
        }
    });
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn && currentUser) {
        // Update auth button
        if (authBtn) {
            authBtn.textContent = currentUser.email?.split('@')[0] || 'Account';
            authBtn.classList.remove('bg-gray-800', 'hover:bg-gray-900');
            authBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        }

        // Show dashboard buttons
        if (myDashboardsBtn) myDashboardsBtn.classList.remove('hidden');

        // Show save button if there are charts
        updateSaveButtonVisibility();

        // Update auth modal
        if (authFormContainer) authFormContainer.classList.add('hidden');
        if (authLoggedIn) authLoggedIn.classList.remove('hidden');
        if (authUserEmail) authUserEmail.textContent = currentUser.email;
    } else {
        // Update auth button
        if (authBtn) {
            authBtn.textContent = 'Sign In';
            authBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
            authBtn.classList.add('bg-gray-800', 'hover:bg-gray-900');
        }

        // Hide dashboard buttons
        if (myDashboardsBtn) myDashboardsBtn.classList.add('hidden');
        if (saveDashboardBtn) saveDashboardBtn.classList.add('hidden');

        // Update auth modal
        if (authFormContainer) authFormContainer.classList.remove('hidden');
        if (authLoggedIn) authLoggedIn.classList.add('hidden');
    }
}

function updateSaveButtonVisibility() {
    if (!currentUser || !saveDashboardBtn) return;

    // Check if there are any dashboard charts (using the global from script.js)
    const hasCharts = window.dashboardCharts && window.dashboardCharts.length > 0;

    if (hasCharts) {
        saveDashboardBtn.classList.remove('hidden');
    } else {
        saveDashboardBtn.classList.add('hidden');
    }
}

async function sendMagicLink() {
    if (!supabaseClient || !authEmail) return;

    const email = authEmail.value.trim();
    if (!email) {
        showAuthMessage('Please enter your email address.', 'error');
        return;
    }

    authSendMagicLink.disabled = true;
    authSendMagicLink.textContent = 'Sending...';

    const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: window.location.origin + window.location.pathname
        }
    });

    authSendMagicLink.disabled = false;
    authSendMagicLink.textContent = 'Send Magic Link';

    if (error) {
        showAuthMessage(error.message, 'error');
    } else {
        showAuthMessage('Check your email for the magic link!', 'success');
    }
}

async function signOut() {
    if (!supabaseClient) return;

    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        showAuthMessage(error.message, 'error');
    } else {
        currentUser = null;
        updateAuthUI(false);
        if (authModal) authModal.classList.add('hidden');
    }
}

function showAuthMessage(message, type) {
    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');

    if (type === 'success') {
        authMessage.classList.add('bg-green-100', 'text-green-700');
    } else {
        authMessage.classList.add('bg-red-100', 'text-red-700');
    }
}

// =============================================
// Dashboard Persistence Functions
// =============================================

async function getAuthToken() {
    if (!supabaseClient) return null;

    const { data: { session } } = await supabaseClient.auth.getSession();
    return session?.access_token;
}

async function loadDashboardsList() {
    if (!currentUser) return;

    // Show loading state
    if (dashboardsLoading) dashboardsLoading.classList.remove('hidden');
    if (dashboardsEmpty) dashboardsEmpty.classList.add('hidden');
    if (dashboardsItems) dashboardsItems.classList.add('hidden');

    try {
        const token = await getAuthToken();
        const response = await fetch('/api/dashboards', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch dashboards');

        const dashboards = await response.json();

        // Hide loading
        if (dashboardsLoading) dashboardsLoading.classList.add('hidden');

        if (dashboards.length === 0) {
            if (dashboardsEmpty) dashboardsEmpty.classList.remove('hidden');
        } else {
            if (dashboardsItems) {
                dashboardsItems.classList.remove('hidden');
                renderDashboardsList(dashboards);
            }
        }
    } catch (err) {
        console.error('Error loading dashboards:', err);
        if (dashboardsLoading) dashboardsLoading.textContent = 'Error loading dashboards';
    }
}

function renderDashboardsList(dashboards) {
    if (!dashboardsItems) return;

    dashboardsItems.innerHTML = dashboards.map(d => `
        <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition group">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800">${escapeHtml(d.name)}</h4>
                    ${d.description ? `<p class="text-sm text-gray-500 mt-1">${escapeHtml(d.description)}</p>` : ''}
                    <p class="text-xs text-gray-400 mt-2">
                        Dataset: ${escapeHtml(d.dataset_id)} ·
                        ${new Date(d.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onclick="openSavedDashboard('${d.id}')" class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                        Open
                    </button>
                    <button onclick="deleteSavedDashboard('${d.id}')" class="px-3 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function openSavedDashboard(dashboardId) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`/api/dashboards/${dashboardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load dashboard');

        const dashboard = await response.json();

        // Check if we have the matching dataset loaded
        const currentDatasetId = window.currentDatasetId || (window.allRows && window.allRows[0]?._file);

        if (!currentDatasetId) {
            alert(`Please upload the dataset "${dashboard.datasetId}" first, then load this dashboard again.`);
            return;
        }

        // Close modal
        if (dashboardsModal) dashboardsModal.classList.add('hidden');

        // Clear current dashboard
        if (typeof clearDashboard === 'function') {
            clearDashboard();
        }

        // Apply global filters if any
        if (dashboard.globalFilters && Object.keys(dashboard.globalFilters).length > 0) {
            window.dashboardFilters = dashboard.globalFilters;
        }

        // Rebuild each card
        dashboard.cards.forEach((card, idx) => {
            // Use the existing function to add chart to dashboard
            if (typeof addChartToDashboard === 'function') {
                addChartToDashboard(card.config, card.title);
            } else {
                console.warn('addChartToDashboard function not found');
            }
        });

        // Switch to dashboard tab
        const tabDashboard = document.getElementById('tab-dashboard');
        if (tabDashboard) tabDashboard.click();

        showAlert(`Loaded dashboard: ${dashboard.name}`, 'success');

    } catch (err) {
        console.error('Error opening dashboard:', err);
        alert('Failed to load dashboard. Please try again.');
    }
}

async function deleteSavedDashboard(dashboardId) {
    if (!confirm('Are you sure you want to delete this dashboard?')) return;

    try {
        const token = await getAuthToken();
        const response = await fetch(`/api/dashboards/${dashboardId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete dashboard');

        // Refresh list
        loadDashboardsList();
        showAlert('Dashboard deleted', 'info');

    } catch (err) {
        console.error('Error deleting dashboard:', err);
        alert('Failed to delete dashboard. Please try again.');
    }
}

async function saveCurrentDashboard() {
    const name = saveDashboardName?.value.trim();
    if (!name) {
        alert('Please enter a dashboard name');
        return;
    }

    const description = saveDashboardDescription?.value.trim() || '';

    // Get current dataset identifier
    const datasetId = window.currentDatasetId ||
                      (window.allRows && window.allRows[0]?._file) ||
                      'unknown';

    // Get current dashboard charts
    const charts = window.dashboardCharts || [];

    const payload = {
        name,
        description,
        datasetId,
        globalFilters: window.dashboardFilters || {},
        cards: charts.map((chart, idx) => ({
            position: idx,
            title: chart.config?.title || '',
            chartType: chart.config?.chartType || 'bar',
            config: chart.config
        }))
    };

    saveDashboardConfirm.disabled = true;
    saveDashboardConfirm.textContent = 'Saving...';

    try {
        const token = await getAuthToken();
        const response = await fetch('/api/dashboards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to save dashboard');

        const result = await response.json();

        // Close modal and reset
        if (saveDashboardModal) saveDashboardModal.classList.add('hidden');
        if (saveDashboardName) saveDashboardName.value = '';
        if (saveDashboardDescription) saveDashboardDescription.value = '';

        showAlert('Dashboard saved!', 'success');

    } catch (err) {
        console.error('Error saving dashboard:', err);
        alert('Failed to save dashboard. Please try again.');
    } finally {
        saveDashboardConfirm.disabled = false;
        saveDashboardConfirm.textContent = 'Save Dashboard';
    }
}

function openSaveModal() {
    if (!currentUser) {
        alert('Please sign in to save dashboards');
        if (authModal) authModal.classList.remove('hidden');
        return;
    }

    // Update info
    const chartCount = window.dashboardCharts?.length || 0;
    const datasetId = window.currentDatasetId ||
                      (window.allRows && window.allRows[0]?._file) ||
                      'Unknown';

    if (saveDashboardInfo) {
        saveDashboardInfo.textContent = `${chartCount} chart(s) · Dataset: ${datasetId}`;
    }

    if (saveDashboardModal) saveDashboardModal.classList.remove('hidden');
}

// =============================================
// Event Listeners
// =============================================

// Auth modal
if (authBtn) {
    authBtn.addEventListener('click', () => {
        if (authModal) authModal.classList.remove('hidden');
    });
}

if (closeAuth) {
    closeAuth.addEventListener('click', () => {
        if (authModal) authModal.classList.add('hidden');
    });
}

if (authSendMagicLink) {
    authSendMagicLink.addEventListener('click', sendMagicLink);
}

if (authSignOut) {
    authSignOut.addEventListener('click', signOut);
}

// My Dashboards modal
if (myDashboardsBtn) {
    myDashboardsBtn.addEventListener('click', () => {
        if (dashboardsModal) dashboardsModal.classList.remove('hidden');
        loadDashboardsList();
    });
}

if (closeDashboards) {
    closeDashboards.addEventListener('click', () => {
        if (dashboardsModal) dashboardsModal.classList.add('hidden');
    });
}

// Save Dashboard modal
if (saveDashboardBtn) {
    saveDashboardBtn.addEventListener('click', openSaveModal);
}

if (closeSaveDashboard) {
    closeSaveDashboard.addEventListener('click', () => {
        if (saveDashboardModal) saveDashboardModal.classList.add('hidden');
    });
}

if (saveDashboardConfirm) {
    saveDashboardConfirm.addEventListener('click', saveCurrentDashboard);
}

// Close modals on backdrop click
[authModal, dashboardsModal, saveDashboardModal].forEach(modal => {
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
});

// Helper function (may be defined in script.js already)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', initAuth);

// Export for use in script.js
window.updateSaveButtonVisibility = updateSaveButtonVisibility;
window.currentUser = currentUser;
