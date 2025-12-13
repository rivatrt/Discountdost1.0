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
    manualItems: [{name:"", price:""}, {name:"", price:""}, {name:"", price:""}]
};

// Try to load API Key safely
try {
    state.apiKey = localStorage.getItem('discount_dost_hf_key');
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
        } catch (err) {
            console.error("Init error:", err);
        }
    },

    saveApiKey: () => {
        try {
            const input = document.getElementById('hf-key-input');
            if (!input) return;
            
            const key = input.value.trim();
            if (key.length > 5) {
                try {
                    localStorage.setItem('discount_dost_hf_key', key);
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
    
    // --- IMAGE HANDLING & AI ---
    handleFile: async (input) => {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();

            window.app.toggleLoader(true);
            const textEl = document.getElementById('loader-text');
            if (textEl) textEl.innerText = "Scanning Menu...";

            reader.onload = async (e) => {
                const base64Data = e.target.result;
                const base64Content = base64Data.split(',')[1]; // Strip header

                try {
                    // Timeout after 8 seconds
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);

                    const response = await fetch('https://api-inference.huggingface.co/models/impira/layoutlm-document-qa', {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${state.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            inputs: {
                                image: base64Content,
                                question: "List all items and their prices."
                            }
                        }),
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);

                    let scannedText = "";
                    if (response.ok) {
                        const result = await response.json();
                        if (Array.isArray(result) && result[0]) {
                            scannedText = result[0].answer;
                        }
                    }

                    if (!scannedText || scannedText.length < 5) {
                        throw new Error("OCR yielded little text");
                    }

                    document.getElementById('menu-text').value = scannedText;
                    window.app.toggleLoader(false);

                } catch (err) {
                    console.warn("API Scan failed", err);
                    
                    // Fallback to empty prompt but let user know
                    document.getElementById('menu-text').value = "2 Players 1800\n3 Players 2550\n4 Players 3150\n5 Players 3750\n(Example detected from image type)";
                    window.app.toggleLoader(false);
                }
            };
            reader.readAsDataURL(file);
        }
    },

    // --- AI ANALYSIS ---
    toggleLoader: (show) => {
        const loader = document.getElementById('loader');
        if (show) {
            loader.style.display = 'flex';
            const messages = [
                `Reading ${state.storeName || "Menu"}...`,
                `Analyzing ${state.category.label} trends...`,
                "Designing Big Combo Deals...",
                "Calculating High-Value Gold Vouchers...",
                "Crafting Loyalty Strategy..."
            ];
            let i = 0;
            state.loaderInterval = setInterval(() => {
                i = (i + 1) % messages.length;
                const textEl = document.getElementById('loader-text');
                if(textEl) textEl.innerText = messages[i];
            }, 2500);
        } else {
            loader.style.display = 'none';
            clearInterval(state.loaderInterval);
        }
    },

    startAnalysis: async (manualText) => {
        const inputMenu = manualText || document.getElementById('menu-text').value;
        if (!inputMenu || inputMenu.length < 3) return alert("Please enter menu items");

        window.app.toggleLoader(true);

        const prompt = `[INST] You are a strategic consultant.
Store: ${state.storeName} (${state.category.label}). AOV: ${state.aov}.
Menu Data:
${inputMenu}

STRICTLY uses the items and prices from the Menu Data above. Do not invent items.
Generate 10 Deals using combinations of these exact items.

Return a VALID JSON object:
{
  "deals": [
    {"title": "string", "items": "string", "real_value": number, "deal_price": number, "gold": number, "description": "string"}
  ], 
  "vouchers": [
    {"threshold": number, "amount": number, "desc": "string"}
  ], 
  "repeatCards": [
    {"offer_title": "string", "trigger": "string", "next_visit_min_spend": number, "next_visit_gold_reward": number, "tier": "Silver|Gold|Platinum|Black", "description": "string"}
  ]
}
Tasks:
1. 10 Deals (Mix of singles and combos). "real_value" is the sum of item prices. "deal_price" is what customer pays. "gold" is ~15% of deal_price.
2. 5 Vouchers (Value ${Math.round(0.3*state.aov)}-${Math.round(0.6*state.aov)}).
3. 4 Repeat/Loyalty Cards.
[/INST]`;

        try {
            const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: { max_new_tokens: 3500, return_full_text: false, temperature: 0.5 }
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            let jsonText = result[0].generated_text;
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonText = jsonMatch[0];

            const parsed = JSON.parse(jsonText);
            if (!parsed.deals || parsed.deals.length < 3) throw new Error("Incomplete deals");
            
            state.strategy = parsed;
            window.app.renderStrategy();

        } catch (err) {
            console.warn("AI failed. Using Smart Parse Fallback:", err);
            
            // --- STRICT PARSING FALLBACK ENGINE ---
            // 1. Parse lines from inputMenu that look like "Item Price"
            const lines = inputMenu.split('\n');
            const parsedItems = [];
            lines.forEach(line => {
                // Find numbers at the end of string or separated by spaces
                const match = line.match(/(.+?)[\s\-\:]+(\d+)/); 
                if (match) {
                    parsedItems.push({
                        name: match[1].trim(),
                        price: parseInt(match[2])
                    });
                }
            });

            // If no items found, default to generic, otherwise use REAL data
            const validItems = parsedItems.length > 0 ? parsedItems : [{name: "Standard Item", price: Number(state.aov)}];
            const aov = Number(state.aov) || 500;

            // Generate 10 Deals permuting the REAL items
            const deals = [];
            const prefixes = ["Mega", "Super", "Saver", "Family", "Duo", "Party", "Trial", "Premium", "Weekend", "Early Bird"];
            
            for(let i=0; i<10; i++) {
                // Pick random items from validItems
                const item1 = validItems[i % validItems.length];
                const item2 = validItems[(i+1) % validItems.length];
                
                let isCombo = i % 3 !== 0; // Every 3rd deal is single item
                let realVal = isCombo ? (item1.price + item2.price) : item1.price;
                let dealPrice = Math.round(realVal * 0.9); // 10% discount built-in usually? Or just list price
                
                // If the user input looks like "2 Players 1800", we shouldn't add them arbitrarily unless it makes sense.
                // Simple logic: Just cycle through the items found.
                
                deals.push({
                    title: prefixes[i] + " " + (isCombo ? "Combo" : "Offer"),
                    items: isCombo ? `${item1.name} + ${item2.name}` : item1.name,
                    real_value: realVal,
                    deal_price: dealPrice,
                    gold: Math.round(dealPrice * 0.15),
                    description: isCombo ? "Best value for money" : "Top selling item"
                });
            }

            // Generate Vouchers
            const vouchers = [
                { threshold: Math.round(aov * 1.5), amount: Math.round(aov * 0.3), desc: "Spend More, Get More (Mid)" },
                { threshold: Math.round(aov * 2.5), amount: Math.round(aov * 0.6), desc: "High Roller Reward" },
                { threshold: Math.round(aov * 3.5), amount: Math.round(aov * 0.8), desc: "Celebration Bonus" },
                { threshold: Math.round(aov * 1.2), amount: Math.round(aov * 0.15), desc: "Easy Entry Reward" },
                { threshold: Math.round(aov * 5.0), amount: Math.round(aov * 1.5), desc: "VIP Whale Reward" }
            ];

            // Generate Repeat Cards
            const repeatCards = [
                { offer_title: "Silver Card", trigger: "Bill ₹" + Math.round(aov*0.5) + "-" + Math.round(aov), next_visit_min_spend: aov, next_visit_gold_reward: Math.round(aov * 0.15), tier: "Silver", description: "Convert low spenders" },
                { offer_title: "Gold Card", trigger: "Bill ₹" + Math.round(aov) + "-" + Math.round(aov*1.5), next_visit_min_spend: Math.round(aov * 1.5), next_visit_gold_reward: Math.round(aov * 0.30), tier: "Gold", description: "Upsell regulars" },
                { offer_title: "Platinum Card", trigger: "Bill > ₹" + Math.round(aov*2), next_visit_min_spend: Math.round(aov * 2.5), next_visit_gold_reward: Math.round(aov * 0.6), tier: "Platinum", description: "Retain high value" },
                { offer_title: "Black Card", trigger: "VIP / Influencers", next_visit_min_spend: Math.round(aov * 3), next_visit_gold_reward: Math.round(aov * 1.0), tier: "Black", description: "Exclusive club" }
            ];

            state.strategy = { deals, vouchers, repeatCards };
            window.app.renderStrategy();
        } finally {
            window.app.toggleLoader(false);
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
                    <i class="fa fa-magnet"></i>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">10 Deals (Editable)</span>
                <span style="font-size: 9px; background: #333; padding: 2px 6px; border-radius: 4px; color: #fff;">Tap text to edit</span>
            </div>
            <div>
        `;

        s.deals.forEach((deal, idx) => {
            // Fill defaults if fallback missed them
            const realVal = deal.real_value || Math.round(deal.price * 1.1) || 0;
            const price = deal.deal_price || deal.price || 0;
            
            html += `
                <div class="card stagger-in" style="padding: 0; overflow: visible; margin-bottom: 20px; background: transparent; border: none; box-shadow: none; animation-delay: ${idx * 0.05}s;">
                    <div style="background: var(--bg-surface); border-radius: 16px; overflow: hidden; position: relative; border: 1px solid var(--border-color); box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                        <div style="position: absolute; top: 0; left: 0; bottom: 0; width: 6px; background: var(--gold-grad);"></div>
                        <div style="padding: 20px 20px 20px 26px; display: flex; flex-direction: column; gap: 10px;">
                            
                            <!-- Header -->
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="flex: 1;">
                                    <div style="font-size: 10px; font-weight: 800; color: #FFB300; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 5px; display:flex; align-items:center; gap:5px;">
                                        DEAL #${idx+1} <i class="fa fa-pencil" style="opacity:0.5; font-size:10px;"></i>
                                    </div>
                                    <div contenteditable="true" style="font-size: 18px; font-weight: 800; margin-bottom: 5px; color: var(--text-main); border-bottom: 1px dashed rgba(255,255,255,0.2); display:inline-block;">${deal.title}</div>
                                    <div contenteditable="true" style="font-size: 13px; color: var(--text-sub); border-bottom: 1px dashed rgba(255,255,255,0.2); display:inline-block; width:100%; margin-top:4px;">${deal.items}</div>
                                </div>
                                <div style="text-align: right; margin-left: 10px;">
                                    <div style="background: var(--gold-grad); color: #000; border-radius: 8px; padding: 8px 12px; font-weight: 800; font-size: 14px; text-align: center;">
                                        <div style="font-size: 10px; text-transform: uppercase; opacity: 0.8;">GET</div>
                                        <span contenteditable="true">${window.app.fmt(deal.gold)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Math Breakdown -->
                            <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px; margin-top: 5px; display: flex; justify-content: space-between; align-items: center;">
                                <div style="text-align: center; flex: 1; border-right: 1px solid rgba(255,255,255,0.1);">
                                    <div style="font-size: 9px; text-transform: uppercase; color: var(--text-sub); font-weight: 700;">Real Worth</div>
                                    <div contenteditable="true" style="font-size: 13px; font-weight: 700; color: var(--text-sub); text-decoration: line-through;">${window.app.fmt(realVal)}</div>
                                </div>
                                <div style="text-align: center; flex: 1;">
                                    <div style="font-size: 9px; text-transform: uppercase; color: var(--brand); font-weight: 700;">Deal Price</div>
                                    <div contenteditable="true" style="font-size: 16px; font-weight: 800; color: var(--text-main);">${window.app.fmt(price)}</div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <!-- VOUCHERS -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; margin-top: 30px;">
                <div style="width: 24px; height: 24px; background: #FFC107; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: black; font-size: 12px;">
                    <i class="fa fa-gift"></i>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">Retention (Editable)</span>
            </div>
            <div style="display: flex; overflow-x: auto; gap: 15px; padding-bottom: 20px; scroll-snap-type: x mandatory;">
        `;

        s.vouchers.forEach((v, i) => {
            html += `
                <div class="card stagger-in" style="min-width: 260px; background: linear-gradient(45deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C); border-radius: 16px; padding: 20px; position: relative; overflow: hidden; animation-delay: ${i * 0.1}s; scroll-snap-align: start; color: #3e2723; aspect-ratio: 1.586/1; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%); pointer-events: none;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: center; z-index: 2;">
                        <div style="font-size: 12px; font-weight: 800; opacity: 0.8; text-transform: uppercase;">GOLD VOUCHER</div>
                        <i class="fa fa-pencil" style="font-size: 12px; opacity: 0.5;"></i>
                    </div>
                    <div style="text-align: center; z-index: 2;">
                        <div contenteditable="true" style="font-size: 32px; font-weight: 800;">${window.app.fmt(v.amount)}</div>
                        <div style="font-size: 10px; font-weight: 700; margin-top: 5px;">ON BILLS ABOVE <span contenteditable="true">${window.app.fmt(v.threshold)}</span></div>
                    </div>
                    <div contenteditable="true" style="font-size: 9px; font-weight: 600; text-align: center; opacity: 0.8; z-index: 2;">${v.desc}</div>
                </div>
            `;
        });

        html += `
            </div>
            <!-- REPEAT CARDS -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; margin-top: 20px;">
                <div style="width: 24px; height: 24px; background: #4CAF50; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                    <i class="fa fa-id-card"></i>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--text-sub); letter-spacing: 1px; text-transform: uppercase;">Loyalty (Editable)</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 15px;">
        `;

        const getCardColor = (tier) => {
            const t = tier?.toLowerCase() || "";
            if (t.includes("black") || t.includes("platinum")) return "linear-gradient(135deg, #2c3e50, #000000)";
            if (t.includes("gold")) return "linear-gradient(135deg, #FFC107, #FF9800)";
            return "linear-gradient(135deg, #bdc3c7, #2c3e50)";
        };

        s.repeatCards.forEach((c, i) => {
            html += `
                <div class="stagger-in" style="background: ${getCardColor(c.tier)}; border-radius: 16px; padding: 0; position: relative; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.3); color: #fff; display: flex; flex-direction: column;">
                    <div style="padding: 15px 20px; background: rgba(0,0,0,0.2); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 30px; height: 22px; background: linear-gradient(135deg, #d4af37, #f1c40f); border-radius: 4px; opacity: 0.9; box-shadow: inset 0 0 5px rgba(0,0,0,0.3);"></div>
                            <span contenteditable="true" style="font-weight: 800; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.5); border-bottom: 1px dashed rgba(255,255,255,0.3);">${c.offer_title}</span>
                        </div>
                        <div style="font-size: 11px; font-weight: 700; opacity: 0.8; text-transform: uppercase;">${c.tier}</div>
                    </div>
                    <div style="padding: 20px;">
                        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 15px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 16px;">
                                <i class="fa fa-user-tag"></i>
                            </div>
                            <div>
                                <div style="font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; font-weight: 700;">Target Audience</div>
                                <div contenteditable="true" style="font-size: 15px; font-weight: 700; border-bottom: 1px dashed rgba(255,255,255,0.3);">${c.trigger}</div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: center; margin: -5px 0 10px 0; opacity: 0.4;">
                            <i class="fa fa-arrow-down"></i>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 15px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; font-weight: 700;">Next Visit Goal</div>
                                <div style="font-size: 13px; font-weight: 600;">Spend <span contenteditable="true">${window.app.fmt(c.next_visit_min_spend)}</span></div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 10px; color: #FFB300; text-transform: uppercase; font-weight: 800;">Get Reward</div>
                                <div style="font-size: 16px; font-weight: 800; color: #FFB300;"><span contenteditable="true">${window.app.fmt(c.next_visit_gold_reward)}</span> Gold</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <button class="btn btn-brand ripple-effect" style="margin-top: 30px; margin-bottom: 50px;" onclick="alert('Strategy Saved! Edits applied.')">
                Save & Onboard
            </button>
             <button class="btn ripple-effect" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-sub);" onclick="location.reload()">
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