// --- CONSTANTS ---
const CATEGORIES = [
    { id: 'Restaurant', icon: 'fa-utensils', label: 'Restaurant', brandRef: "Swiggy/Zomato top brands like Domino's" },
    { id: 'Cafe', icon: 'fa-coffee', label: 'Cafe', brandRef: "Starbucks or Third Wave Coffee" },
    { id: 'Retail', icon: 'fa-shopping-bag', label: 'Retail', brandRef: "Westside or H&M" },
    { id: 'Electronics', icon: 'fa-mobile-alt', label: 'Electronics', brandRef: "Croma or Reliance Digital" },
    { id: 'Grocery', icon: 'fa-carrot', label: 'Grocery', brandRef: "Zepto or Blinkit" },
    { id: 'Clothing', icon: 'fa-tshirt', label: 'Fashion', brandRef: "Zara or Myntra" },
    { id: 'Gym', icon: 'fa-dumbbell', label: 'Gym', brandRef: "Cult.fit" },
    { id: 'Jewelry', icon: 'fa-gem', label: 'Jewelry', brandRef: "Tanishq" },
    { id: 'Other', icon: 'fa-store', label: 'Other', brandRef: "premium loyalty programs" }
];

const MERCHANT_TIPS = [
    "Increasing customer retention by just 5% can boost profits by 25% to 95%.",
    "65% of a company's business comes from existing customers.",
    "Repeat customers spend 67% more than new customers.",
    "A 2% increase in customer retention has the same effect as decreasing costs by 10%.",
    "It costs 5x more to acquire a new customer than to keep an existing one.",
    "Loyal customers are 50% more likely to try new products.",
    "Personalized rewards increase redemption rates by 6x."
];

const LOADING_MSGS = [
    "> scanning_menu_items...",
    "> calculating_churn_risk...",
    "> identifying_whales...",
    "> benchmarking_competitors...",
    "> optimizing_price_elasticity...",
    "> generating_gold_hooks...",
    "> applying_psychology..."
];

const AI_MODELS = [
    { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', tier: 'High Intelligence' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'High Speed' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', tier: 'Standard' }
];

// --- APP STATE ---
const state = {
    page: 1,
    category: CATEGORIES[0],
    storeName: "",
    visits: "",
    aov: "",
    discount: "",
    isDark: true,
    apiKeys: [], // Now array
    strategy: null,
    groundingSources: [],
    loaderInterval: null,
    terminalInterval: null,
    loaderStepIndex: 0,
    manualItems: [{name:"", price:""}, {name:"", price:""}, {name:"", price:""}],
    installPrompt: null,
    cooldownTimer: null
};

// Load Keys from Storage
try {
    const stored = localStorage.getItem('discount_dost_gemini_keys');
    if (stored) {
        state.apiKeys = JSON.parse(stored);
    } else {
        // Legacy fallback
        const single = localStorage.getItem('discount_dost_gemini_key');
        if (single) state.apiKeys = [single];
    }
} catch (e) {
    console.warn("LocalStorage access denied");
}

