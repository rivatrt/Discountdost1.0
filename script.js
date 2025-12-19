// --- CONSTANTS ---
const CATEGORIES = [
    { id: 'Restaurant', icon: 'fa-utensils', label: 'Restaurant', brandRef: "Swiggy/Zomato top brands like Domino's" },
    { id: 'Cafe', icon: 'fa-coffee', label: 'Cafe', brandRef: "Starbucks or Third Wave Coffee" },
    { id: 'Retail', icon: 'fa-shopping-bag', label: 'Retail', brandRef: "Westside or H&M" },
    { id: 'Salon', icon: 'fa-cut', label: 'Salon', brandRef: "Lakme or Toni & Guy" }, 
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

// --- APP STATE ---
const state = {
    page: 1,
    category: CATEGORIES[0],
    storeName: "",
    visits: "",
    aov: "",
    discount: "",
    isDark: true,
    apiKeys: [], 
    hfToken: "", 
    keyHistory: {}, 
    strategy: null,
    groundingSources: [],
    loaderInterval: null,
    terminalInterval: null,
    timerInterval: null,
    loaderProgress: 0,
    manualItems: [{name:"", price:""}, {name:"", price:""}, {name:"", price:""}],
    installPrompt: null,
    cooldownTimer: null
};

// MODEL CONFIG
const AI_MODELS = [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', rpm: 15, rpd: 1500, tpm: 1000000 },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', rpm: 15, rpd: 1500, tpm: 1000000 },
    { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro',   rpm: 2,  rpd: 50,   tpm: 32000 }
];

// --- INITIALIZATION ---
try {
    const storedKeys = localStorage.getItem('discount_dost_gemini_keys');
    if (storedKeys) state.apiKeys = JSON.parse(storedKeys);
    else {
        const single = localStorage.getItem('discount_dost_gemini_key');
        if (single) state.apiKeys = [single];
    }

    const storedHf = localStorage.getItem('discount_dost_hf_token');
    if (storedHf) state.hfToken = storedHf;

    const storedHistory = localStorage.getItem('discount_dost_key_history');
    if (storedHistory) state.keyHistory = JSON.parse(storedHistory);

} catch (e) {
    console.warn("Storage access error");
}

// --- ACCURATE TRACKING ENGINE ---
window.tracker = {
    logRequest: (key, tokenCount) => {
        if (!state.keyHistory[key]) state.keyHistory[key] = [];
        state.keyHistory[key].push({ ts: Date.now(), tokens: tokenCount });
        window.tracker.cleanup(key); 
        localStorage.setItem('discount_dost_key_history', JSON.stringify(state.keyHistory));
    },

    cleanup: (key) => {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        if (state.keyHistory[key]) {
            state.keyHistory[key] = state.keyHistory[key].filter(log => log.ts > oneDayAgo);
        }
    },

    getStats: (key) => {
        const history = state.keyHistory[key] || [];
        const now = Date.now();
        const oneMinAgo = now - 60000;
        const reqsLastMin = history.filter(log => log.ts > oneMinAgo).length;
        const tokensLastMin = history.filter(log => log.ts > oneMinAgo).reduce((sum, log) => sum + (log.tokens || 0), 0);
        const midnight = new Date();
        midnight.setHours(0,0,0,0);
        const reqsToday = history.filter(log => log.ts > midnight.getTime()).length;

        return { rpm: reqsLastMin, tpm: tokensLastMin, rpd: reqsToday, dailyLimit: 1500, rpmLimit: 15 };
    },

    isRateLimited: (key, modelRPM, modelRPD) => {
        const stats = window.tracker.getStats(key);
        if (stats.rpm >= modelRPM) return `RPM Limit (${stats.rpm}/${modelRPM})`;
        if (stats.rpd >= modelRPD) return `Daily Limit (${stats.rpd}/${modelRPD})`;
        return false;
    }
};

// --- APP CONTROLLER ---
window.app = {
    init: () => {
        try {
            document.body.classList.add('dark-mode');
            window.app.renderCategoryGrid();
            window.app.renderManualInputs();
            
            window.history.replaceState({page: 1}, "", "");
            window.addEventListener('popstate', (event) => {
                if (event.state && event.state.page) window.app.renderPage(event.state.page);
            });

            if (state.apiKeys.length > 0) {
                const modal = document.getElementById('api-key-modal');
                if(modal) modal.style.display = 'none';
            }

            ['store', 'visits', 'aov', 'discount'].forEach(id => {
                const el = document.getElementById(`inp-${id}`);
                if(el) el.addEventListener('input', (e) => state[id === 'store' ? 'storeName' : id] = e.target.value);
            });

        } catch (err) { console.error("Init error:", err); }
    },

    // --- KEY MANAGER UI ---
    openKeyManager: () => {
        const modal = document.getElementById('key-manager-modal');
        const list = document.getElementById('key-list');
        const hfInput = document.getElementById('hf-key-input');
        
        list.innerHTML = '';
        if (hfInput) hfInput.value = state.hfToken || '';
        
        for (let i = 0; i < 5; i++) {
            const val = state.apiKeys[i] || '';
            let statsHtml = '';

            if (val.length > 10) {
                const stats = window.tracker.getStats(val);
                const rpmPct = Math.min((stats.rpm / 15) * 100, 100);
                const rpdPct = Math.min((stats.rpd / 1500) * 100, 100);
                const rpmColor = stats.rpm >= 15 ? '#FF3D00' : (stats.rpm >= 12 ? '#FFC107' : '#00E676');
                const rpdColor = stats.rpd >= 1500 ? '#FF3D00' : '#4285F4';

                statsHtml = `
                    <div style="margin-top:5px; margin-bottom:15px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <span style="font-size:10px; font-weight:700; color:${rpmColor}">RPM (Speed): ${stats.rpm}/15</span>
                            <span style="font-size:10px; color:var(--text-sub);">Tokens/min: ${stats.tpm.toLocaleString()}</span>
                        </div>
                        <div style="height:4px; background:rgba(0,0,0,0.3); border-radius:2px; overflow:hidden; margin-bottom:8px;">
                            <div style="width:${rpmPct}%; background:${rpmColor}; height:100%; transition:width 0.3s;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <span style="font-size:10px; font-weight:700; color:var(--text-main);">Daily Usage: ${stats.rpd}/1500</span>
                        </div>
                        <div style="height:4px; background:rgba(0,0,0,0.3); border-radius:2px; overflow:hidden;">
                            <div style="width:${rpdPct}%; background:${rpdColor}; height:100%; transition:width 0.3s;"></div>
                        </div>
                    </div>
                `;
            }

            list.innerHTML += `
                <div>
                    <input type="text" id="key-slot-${i}" class="cat-trigger" 
                        placeholder="Gemini Key ${i+1} (Auto-Switch Slot)" value="${val}" 
                        style="padding: 12px; font-size: 13px; border:1px solid var(--border-color); width:100%;">
                    ${statsHtml}
                </div>
            `;
        }
        modal.style.display = 'flex';
    },

    saveKeys: () => {
        const newKeys = [];
        for (let i = 0; i < 5; i++) {
            const el = document.getElementById(`key-slot-${i}`);
            if (el && el.value.trim().length > 10) newKeys.push(el.value.trim());
        }
        
        // Save HF Token
        const hfInput = document.getElementById('hf-key-input');
        if (hfInput) {
            state.hfToken = hfInput.value.trim();
            localStorage.setItem('discount_dost_hf_token', state.hfToken);
        }

        if (newKeys.length > 0) {
            state.apiKeys = newKeys;
            localStorage.setItem('discount_dost_gemini_keys', JSON.stringify(newKeys));
            document.getElementById('key-manager-modal').style.display = 'none';
            document.getElementById('api-key-modal').style.display = 'none';
        } else {
            alert("Enter at least one valid Gemini key.");
        }
    },
    
    saveApiKey: () => {
        const input = document.getElementById('gemini-key-input');
        if (!input) return;
        const key = input.value.trim();
        if (key.length > 5) {
            state.apiKeys = [key];
            localStorage.setItem('discount_dost_gemini_keys', JSON.stringify(state.apiKeys));
            document.getElementById('api-key-modal').style.display = 'none';
        }
    },

    // --- PUTER.JS INTEGRATION (FREE TIER) ---
    generatePuter: async (prompt, isJson = true) => {
        if (typeof puter === 'undefined') throw new Error("Puter.js not loaded");
        
        // Fast Prompt: Simplify to reduce Puter's processing time
        const fastPrompt = `You are a JSON API. Return valid JSON only. \n${prompt.substring(0, 1500)}`; 

        const response = await puter.ai.chat(fastPrompt);
        const text = response?.message?.content || response?.toString() || "";
        
        if (isJson) {
             const match = text.match(/\{[\s\S]*\}/);
             if (match) return JSON.parse(match[0]);
             throw new Error("Puter JSON Parse Failed");
        }
        return { text };
    },

    // --- HUGGING FACE INTEGRATION ---
    generateHuggingFace: async (prompt, isJson = true) => {
        if (!state.hfToken) throw new Error("No HF Token");
        
        const model = "mistralai/Mistral-7B-Instruct-v0.3"; 
        const url = `https://api-inference.huggingface.co/models/${model}`;
        
        const formattedPrompt = `<s>[INST] ${prompt} [/INST]`;

        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${state.hfToken}`,
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ 
                inputs: formattedPrompt,
                parameters: { max_new_tokens: 2000, return_full_text: false, temperature: 0.7 } 
            })
        });

        if (!response.ok) throw new Error(`HF Error ${response.status}`);
        
        const result = await response.json();
        let text = result[0]?.generated_text || "";
        
        if (isJson) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            throw new Error("HF JSON Parse Failed");
        }
        return { text };
    },

    // --- CORE GENERATION LOGIC (TRIPLE LAYER) ---
    generateWithFallback: async (payloadFactory, type = 'text') => {
        const activeModelBadge = document.getElementById('loader-active-model');
        const modelNameText = document.getElementById('model-name-text');
        
        if(activeModelBadge) activeModelBadge.style.display = 'inline-flex';

        // TIMER HELPER: Reset timer based on expected latency
        const updateTimer = (seconds) => {
            window.app.startTimer(seconds);
        };

        // LAYER 1: GEMINI (High Speed ~ 8-12s)
        updateTimer(12);
        if (state.apiKeys && state.apiKeys.length > 0) {
            for (let m = 0; m < AI_MODELS.length; m++) {
                const model = AI_MODELS[m];
                if(modelNameText) modelNameText.innerText = model.label; 

                for (let k = 0; k < state.apiKeys.length; k++) {
                    const currentKey = state.apiKeys[k];
                    const limitReason = window.tracker.isRateLimited(currentKey, model.rpm, model.rpd);
                    if (limitReason) continue; 

                    try {
                        const body = payloadFactory(model.id);
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${currentKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body)
                        });

                        if (response.status === 429 || response.status === 503) {
                            for(let i=0; i<15; i++) window.tracker.logRequest(currentKey, 0);
                            continue; 
                        }

                        if (!response.ok) break; // Try next model

                        const data = await response.json();
                        const usage = data.usageMetadata;
                        const totalTokens = usage ? usage.totalTokenCount : 500;
                        window.tracker.logRequest(currentKey, totalTokens);
                        return data; 

                    } catch (e) { continue; }
                }
            }
        }
        
        // Extract raw prompt for fallbacks
        const dummyPayload = payloadFactory('dummy');
        const promptText = dummyPayload.contents[0].parts[0].text; 

        // LAYER 2: HUGGING FACE (Backup ~ 25s)
        if (state.hfToken && type === 'text') {
            updateTimer(25);
            if(modelNameText) modelNameText.innerText = "Hugging Face (Mistral)";
            try {
                const hfData = await window.app.generateHuggingFace(promptText);
                return { candidates: [{ content: { parts: [{ text: JSON.stringify(hfData) }] } }] };
            } catch (hfErr) { console.warn("HF Failed:", hfErr); }
        }

        // LAYER 3: PUTER.JS (Free / Unlimited ~ 35-45s)
        if (type === 'text') {
            updateTimer(40);
            if(modelNameText) modelNameText.innerText = "Puter.js (Free Tier)";
            try {
                const puterData = await window.app.generatePuter(promptText);
                return { candidates: [{ content: { parts: [{ text: JSON.stringify(puterData) }] } }] };
            } catch (pErr) { console.warn("Puter Failed:", pErr); }
        }

        window.app.showError("System Overload", "All AI providers (Google, HF, Puter) are busy. Please wait a moment.");
        throw new Error("QuotaExhausted");
    },

    // --- UI HELPERS ---
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
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.getElementById(`nav-${page}`);
        if(navItem) navItem.classList.add('active');
        document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
        const targetPage = page === 1 ? 'view-input' : page === 2 ? 'view-results' : 'view-strategy';
        const pageEl = document.getElementById(targetPage);
        if(pageEl) pageEl.classList.add('active');
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

    goBack: () => window.history.back(),

    validateAndNav: (page) => {
        if (!state.visits || !state.aov || !state.discount) {
            alert("Please fill all business details");
            return;
        }
        window.app.navTo(page);
    },

    fmt: (n) => {
        const num = parseFloat(n);
        if (isNaN(num)) return "₹0";
        return "₹" + Math.round(num).toLocaleString('en-IN');
    },
    
    fmtCompact: (n) => {
        const num = Number(n);
        if (isNaN(num)) return "₹0";
        if (num >= 10000000) return "₹" + (num / 10000000).toFixed(2) + " Cr";
        if (num >= 100000) return "₹" + (num / 100000).toFixed(2) + " L";
        return "₹" + Math.round(num).toLocaleString('en-IN');
    },

    toggleDeal: (el) => {
        if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') return;
        if (el.classList.contains('repeat-card-wrapper')) {
             el.classList.toggle('expanded');
             return;
        }
        el.classList.toggle('expanded');
    },

    shareStrategy: () => window.print(),

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

    recalcItemTotal: (inputEl) => {
        const card = inputEl.closest('.deal-card');
        if(!card) return;
        let totalReal = 0;
        const itemRows = card.querySelectorAll('.item-row-price');
        itemRows.forEach(row => {
            const val = parseFloat(row.innerText.replace(/[^0-9.]/g, '')) || 0;
            totalReal += val;
        });
        const realValDisplay = card.querySelector('.real-value-display');
        if(realValDisplay) realValDisplay.innerText = window.app.fmt(totalReal);
        window.app.updateDealMath(inputEl); 
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
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; background: var(--bg-input); border-bottom: 1px solid var(--border-color);">
                    <div style="padding: 15px; font-size: 12px; font-weight: 800; color: var(--text-main); border-right: 1px solid var(--border-color);">DAILY</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: var(--danger); border-right: 1px solid var(--border-color);">${window.app.fmtCompact(discountDaily)}</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: #FFB300;">${window.app.fmtCompact(goldDaily)}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; background: var(--bg-input); border-bottom: 1px solid var(--border-color);">
                    <div style="padding: 15px; font-size: 12px; font-weight: 800; color: var(--text-main); border-right: 1px solid var(--border-color);">MONTHLY</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: var(--danger); border-right: 1px solid var(--border-color);">${window.app.fmtCompact(discountMonthly)}</div>
                    <div style="padding: 15px 8px; font-size: 14px; font-weight: 800; color: #FFB300;">${window.app.fmtCompact(goldMonthly)}</div>
                </div>
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
    
    getFallbackMenu: (catId) => {
        const aov = Number(state.aov) || 500;
        const dictionaries = {
            'Cafe': [{n: "Cappuccino", p: 0.4}, {n: "Cold Brew", p: 0.5}, {n: "Croissant", p: 0.45}, {n: "Bagel Cream Cheese", p: 0.5}],
            'Restaurant': [{n: "Butter Chicken", p: 0.8}, {n: "Dal Makhani", p: 0.6}, {n: "Garlic Naan", p: 0.15}, {n: "Paneer Tikka", p: 0.55}],
            'Retail': [{n: "Cotton Tee", p: 0.5}, {n: "Denim Jeans", p: 1.5}, {n: "Summer Dress", p: 1.2}, {n: "Sneakers", p: 2.0}],
            'Grocery': [{n: "Fresh Atta 5kg", p: 0.4}, {n: "Premium Rice", p: 0.8}, {n: "Cooking Oil", p: 1.0}, {n: "Dry Fruits Pack", p: 1.2}],
            'Salon': [{n: "Haircut", p: 0.5}, {n: "Facial", p: 1.5}, {n: "Manicure", p: 0.8}, {n: "Pedicure", p: 0.9}]
        };
        const items = dictionaries[catId] || dictionaries['Restaurant'];
        return items.map(i => `${i.n} ${Math.round(aov * i.p)}`).join('\n');
    },

    showError: (title, desc) => {
        window.app.toggleLoader(false);
        const modal = document.getElementById('error-modal');
        document.getElementById('error-title').innerText = title;
        document.getElementById('error-desc').innerText = desc;
        modal.style.display = 'flex';
    },

    handleFile: async (input) => {
        if (input.files && input.files.length > 0) {
            const files = Array.from(input.files);
            if (files.length > 10) return alert("Please upload a maximum of 10 files at a time.");
            window.app.toggleLoader(true, true); 
            try {
                const filePromises = files.map(file => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const base64Data = e.target.result.split(',')[1];
                            let mime = file.type || "image/jpeg";
                            if (!mime && file.name.toLowerCase().endsWith('.pdf')) mime = 'application/pdf';
                            if (!mime && file.name.toLowerCase().match(/\.(jpg|jpeg)$/)) mime = 'image/jpeg';
                            if (!mime && file.name.toLowerCase().endsWith('.png')) mime = 'image/png';
                            resolve({ inline_data: { mime_type: mime, data: base64Data } });
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                });
                const inlineDataParts = await Promise.all(filePromises);
                const result = await window.app.generateWithFallback((modelId) => ({
                    contents: [{
                        parts: [
                            { text: "Analyze these menu images/PDFs. Extract all menu items and prices into a single clean list. Ignore phone numbers or addresses." },
                            ...inlineDataParts 
                        ]
                    }]
                }), 'ocr');
                let scannedText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (!scannedText || scannedText.length < 5) throw new Error("OCR yielded little text");
                document.getElementById('menu-text').value = scannedText.trim();
            } catch (err) {
                if (err.message !== "QuotaExhausted" && err.message !== "No API Keys") {
                    window.app.showError("Scan Failed", "Could not read files. Please try clearer images or a text PDF.");
                    const fallbackData = window.app.getFallbackMenu(state.category.id);
                    document.getElementById('menu-text').value = fallbackData;
                }
            } finally {
                input.value = ''; 
                window.app.toggleLoader(false);
            }
        }
    },

    toggleLoader: (show, isScanning = false) => {
        const loader = document.getElementById('loader');
        const quoteBox = document.getElementById('loader-quote');
        const storeNameEl = document.getElementById('loader-store-name');
        const statusEl = document.getElementById('status-dynamic');
        const progressEl = document.getElementById('loader-progress');
        const activeModelBadge = document.getElementById('loader-active-model');
        const timerEl = document.getElementById('loader-timer');
        
        if (show) {
            loader.style.display = 'flex';
            if(activeModelBadge) activeModelBadge.style.display = 'none'; 
            if(storeNameEl) storeNameEl.innerText = state.storeName || "Your Business";
            if(timerEl) timerEl.innerText = ""; // Reset timer text initially

            let progress = 0;
            const statusSteps = isScanning 
                ? ["Reading Files...", "Enhancing Image...", "Extracting Text...", "Finalizing OCR..."]
                : ["Analyzing Menu...", "Benchmarking Prices...", "Identifying Whales...", "Cooking Deals...", "Polishing Strategy..."];
            if (state.loaderInterval) clearInterval(state.loaderInterval);
            state.loaderInterval = setInterval(() => {
                progress += Math.floor(Math.random() * 5) + 1;
                if (progress > 95) progress = 95;
                if (progressEl) progressEl.style.width = progress + "%";
                const stepIdx = Math.floor((progress / 100) * statusSteps.length);
                if (statusEl && statusSteps[stepIdx]) statusEl.innerText = statusSteps[stepIdx];
            }, 200);
            const rotateTip = () => {
                const tip = MERCHANT_TIPS[Math.floor(Math.random() * MERCHANT_TIPS.length)];
                quoteBox.innerText = tip;
            };
            rotateTip(); 
            if (state.tipInterval) clearInterval(state.tipInterval);
            state.tipInterval = setInterval(rotateTip, 3000); 
        } else {
            if (progressEl) progressEl.style.width = "100%";
            if (statusEl) statusEl.innerText = "Complete!";
            // Reset Timer on finish
            if(state.timerInterval) clearInterval(state.timerInterval);
            if(timerEl) timerEl.innerText = "";

            setTimeout(() => {
                loader.style.display = 'none';
                clearInterval(state.tipInterval);
                clearInterval(state.loaderInterval);
                if (progressEl) progressEl.style.width = "0%";
            }, 500);
        }
    },

    // NEW: Real-time Countdown Timer Logic
    startTimer: (duration) => {
        let remaining = duration;
        const el = document.getElementById('loader-timer');
        if (!el) return;
        
        // Clear previous timer if running
        if (state.timerInterval) clearInterval(state.timerInterval);
        
        // Initial set
        el.innerText = `Est. Time: ${remaining}s`;
        
        state.timerInterval = setInterval(() => {
            remaining--;
            if(remaining <= 0) {
                el.innerText = "Finishing up...";
                clearInterval(state.timerInterval);
            } else {
                el.innerText = `Est. Time: ${remaining}s`;
            }
        }, 1000);
    },

    startAnalysis: async (manualText) => {
        const isQuickMode = document.getElementById('skip-details-toggle')?.checked;
        if (!isQuickMode && (!state.visits || !state.aov)) {
            alert("Please enter Business Details on Page 1 first, or enable 'Quick Mode' toggle.");
            window.app.navTo(1);
            return;
        }
        const inputMenu = manualText || document.getElementById('menu-text').value;
        if (!inputMenu || inputMenu.length < 3) return alert("Please enter menu items");

        window.app.toggleLoader(true);
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const currentAOV = isQuickMode ? 500 : state.aov; 
        const currentDiscount = isQuickMode ? 10 : state.discount;
        const storeName = state.storeName || "My Store";

        const prompt = `Role: Senior Brand Strategist for a ${state.category.label} (Ref: ${state.category.brandRef}).
        CONTEXT:
        - Date: ${dateStr}. (CRITICAL: Generate titles relevant to UPCOMING festivals/seasons relative to this date).
        - Store: '${storeName}'
        - AOV: ₹${currentAOV}
        - Current Discount: ${currentDiscount}%
        - MENU DATA: ${inputMenu}
        TASK: Create retention strategy.
        1. 10 'Smart Bundles':
           - Combos priced 15-20% above ₹${currentAOV}.
           - TITLES: Catchy, Hinglish or trendy.
           - STRUCTURE: 'items' array (REQUIRED for Quick Mode and Full Mode).
           - Gold Value ~10-15% of deal_price.
        2. 5 Gold Vouchers.
        3. Physical Repeat Card.
        OUTPUT JSON: { "deals": [{"title": "string", "deal_price": number, "gold": number, "items": [{"name": "string", "price": number}]}], "vouchers": [{"threshold": number, "amount": number, "desc": "string"}], "repeatCard": {...} }`;

        try {
            const result = await window.app.generateWithFallback((modelId) => ({
                contents: [{ parts: [{ text: prompt }] }]
            }));

            const candidate = result?.candidates?.[0];
            let jsonText = candidate?.content?.parts?.[0]?.text;
            const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
            state.groundingSources = groundingChunks.map(c => c.web).filter(w => w);

            if (jsonText) jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
            if (!jsonText) throw new Error("Empty AI response");

            let parsed;
            try { parsed = JSON.parse(jsonText); } catch (e) { throw new Error("Invalid JSON"); }

            if (!parsed.deals || !Array.isArray(parsed.deals)) parsed.deals = [];
            parsed.deals = parsed.deals.map(d => {
                // Ensure real deal price matches sum of items
                if (typeof d.items === 'string') {
                    d.items = [{name: d.items, price: d.deal_price}];
                } else if (Array.isArray(d.items)) {
                    const totalRealVal = d.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
                    if (totalRealVal > 0) d.deal_price = totalRealVal; 
                }
                return d;
            });

            if (!parsed.repeatCard) {
                parsed.repeatCard = {
                    trigger: `Bill > ${window.app.fmt(Number(currentAOV)/2)}`,
                    next_visit_min_spend: Number(currentAOV),
                    next_visit_gold_reward: Math.round(Number(currentAOV)*0.1),
                    card_title: "Gold Member",
                    card_desc: "Visit 5 times to unlock bonus"
                };
            }

            if (!parsed.vouchers || !Array.isArray(parsed.vouchers)) {
                parsed.vouchers = [
                    {threshold: Number(currentAOV), amount: Math.round(Number(currentAOV)*0.05), desc: "Bronze Reward"},
                    {threshold: Number(currentAOV)*2, amount: Math.round(Number(currentAOV)*0.2), desc: "Silver Reward"}
                ];
            }
            state.strategy = parsed;
            window.app.renderStrategy();

        } catch (err) {
            if (err.message !== "QuotaExhausted" && err.message !== "No API Keys") {
                 console.warn("AI failed. Using Smart Parse Fallback:", err);
                 const deals = [];
                 for(let i=0; i<10; i++) deals.push({title: "Offer "+(i+1), items: [{name: "Item 1", price: 100}], real_value: Number(currentAOV), deal_price: Number(currentAOV), gold: Math.round(currentAOV*0.1)});
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
        const isQuickMode = document.getElementById('skip-details-toggle')?.checked;
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="font-size:10px; font-weight:700; color:var(--text-sub); text-transform:uppercase;">
                    ${isQuickMode ? '<i class="fa fa-bolt"></i> Quick Mode' : '<i class="fa fa-chart-line"></i> Deep Analysis'}
                </div>
                <button class="btn ripple-effect" style="width: auto; padding: 8px 16px; font-size: 11px; height: 32px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);" onclick="app.startAnalysis()">
                    <i class="fa fa-sync-alt"></i> Regenerate
                </button>
            </div>
        `;

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
                    html += `<a href="${src.uri}" target="_blank" style="font-size: 11px; color: var(--text-main); text-decoration: none; background: var(--bg-surface); padding: 4px 10px; border-radius: 15px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 5px;">${src.title} <i class="fa fa-external-link-alt" style="font-size: 9px; opacity: 0.5;"></i></a>`;
                }
            });
            html += `</div></div>`;
        }
        
        html += `<div style="display: flex; alignItems: center; gap: 8px; margin-bottom: 15px; margin-top: 10px;"><div style="width: 24px; height: 24px; background: #FF5722; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;"><i class="fa fa-ticket-alt"></i></div><span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">10 Exclusive Deals</span></div><div>`;

        if (s.deals && s.deals.length > 0) {
            s.deals.forEach((deal, idx) => {
                let realVal = 0;
                let itemsHtml = '';
                
                // RE-CALCULATE REAL VALUE FROM ITEMS
                if (Array.isArray(deal.items)) {
                    deal.items.forEach(item => {
                        const p = Number(item.price) || 0;
                        realVal += p;
                        itemsHtml += `<div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding: 6px 0;"><div contenteditable="true" style="font-size: 13px; color: var(--text-sub); flex: 1;">${item.name}</div><div contenteditable="true" class="item-row-price" oninput="app.recalcItemTotal(this)" style="font-size: 13px; font-weight: 700; color: var(--text-main); width: 60px; text-align: right;">${p}</div></div>`;
                    });
                } else { 
                    realVal = deal.deal_price; 
                }

                // Force Deal Price to match Real Value initially (Gold Logic)
                const price = realVal;
                
                const gold = Math.max(30, deal.gold || Math.round(price * 0.10));
                const platformFee = Math.round(price * 0.10);
                const gstOnFee = Math.round(platformFee * 0.18);
                const net = price - gold - platformFee - gstOnFee;
                const goldPct = price > 0 ? Math.round((gold / price) * 100) : 10;

                html += `
                    <div class="deal-card deal-card-new stagger-in" onclick="app.toggleDeal(this)" style="animation-delay: ${idx * 0.05}s;">
                        <div class="deal-header"><div style="font-size: 10px; font-weight: 800; color: var(--text-sub); text-transform: uppercase; letter-spacing: 1px;">DEAL #${idx+1}</div><div class="deal-tag">GET ${window.app.fmt(gold)} GOLD</div></div>
                        <div class="deal-body">
                            <div contenteditable="true" style="font-size: 18px; font-weight: 800; margin-bottom: 12px; color: var(--text-main); line-height: 1.3;">${deal.title || 'Special Offer'}</div>
                            
                            <!-- ITEMS CLIPS (Visual Summary) -->
                            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 15px;">
                                ${(Array.isArray(deal.items) ? deal.items.slice(0,3).map(i => 
                                    `<div style="font-size: 10px; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 12px; color: var(--text-sub); border: 1px solid rgba(255,255,255,0.05);">${i.name}</div>`
                                ).join('') : '')}
                                ${(Array.isArray(deal.items) && deal.items.length > 3) ? `<div style="font-size: 10px; opacity: 0.5;">+${deal.items.length - 3} more</div>` : ''}
                            </div>

                            <div class="deal-price-box"><div><div class="price-label">Deal Price (Full Value)</div><div contenteditable="true" oninput="app.updateDealMath(this)" class="deal-price-edit" style="font-size: 20px; font-weight: 800; color: var(--brand); letter-spacing: -0.5px;">${window.app.fmt(price)}</div></div><div style="text-align: right;"><div class="price-label">Net Earning</div><div class="val-net" style="font-size: 16px; font-weight: 800; color: #00E676;">${window.app.fmt(net)}</div></div></div>
                            <div style="text-align: center; margin-top: 10px;"><div class="tap-hint">TAP TO SEE BREAKDOWN <i class="fa fa-chevron-down"></i></div></div>
                        </div>
                        <div class="math-breakdown">
                             <div style="padding: 20px;">
                                <!-- DETAILED ITEM BREAKDOWN INSIDE -->
                                <div style="background: var(--bg-input); border-radius: 8px; padding: 10px; margin-bottom: 15px;">
                                    <div style="font-size: 9px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; margin-bottom: 5px;">Item Breakdown</div>
                                    ${itemsHtml}
                                    <div style="display: flex; justify-content: space-between; padding-top: 8px; margin-top: 4px; border-top: 1px solid var(--border-color);"><div style="font-size: 11px; font-weight: 800;">Total Real Value</div><div class="real-value-display" style="font-size: 12px; font-weight: 800;">${window.app.fmt(realVal)}</div></div>
                                </div>

                                <div class="math-row"><div class="math-label">Customer Pays</div><div class="math-val val-bill">${window.app.fmt(price)}</div></div>
                                <div class="math-row"><div class="math-label">Gold Reward (<span contenteditable="true" oninput="app.updateDealMath(this)" class="edit-pct pct-gold">${goldPct}</span>%)</div><div class="math-val val-gold" style="color:#FFB300;">- ${window.app.fmt(gold)}</div></div>
                                <div class="math-row"><div class="math-label">Platform Fee (<span contenteditable="true" oninput="app.updateDealMath(this)" class="edit-pct pct-fee">10</span>%)</div><div class="math-val val-fee" style="color:#FF5722;">- ${window.app.fmt(platformFee)}</div></div>
                                <div class="math-row"><div class="math-label">GST (<span contenteditable="true" oninput="app.updateDealMath(this)" class="edit-pct pct-gst">18</span>%)</div><div class="math-val val-gst" style="color:#FF5722;">- ${window.app.fmt(gstOnFee)}</div></div>
                                <div style="padding-top: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 5px; border-top:1px solid var(--border-color);"><span style="font-size: 11px; color: #00E676; font-weight: 800; text-transform: uppercase;">Net Merchant Earning</span><span class="val-net" style="font-weight: 800; font-size:18px;">${window.app.fmt(net)}</span></div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        html += `</div>`;
        
        html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; margin-top: 40px;"><div style="width: 24px; height: 24px; background: #FFC107; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: black; font-size: 12px;"><i class="fa fa-gift"></i></div><span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">Gold Vouchers (Retention)</span></div><div style="display: flex; overflow-x: auto; gap: 15px; padding-bottom: 20px; scroll-snap-type: x mandatory;">`;
        if (s.vouchers && s.vouchers.length > 0) {
            s.vouchers.forEach((v, i) => {
                const amount = window.app.fmt(Number(v.amount) || 0);
                const threshold = window.app.fmt(Number(v.threshold) || 0);
                
                html += `<div class="voucher-card-gold stagger-in" onclick="app.toggleDeal(this)" style="animation-delay: ${0.5 + (i * 0.1)}s;"><div style="display: flex; justify-content: space-between; align-items: center;"><div style="font-size: 10px; font-weight: 800; text-transform: uppercase; opacity: 0.8;">VOUCHER</div><div style="font-size: 10px; font-weight: 700; background: #000; color: #FFC107; padding: 2px 6px; border-radius: 4px;">GOLD</div></div><div style="text-align: center; padding: 15px 0;"><div contenteditable="true" style="font-size: 32px; font-weight: 900; letter-spacing: -1px;">${amount}</div><div style="font-size: 10px; font-weight: 700; margin-top: 5px; opacity: 0.7;">ON BILL > ${threshold}</div></div><div contenteditable="true" style="font-size: 11px; text-align: center; font-weight: 600; opacity: 0.8; line-height: 1.4;">${v.desc}</div></div>`;
            });
        }
        html += `</div>`;

        const rc = s.repeatCard || { trigger: "Bill > 500", next_visit_gold_reward: 50, next_visit_min_spend: 100, card_title: "Gold Member", card_desc: "Loyalty Card" };
        html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; margin-top: 40px;"><div style="width: 24px; height: 24px; background: #4CAF50; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;"><i class="fa fa-credit-card"></i></div><span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">Physical Repeat Business Card</span></div>
            <div class="repeat-card-wrapper stagger-in" onclick="app.toggleDeal(this)" style="animation-delay: 1s;">
                <div class="repeat-card-visual"><div class="rc-logo-corner"><i class="fa fa-infinity"></i></div><div><div class="rc-chip"></div><div class="rc-store-name">${state.storeName || "STORE NAME"}</div></div><div><div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">${rc.card_title || "Platinum Club"}</div><div class="rc-offer-main">Get <span class="gold-text">${window.app.fmt(rc.next_visit_gold_reward || 0)} Gold</span> on every visit</div></div></div>
                <div class="math-breakdown"><div style="padding: 20px;"><div style="font-size: 11px; font-weight: 800; color: var(--text-sub); text-transform: uppercase; margin-bottom: 15px;">Physical Card Logic</div><div class="rc-input-row"><span>Trigger Condition</span><div class="rc-val-edit" contenteditable="true" style="width: 120px;">${rc.trigger || 'N/A'}</div></div><div class="rc-input-row"><span>Gold Reward Amount</span><div class="rc-val-edit inp-rc-gold" contenteditable="true" oninput="app.updateRepeatCard()">${window.app.fmt(rc.next_visit_gold_reward || 0)}</div></div><div class="rc-input-row"><span>Redeem Min Bill</span><div class="rc-val-edit" contenteditable="true">${window.app.fmt(rc.next_visit_min_spend || 0)}</div></div><div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color); font-size: 11px; color: var(--text-sub); line-height: 1.4;"><i class="fa fa-print"></i> <b>Print this card.</b> Hand it to customers who spend above the trigger amount. They keep the card in their wallet and redeem Gold on every subsequent visit.</div></div></div>
            </div>
            <button class="btn btn-brand ripple-effect" style="margin-top: 40px;" onclick="app.shareStrategy()"><i class="fa fa-file-pdf"></i> Download Strategy PDF</button>
            <button class="btn ripple-effect" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-sub); margin-bottom: 50px;" onclick="location.reload()">Reset Strategy</button>
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
