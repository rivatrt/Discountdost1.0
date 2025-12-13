import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";

// --- CONSTANTS & TYPES ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type Category = {
    id: string;
    icon: string;
    label: string;
    brandRef: string;
};

const CATEGORIES: Category[] = [
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

type GoldDeal = {
    title: string;
    items: string; 
    price: number;
    gold: number;
    description: string;
};

type VoucherTier = {
    threshold: number;
    amount: number;
    desc: string;
};

type RepeatCard = {
    offer_title: string;
    trigger: string; // "Purchased Coffee (< ₹200)"
    next_visit_min_spend: number;
    next_visit_gold_reward: number;
    tier: string;
    description: string;
};

type StrategyData = {
    deals: GoldDeal[];
    vouchers: VoucherTier[];
    repeatCards: RepeatCard[];
};

// --- COMPONENTS ---

const LoadingScreen = ({ storeName, category }: any) => {
    const [idx, setIdx] = useState(0);
    
    const messages = [
        `Reading ${storeName || "Menu"}...`,
        `Analyzing ${category.label} trends...`,
        "Designing Big Combo Deals...",
        "Calculating High-Value Gold Vouchers...",
        "Crafting Loyalty Strategy...",
        "Finalizing Profitability Model..."
    ];

    const tips = [
        "💡 Insight: Retaining a customer is 5x cheaper than acquiring a new one.",
        "💡 Tip: Gold Vouchers have 3x higher redemption than cash discounts.",
        "💡 Stat: 80% of revenue comes from 20% of loyal customers.",
        "💡 Strategy: Upselling to repeat customers is 60% easier."
    ];

    const allContent = [...messages, ...tips];

    useEffect(() => {
        const timer = setInterval(() => {
            setIdx(prev => (prev + 1) % allContent.length);
        }, 2500);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="loader-overlay">
            <div className="brand-pulse">
                <i className="fa fa-bolt"></i>
            </div>
            
            <h2 style={{fontSize: "20px", fontWeight: 800, marginBottom: "8px"}}>Building Strategy</h2>
            <p style={{fontSize: "12px", color: "var(--text-sub)", marginBottom: "30px"}}>for {storeName || "your business"}</p>
            
            <div className="progress-bar-bg" style={{marginBottom: "30px"}}>
                <div className="progress-bar-fill"></div>
            </div>

            <div style={{height: "50px", display: "flex", alignItems: "center", justifyContent: "center", width: "85%", textAlign: "center"}}>
                <div key={idx} className="fade-text" style={{fontSize: "14px", color: "var(--text-main)", fontWeight: 600, lineHeight: "1.4"}}>
                   {allContent[idx]}
                </div>
            </div>
        </div>
    );
};

const Header = ({ title, shrink, onBack, canGoBack, onInstall, showInstall, toggleTheme, isDark }: any) => {
    return (
        <header id="main-header" className={shrink ? "shrink" : ""}>
            <div className="header-top-row">
                <div 
                    className={`icon-btn back-btn ripple-effect ${canGoBack ? "visible" : ""}`} 
                    id="back-btn" 
                    onClick={onBack}
                >
                    <i className="fa fa-arrow-left"></i>
                </div>
                
                <div style={{ display: "flex", gap: "12px" }}>
                    <div 
                        className={`icon-btn ripple-effect ${showInstall ? "visible" : ""}`} 
                        id="install-btn" 
                        onClick={onInstall}
                    >
                        <i className="fa fa-download"></i>
                    </div>
                    
                    <div className="icon-btn ripple-effect" onClick={toggleTheme}>
                        <i className={`fa ${isDark ? 'fa-sun' : 'fa-moon'}`} id="theme-icon"></i>
                    </div>
                </div>
            </div>
            
            <div className="header-content-wrapper">
                <div className="brand-pill">
                    <i className="fa fa-bolt"></i> Discount Dost
                </div>
                <h1 id="page-title" dangerouslySetInnerHTML={{ __html: title }}></h1>
            </div>
        </header>
    );
};

const BottomNav = ({ activePage, onNav }: any) => {
    return (
        <nav className="bottom-nav">
            <div className={`nav-item ripple-effect ${activePage === 1 ? "active" : ""}`} onClick={() => onNav(1)}>
                <div className="nav-icon-box"><i className="fa fa-calculator"></i></div>
                <span style={{ fontSize: "10px", fontWeight: 700 }}>Input</span>
            </div>
            <div className={`nav-item ripple-effect ${activePage === 2 ? "active" : ""}`} onClick={() => onNav(2)}>
                <div className="nav-icon-box"><i className="fa fa-chart-pie"></i></div>
                <span style={{ fontSize: "10px", fontWeight: 700 }}>Results</span>
            </div>
            <div className={`nav-item ripple-effect ${activePage === 3 ? "active" : ""}`} onClick={() => onNav(3)}>
                <div className="nav-icon-box"><i className="fa fa-chess"></i></div>
                <span style={{ fontSize: "10px", fontWeight: 700 }}>Strategy</span>
            </div>
        </nav>
    );
};

const SuccessModal = ({ show, title, msg, onClose }: any) => {
    if (!show) return null;
    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.8)", zIndex: 2000,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(5px)"
        }} onClick={onClose}>
            <div style={{
                background: "var(--bg-surface)", width: "85%", maxWidth: "320px",
                borderRadius: "24px", padding: "30px 25px", textAlign: "center",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)", border: "1px solid var(--border-color)",
                animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    width: "64px", height: "64px", background: title === 'Error' ? "rgba(255,61,0,0.1)" : "rgba(76,175,80,0.1)",
                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px auto", color: title === 'Error' ? "var(--danger)" : "var(--success)", fontSize: "28px"
                }}>
                    <i className={`fa ${title === 'Error' ? 'fa-exclamation-triangle' : 'fa-check'}`}></i>
                </div>
                <h3 style={{ fontSize: "22px", marginBottom: "10px", fontWeight: 800 }}>{title}</h3>
                <p style={{ fontSize: "15px", color: "var(--text-sub)", marginBottom: "25px", lineHeight: "1.5" }}>{msg}</p>
                <button className="btn btn-brand ripple-effect" style={{ width: "100%" }} onClick={onClose}>
                    Okay, Got it
                </button>
            </div>
        </div>
    );
};

