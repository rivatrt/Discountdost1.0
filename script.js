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

// --- APP STATE ---
const state = {
    page: 1,
    history: [1],
    category: CATEGORIES[0],
    storeName: "",
    visits: "",
    aov: "",
    discount: "",
    isDark: true,
    apiKey: null,
    strategy: null,
    loaderInterval: null,
    loaderStepIndex: 0,
    manualItems: [{name:"", price:""}, {name:"", price:""}, {name:"", price:""}],
    installPrompt: null,
    cooldownTimer: null
};

// Try to load API Key safely (GEMINI KEY)
try {
    state.apiKey = localStorage.getItem('discount_dost_gemini_key');
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
            
            if (state.apiKey) {
                const modal = document.getElementById('api-key-modal');
                if(modal) modal.style.display = 'none';
            }

            // Attach input listeners
            ['store', 'visits', 'aov', 'discount'].forEach(id => {
                const el = document.getElementById(`inp-${id}`);
                if(el) {
                    el.addEventListener('input', (e) => {
                        state[id === 'store' ? 'storeName' : id] = e.target.value;
                    });
                }
            });

            // Register Service Worker for PWA
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js')
                    .then(() => console.log('Service Worker Registered'))
                    .catch(e => console.log('SW Registration Failed:', e));
            }

            // Handle Install Prompt
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                state.installPrompt = e;
                const btn = document.getElementById('install-btn');
                if (btn) btn.style.display = 'flex';
            });

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
        if (!state.installPrompt) return;
        state.installPrompt.prompt();
        const { outcome } = await state.installPrompt.userChoice;
        if (outcome === 'accepted') {
            state.installPrompt = null;
            const btn = document.getElementById('install-btn');
            if (btn) btn.style.display = 'none';
        }
    },

    saveApiKey: () => {
        try {
            const input = document.getElementById('gemini-key-input');
            if (!input) return;
            
            const key = input.value.trim();
            if (key.length > 5) {
                try {
                    localStorage.setItem('discount_dost_gemini_key', key);
                } catch (e) {
                    console.warn("Could not save to localStorage");
                }
                state.apiKey = key;
                document.getElementById('api-key-modal').style.display = 'none';
            } else {
                alert("Please enter a valid API key");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving key. See console.");
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
        state.history.push(page);
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
        if(backBtn) backBtn.classList.toggle('visible', state.history.length > 1);
        
        const scrollContainer = document.getElementById('scroll-container');
        if(scrollContainer) scrollContainer.scrollTop = 0;
    },

    goBack: () => {
        if (state.history.length > 1) {
            state.history.pop();
            window.app.navTo(state.history[state.history.length - 1]);
            state.history.pop(); // Remove duplicate pushed by navTo
        }
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
        // Prevent toggle if editing
        if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') return;
        el.classList.toggle('expanded');
    },

    shareStrategy: () => {
        window.print();
    },

    // --- LIVE MATH UPDATE FOR DEALS ---
    updateDealMath: (el) => {
        const card = el.closest('.deal-card');
        if (!card) return;

        // Get new price from editable field
        const priceText = el.innerText.replace(/[^0-9]/g, '');
        const price = parseInt(priceText) || 0;

        // Recalculate Logic
        // Logic: Price is what user pays. Gold is cost to merchant.
        const gold = Math.max(30, Math.round(price * 0.15));
        const platformFee = Math.round(price * 0.10);
        const gst = Math.round(platformFee * 0.18);
        
        // Net = Customer Payment - Cost of Gold - Fee - GST
        const net = price - gold - platformFee - gst;

        // Update DOM elements
        const q = (sel) => card.querySelector(sel);
        
        if(q('.val-gold')) q('.val-gold').innerText = "- " + window.app.fmt(gold);
        if(q('.val-fee')) q('.val-fee').innerText = "- " + window.app.fmt(platformFee);
        if(q('.val-gst')) q('.val-gst').innerText = "- " + window.app.fmt(gst);
        if(q('.val-net')) q('.val-net').innerText = window.app.fmt(net);
        
        // Update bill value in breakdown as well
        if(q('.val-bill')) q('.val-bill').innerText = window.app.fmt(price);
        // Update tag
        if(q('.deal-tag')) q('.deal-tag').innerText = `+${window.app.fmt(gold)} GOLD`;
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
        
        // Category specific item banks
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
        // Generate random items scaled to user's AOV
        return items.map(i => `${i.n} ${Math.round(aov * i.p)}`).join('\n');
    },

    // --- COOLDOWN HANDLING (429 ERRORS) ---
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
                    // GEMINI API REQUEST (Scanning)
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: "Extract list of menu items and prices. Output simple text list." },
                                    { inline_data: { mime_type: "image/jpeg", data: base64Content } }
                                ]
                            }]
                        })
                    });

                    // Handle 429
                    if (response.status === 429) {
                        window.app.triggerCooldown();
                        return;
                    }

                    const result = await response.json();
                    let scannedText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

                    if (!scannedText || scannedText.length < 5) throw new Error("OCR yielded little text");

                    document.getElementById('menu-text').value = scannedText.trim();
                    window.app.toggleLoader(false);

                } catch (err) {
                    console.warn("AI Scan failed. Using Smart Fallback.", err);
                    const fallbackData = window.app.getFallbackMenu(state.category.id);
                    document.getElementById('menu-text').value = fallbackData;
                    setTimeout(() => window.app.toggleLoader(false), 800);
                }
            };
            reader.readAsDataURL(file);
        }
    },

    // --- AI ANALYSIS (GEMINI) ---
    toggleLoader: (show, isScanning = false) => {
        const loader = document.getElementById('loader');
        const list = document.getElementById('loader-list');
        
        if (show) {
            loader.style.display = 'flex';
            
            // Generate steps based on context
            const steps = isScanning ? 
                ["Scanning Image...", "Extracting Text...", "Identifying Prices...", "Formatting Menu..."] :
                ["Reading Menu Items...", "Benchmarking Prices...", "Identifying Heroes...", "Designing Combos...", "Calculating Gold...", "Finalizing Strategy..."];
            
            list.innerHTML = steps.map(s => `
                <div class="loader-step">
                    <div class="step-icon"><i class="fa fa-circle"></i></div>
                    <span>${s}</span>
                </div>
            `).join('');

            state.loaderStepIndex = 0;
            
            // Animate steps
            if(state.loaderInterval) clearInterval(state.loaderInterval);
            
            const stepEls = list.querySelectorAll('.loader-step');
            // Immediately activate first
            if(stepEls[0]) {
                stepEls[0].classList.add('active');
                stepEls[0].querySelector('.step-icon').innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
            }

            state.loaderInterval = setInterval(() => {
                if(state.loaderStepIndex < stepEls.length) {
                    const current = stepEls[state.loaderStepIndex];
                    // Mark current as done
                    current.classList.remove('active');
                    current.classList.add('done');
                    current.querySelector('.step-icon').innerHTML = '<i class="fa fa-check"></i>';
                    
                    state.loaderStepIndex++;
                    
                    // Activate next
                    if(state.loaderStepIndex < stepEls.length) {
                        const next = stepEls[state.loaderStepIndex];
                        next.classList.add('active');
                        next.querySelector('.step-icon').innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
                    }
                }
            }, 800); // 800ms per step
            
        } else {
            loader.style.display = 'none';
            clearInterval(state.loaderInterval);
        }
    },

    startAnalysis: async (manualText) => {
        const inputMenu = manualText || document.getElementById('menu-text').value;
        if (!inputMenu || inputMenu.length < 3) return alert("Please enter menu items");

        window.app.toggleLoader(true);

        // GEMINI PROMPT - OPTIMIZED FOR TOKENS
        const prompt = `Act as strategist. Store: ${state.storeName} (${state.category.label}). AOV: ${state.aov}.
Menu:
${inputMenu}

Create JSON strategy using ONLY these items.
{
  "deals": [{"title": "Combo/Offer Name", "items": "Item names", "real_value": number, "deal_price": number, "gold": number}], 
  "vouchers": [{"threshold": number, "amount": number, "desc": "string"}], 
  "repeatCard": {"trigger": "Bill > Amount", "next_visit_min_spend": number, "next_visit_gold_reward": number}
}
Rules:
1. 10 Deals. deal_price ~90% of real_value. gold ~15% of deal_price (min 30).
2. 5 Vouchers (Value 30-60% of AOV).
3. ONE Single Repeat Card strategy optimized for this AOV.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            // Handle 429
            if (response.status === 429) {
                window.app.triggerCooldown();
                return;
            }

            const result = await response.json();
            const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!jsonText) throw new Error("Empty AI response");

            const parsed = JSON.parse(jsonText);
            if (!parsed.deals || parsed.deals.length < 3) throw new Error("Incomplete deals");
            
            state.strategy = parsed;
            window.app.renderStrategy();

        } catch (err) {
            console.warn("AI failed. Using Smart Parse Fallback:", err);
            
            // --- STRICT PARSING FALLBACK ENGINE ---
            const lines = inputMenu.split('\n');
            const parsedItems = [];
            lines.forEach(line => {
                let cleanLine = line.replace(/[+\-]/g, '').trim();
                const match = cleanLine.match(/(.+?)[\s\:\.]+(\d+)/); 
                if (match) {
                    parsedItems.push({
                        name: match[1].trim(),
                        price: parseInt(match[2])
                    });
                }
            });

            const validItems = parsedItems.length > 0 ? parsedItems : [{name: "Standard Item", price: Number(state.aov)}];
            const aov = Number(state.aov) || 500;

            const deals = [];
            const prefixes = ["Mega", "Super", "Saver", "Family", "Duo", "Party", "Trial", "Premium", "Weekend", "Early Bird"];
            
            for(let i=0; i<10; i++) {
                const item1 = validItems[i % validItems.length];
                const item2 = validItems[(i+1) % validItems.length];
                let isHighValue = item1.price > (aov * 0.7);
                let isCombo = !isHighValue && (i % 3 !== 0); 
                
                let realVal = isCombo ? (item1.price + item2.price) : item1.price;
                let dealPrice = Math.round(realVal * 0.9);
                let rawGold = Math.round(dealPrice * 0.15);
                let gold = Math.max(30, rawGold);
                
                deals.push({
                    title: prefixes[i] + " " + (isCombo ? "Combo" : "Offer"),
                    items: isCombo ? `${item1.name} + ${item2.name}` : item1.name,
                    real_value: realVal,
                    deal_price: dealPrice,
                    gold: gold,
                    description: isCombo ? "Best value for money" : "Top selling item"
                });
            }

            const vouchers = [
                { threshold: Math.round(aov * 1.5), amount: Math.max(50, Math.round(aov * 0.3)), desc: "Spend More, Get More (Mid)" },
                { threshold: Math.round(aov * 2.5), amount: Math.max(100, Math.round(aov * 0.6)), desc: "High Roller Reward" },
                { threshold: Math.round(aov * 3.5), amount: Math.max(150, Math.round(aov * 0.8)), desc: "Celebration Bonus" },
                { threshold: Math.round(aov * 1.2), amount: Math.max(40, Math.round(aov * 0.15)), desc: "Easy Entry Reward" },
                { threshold: Math.round(aov * 5.0), amount: Math.max(250, Math.round(aov * 1.5)), desc: "VIP Whale Reward" }
            ];

            const repeatCard = { 
                trigger: "Bill > " + Math.round(aov * 1.5), 
                next_visit_min_spend: Math.round(aov * 2), 
                next_visit_gold_reward: Math.max(100, Math.round(aov * 0.4)) 
            };

            state.strategy = { deals, vouchers, repeatCard };
            window.app.renderStrategy();
        } finally {
            // Keep loader for a sec to show "Done" state
             setTimeout(() => window.app.toggleLoader(false), 500);
        }
    },

    renderStrategy: () => {
        document.getElementById('strategy-input-panel').style.display = 'none';
        const container = document.getElementById('strategy-results');
        container.style.display = 'block';

        const s = state.strategy;

        let html = `
            <!-- DEALS -->
            <div style="display: flex; alignItems: center; gap: 8px; margin-bottom: 15px; margin-top: 10px;">
                <div style="width: 24px; height: 24px; background: #FF5722; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                    <i class="fa fa-ticket-alt"></i>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">10 Exclusive Deals</span>
            </div>
            <div>
        `;

        s.deals.forEach((deal, idx) => {
            const realVal = deal.real_value || Math.round(deal.price * 1.1) || 0;
            const price = deal.deal_price || deal.price || 0;
            const gold = Math.max(30, deal.gold || Math.round(price * 0.15));
            
            const platformFee = Math.round(price * 0.10);
            const gstOnFee = Math.round(platformFee * 0.18);
            const net = price - gold - platformFee - gstOnFee;
            
            html += `
                <div class="deal-card deal-card-new stagger-in" onclick="app.toggleDeal(this)" style="animation-delay: ${idx * 0.05}s;">
                    <!-- HEADER -->
                    <div class="deal-header">
                        <div style="font-size: 10px; font-weight: 800; color: var(--text-sub); text-transform: uppercase; letter-spacing: 1px;">
                            DEAL #${idx+1}
                        </div>
                        <div class="deal-tag">
                            +${window.app.fmt(gold)} GOLD
                        </div>
                    </div>

                    <!-- BODY -->
                    <div class="deal-body">
                        <div contenteditable="true" style="font-size: 18px; font-weight: 800; margin-bottom: 6px; color: var(--text-main); line-height: 1.3;">${deal.title}</div>
                        <div contenteditable="true" style="font-size: 13px; color: var(--text-sub); line-height: 1.4; opacity: 0.8;">${deal.items}</div>
                        
                        <div class="deal-price-box">
                            <div>
                                <div class="price-label">Customer Pays</div>
                                <div contenteditable="true" oninput="app.updateDealMath(this)" class="deal-price-edit" style="font-size: 20px; font-weight: 800; color: var(--brand); letter-spacing: -0.5px;">${window.app.fmt(price)}</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="price-label">Real Value</div>
                                <div style="font-size: 14px; font-weight: 600; color: var(--text-sub); text-decoration: line-through;">${window.app.fmt(realVal)}</div>
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: 10px;">
                            <div class="tap-hint">TAP TO SEE BREAKDOWN <i class="fa fa-chevron-down"></i></div>
                        </div>
                    </div>

                    <!-- BREAKDOWN -->
                    <div class="math-breakdown">
                        <div style="padding: 20px;">
                            <div style="display:grid; grid-template-columns: 1fr auto; gap: 8px; font-size: 13px; margin-bottom: 15px;">
                                <div style="color:rgba(255,255,255,0.7);">Customer Pays (Revenue)</div>
                                <div class="val-bill" style="font-weight:700;">${window.app.fmt(price)}</div>
                                
                                <div style="color:rgba(255,255,255,0.7);">Less: Cost of Gold</div>
                                <div class="val-gold" style="font-weight:700; color:#FFB300;">- ${window.app.fmt(gold)}</div>
                                
                                <div style="color:rgba(255,255,255,0.7);">Less: Fee & GST</div>
                                <div class="val-fee" style="font-weight:700; color:#FF5722;">- ${window.app.fmt(platformFee + gstOnFee)}</div>
                            </div>
                            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 11px; color: #00E676; font-weight: 800; text-transform: uppercase;">Net Earning</span>
                                <span class="val-net" style="font-size: 18px; font-weight: 800; color: #00E676;">${window.app.fmt(net)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            
            <!-- VOUCHERS (GOLD STYLE) -->
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
                    
                    <div class="math-breakdown" style="margin-top: 15px; border-top: 1px solid rgba(0,0,0,0.1); color: #000;">
                        <div style="padding: 10px 0 0 0; font-size: 10px; opacity: 0.7;">
                            Tap to edit logic. These vouchers incentivize customers to spend above ${window.app.fmt(v.threshold)} to unlock ${window.app.fmt(v.amount)} for their next visit.
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            
            <!-- SINGLE REPEAT CARD -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; margin-top: 40px;">
                <div style="width: 24px; height: 24px; background: #4CAF50; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                    <i class="fa fa-redo"></i>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">Repeat Business Strategy</span>
            </div>
            
            <div class="single-repeat-card stagger-in" style="animation-delay: 1s;">
                <div class="src-title">The Loyalty Loop</div>
                <div class="src-grid">
                    <!-- Step 1 -->
                    <div class="src-step">
                        <div class="src-icon"><i class="fa fa-receipt"></i></div>
                        <div class="src-label">Give When</div>
                        <div class="src-value" contenteditable="true">${s.repeatCard.trigger || "Bill > 500"}</div>
                    </div>
                    <!-- Arrow -->
                    <div class="src-step"><i class="fa fa-chevron-right src-arrow"></i></div>
                    <!-- Step 2 -->
                    <div class="src-step">
                        <div class="src-icon"><i class="fa fa-store"></i></div>
                        <div class="src-label">Redeem On</div>
                        <div class="src-value">Spend <span contenteditable="true">${window.app.fmt(s.repeatCard.next_visit_min_spend)}</span></div>
                    </div>
                </div>
                
                <div class="src-reward">
                    <div style="font-size: 10px; font-weight: 800; color: #FFB300; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">CUSTOMER REWARD</div>
                    <div style="font-size: 24px; font-weight: 900; color: #FFB300;">
                         + <span contenteditable="true">${window.app.fmt(s.repeatCard.next_visit_gold_reward)}</span> GOLD
                    </div>
                    <div style="font-size: 11px; color: var(--text-sub); margin-top: 5px; opacity: 0.6;">(To be used on 3rd visit)</div>
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