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
    installPrompt: null,
    historyInitiated: false
};

// --- ERROR SYSTEM ---
const ErrorSystem = {
    show: (title, message, actionText = "Dismiss", actionFn = null) => {
        const toast = document.getElementById('error-toast');
        document.getElementById('err-title-text').innerText = title;
        document.getElementById('err-body-text').innerText = message;
        const btn = document.getElementById('err-action-btn');
        btn.innerText = actionText;
        btn.onclick = () => {
            if (actionFn) actionFn();
            toast.classList.remove('visible');
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        };
        toast.style.display = 'block';
        setTimeout(() => { toast.classList.add('visible'); }, 10);
    },
    handleAPIError: (status) => {
        if (status === 401 || status === 403) ErrorSystem.show("Permission Denied", "API Key invalid or expired.", "Update Key", window.app.openKeyManager);
        else if (status === 429) ErrorSystem.show("Quota Exceeded", "Free credits exhausted.", "Rotate Key", window.app.openKeyManager);
        else if (status >= 500) ErrorSystem.show("AI Busy", "Gemini is overloaded. Trying fallback...", "Dismiss");
        else ErrorSystem.show("Connection Error", "Check your internet connection.", "Dismiss");
    }
};

// --- APP CONTROLLER ---
window.app = {
    init: () => {
        try {
            document.body.classList.add('dark-mode');
            
            // KEY INIT
            try {
                const stored = localStorage.getItem('discount_dost_gemini_keys');
                if (stored) state.apiKeys = JSON.parse(stored);
                if (state.apiKeys.length > 0) document.getElementById('api-key-modal').style.display = 'none';
            } catch (e) { console.warn('Storage denied'); }

            // INPUT LISTENERS
            ['store', 'visits', 'aov', 'discount'].forEach(id => {
                const el = document.getElementById(`inp-${id}`);
                if(el) el.addEventListener('input', (e) => state[id === 'store' ? 'storeName' : id] = e.target.value);
            });

            // SERVICE WORKER
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Fail', err));
            }

            // PWA INSTALL
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                state.installPrompt = e;
                const btn = document.getElementById('install-btn');
                if (btn) btn.style.display = 'flex';
            });

            // BACK GESTURE SUPPORT (HISTORY API)
            window.history.replaceState({ page: 1 }, '', '');
            window.addEventListener('popstate', (event) => {
                if (event.state && event.state.page) {
                    window.app.navTo(event.state.page, false);
                }
            });

            // iOS CHECK
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
            if (isIOS && !isStandalone) document.getElementById('install-btn').style.display = 'flex';

        } catch (err) { console.error("Init Error", err); }
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
            const modal = document.getElementById('install-help-modal');
            modal.querySelector('.modal-icon').innerHTML = '<i class="fab fa-apple"></i>';
            modal.querySelector('h3').innerText = "Install on iOS";
            modal.querySelector('p').innerHTML = `1. Tap <b>Share</b> <i class="fa fa-share-square"></i><br>2. <b>"Add to Home Screen"</b> <i class="fa fa-plus-square"></i>`;
            modal.style.display = 'flex';
        }
    },
    
    closeInstallModal: () => document.getElementById('install-help-modal').style.display = 'none',
    dismissError: () => document.getElementById('error-toast').classList.remove('visible'),

    // --- NAVIGATION ---
    toggleTheme: () => {
        state.isDark = !state.isDark;
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
    },

    handleScroll: () => {
        const header = document.getElementById('main-header');
        header.classList.toggle('shrink', document.getElementById('scroll-container').scrollTop > 20);
    },

    navTo: (page, push = true) => {
        // History Logic
        if (push && state.page !== page) {
            window.history.pushState({ page: page }, '', '');
        }

        state.page = page;
        
        // UI Updates
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`nav-${page}`).classList.add('active');
        
        document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
        const target = page === 1 ? 'view-input' : page === 2 ? 'view-results' : 'view-strategy';
        document.getElementById(target).classList.add('active');
        
        // Header Text
        document.getElementById('page-title').innerHTML = page === 1 ? "Business<br>Details" : page === 2 ? "Impact<br>Analysis" : "Growth<br>Strategy";
        
        const backBtn = document.getElementById('back-btn');
        backBtn.classList.toggle('visible', page > 1);

        if(page === 2) window.app.renderResults();
    },

    goBack: () => window.history.back(),

    validateAndNav: (page) => {
        if (!state.visits || !state.aov || !state.discount) {
            ErrorSystem.show("Missing Data", "Please fill in all details to proceed.");
            return;
        }
        window.app.navTo(page);
    },

    // --- GOLD DEAL LOGIC ---
    renderResults: () => {
        const v = parseInt(state.visits) || 0;
        const a = parseInt(state.aov) || 0;
        const d = parseInt(state.discount) || 0;
        const rev = v * a;
        
        // Logic: Gold Deal usually brings 30% more volume at same discount cost
        const uplift = 1.3;
        const newVisits = Math.round(v * uplift);
        const newRev = newVisits * a;
        const profit = Math.round((newRev - rev) * 0.8); // 20% cost assumption

        document.getElementById('results-container').innerHTML = `
            <div class="gold-card stagger-in">
                <div class="gold-header">
                    <div class="gold-title">${state.storeName || 'YOUR STORE'}</div>
                    <div class="gold-chip"></div>
                </div>
                <div style="font-size:32px; font-weight:800; margin-bottom:5px;">GOLD MEMBER</div>
                <div style="font-size:14px; opacity:0.8;">Exclusive Privilege Card</div>
                <div class="gold-stats">
                    <div>
                        <div class="gs-label">Monthly Impact</div>
                        <div class="gs-val">+₹${profit.toLocaleString()}</div>
                    </div>
                    <div>
                        <div class="gs-label">Visit Uplift</div>
                        <div class="gs-val">+${Math.round((uplift-1)*100)}%</div>
                    </div>
                </div>
            </div>
            
            <div class="card stagger-in" style="animation-delay:0.1s">
                <h3 style="margin:0 0 10px 0;">Current Performance</h3>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:var(--text-sub)">Daily Revenue</span>
                    <span style="font-weight:700">₹${rev.toLocaleString()}</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="color:var(--text-sub)">Discount Cost</span>
                    <span style="font-weight:700; color:var(--danger)">-₹${Math.round(rev * (d/100)).toLocaleString()}</span>
                </div>
            </div>
        `;
    },

    // --- AI LOGIC (OPTIMIZED) ---
    updateLoader: (msg) => {
        const el = document.getElementById('loader-msg');
        if(el) {
            el.style.opacity = '0';
            setTimeout(() => { el.innerText = msg; el.style.opacity = '1'; }, 200);
        }
    },

    startAnalysis: async () => {
        const menu = document.getElementById('menu-text').value;
        if (!menu || menu.length < 5) {
            ErrorSystem.show("Input Error", "Please enter menu items to analyze.");
            return;
        }

        const loader = document.getElementById('loader');
        loader.style.display = 'flex';
        
        let success = false;
        
        // Loop through Keys
        for (const key of state.apiKeys) {
            if (success) break;
            
            // Loop through Models
            for (const model of AI_MODELS) {
                if (success) break;
                try {
                    document.getElementById('model-badge').innerText = model.label;
                    window.app.updateLoader("CONNECTING TO NEURAL NET...");
                    
                    await new Promise(r => setTimeout(r, 800)); // UX Pause
                    window.app.updateLoader("ANALYZING MENU STRUCTURE...");
                    
                    const prompt = `Act as a top pricing strategist. Store: ${state.storeName}. Menu: ${menu}. Suggest 3 'Gold Deal' bundles to increase AOV. Return HTML.`;
                    
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });

                    if (response.ok) {
                        window.app.updateLoader("DRAFTING STRATEGY...");
                        const data = await response.json();
                        const text = data.candidates[0].content.parts[0].text;
                        
                        // Parse Markdown-ish response to HTML
                        const htmlContent = text.replace(/```html/g, '').replace(/```/g, '');
                        
                        document.getElementById('strategy-results').innerHTML = `<div class="card stagger-in">${htmlContent}</div>`;
                        document.getElementById('strategy-results').style.display = 'block';
                        success = true;
                    } else {
                        if (response.status !== 401 && response.status !== 429) throw new Error(response.status);
                    }
                } catch (e) {
                    console.log("Model fail", e);
                }
            }
        }

        loader.style.display = 'none';
        
        if (!success) {
            ErrorSystem.handleAPIError(429);
        }
    },

    // --- KEY MANAGEMENT ---
    openKeyManager: () => {
        const list = document.getElementById('key-list');
        list.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const val = state.apiKeys[i] || '';
            list.innerHTML += `<input type="text" id="key-slot-${i}" class="cat-trigger" placeholder="API Key ${i+1}" value="${val}" style="margin-bottom:8px;">`;
        }
        document.getElementById('key-manager-modal').style.display = 'flex';
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
            ErrorSystem.show("Invalid Input", "Enter at least one valid key.");
        }
    },
    
    saveApiKey: () => {
        const input = document.getElementById('gemini-key-input');
        if (input && input.value.length > 10) {
            state.apiKeys = [input.value.trim()];
            localStorage.setItem('discount_dost_gemini_keys', JSON.stringify(state.apiKeys));
            document.getElementById('api-key-modal').style.display = 'none';
        } else {
            ErrorSystem.show("Key Error", "Enter a valid API key.");
        }
    }
};

document.addEventListener('DOMContentLoaded', window.app.init);