const ManualEntryModal = ({ show, onClose, onSubmit }: any) => {
    const [items, setItems] = useState([{ name: "", price: "" }, { name: "", price: "" }, { name: "", price: "" }]);
    if (!show) return null;
    
    const handleChange = (idx: number, field: string, val: string) => {
        const newItems = [...items];
        (newItems[idx] as any)[field] = val;
        setItems(newItems);
    };

    const handleSubmit = () => {
        const validItems = items.filter(i => i.name && i.price);
        if (validItems.length === 0) return;
        const text = validItems.map(i => `${i.name} ${i.price}`).join("\n");
        onSubmit(text);
    };

    return (
        <div className="modal-overlay" style={{display: 'flex'}} onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div style={{width:"60px", height:"60px", background:"var(--bg-input)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 15px auto"}}>
                    <i className="fa fa-pen" style={{color:"var(--brand)", fontSize:"24px"}}></i>
                </div>
                <h3 style={{margin:"0 0 10px 0", fontWeight: 800}}>Help the AI</h3>
                <p style={{fontSize:"13px", color:"var(--text-sub)", marginBottom:"20px"}}>We couldn't read the menu? Add 3 popular items manually.</p>
                
                {items.map((item, i) => (
                    <div key={i} style={{marginBottom:"10px", display:"flex", gap:"10px"}}>
                        <input 
                            type="text" 
                            placeholder={i===0?"Burger":i===1?"Pizza":"Coffee"} 
                            value={item.name}
                            onChange={e => handleChange(i, 'name', e.target.value)}
                            style={{flex:2, fontSize:"14px", padding:"12px"}}
                        />
                        <input 
                            type="number" 
                            placeholder={i===0?"200":i===1?"450":"150"} 
                            value={item.price}
                            onChange={e => handleChange(i, 'price', e.target.value)}
                            style={{flex:1, fontSize:"14px", padding:"12px"}}
                        />
                    </div>
                ))}
                
                <button className="btn btn-black ripple-effect" style={{marginTop:"15px"}} onClick={handleSubmit}>
                    Generate Strategy
                </button>
                <div style={{marginTop:"15px", fontSize:"12px", fontWeight:600, color:"var(--text-sub)", cursor:"pointer"}} onClick={onClose}>
                    Cancel
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

const App = () => {
    // State
    const [page, setPage] = useState(1);
    const [history, setHistory] = useState([1]);
    const [shrink, setShrink] = useState(false);
    const [isDark, setIsDark] = useState(true); 
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    
    // Data State
    const [category, setCategory] = useState<Category>(CATEGORIES[0]);
    const [visits, setVisits] = useState<number | string>("");
    const [aov, setAov] = useState<number | string>("");
    const [discount, setDiscount] = useState<number | string>("");
    const [storeName, setStoreName] = useState("");
    
    // Analysis State
    const [analyzing, setAnalyzing] = useState(false);
    const [strategy, setStrategy] = useState<StrategyData | null>(null);
    const [expandedDeal, setExpandedDeal] = useState<number | null>(null); // Index of expanded deal
    const [editingDeal, setEditingDeal] = useState<number | null>(null); // Index of deal being edited
    
    // Modals
    const [showCatModal, setShowCatModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [successModal, setSuccessModal] = useState({ show: false, title: "", msg: "" });

    // Scroll Handler
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.body.classList.add('dark-mode'); // Default dark
        const handleScroll = () => {
            if (scrollContainerRef.current) {
                setShrink(scrollContainerRef.current.scrollTop > 40);
            }
        };
        const el = scrollContainerRef.current;
        if (el) el.addEventListener("scroll", handleScroll);
        
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // Service Worker Disabled
        // if ('serviceWorker' in navigator) {
        //     navigator.serviceWorker.register('./sw.js').catch(console.error);
        // }

        return () => {
            if (el) el.removeEventListener("scroll", handleScroll);
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const toggleTheme = () => {
        const body = document.body;
        if (isDark) {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            setIsDark(false);
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
        } else {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            setIsDark(true);
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#000000');
        }
    };

    const navTo = (newPage: number) => {
        if (page === newPage) return;
        setHistory(prev => [...prev, newPage]);
        setPage(newPage);
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    };

    const goBack = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop();
            const prevPage = newHistory[newHistory.length - 1];
            setHistory(newHistory);
            setPage(prevPage);
        }
    };

    const installApp = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setDeferredPrompt(null);
        }
    };

    // --- FINANCIAL MATH ---
    const calculateStats = () => {
        const v = Number(visits) || 0;
        const a = Number(aov) || 0;
        const d = Number(discount) || 0;
        
        // --- 1. CURRENT DISCOUNT MODEL (LOSS) ---
        // Loss = Listed Price * Discount %
        const lossPerBill = a * (d / 100);
        
        // --- 2. DISCOUNT DOST GOLD MODEL (COST) ---
        // Platform Fee = 10% of Listed Price
        // GST = 18% of Platform Fee
        
        // RULE UPDATE: Merchant only has to give gold voucher of HALF the value of their current discount.
        const goldVoucherValue = lossPerBill * 0.5;

        // Cost Calculation: 
        // We assume the merchant buys Gold at 1.177x factor (Cost + Admin + GST).
        // If the merchant gives a voucher worth X, they pay X * 1.177
        const costPerBillGold = (goldVoucherValue * 1.177); 
        
        const platformFee = a * 0.10; // For context only, implicit in Gold purchase model usually, but let's keep it clean
        
        // --- 3. COMPARISON ---
        // Savings = Cash Loss - Gold Cost
        const savingsPerBill = lossPerBill - costPerBillGold;

        // --- 4. AGGREGATES ---
        const dailyLoss = lossPerBill * v;
        const monthlyLoss = dailyLoss * 30;
        const yearlyLoss = dailyLoss * 365;

        const dailyCostGold = costPerBillGold * v;
        const monthlyCostGold = dailyCostGold * 30;
        const yearlyCostGold = dailyCostGold * 365;

        const dailySave = savingsPerBill * v;
        const monthlySave = dailySave * 30;
        const yearlySave = dailySave * 365;

        return {
            perBill: {
                loss: lossPerBill,
                goldCost: costPerBillGold,
                voucherValue: goldVoucherValue,
                save: savingsPerBill
            },
            discount: {
                daily: dailyLoss,
                monthly: monthlyLoss,
                yearly: yearlyLoss
            },
            gold: {
                daily: dailyCostGold,
                monthly: monthlyCostGold,
                yearly: yearlyCostGold
            },
            savings: {
                daily: dailySave,
                monthly: monthlySave,
                yearly: yearlySave
            }
        };
    };

    const stats = calculateStats();

    // GEMINI STRATEGY GENERATION
    const handleAnalysis = async (inputText: string, imageBase64?: string, mimeType?: string) => {
        setAnalyzing(true);
        setStrategy(null);
        // If coming from manual input, close modal
        setShowManualModal(false);

        try {
            // Simplified prompt for speed
            const prompt = `
            Act as a world-class strategist for "Discount Dost".
            Store: ${storeName} (${category.label}). AOV: ₹${aov}. Discount: ${discount}%. Visits: ${visits}.
            
            Task: Analyze input menu/data carefully.
            
            1. **10 Deals (Big Combos):** 
               - Create BIG COMBOS (e.g. "Family Feast", "Party Platter") using REAL items from input.
               - Price: Approx ₹${aov}. 
               - Gold Reward: ~15% of price.
            
            2. **5 Gold Vouchers (High Value):** 
               - Design "Gold Cards" to replace cash discounts.
               - Value: Make them "High Value" to look attractive (e.g. ₹${(aov * 0.3).toFixed(0)} to ₹${(aov * 0.6).toFixed(0)}). 
               - Thresholds: Upsell (1.2x to 2x AOV).
            
            3. **4 Repeat Cards (Loyalty):**
               - Create 4 specific retention cards based on what the customer PURCHASED TODAY.
               - 2 Low Value Triggers (e.g. bought single coffee/snack): Push them to buy a meal next time.
               - 2 High Value Triggers (e.g. bought family meal): Push them to come back for a party/event.
               - For each, specify:
                  - 'trigger': The item they likely bought today (e.g. "Small Coffee").
                  - 'offer_title': Creative name for the card.
                  - 'next_visit_min_spend': Minimum spend for the *next* visit.
                  - 'next_visit_gold_reward': Gold reward for that next visit.
                  - 'tier': Silver/Gold/Platinum/Black.

            Input Data: ${inputText}
            `;

            let response;
            const schema = {
                type: Type.OBJECT,
                properties: {
                    deals: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                items: { type: Type.STRING },
                                price: { type: Type.NUMBER },
                                gold: { type: Type.NUMBER },
                                description: { type: Type.STRING }
                            },
                            required: ["title", "items", "price", "gold", "description"]
                        }
                    },
                    vouchers: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                threshold: { type: Type.NUMBER },
                                amount: { type: Type.NUMBER },
                                desc: { type: Type.STRING }
                            },
                            required: ["threshold", "amount", "desc"]
                        }
                    },
                    repeatCards: {
                        type: Type.ARRAY,
                        items: {
                             type: Type.OBJECT,
                             properties: {
                                 offer_title: { type: Type.STRING },
                                 trigger: { type: Type.STRING },
                                 next_visit_min_spend: { type: Type.NUMBER },
                                 next_visit_gold_reward: { type: Type.NUMBER },
                                 tier: { type: Type.STRING },
                                 description: { type: Type.STRING }
                             },
                             required: ["offer_title", "trigger", "next_visit_min_spend", "next_visit_gold_reward", "tier", "description"]
                        }
                    }
                }
            };

            if (imageBase64 && mimeType) {
                 response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: mimeType, data: imageBase64 } },
                            { text: prompt }
                        ]
                    },
                    config: { responseMimeType: "application/json", responseSchema: schema }
                });
            } else {
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: "application/json", responseSchema: schema }
                });
            }

            const json = JSON.parse(response.text || "{}");
            setStrategy(json);

        } catch (err) {
            console.error(err);
            setSuccessModal({ show: true, title: "Error", msg: "Analysis failed. Please try again." });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            handleAnalysis("", base64String, file.type);
        };
        reader.readAsDataURL(file);
    };

    const updateDeal = (index: number, field: 'price' | 'gold', value: string) => {
        if (!strategy) return;
        const newDeals = [...strategy.deals];
        newDeals[index] = { ...newDeals[index], [field]: parseFloat(value) || 0 };
        setStrategy({ ...strategy, deals: newDeals });
    };

    // UI FORMATTING
    const fmt = (n: number) => "₹" + Math.round(n).toLocaleString('en-IN');
    const fmtCompact = (n: number) => {
        if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
        if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
        return "₹" + Math.round(n).toLocaleString('en-IN');
    };

    const getPageTitle = () => {
        if (page === 1) return "Business<br>Details";
        if (page === 2) return "Impact<br>Analysis";
        return "Growth<br>Strategy";
    };

    const getCardColor = (tier: string) => {
        const t = tier?.toLowerCase() || "";
        if (t.includes("black") || t.includes("platinum")) return "linear-gradient(135deg, #2c3e50, #000000)";
        if (t.includes("gold")) return "linear-gradient(135deg, #FFC107, #FF9800)";
        return "linear-gradient(135deg, #bdc3c7, #2c3e50)"; // Silver default
    };

    return (
        <>
            <Header 
                title={getPageTitle()} 
                shrink={shrink} 
                onBack={goBack} 
                canGoBack={history.length > 1}
                onInstall={installApp}
                showInstall={!!deferredPrompt}
                toggleTheme={toggleTheme}
                isDark={isDark}
            />

            <main id="scroll-container" ref={scrollContainerRef}>
                
                {analyzing && <LoadingScreen storeName={storeName} category={category} />}

                {/* PAGE 1: INPUT */}
                <div id="view-input" className={`page ${page === 1 ? "active" : ""}`}>
                    <div className="card">
                        <div className="input-group">
                            <label>Store Name</label>
                            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Cafe Blue" />
                        </div>
                        <div className="input-group">
                            <label>Business Category</label>
                            <div className="cat-trigger ripple-effect" onClick={() => setShowCatModal(true)}>
                                <span>{category.label}</span>
                                <i className="fa fa-chevron-down" style={{ float: "right", opacity: 0.3, marginTop: "4px" }}></i>
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Daily Customer Visits</label>
                            <input type="tel" value={visits} onChange={(e) => setVisits(e.target.value)} placeholder="e.g. 50" />
                        </div>
                        <div className="input-group">
                            <label>Average Bill Value (₹)</label>
                            <input type="tel" value={aov} onChange={(e) => setAov(e.target.value)} placeholder="e.g. 1500" />
                        </div>
                        <div className="input-group">
                            <label>Current Discount (%)</label>
                            <input type="tel" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 15" />
                        </div>
                    </div>
                    <button className="btn btn-black ripple-effect" onClick={() => {
                        if(!visits || !aov || !discount) return alert("Please fill all business details");
                        navTo(2);
                    }}>
                        Analyze Impact <i className="fa fa-arrow-right"></i>
                    </button>
                    <div style={{ height: "20px" }}></div>
                </div>

                {/* PAGE 2: RESULTS (SALES DASHBOARD) */}
                <div id="view-results" className={`page ${page === 2 ? "active" : ""}`}>
                    
                    {/* Comparison Table */}
                    <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                        <div style={{ padding: "20px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-color)" }}>
                            <div style={{ fontWeight: 800, fontSize: "18px" }}>Impact Analysis</div>
                            <div style={{ fontSize: "12px", color: "var(--text-sub)" }}>Half the value, Double the Impact</div>
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border-color)" }}>
                            <div style={{ padding: "12px 8px", fontSize: "10px", fontWeight: 800, color: "var(--text-sub)", borderRight: "1px solid var(--border-color)" }}>TIMEFRAME</div>
                            <div style={{ padding: "12px 8px", fontSize: "10px", fontWeight: 800, color: "var(--danger)", borderRight: "1px solid var(--border-color)", background: "rgba(255, 61, 0, 0.05)" }}>CASH DISCOUNT<br/>(LOSS)</div>
                            <div style={{ padding: "12px 8px", fontSize: "10px", fontWeight: 800, color: "#FFB300", background: "rgba(255, 179, 0, 0.05)" }}>GOLD MODEL<br/>(COST)</div>
                        </div>

                        {/* Daily */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border-color)", alignItems: "center" }}>
                            <div style={{ padding: "12px 15px", fontSize: "12px", fontWeight: 700, color: "var(--text-sub)", borderRight: "1px solid var(--border-color)" }}>Daily</div>
                            <div style={{ padding: "12px 8px", fontSize: "13px", fontWeight: 700, color: "var(--danger)", borderRight: "1px solid var(--border-color)" }}>{fmt(stats.discount.daily)}</div>
                            <div style={{ padding: "12px 8px", fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{fmt(stats.gold.daily)}</div>
                        </div>

                         {/* Monthly */}
                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border-color)", alignItems: "center" }}>
                            <div style={{ padding: "12px 15px", fontSize: "12px", fontWeight: 700, color: "var(--text-sub)", borderRight: "1px solid var(--border-color)" }}>Monthly</div>
                            <div style={{ padding: "12px 8px", fontSize: "13px", fontWeight: 700, color: "var(--danger)", borderRight: "1px solid var(--border-color)" }}>{fmt(stats.discount.monthly)}</div>
                            <div style={{ padding: "12px 8px", fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{fmt(stats.gold.monthly)}</div>
                        </div>

                        {/* Yearly */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center", background: "var(--bg-input)" }}>
                            <div style={{ padding: "15px", fontSize: "12px", fontWeight: 800, color: "var(--text-main)", borderRight: "1px solid var(--border-color)" }}>YEARLY</div>
                            <div style={{ padding: "15px 8px", fontSize: "14px", fontWeight: 800, color: "var(--danger)", borderRight: "1px solid var(--border-color)" }}>{fmtCompact(stats.discount.yearly)}</div>
                            <div style={{ padding: "15px 8px", fontSize: "14px", fontWeight: 800, color: "#FFB300" }}>{fmtCompact(stats.gold.yearly)}</div>
                        </div>
                    </div>

                    {/* Net Profit Card */}
                    <div className="card" style={{ background: "var(--success-bg)", border: "1px solid var(--success)", textAlign: "center", padding: "24px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--success)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px" }}>NET PROFIT INCREASE</div>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--success)", marginBottom: "5px" }}>+{fmtCompact(stats.savings.yearly)}</div>
                        <div style={{ fontSize: "13px", color: "var(--success)", opacity: 0.8 }}>Saved directly to your bottom line</div>
                    </div>

                    {/* Per Bill Breakdown */}
                    <div className="card">
                        <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "15px" }}>Per Bill Breakdown</div>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                            <span style={{ color: "var(--text-sub)" }}>Listed Price (Bill)</span>
                            <span style={{ fontWeight: 700 }}>{fmt(Number(aov))}</span>
                        </div>
                        <div style={{ width: "100%", height: "1px", background: "var(--border-color)", margin: "10px 0" }}></div>

                        {/* Old Way */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                            <span style={{ color: "var(--danger)" }}>Cash Discount ({discount}%)</span>
                            <span style={{ fontWeight: 700, color: "var(--danger)" }}>- {fmt(stats.perBill.loss)}</span>
                        </div>
                        
                        {/* New Way */}
                        <div style={{ marginTop: "15px", padding: "12px", background: "var(--bg-input)", borderRadius: "12px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 800, color: "#FFB300", marginBottom: "8px", textTransform: "uppercase" }}>Discount Dost Model</div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "13px" }}>
                                <span style={{ color: "var(--text-sub)" }}>Given as Gold (50% of Loss)</span>
                                <span>{fmt(stats.perBill.voucherValue)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "13px" }}>
                                <span style={{ color: "var(--text-sub)" }}>Admin Fee + GST (17.7%)</span>
                                <span>+ {fmt(stats.perBill.voucherValue * 0.177)}</span>
                            </div>
                            <div style={{ width: "100%", height: "1px", background: "var(--border-color)", margin: "8px 0" }}></div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 800 }}>
                                <span>Total Gold Cost</span>
                                <span>{fmt(stats.perBill.goldCost)}</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-gold ripple-effect" onClick={() => navTo(3)}>
                        Generate Brand Strategy <i className="fa fa-magic"></i>
                    </button>
                    <div style={{ height: "20px" }}></div>
                </div>

                {/* PAGE 3: STRATEGY */}
                <div id="view-strategy" className={`page ${page === 3 ? "active" : ""}`}>
                    
                    {!analyzing && !strategy && (
                        <div className="card" id="upload-panel">
                            <div style={{ fontWeight: 700, fontSize: "18px", marginBottom: "5px" }}>Create {storeName || "Brand"} Strategy</div>
                            <div style={{ fontSize: "13px", color: "var(--text-sub)", marginBottom: "20px" }}>AI will benchmark <b>{storeName || "your store"}</b> against top brands like {category.brandRef}.</div>
                            <div id="text-mode">
                                <textarea id="menu-text" rows={5} placeholder="Paste menu items...&#10;e.g. Chicken Burger 250&#10;Veg Pizza 400"></textarea>
                                <div style={{ display: "flex", gap: "12px", marginTop: "15px" }}>
                                    <button className="btn btn-black ripple-effect" style={{ flex: 1 }} onClick={() => {
                                         const txt = (document.getElementById('menu-text') as HTMLTextAreaElement).value;
                                         if(txt.length > 3) handleAnalysis(txt);
                                    }}>Analyze Menu</button>
                                    <button className="btn ripple-effect" style={{ flex: 1, background: "var(--bg-input)", color: "var(--text-main)" }} onClick={() => document.getElementById('file-in')?.click()}>
                                        <i className="fa fa-camera"></i> Scan Menu
                                    </button>
                                </div>
                                <div style={{ textAlign: "center", marginTop: "15px" }}>
                                    <span 
                                        style={{ fontSize: "12px", color: "var(--text-sub)", textDecoration: "underline", cursor: "pointer" }}
                                        onClick={() => setShowManualModal(true)}
                                    >
                                        Or enter items manually
                                    </span>
                                </div>
                            </div>
                            <input type="file" id="file-in" style={{ display: "none" }} accept="image/*" onChange={handleFileUpload} />
                        </div>
                    )}

                    {!analyzing && strategy && (
                        <div id="strategy-results" style={{ paddingBottom: "50px" }}>
                            
                            {/* SECTION 1: GOLD DEALS (ACQUISITION) */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", marginTop: "10px" }}>
                                <div style={{ width: "24px", height: "24px", background: "#FF5722", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px" }}>
                                    <i className="fa fa-magnet"></i>
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-sub)", letterSpacing: "1px", textTransform: "uppercase" }}>Acquisition (10 Big Combo Deals)</span>
                            </div>

                            <div>
                                {strategy.deals.map((deal, idx) => {
                                    const isExpanded = expandedDeal === idx;
                                    const isEditing = editingDeal === idx;
                                    
                                    const platformFee = deal.price * 0.10;
                                    const gst = platformFee * 0.18;
                                    const totalDeduction = deal.gold + platformFee + gst;
                                    const netReceivable = deal.price - totalDeduction;
                                    const goldPercent = deal.price > 0 ? ((deal.gold / deal.price) * 100).toFixed(1) : "0.0";

                                    return (
                                        <div key={idx} className="card stagger-in" style={{ padding: 0, overflow: "visible", marginBottom: "20px", background: "transparent", border: "none", boxShadow: "none", animationDelay: `${idx * 0.1}s` }}>
                                            <div style={{ 
                                                background: "var(--bg-surface)", 
                                                borderRadius: "16px", 
                                                overflow: "hidden", 
                                                position: "relative",
                                                border: "1px solid var(--border-color)",
                                                boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                                            }}>
                                                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "6px", background: "var(--gold-grad)" }}></div>
                                                
                                                <div style={{ padding: "20px 20px 20px 26px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: "10px", fontWeight: 800, color: "#FFB300", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px" }}>COMBO OFFER</div>
                                                            <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "5px", color: "var(--text-main)" }}>{deal.title}</div>
                                                            
                                                            {isEditing ? (
                                                                <div style={{ marginTop: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
                                                                    <div style={{flex:1}}>
                                                                        <label style={{fontSize:"10px", color:"var(--text-sub)"}}>Price</label>
                                                                        <input 
                                                                            type="number" 
                                                                            value={deal.price} 
                                                                            onChange={(e) => updateDeal(idx, 'price', e.target.value)}
                                                                            style={{ padding: "8px", fontSize: "14px", height: "auto" }}
                                                                        />
                                                                    </div>
                                                                    <div style={{flex:1}}>
                                                                        <label style={{fontSize:"10px", color:"#FFB300"}}>Gold</label>
                                                                        <input 
                                                                            type="number" 
                                                                            value={deal.gold} 
                                                                            onChange={(e) => updateDeal(idx, 'gold', e.target.value)}
                                                                            style={{ padding: "8px", fontSize: "14px", height: "auto", borderColor: "#FFB300", color: "#FFB300" }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: "13px", color: "var(--text-sub)" }}>{deal.items} <strong style={{color:"var(--text-main)"}}>@ {fmt(deal.price)}</strong></div>
                                                            )}

                                                        </div>
                                                        {!isEditing && (
                                                            <div style={{ textAlign: "right", marginLeft: "10px" }}>
                                                                <div style={{ 
                                                                    background: "var(--gold-grad)", 
                                                                    color: "#000", 
                                                                    borderRadius: "8px", 
                                                                    padding: "8px 12px", 
                                                                    fontWeight: 800, 
                                                                    fontSize: "14px", 
                                                                    boxShadow: "0 4px 15px rgba(255, 193, 7, 0.4)",
                                                                    textAlign: "center"
                                                                }}>
                                                                    <div style={{fontSize:"10px", textTransform:"uppercase", opacity: 0.8}}>GET</div>
                                                                    {fmt(deal.gold)}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                                         <button 
                                                            className="ripple-effect"
                                                            style={{ flex: 1, padding: "10px", background: "var(--bg-input)", border: "none", borderRadius: "10px", color: "var(--text-main)", fontSize: "12px", fontWeight: 700 }}
                                                            onClick={() => {
                                                                if (isEditing) setEditingDeal(null);
                                                                else { setEditingDeal(idx); setExpandedDeal(idx); }
                                                            }}
                                                        >
                                                            {isEditing ? "Done" : "Edit"}
                                                        </button>
                                                        <button 
                                                            className="ripple-effect"
                                                            style={{ flex: 1, padding: "10px", background: "var(--bg-input)", border: "none", borderRadius: "10px", color: "var(--text-main)", fontSize: "12px", fontWeight: 700 }}
                                                            onClick={() => setExpandedDeal(isExpanded ? null : idx)}
                                                        >
                                                            {isExpanded ? "Hide ROI" : "Check ROI"} <i className={`fa fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div style={{ background: "#000", padding: "20px", borderTop: "1px dashed rgba(255,255,255,0.2)" }}>
                                                        <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--text-sub)", marginBottom: "15px", letterSpacing: "1px" }}>Profitability Breakdown</div>
                                                        
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                                                            <span>Customer Bill</span>
                                                            <span style={{ fontWeight: 700 }}>{fmt(deal.price)}</span>
                                                        </div>
                                                        
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", color: "var(--text-sub)" }}>
                                                            <span>Gold Given ({goldPercent}%)</span>
                                                            <span>- {fmt(deal.gold)}</span>
                                                        </div>
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", color: "var(--text-sub)" }}>
                                                            <span>Platform Fee (10% of Bill)</span>
                                                            <span>- {fmt(platformFee)}</span>
                                                        </div>
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", color: "var(--text-sub)" }}>
                                                            <span>GST (18% on Fee)</span>
                                                            <span>- {fmt(gst)}</span>
                                                        </div>
                                                        <div style={{ width: "100%", height: "1px", background: "var(--border-color)", margin: "10px 0" }}></div>
                                                        
                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 800 }}>
                                                            <span>Net Receivable</span>
                                                            <span style={{ color: "var(--success)" }}>{fmt(netReceivable)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* SECTION 2: GOLD VOUCHER (RETENTION) */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", marginTop: "30px" }}>
                                <div style={{ width: "24px", height: "24px", background: "#FFC107", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "black", fontSize: "12px" }}>
                                    <i className="fa fa-gift"></i>
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-sub)", letterSpacing: "1px", textTransform: "uppercase" }}>Retention (High Value Gold Vouchers)</span>
                            </div>

                            <div style={{ 
                                display: "flex", 
                                overflowX: "auto", 
                                gap: "15px", 
                                paddingBottom: "20px", 
                                scrollSnapType: "x mandatory" 
                            }}>
                                {strategy.vouchers && strategy.vouchers.map((v, i) => (
                                    <div key={i} className="card stagger-in" style={{ 
                                        minWidth: "260px",
                                        background: "linear-gradient(45deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)", 
                                        borderRadius: "16px",
                                        padding: "20px",
                                        position: "relative",
                                        overflow: "hidden",
                                        animationDelay: `${i * 0.1}s`,
                                        marginBottom: 0,
                                        scrollSnapAlign: "start",
                                        color: "#3e2723",
                                        boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
                                        border: "none",
                                        aspectRatio: "1.586/1",
                                        display: "flex", flexDirection: "column", justifyContent: "space-between"
                                    }}>
                                        {/* Shine effect */}
                                        <div style={{position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)", pointerEvents: "none"}}></div>

                                        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2}}>
                                            <div style={{fontSize: "12px", fontWeight: 800, opacity: 0.8, textTransform: "uppercase"}}>GOLD VOUCHER</div>
                                            <i className="fa fa-crown" style={{fontSize: "16px", opacity: 0.7}}></i>
                                        </div>

                                        <div style={{textAlign: "center", zIndex: 2}}>
                                            <div style={{fontSize: "32px", fontWeight: 800, textShadow: "0 1px 2px rgba(255,255,255,0.5)"}}>{fmt(v.amount)}</div>
                                            <div style={{fontSize: "10px", fontWeight: 700, marginTop: "5px"}}>ON BILLS ABOVE {fmt(v.threshold)}</div>
                                        </div>

                                        <div style={{fontSize: "9px", fontWeight: 600, textAlign: "center", opacity: 0.8, zIndex: 2}}>
                                            {v.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* SECTION 3: REPEAT BUSINESS CARD */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", marginTop: "20px" }}>
                                <div style={{ width: "24px", height: "24px", background: "#4CAF50", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px" }}>
                                    <i className="fa fa-id-card"></i>
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-sub)", letterSpacing: "1px", textTransform: "uppercase" }}>Loyalty (4 Tiered Cards)</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                {strategy.repeatCards && strategy.repeatCards.map((c, i) => (
                                    <div key={i} className="stagger-in" style={{
                                        background: getCardColor(c.tier),
                                        borderRadius: "16px",
                                        padding: "0",
                                        position: "relative",
                                        overflow: "hidden",
                                        boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                                        color: "#fff",
                                        display: "flex", flexDirection: "column"
                                    }}>
                                        {/* HEADER */}
                                        <div style={{
                                            padding: "15px 20px",
                                            background: "rgba(0,0,0,0.2)",
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                            borderBottom: "1px solid rgba(255,255,255,0.1)"
                                        }}>
                                            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                                <div style={{width: "30px", height: "22px", background: "linear-gradient(135deg, #d4af37, #f1c40f)", borderRadius: "4px", opacity: 0.9, boxShadow: "inset 0 0 5px rgba(0,0,0,0.3)"}}></div>
                                                <span style={{fontWeight: 800, fontSize: "14px", letterSpacing: "1px", textTransform: "uppercase", textShadow: "0 2px 4px rgba(0,0,0,0.5)"}}>{c.offer_title}</span>
                                            </div>
                                            <div style={{fontSize: "11px", fontWeight: 700, opacity: 0.8, textTransform: "uppercase"}}>{c.tier}</div>
                                        </div>

                                        {/* BODY */}
                                        <div style={{padding: "20px"}}>
                                            {/* TRIGGER SECTION */}
                                            <div style={{display: "flex", gap: "12px", alignItems: "center", marginBottom: "15px"}}>
                                                <div style={{width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px"}}>
                                                    <i className="fa fa-shopping-basket"></i>
                                                </div>
                                                <div>
                                                    <div style={{fontSize: "10px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700}}>If Customer Buys</div>
                                                    <div style={{fontSize: "15px", fontWeight: 700}}>{c.trigger}</div>
                                                </div>
                                            </div>

                                            {/* ARROW */}
                                            <div style={{display: "flex", justifyContent: "center", margin: "-5px 0 10px 0", opacity: 0.4}}>
                                                <i className="fa fa-arrow-down"></i>
                                            </div>

                                            {/* OFFER SECTION */}
                                            <div style={{background: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 15px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                                                <div>
                                                    <div style={{fontSize: "10px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700}}>Next Visit Offer</div>
                                                    <div style={{fontSize: "13px", fontWeight: 600}}>Spend {fmt(c.next_visit_min_spend)}</div>
                                                </div>
                                                <div style={{textAlign: "right"}}>
                                                    <div style={{fontSize: "10px", color: "#FFB300", textTransform: "uppercase", fontWeight: 800}}>Get Reward</div>
                                                    <div style={{fontSize: "16px", fontWeight: 800, color: "#FFB300"}}>{fmt(c.next_visit_gold_reward)} Gold</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="btn btn-brand ripple-effect" style={{ marginTop: "30px", marginBottom: "50px" }} onClick={() => setSuccessModal({ show: true, title: "Onboarded!", msg: `${storeName} is now ready to grow!` })}>
                                Save & Onboard
                            </button>
                             <button className="btn ripple-effect" style={{ background: 'transparent', border:'1px solid var(--border-color)', color:'var(--text-sub)' }} onClick={() => setStrategy(null)}>
                                Reset Strategy
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* CATEGORY SHEET */}
            <div className={`modal-bg ${showCatModal ? "open" : ""}`} onClick={() => setShowCatModal(false)}></div>
            <div className={`modal-sheet ${showCatModal ? "open" : ""}`}>
                <div style={{ width: "40px", height: "5px", background: "rgba(255,255,255,0.2)", borderRadius: "10px", margin: "0 auto 20px auto" }}></div>
                <div style={{ fontSize: "20px", fontWeight: 800, textAlign: "center", marginBottom: "10px" }}>Select Category</div>
                <div className="cat-grid">
                    {CATEGORIES.map(c => (
                        <div 
                            key={c.id} 
                            className={`cat-item ${category.id === c.id ? "selected" : ""}`} 
                            onClick={() => { setCategory(c); setShowCatModal(false); }}
                        >
                            <i className={`fa ${c.icon}`} style={{ fontSize: "24px", marginBottom: "8px" }}></i>
                            <div style={{ fontSize: "11px", fontWeight: 700 }}>{c.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <ManualEntryModal 
                show={showManualModal}
                onClose={() => setShowManualModal(false)}
                onSubmit={handleAnalysis}
            />

            <SuccessModal 
                show={successModal.show} 
                title={successModal.title} 
                msg={successModal.msg} 
                onClose={() => setSuccessModal({ ...successModal, show: false })} 
            />

            <BottomNav activePage={page} onNav={navTo} />
        </>
    );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);