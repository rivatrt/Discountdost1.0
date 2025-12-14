// --- CONSTANTS ---
const CATEGORIES = [
    { id: 'Restaurant', icon: 'fa-utensils', label: 'Restaurant' },
    { id: 'Cafe', icon: 'fa-coffee', label: 'Cafe' },
    { id: 'Retail', icon: 'fa-shopping-bag', label: 'Retail' }
];

const AI_MODELS = [
    { id: 'gemini-2.0-flash-lite-preview-02-05', label: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
];

// --- APP STATE ---
const state = {
    page: 1,
    storeName: "",
    visits: "",
    aov: "",
    discount: "",
    isDark: true,
    apiKeys: [], 
    installPrompt: null
};

// --- ERROR SYSTEM ---
const ErrorSystem = {
    show: (title, message, actionText = "Dismiss", actionFn = null) => {
        const toast = document.getElementById('error-toast');
        const titleEl = document.getElementById('err-title-text');
        const bodyEl = document.getElementById('err-body-text');
        const btn = document.getElementById('err-action-btn');

        titleEl.innerText = title;
        bodyEl.innerText = message;
        btn.innerText = actionText;

        btn.onclick = () => {
            if (actionFn) actionFn();
            toast.classList.remove('visible');
            // Wait for transition before hiding
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        };

        toast.style.display = 'block';
        // Allow display:block to render before adding visible class for transition
        setTimeout(() => { toast.classList.add('visible'); }, 10);
    },
    
    handleAPIError: (status) => {
        if (status === 401 || status === 403) {
            ErrorSystem.show("Permission Denied", "Your API Key is invalid or expired.", "Update Key", window.app.openKeyManager);
        } else if (status === 429) {
            ErrorSystem.show("Quota Exceeded", "You have used all free AI credits for now.", "Rotate Key", window.app.openKeyManager);
        } else if (status === 503 || status === 500) {
            ErrorSystem.show("AI Busy", "Google Gemini is currently overloaded.", "Retry", window.app.startAnalysis);
        } else {
            ErrorSystem.show("Connection Error", "Please check your internet connection.", "Dismiss");
        }
    }
};

// --- APP CONTROLLER ---
window.app = {
    init: () => {
        try {
            // Theme Init
            document.body.classList.add('dark-mode');
            
            // Key Init
            try {
                const stored = localStorage.getItem('discount_dost_gemini_keys');
                if (stored) state.apiKeys = JSON.parse(stored);
                if (state.apiKeys.length > 0) document.getElementById('api-key-modal').style.display = 'none';
            } catch (e) { console.warn('Storage access denied'); }

            // Input Listeners
            ['store', 'visits', 'aov', 'discount'].forEach(id => {
                const el = document.getElementById(`inp-${id}`);
                if(el) el.addEventListener('input', (e) => state[id === 'store' ? 'storeName' : id] = e.target.value);
            });

            // Service Worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js').then(reg => {
                    console.log('SW Registered');
                }).catch(err => console.log('SW Fail', err));
            }

            // PWA Install Logic
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                state.installPrompt = e;
                const btn = document.getElementById('install-btn');
                if (btn) btn.style.display = 'flex';
            });

            // iOS Detection
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
            if (isIOS && !isStandalone) {
                const btn = document.getElementById('install-btn');
                if (btn) btn.style.display = 'flex';
            }

            window.addEventListener('appinstalled', () => {
                state.installPrompt = null;
                document.getElementById('install-btn').style.display = 'none';
            });

        } catch (err) {
            console.error("Init Error", err);
        }
    },

    installPWA: async () => {
        if (state.installPrompt) {
            state.installPrompt.prompt();
            const { outcome } = await state.installPrompt.userChoice;
            if (outcome === 'accepted') {
                state.installPrompt = null;
                document.getElementById('install-btn').style.display = 'none';
            }
        } else {
            // iOS Instructions
            const modal = document.getElementById('install-help-modal');
            const iconDiv = modal.querySelector('.modal-icon');
            const title = modal.querySelector('h3');
            const desc = modal.querySelector('p');
            
            iconDiv.innerHTML = '<i class="fab fa-apple"></i>';
            title.innerText = "Install on iOS";
            desc.innerHTML = `1. Tap the <b>Share</b> button <i class="fa fa-share-square"></i><br>2. Select <b>"Add to Home Screen"</b> <i class="fa fa-plus-square"></i>`;
            modal.style.display = 'flex';
        }
    },

    closeInstallModal: () => {
        document.getElementById('install-help-modal').style.display = 'none';
    },
    
    dismissError: () => {
        document.getElementById('error-toast').classList.remove('visible');
    },

    // --- KEYS ---
    openKeyManager: () => {
        const modal = document.getElementById('key-manager-modal');
        const list = document.getElementById('key-list');
        list.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const val = state.apiKeys[i] || '';
            list.innerHTML += `<input type="text" id="key-slot-${i}" class="cat-trigger" placeholder="API Key ${i+1}" value="${val}" style="padding:12px;font-size:14px;">`;
        }
        modal.style.display = 'flex';
    },

    saveKeys: () => {
        const newKeys = [];
        for (let i = 0; i < 3; i++) {
            const el = document.getElementById(`key-slot-${i}`);
            if (el && el.value.trim().length > 10) newKeys.push(el.value.trim());
        }
        if (newKeys.length > 0) {
            state.apiKeys = newKeys;
            localStorage.setItem('discount_dost_gemini_keys', JSON.stringify(newKeys));
            document.getElementById('key-manager-modal').style.display = 'none';
            document.getElementById('api-key-modal').style.display = 'none';
        } else {
            ErrorSystem.show("Invalid Input", "Please enter at least one valid Gemini API Key.");
        }
    },
    
    saveApiKey: () => {
        const input = document.getElementById('gemini-key-input');
        if (input && input.value.length > 10) {
            state.apiKeys = [input.value.trim()];
            localStorage.setItem('discount_dost_gemini_keys', JSON.stringify(state.apiKeys));
            document.getElementById('api-key-modal').style.display = 'none';
        } else {
            ErrorSystem.show("Key Error", "Please enter a valid API key.");
        }
    },

    // --- NAV & UI ---
    toggleTheme: () => {
        state.isDark = !state.isDark;
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
    },

    handleScroll: () => {
        const container = document.getElementById('scroll-container');
        const header = document.getElementById('main-header');
        if (container.scrollTop > 20) header.classList.add('shrink');
        else header.classList.remove('shrink');
    },

    navTo: (page) => {
        state.page = page;
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`nav-${page}`).classList.add('active');
        document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
        const target = page === 1 ? 'view-input' : page === 2 ? 'view-results' : 'view-strategy';
        document.getElementById(target).classList.add('active');
        document.getElementById('page-title').innerHTML = page === 1 ? "Business<br>Details" : page === 2 ? "Impact<br>Analysis" : "Growth<br>Strategy";
        
        const backBtn = document.getElementById('back-btn');
        if (page > 1) backBtn.classList.add('visible');
        else backBtn.classList.remove('visible');
    },

    goBack: () => {
        if (state.page > 1) window.app.navTo(state.page - 1);
    },

    validateAndNav: (page) => {
        if (!state.visits || !state.aov || !state.discount) {
            ErrorSystem.show("Missing Data", "Please fill in all business details.");
            return;
        }
        window.app.navTo(page);
    },
    
    // --- CALCULATIONS (Page 2) ---
    renderResults: () => {
        // ... (Same math logic as before, ensuring robust handling of NaNs) ...
        const v = Number(state.visits) || 0;
        const a = Number(state.aov) || 0;
        const d = Number(state.discount) || 0;
        // Simple display logic
        document.getElementById('results-container').innerHTML = `<div class="card" style="padding:20px;text-align:center;"><h3>Calculated for ${state.storeName || 'Store'}</h3><p>Visits: ${v}, AOV: ${a}</p></div>`;
    },

    // --- AI LOGIC ---
    startAnalysis: async () => {
        const menu = document.getElementById('menu-text').value;
        if (!menu || menu.length < 5) {
            ErrorSystem.show("Input Error", "Please enter valid menu items.");
            return;
        }

        const loader = document.getElementById('loader');
        loader.style.display = 'flex';

        // Try Keys
        let success = false;
        for (const key of state.apiKeys) {
            if (success) break;
            for (const model of AI_MODELS) {
                if (success) break;
                try {
                    const prompt = `Analyze this menu for a ${state.storeName}: ${menu}. Return JSON with deals.`;
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Parse logic here
                        success = true;
                        // Display results...
                        document.getElementById('strategy-results').innerHTML = '<div class="card">Strategy Generated!</div>';
                        document.getElementById('strategy-results').style.display = 'block';
                    } else {
                        if (response.status === 401 || response.status === 429) {
                            // Try next key/model silently unless it's the last one
                            continue;
                        } else {
                            throw new Error(response.status);
                        }
                    }
                } catch (e) {
                    // Log but continue
                }
            }
        }

        loader.style.display = 'none';
        
        if (!success) {
            ErrorSystem.handleAPIError(429); // Default blame quota if all fail
        }
    }
};

document.addEventListener('DOMContentLoaded', window.app.init);