// --- APP CONTROLLER ---
window.app = {
    init: () => {
        try {
            document.body.classList.add('dark-mode');
            window.app.renderCategoryGrid();
            window.app.renderManualInputs();
            
            // Handle Native Back Button / Swipe
            window.history.replaceState({page: 1}, "", "");
            window.addEventListener('popstate', (event) => {
                if (event.state && event.state.page) {
                    window.app.renderPage(event.state.page);
                }
            });

            // Initial Key Check
            if (state.apiKeys.length > 0) {
                const modal = document.getElementById('api-key-modal');
                if(modal) modal.style.display = 'none';
            }

            // Input Listeners
            ['store', 'visits', 'aov', 'discount'].forEach(id => {
                const el = document.getElementById(`inp-${id}`);
                if(el) {
                    el.addEventListener('input', (e) => {
                        state[id === 'store' ? 'storeName' : id] = e.target.value;
                    });
                }
            });

            // Service Worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js')
                    .catch(e => console.log('SW Registration Failed:', e));
            }

            // --- NATIVE INSTALL LOGIC ---
            // 1. Android/Chrome/Desktop: Listen for beforeinstallprompt
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault(); // Stash event
                state.installPrompt = e;
                const btn = document.getElementById('install-btn');
                if (btn) btn.style.display = 'flex'; // Show only when available
            });

            // 2. iOS Detection (No event, check UA + Standalone status)
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            
            if (isIOS && !isStandalone) {
                const btn = document.getElementById('install-btn');
                if (btn) btn.style.display = 'flex';
            }

            // 3. Hide on successful install
            window.addEventListener('appinstalled', () => {
                state.installPrompt = null;
                const btn = document.getElementById('install-btn');
                if (btn) btn.style.display = 'none';
            });

        } catch (err) {
            console.error("Init error:", err);
        }
    },

    installPWA: async () => {
        // SCENARIO A: Native Android/Desktop Prompt available
        if (state.installPrompt) {
            state.installPrompt.prompt();
            const { outcome } = await state.installPrompt.userChoice;
            if (outcome === 'accepted') {
                state.installPrompt = null;
                const btn = document.getElementById('install-btn');
                if (btn) btn.style.display = 'none';
            }
            return;
        }

        // SCENARIO B: iOS Instructions
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
        
        if (isIOS) {
             const modal = document.getElementById('install-help-modal');
             const iconDiv = modal.querySelector('.modal-icon');
             const title = modal.querySelector('h3');
             const desc = modal.querySelector('p');
             
             iconDiv.innerHTML = '<i class="fab fa-apple"></i>';
             title.innerText = "Install on iOS";
             desc.innerHTML = `1. Tap the <b>Share</b> button <i class="fa fa-share-square"></i><br>2. Scroll down & select <br><b>"Add to Home Screen"</b> <i class="fa fa-plus-square"></i>`;
             modal.style.display = 'flex';
        }
    },
    
    closeInstallModal: () => {
        document.getElementById('install-help-modal').style.display = 'none';
    },

    // --- KEY MANAGER ---
    openKeyManager: () => {
        const modal = document.getElementById('key-manager-modal');
        const list = document.getElementById('key-list');
        list.innerHTML = '';
        
        // Render 5 inputs populated with existing keys
        for (let i = 0; i < 5; i++) {
            const val = state.apiKeys[i] || '';
            list.innerHTML += `
                <input type="text" id="key-slot-${i}" class="cat-trigger" 
                    placeholder="Gemini API Key ${i+1}" value="${val}" 
                    style="padding: 12px; font-size: 14px;">
            `;
        }
        modal.style.display = 'flex';
    },

    saveKeys: () => {
        const newKeys = [];
        for (let i = 0; i < 5; i++) {
            const el = document.getElementById(`key-slot-${i}`);
            if (el && el.value.trim().length > 10) { // Basic validation
                newKeys.push(el.value.trim());
            }
        }
        
        if (newKeys.length > 0) {
            state.apiKeys = newKeys;
            localStorage.setItem('discount_dost_gemini_keys', JSON.stringify(newKeys));
            document.getElementById('key-manager-modal').style.display = 'none';
            
            // Also hide initial blocker if it was open
            document.getElementById('api-key-modal').style.display = 'none';
            alert(`Saved ${newKeys.length} keys.`);
        } else {
            alert("Please enter at least one valid key.");
        }
    },

    saveApiKey: () => {
        // Handler for initial blocking modal
        const input = document.getElementById('gemini-key-input');
        if (!input) return;
        const key = input.value.trim();
        if (key.length > 5) {
            state.apiKeys = [key];
            localStorage.setItem('discount_dost_gemini_keys', JSON.stringify(state.apiKeys));
            document.getElementById('api-key-modal').style.display = 'none';
        } else {
            alert("Please enter a valid API key");
        }
    },

    toggleTheme: () => {
        state.isDark = !state.isDark;
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
        document.getElementById('theme-icon').className = state.isDark ? 'fa fa-moon' : 'fa fa-sun';
    },

    handleScroll: () => {
        const container = document.getElementById('scroll-container');
        if (!container) return;
        const shrink = container.scrollTop > 40;
        const header = document.getElementById('main-header');
        if (shrink) header.classList.add('shrink');
        else header.classList.remove('shrink');
    },

    navTo: (page) => {
        if (state.page === page) return;
        window.history.pushState({page: page}, "", "");
        window.app.renderPage(page);
    },

    renderPage: (page) => {
        state.page = page;
        
        // Update Tabs
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.getElementById(`nav-${page}`);
        if(navItem) navItem.classList.add('active');
        
        // Update Pages
        document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
        const targetPage = page === 1 ? 'view-input' : page === 2 ? 'view-results' : 'view-strategy';
        const pageEl = document.getElementById(targetPage);
        if(pageEl) pageEl.classList.add('active');

        // Header Title
        const titleEl = document.getElementById('page-title');
        if (page === 1) titleEl.innerHTML = "Business<br>Details";
        else if (page === 2) {
            titleEl.innerHTML = "Impact<br>Analysis";
            window.app.renderResults();
        } else {
            titleEl.innerHTML = "Growth<br>Strategy";
            document.getElementById('strategy-store-name').innerText = state.storeName || "your store";
        }

        const backBtn = document.getElementById('back-btn');
        if(backBtn) backBtn.classList.toggle('visible', page > 1);
        
        const scrollContainer = document.getElementById('scroll-container');
        if(scrollContainer) scrollContainer.scrollTop = 0;
    },

    goBack: () => {
        window.history.back();
    },

    validateAndNav: (page) => {
        if (!state.visits || !state.aov || !state.discount) {
            alert("Please fill all business details");
            return;
        }
        window.app.navTo(page);
    },

    // --- RENDERING HELPERS ---
    fmt: (n) => "₹" + Math.round(Number(n)).toLocaleString('en-IN'),
    fmtCompact: (n) => {
        n = Number(n);
        if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
        if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
        return "₹" + Math.round(n).toLocaleString('en-IN');
    },

    toggleDeal: (el) => {
        if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') return;
        if (el.classList.contains('repeat-card-wrapper')) {
             el.classList.toggle('expanded');
             return;
        }
        el.classList.toggle('expanded');
    },

    shareStrategy: () => {
        window.print();
    },

    // --- LIVE MATH UPDATE FOR DEALS ---
    updateDealMath: (el) => {
        const card = el.closest('.deal-card');
        if (!card) return;

        const getNum = (sel) => {
            const e = card.querySelector(sel);
            return e ? parseFloat(e.innerText.replace(/[^0-9.]/g, '')) || 0 : 0;
        }

        let price = getNum('.deal-price-edit');
        let goldPct = getNum('.pct-gold');
        let feePct = getNum('.pct-fee');
        let gstPct = getNum('.pct-gst'); 

        const gold = Math.round(price * (goldPct / 100));
        const fee = Math.round(price * (feePct / 100));
        const gst = Math.round(fee * (gstPct / 100));
        const net = price - gold - fee - gst;

        const setTxt = (sel, val, isNeg=false) => {
            const e = card.querySelector(sel);
            if(e) e.innerText = (isNeg ? "- " : "") + window.app.fmt(val);
        }

        setTxt('.val-gold', gold, true);
        setTxt('.val-fee', fee, true);
        setTxt('.val-gst', gst, true);
        setTxt('.val-net', net);
        setTxt('.val-bill', price);
        
        const tag = card.querySelector('.deal-tag');
        if(tag) tag.innerText = `GET ${window.app.fmt(gold)} GOLD`;
    },

    updateRepeatCard: () => {
        const wrapper = document.querySelector('.repeat-card-wrapper');
        if (!wrapper) return;
        const getGold = parseInt(wrapper.querySelector('.inp-rc-gold').innerText.replace(/[^0-9]/g,'')) || 0;
        wrapper.querySelector('.gold-text').innerText = `${window.app.fmt(getGold)} Gold`;
    },

    renderResults: () => {
        const v = Number(state.visits);
        const a = Number(state.aov);
        const d = Number(state.discount);
        
        const lossPerBill = a * (d / 100);
        const goldVoucherValue = lossPerBill * 0.5;
        const costPerBillGold = (goldVoucherValue * 1.177);
        const savingsPerBill = lossPerBill - costPerBillGold;

        const discountDaily = lossPerBill * v;
        const goldDaily = costPerBillGold * v;

        const discountMonthly = discountDaily * 30;
        const goldMonthly = goldDaily * 30;

        const discountYearly = discountDaily * 365;
        const goldYearly = goldDaily * 365;
        const savingsYearly = savingsPerBill * v * 365;

        const html = `
            <div class="card" style="padding: 0; overflow: hidden;">
                <div style="padding: 20px; background: var(--bg-surface); border-bottom: 1px solid var(--border-color);">
                    <div style="font-weight: 800; font-size: 18px;">Impact Analysis</div>
                    <div style="font-size: 12px; color: var(--text-sub);">Half the value, Double the Impact</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid var(--border-color);">
                    <div style="padding: 12px 8px; font-size: 10px; font-weight: 800; color: var(--text-sub); border-right: 1px solid var(--border-color);">TIMEFRAME</div>
                    <div style="padding: 12px 8px; font-size: 10px; font-weight: 800; color: var(--danger); border-right: 1px solid var(--border-color); background: rgba(255, 61, 0, 0.05);">CASH DISCOUNT<br>(LOSS)</div>
                    <div style="padding: 12px 8px; font-size: 10px; font-weight: 800; color: #FFB300; background: rgba(255, 179, 0, 0.05);">GOLD MODEL<br>(COST)</div>
                </div>
                
                <!-- DAILY -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; background: var(--bg-input); border-bottom: 1px solid var(--border-color);">
                    <div style="padding: 15px; font-size: 12px; font-weight: 800; color: var(--text-main); border-right: 1px solid var(--border-color);">DAILY</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: var(--danger); border-right: 1px solid var(--border-color);">${window.app.fmtCompact(discountDaily)}</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: #FFB300;">${window.app.fmtCompact(goldDaily)}</div>
                </div>

                <!-- MONTHLY -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; background: var(--bg-input); border-bottom: 1px solid var(--border-color);">
                    <div style="padding: 15px; font-size: 12px; font-weight: 800; color: var(--text-main); border-right: 1px solid var(--border-color);">MONTHLY</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: var(--danger); border-right: 1px solid var(--border-color);">${window.app.fmtCompact(discountMonthly)}</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: #FFB300;">${window.app.fmtCompact(goldMonthly)}</div>
                </div>

                <!-- YEARLY -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; background: var(--bg-input);">
                    <div style="padding: 15px; font-size: 12px; font-weight: 800; color: var(--text-main); border-right: 1px solid var(--border-color);">YEARLY</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: var(--danger); border-right: 1px solid var(--border-color);">${window.app.fmtCompact(discountYearly)}</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: #FFB300;">${window.app.fmtCompact(goldYearly)}</div>
                </div>
            </div>

            <div class="card" style="background: var(--bg-success); border: 1px solid var(--success); text-align: center; padding: 24px;">
                <div style="font-size: 12px; font-weight: 800; color: var(--success); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">NET PROFIT INCREASE</div>
                <div style="font-size: 28px; font-weight: 800; color: var(--success); margin-bottom: 5px;">+${window.app.fmtCompact(savingsYearly)}</div>
                <div style="font-size: 13px; color: var(--success); opacity: 0.8;">Saved directly to your bottom line</div>
            </div>
        `;
        document.getElementById('results-container').innerHTML = html;
    },

    // --- MODALS ---
    openCatModal: () => {
        document.getElementById('cat-modal-bg').classList.add('open');
        document.getElementById('cat-modal-sheet').classList.add('open');
    },
    closeCatModal: () => {
        document.getElementById('cat-modal-bg').classList.remove('open');
        document.getElementById('cat-modal-sheet').classList.remove('open');
    },
    renderCategoryGrid: () => {
        const grid = document.getElementById('cat-grid');
        grid.innerHTML = CATEGORIES.map(c => `
            <div class="cat-item ${state.category.id === c.id ? 'selected' : ''}" onclick="window.app.selectCategory('${c.id}')">
                <i class="fa ${c.icon}" style="font-size: 24px; margin-bottom: 8px;"></i>
                <div style="font-size: 11px; font-weight: 700;">${c.label}</div>
            </div>
        `).join('');
    },
    selectCategory: (id) => {
        state.category = CATEGORIES.find(c => c.id === id);
        document.getElementById('txt-category').innerText = state.category.label;
        window.app.renderCategoryGrid();
        window.app.closeCatModal();
    },

    openManualModal: () => document.getElementById('manual-modal').style.display = 'flex',
    closeManualModal: () => document.getElementById('manual-modal').style.display = 'none',
    
    renderManualInputs: () => {
        const container = document.getElementById('manual-inputs');
        container.innerHTML = state.manualItems.map((item, i) => `
            <div style="margin-bottom:10px; display:flex; gap:10px;">
                <input type="text" placeholder="${i===0?'Burger':i===1?'Pizza':'Coffee'}" value="${item.name}" 
                    oninput="state.manualItems[${i}].name = this.value" style="flex:2; font-size:14px; padding:12px;">
                <input type="number" placeholder="${i===0?'200':i===1?'450':'150'}" value="${item.price}" 
                    oninput="state.manualItems[${i}].price = this.value" style="flex:1; font-size:14px; padding:12px;">
            </div>
        `).join('');
    },
    submitManual: () => {
        const text = state.manualItems.filter(i => i.name && i.price).map(i => `${i.name} ${i.price}`).join('\n');
        if (text) {
            window.app.closeManualModal();
            window.app.startAnalysis(text);
        }
    },
    
    // --- SMART FALLBACK GENERATOR ---
    getFallbackMenu: (catId) => {
        const aov = Number(state.aov) || 500;
        const dictionaries = {
            'Cafe': [
                {n: "Cappuccino", p: 0.4}, {n: "Cold Brew", p: 0.5}, {n: "Croissant", p: 0.45}, 
                {n: "Bagel Cream Cheese", p: 0.5}, {n: "Club Sandwich", p: 0.7}, {n: "Hazelnut Latte", p: 0.6}
            ],
            'Restaurant': [
                {n: "Butter Chicken", p: 0.8}, {n: "Dal Makhani", p: 0.6}, {n: "Garlic Naan", p: 0.15}, 
                {n: "Paneer Tikka", p: 0.55}, {n: "Veg Biryani", p: 0.5}, {n: "Tandoori Platter", p: 1.2}
            ],
            'Retail': [
                {n: "Cotton Tee", p: 0.5}, {n: "Denim Jeans", p: 1.5}, {n: "Summer Dress", p: 1.2}, 
                {n: "Sneakers", p: 2.0}, {n: "Jacket", p: 2.5}
            ],
            'Grocery': [
                {n: "Fresh Atta 5kg", p: 0.4}, {n: "Premium Rice", p: 0.8}, {n: "Cooking Oil", p: 1.0}, 
                {n: "Dry Fruits Pack", p: 1.2}, {n: "Cleaning Kit", p: 0.5}
            ]
        };
        const items = dictionaries[catId] || dictionaries['Restaurant'];
        return items.map(i => `${i.n} ${Math.round(aov * i.p)}`).join('\n');
    },

    // --- COOLDOWN HANDLING ---
    triggerCooldown: () => {
        window.app.toggleLoader(false);
        const overlay = document.getElementById('cooldown-overlay');
        const timerEl = document.getElementById('cooldown-timer');
        if(!overlay) return;

        overlay.style.display = 'flex';
        let timeLeft = 60;
        timerEl.innerText = timeLeft;

        if (state.cooldownTimer) clearInterval(state.cooldownTimer);
        
        state.cooldownTimer = setInterval(() => {
            timeLeft--;
            timerEl.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(state.cooldownTimer);
                overlay.style.display = 'none';
            }
        }, 1000);
    },

    // --- UNIFIED AI FALLBACK HANDLER (MULTI-KEY ROTATION) ---
    generateWithFallback: async (payloadFactory) => {
        const textEl = document.getElementById('loader-model-text');
        
        // Ensure we have at least one key to try (or legacy)
        const keysToTry = state.apiKeys.length > 0 ? state.apiKeys : [];
        if (keysToTry.length === 0) throw new Error("No API Keys");

        // Loop Models (Best to Worst)
        for (let m = 0; m < AI_MODELS.length; m++) {
            const model = AI_MODELS[m];
            
            // Loop Keys (Try all keys on Best Model before downgrading)
            for (let k = 0; k < keysToTry.length; k++) {
                const currentKey = keysToTry[k];

                if (textEl) {
                    textEl.innerText = `${model.label} (Key ${k+1})`;
                }

                try {
                    const body = payloadFactory(model.id);
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${currentKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    if (response.status === 429 || response.status === 503) {
                        console.warn(`Model ${model.id} with Key ${k+1} exhausted.`);
                        continue; // Try next key
                    }

                    if (!response.ok) {
                         const err = await response.text();
                         console.warn(`Model ${model.id} error:`, err);
                         continue; // Fatal error for this request, but try next key just in case
                    }

                    const data = await response.json();
                    return data; // Success!

                } catch (e) {
                    console.warn(`Network error with Key ${k+1}`);
                    continue; // Try next key
                }
            }
            
            // If we are here, ALL keys failed for this model.
            // Downgrade model visually
             if (textEl && m < AI_MODELS.length - 1) {
                textEl.innerText = `Downgrading to ${AI_MODELS[m+1].label}...`;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // If we get here, everything failed.
        throw new Error("QuotaExhausted");
    },

    // --- IMAGE HANDLING & AI (GEMINI) ---
    handleFile: async (input) => {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();

            window.app.toggleLoader(true, true); // true, true for scan mode
            
            reader.onload = async (e) => {
                const base64Data = e.target.result;
                const base64Content = base64Data.split(',')[1]; // Strip header

                try {
                    // GENERATE WITH FALLBACK
                    const result = await window.app.generateWithFallback((modelId) => ({
                        contents: [{
                            parts: [
                                { text: "Extract list of menu items and prices. Output simple text list." },
                                { inline_data: { mime_type: "image/jpeg", data: base64Content } }
                            ]
                        }]
                    }));

                    let scannedText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (!scannedText || scannedText.length < 5) throw new Error("OCR yielded little text");

                    document.getElementById('menu-text').value = scannedText.trim();
                    window.app.toggleLoader(false);

                } catch (err) {
                    if (err.message === "QuotaExhausted") {
                        window.app.triggerCooldown();
                    } else {
                        console.warn("AI Scan failed. Using Smart Fallback.", err);
                        const fallbackData = window.app.getFallbackMenu(state.category.id);
                        document.getElementById('menu-text').value = fallbackData;
                        setTimeout(() => window.app.toggleLoader(false), 800);
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    },

    // --- AI ANALYSIS (GEMINI) ---
    toggleLoader: (show, isScanning = false) => {
        const loader = document.getElementById('loader');
        const quoteBox = document.getElementById('loader-quote');
        const textEl = document.getElementById('loader-model-text');
        const storeNameEl = document.getElementById('loader-store-name');
        const terminal = document.getElementById('loader-terminal');
        
        if (show) {
            loader.style.display = 'flex';
            
            // Personalize
            if(storeNameEl) storeNameEl.innerText = state.storeName || "Your Business";

            // Reset Badge
            if (textEl) {
                textEl.innerText = `GEMINI 3 PRO`; // Default start
            }

            // START TIPS ROTATION (MERCHANT TIPS)
            const rotateTip = () => {
                const tip = MERCHANT_TIPS[Math.floor(Math.random() * MERCHANT_TIPS.length)];
                quoteBox.innerText = tip;
            };
            rotateTip(); // Initial
            if (state.tipInterval) clearInterval(state.tipInterval);
            state.tipInterval = setInterval(rotateTip, 4000); // Change every 4s
            
            // START TERMINAL TEXT ANIMATION
            let msgIdx = 0;
            if (terminal) terminal.innerHTML = "";
            if (state.terminalInterval) clearInterval(state.terminalInterval);
            
            const addLine = () => {
                const msg = LOADING_MSGS[msgIdx % LOADING_MSGS.length];
                const line = document.createElement('span');
                line.className = 'term-line';
                line.innerText = msg;
                if(terminal) {
                    terminal.innerHTML = ""; // Keep it clean, single line or append
                    terminal.appendChild(line);
                }
                msgIdx++;
            }
            addLine();
            state.terminalInterval = setInterval(addLine, 1500);

        } else {
            loader.style.display = 'none';
            clearInterval(state.tipInterval);
            clearInterval(state.terminalInterval);
        }
    },

    startAnalysis: async (manualText) => {
        const inputMenu = manualText || document.getElementById('menu-text').value;
        if (!inputMenu || inputMenu.length < 3) return alert("Please enter menu items");

        window.app.toggleLoader(true);

        const prompt = `Role: World-class loyalty strategist for a ${state.category.label} named '${state.storeName}'.
Business Context:
- AOV: ₹${state.aov}
- Daily Footfall: ${state.visits}
- Current Discount: ${state.discount}%

Menu/Items:
${inputMenu}

Goal: Create a retention strategy using psychological "Dark Patterns" (Ethical FOMO, Loss Aversion, Gamification, Decoy Effect).

Requirements:
1. 10 'Smart Deals': 
   - Combine items to push AOV ~20% higher than ₹${state.aov}.
   - Use 'deal_price' = Sum of items (Full MRP). We do NOT discount cash. We give GOLD.
   - Gold Value should be ~10-15% of deal_price.
   - Titles should use triggers like "Limited Edition", "Weekend Loot", "Family Feast".
   - CRITICAL: In deal description and product info, ONLY show real data and prices from the input menu. Do not invent items.

2. 5 Gold Vouchers:
   - For retention. "Spend ₹X, Get ₹Y Gold Next Time".
   - Thresholds should target casuals (1x AOV) to whales (5x AOV).

3. Physical Repeat Business Card:
   - A strategy for a printed card handed to customers.
   - Logic: "Visit X times" or "Collect Stamps".
   - Rewards must be Gold based.

Output JSON:
{
  "deals": [{"title": "string", "items": "string", "real_value": number, "deal_price": number, "gold": number}], 
  "vouchers": [{"threshold": number, "amount": number, "desc": "string"}], 
  "repeatCard": {"trigger": "Bill > Amount", "next_visit_min_spend": number, "next_visit_gold_reward": number, "card_title": "string", "card_desc": "string"}
}`;

        try {
            // GENERATE WITH FALLBACK
            const result = await window.app.generateWithFallback((modelId) => ({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ googleSearch: {} }] 
            }));

            const candidate = result?.candidates?.[0];
            let jsonText = candidate?.content?.parts?.[0]?.text;
            
            // Extract Grounding Metadata
            const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
            state.groundingSources = groundingChunks.map(c => c.web).filter(w => w);

            if (jsonText) {
                jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
            }
            
            if (!jsonText) throw new Error("Empty AI response");

            const parsed = JSON.parse(jsonText);
            if (!parsed.deals || parsed.deals.length < 3) throw new Error("Incomplete deals");
            
            state.strategy = parsed;
            window.app.renderStrategy();

        } catch (err) {
            if (err.message === "QuotaExhausted") {
                window.app.triggerCooldown();
            } else {
                console.warn("AI failed. Using Smart Parse Fallback:", err);
                // Simple Fallback logic...
                 const deals = [];
                 for(let i=0; i<10; i++) deals.push({title: "Offer "+(i+1), items: "Best Items", real_value: Number(state.aov), deal_price: Number(state.aov), gold: Math.round(state.aov*0.1)});
                 const vouchers = [{threshold: 1000, amount: 100, desc: "Visit Bonus"}];
                 const repeatCard = {trigger: "Bill > 500", next_visit_min_spend: 1000, next_visit_gold_reward: 100, card_title: "Platinum Club", card_desc: "Physical Loyalty Card"};
                 state.strategy = { deals, vouchers, repeatCard };
                 window.app.renderStrategy();
            }
        } finally {
             setTimeout(() => window.app.toggleLoader(false), 500);
        }
    },

    renderStrategy: () => {
        document.getElementById('strategy-input-panel').style.display = 'none';
        const container = document.getElementById('strategy-results');
        container.style.display = 'block';

        const s = state.strategy;
        const sources = state.groundingSources || [];

        let html = '';

        // --- REGENERATE BUTTON ---
        html += `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                <button class="btn ripple-effect" style="width: auto; padding: 8px 16px; font-size: 11px; height: 32px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);" onclick="app.startAnalysis()">
                    <i class="fa fa-sync-alt"></i> Regenerate
                </button>
            </div>
        `;

        // --- GROUNDING SOURCES ---
        if (sources.length > 0) {
            html += `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(66, 133, 244, 0.1); border: 1px solid rgba(66, 133, 244, 0.3); border-radius: 12px; animation: fadeUp 0.5s ease;">
                    <div style="font-size: 11px; font-weight: 800; color: #4285F4; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">
                        <i class="fab fa-google"></i> Verified with Google Search
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            `;
            sources.forEach(src => {
                if (src.uri && src.title) {
                    html += `
                        <a href="${src.uri}" target="_blank" style="font-size: 11px; color: var(--text-main); text-decoration: none; background: var(--bg-surface); padding: 4px 10px; border-radius: 15px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 5px;">
                            ${src.title} <i class="fa fa-external-link-alt" style="font-size: 9px; opacity: 0.5;"></i>
                        </a>
                    `;
                }
            });
            html += `</div></div>`;
        }
        
        // --- DEALS SECTION ---
        html += `
            <div style="display: flex; alignItems: center; gap: 8px; margin-bottom: 15px; margin-top: 10px;">
                <div style="width: 24px; height: 24px; background: #FF5722; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                    <i class="fa fa-ticket-alt"></i>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">10 Exclusive Deals</span>
            </div>
            <div>
        `;

        s.deals.forEach((deal, idx) => {
            const realVal = deal.real_value || deal.price || 0;
            const price = deal.deal_price || deal.price || 0;
            const gold = Math.max(30, deal.gold || Math.round(price * 0.10));
            
            const platformFee = Math.round(price * 0.10);
            const gstOnFee = Math.round(platformFee * 0.18);
            const net = price - gold - platformFee - gstOnFee;
            
            // Calculate starting percentages for display
            const goldPct = Math.round((gold / price) * 100) || 10;
            const feePct = 10;
            const gstPct = 18;

            html += `
                <div class="deal-card deal-card-new stagger-in" onclick="app.toggleDeal(this)" style="animation-delay: ${idx * 0.05}s;">
                    <!-- HEADER -->
                    <div class="deal-header">
                        <div style="font-size: 10px; font-weight: 800; color: var(--text-sub); text-transform: uppercase; letter-spacing: 1px;">
                            DEAL #${idx+1}
                        </div>
                        <div class="deal-tag">
                            GET ${window.app.fmt(gold)} GOLD
                        </div>
                    </div>

                    <!-- BODY -->
                    <div class="deal-body">
                        <div contenteditable="true" style="font-size: 18px; font-weight: 800; margin-bottom: 6px; color: var(--text-main); line-height: 1.3;">${deal.title}</div>
                        <div contenteditable="true" style="font-size: 13px; color: var(--text-sub); line-height: 1.4; opacity: 0.8;">${deal.items}</div>
                        
                        <div class="deal-price-box">
                            <div>
                                <div class="price-label">Customer Pays (Full MRP)</div>
                                <div contenteditable="true" oninput="app.updateDealMath(this)" class="deal-price-edit" style="font-size: 20px; font-weight: 800; color: var(--brand); letter-spacing: -0.5px;">${window.app.fmt(price)}</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="price-label">Real Value</div>
                                <div style="font-size: 14px; font-weight: 600; color: var(--text-sub);">${window.app.fmt(realVal)}</div>
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: 10px;">
                            <div class="tap-hint">TAP TO EDIT MATH <i class="fa fa-chevron-down"></i></div>
                        </div>
                    </div>

                    <!-- EDITABLE BREAKDOWN (PERCENTAGE RESTORED) -->
                    <div class="math-breakdown">
                        <div style="padding: 20px;">
                            <div class="math-row">
                                <div class="math-label">Customer Pays (Revenue)</div>
                                <div class="math-val val-bill">${window.app.fmt(price)}</div>
                            </div>

                            <div class="math-row">
                                <div class="math-label">
                                    User Gets Gold (<span contenteditable="true" oninput="app.updateDealMath(this)" class="edit-pct pct-gold">${goldPct}</span>%)
                                </div>
                                <div class="math-val val-gold" style="color:#FFB300;">- ${window.app.fmt(gold)}</div>
                            </div>

                            <div class="math-row">
                                <div class="math-label">
                                    Platform Fee (<span contenteditable="true" oninput="app.updateDealMath(this)" class="edit-pct pct-fee">${feePct}</span>%)
                                </div>
                                <div class="math-val val-fee" style="color:#FF5722;">- ${window.app.fmt(platformFee)}</div>
                            </div>

                            <div class="math-row">
                                <div class="math-label">
                                    GST on Fee (<span contenteditable="true" oninput="app.updateDealMath(this)" class="edit-pct pct-gst">${gstPct}</span>%)
                                </div>
                                <div class="math-val val-gst" style="color:#FF5722;">- ${window.app.fmt(gstOnFee)}</div>
                            </div>

                            <div style="padding-top: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                                <span style="font-size: 11px; color: #00E676; font-weight: 800; text-transform: uppercase;">Net Merchant Earning</span>
                                <span class="val-net" style="font-weight: 800;">${window.app.fmt(net)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            
            <!-- VOUCHERS -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; margin-top: 40px;">
                <div style="width: 24px; height: 24px; background: #FFC107; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: black; font-size: 12px;">
                    <i class="fa fa-gift"></i>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">Gold Vouchers (Retention)</span>
            </div>
            <div style="display: flex; overflow-x: auto; gap: 15px; padding-bottom: 20px; scroll-snap-type: x mandatory;">
        `;

        s.vouchers.forEach((v, i) => {
            html += `
                <div class="voucher-card-gold stagger-in" onclick="app.toggleDeal(this)" style="animation-delay: ${0.5 + (i * 0.1)}s;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; opacity: 0.8;">VOUCHER</div>
                        <div style="font-size: 10px; font-weight: 700; background: #000; color: #FFC107; padding: 2px 6px; border-radius: 4px;">GOLD</div>
                    </div>
                    <div style="text-align: center; padding: 15px 0;">
                        <div contenteditable="true" style="font-size: 32px; font-weight: 900; letter-spacing: -1px;">${window.app.fmt(v.amount)}</div>
                        <div style="font-size: 10px; font-weight: 700; margin-top: 5px; opacity: 0.7;">ON BILL > ${window.app.fmt(v.threshold)}</div>
                    </div>
                    <div contenteditable="true" style="font-size: 11px; text-align: center; font-weight: 600; opacity: 0.8; line-height: 1.4;">${v.desc}</div>
                </div>
            `;
        });

        html += `
            </div>
            
            <!-- PHYSICAL REPEAT CARD -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; margin-top: 40px;">
                <div style="width: 24px; height: 24px; background: #4CAF50; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                    <i class="fa fa-credit-card"></i>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">Physical Repeat Business Card</span>
            </div>
            
            <div class="repeat-card-wrapper stagger-in" onclick="app.toggleDeal(this)" style="animation-delay: 1s;">
                <!-- VISUAL CARD FRONT -->
                <div class="repeat-card-visual">
                    <div class="rc-logo-corner"><i class="fa fa-infinity"></i></div>
                    <div>
                        <div class="rc-chip"></div>
                        <div class="rc-store-name">${state.storeName || "STORE NAME"}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">
                             ${s.repeatCard.card_title || "Platinum Club"}
                        </div>
                        <div class="rc-offer-main">
                             Get <span class="gold-text">${window.app.fmt(s.repeatCard.next_visit_gold_reward)} Gold</span> on every visit
                        </div>
                    </div>
                </div>

                <!-- EDIT PANEL -->
                <div class="math-breakdown">
                    <div style="padding: 20px;">
                        <div style="font-size: 11px; font-weight: 800; color: var(--text-sub); text-transform: uppercase; margin-bottom: 15px;">Physical Card Logic</div>
                        
                        <div class="rc-input-row">
                            <span>Trigger Condition</span>
                            <div class="rc-val-edit" contenteditable="true" style="width: 120px;">${s.repeatCard.trigger}</div>
                        </div>

                        <div class="rc-input-row">
                            <span>Gold Reward Amount</span>
                            <div class="rc-val-edit inp-rc-gold" contenteditable="true" oninput="app.updateRepeatCard()">${window.app.fmt(s.repeatCard.next_visit_gold_reward)}</div>
                        </div>

                        <div class="rc-input-row">
                            <span>Redeem Min Bill</span>
                            <div class="rc-val-edit" contenteditable="true">${window.app.fmt(s.repeatCard.next_visit_min_spend)}</div>
                        </div>

                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color); font-size: 11px; color: var(--text-sub); line-height: 1.4;">
                            <i class="fa fa-print"></i> <b>Print this card.</b> Hand it to customers who spend above the trigger amount. They keep the card in their wallet and redeem Gold on every subsequent visit.
                        </div>
                    </div>
                </div>
            </div>

            <button class="btn btn-brand ripple-effect" style="margin-top: 40px;" onclick="app.shareStrategy()">
                <i class="fa fa-file-pdf"></i> Download Strategy PDF
            </button>
             <button class="btn ripple-effect" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-sub); margin-bottom: 50px;" onclick="location.reload()">
                Reset Strategy
            </button>
        `;

        container.innerHTML = html;
    }
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.app.init);
} else {
    window.app.init();
                }
