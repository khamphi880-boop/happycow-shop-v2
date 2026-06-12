import { 
  ShoppingCart, Plus, Trash2, ChevronLeft, X, Upload, ClipboardList, Coffee, Zap, 
  MapPin, Copy, CheckCircle, AlertCircle, Clock, Check, 
  Banknote, CreditCard, MessageSquare, Star, Share2, Sparkles, Search, TrendingUp, Camera
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, updateDoc, increment } from 'firebase/firestore';

// --- 1. Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyALI9gWvkoSfaGZd5tVxA-INr4QV5Cmf-w",
  authDomain: "happycowshop-fd7b0.firebaseapp.com",
  projectId: "happycowshop-fd7b0",
  storageBucket: "happycowshop-fd7b0.firebasestorage.app",
  messagingSenderId: "373478946147",
  appId: "1:373478946147:web:915a1dea4d2e3667f34f56"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const LIFF_ID = "2009828681-C1cb8QC3"; 

// 🔗 นำ URL ของ Google Apps Script มาใส่ที่นี่
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwqAe51oA1eQ-uVnfnCVMLlBGV9CLfnW2FsbYLO3vxfTngXU8xydnpOzK3DGk6wkA/exec";

const CATEGORIES = ['🔥 เมนูขายดี', 'นม', 'ชา', 'กาแฟ', 'มัทฉะ', 'สมูทตี้โยเกิร์ต', 'วิปครีมและครีมชีส'];
const SWEETNESS = ['0%', '25%', '50%', '75%', '100%', '120%'];

const THEMES = {
  default: { bg: '#F5EEDC', primary: '#3D2C1E', accent: '#A67C52', name: 'ปกติ (มินิมอล)', icons: [] },
  christmas: { bg: '#f0fdf4', primary: '#166534', accent: '#dc2626', name: '🎄 คริสต์มาส', icons: ['❄️', '⛄', '🎁', '🦌'] },
  valentine: { bg: '#fdf2f8', primary: '#831843', accent: '#db2777', name: '💖 วาเลนไทน์', icons: ['💖', '💕', '🌹', '🥰'] },
  songkran: { bg: '#e0f2fe', primary: '#0369a1', accent: '#0ea5e9', name: '💦 สงกรานต์', icons: ['💦', '🔫', '🌊', '🌴'] },
  halloween: { bg: '#fffbeb', primary: '#451a03', accent: '#ea580c', name: '🎃 ฮาโลวีน', icons: ['🎃', '👻', '🦇', '🕸️'] },
  newyear: { bg: '#f8fafc', primary: '#0f172a', accent: '#ca8a04', name: '🎆 ปีใหม่', icons: ['🎆', '✨', '🎉', '🥂'] },
  loykrathong: { bg: '#f5f3ff', primary: '#2e1065', accent: '#7c3aed', name: '🌕 ลอยกระทง', icons: ['🌕', '🕯️', '🌸', '✨'] },
  custom: { bg: '#F5EEDC', primary: '#3D2C1E', accent: '#A67C52', name: '🎨 อัปโหลดเอง', icons: [] },
};

// --- 2. ฟังก์ชันบีบอัดรูปภาพ (ปรับลดขนาดสำหรับฝั่งลูกค้า) ---
const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.4) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; } } 
        else { if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; } }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function CustomerApp() {
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [toppings, setToppings] = useState([]); 
  
  const [cart, setCart] = useState(() => {
    try { const saved = localStorage.getItem('happycow_cart'); return saved ? JSON.parse(saved) : []; }
    catch(e) { return []; }
  });

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'viewOrders') return 'myOrders';
    
    const isFirstTimeSession = !sessionStorage.getItem('happycow_session_active');
    sessionStorage.setItem('happycow_session_active', 'true');
    return isFirstTimeSession ? 'shop' : (localStorage.getItem('happycow_customer_view') || 'shop');
  }); 

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(() => new URLSearchParams(window.location.search).get('action') === 'viewOrders');
  
  const [address, setAddress] = useState(() => localStorage.getItem('happycow_address') || '');
  const [note, setNote] = useState(() => localStorage.getItem('happycow_note') || ''); 
  const [slipImage, setSlipImage] = useState('');
  const [slipStatus, setSlipStatus] = useState('idle'); 
  const [paymentMethod, setPaymentMethod] = useState(() => localStorage.getItem('happycow_paymentMethod') || 'promptpay'); 
  const [isCopied, setIsCopied] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [msgBox, setMsgBox] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });
  const showAlert = (message) => setMsgBox({ isOpen: true, type: 'alert', message, onConfirm: null });
  
  const [storeSettings, setStoreSettings] = useState({ 
    promptPayNo: '0812345678', qrCodeImage: '', isStoreOpen: true, theme: 'default', 
    customBgImage: '', isBlendOut: false, shopLineUrl: ''
  });

  const [successModalData, setSuccessModalData] = useState(null);
  const [optionModalItem, setOptionModalItem] = useState(null);
  const [tempOptions, setTempOptions] = useState({ sweetness: '100%', isBlended: false, addPearl: true, selectedToppings: [] });
  const [lineProfile, setLineProfile] = useState({ displayName: 'ลูกค้าทั่วไป', pictureUrl: '', userId: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try { const saved = localStorage.getItem('happycow_searchHistory'); return saved ? JSON.parse(saved) : []; }
    catch(e) { return []; }
  });
  const [popularSearches, setPopularSearches] = useState([]);
  
  const [showStoreClosedModal, setShowStoreClosedModal] = useState(false);
  const sliderRef = useRef(null);

  const getAddedBlendPrice = (item) => {
    if (item.category === 'สมูทตี้โยเกิร์ต' || item.category === 'ผลไม้และสมูทตี้') return 0;
    return (item.blendPrice !== undefined && item.blendPrice !== null && item.blendPrice !== '') ? Number(item.blendPrice) : 5;
  };

  useEffect(() => { localStorage.setItem('happycow_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('happycow_customer_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('happycow_address', address); }, [address]);
  useEffect(() => { localStorage.setItem('happycow_note', note); }, [note]);
  useEffect(() => { localStorage.setItem('happycow_paymentMethod', paymentMethod); }, [paymentMethod]);
  useEffect(() => { localStorage.setItem('happycow_searchHistory', JSON.stringify(searchHistory)); }, [searchHistory]);

  // --- โหลดข้อมูลแบบเรียลไทม์จาก Firestore ---
  useEffect(() => {
    // ระบบบันทึกจำนวนผู้เข้าชมเว็บ
    const recordVisit = async () => {
      const todayStr = new Date().toLocaleDateString('en-CA'); 
      const isVisited = sessionStorage.getItem('happycow_visited_today');
      if (!isVisited) {
        sessionStorage.setItem('happycow_visited_today', 'true');
        try {
          await setDoc(doc(db, 'settings', 'visit_stats'), { [todayStr]: increment(1) }, { merge: true });
        } catch (e) { console.error(e); }
      }
    };
    recordVisit();

    let cid = localStorage.getItem('happycow_uid') || 'guest_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('happycow_uid', cid);
    setLineProfile(prev => ({ ...prev, userId: cid }));

    const initializeLiff = () => {
      window.liff.init({ liffId: LIFF_ID }).then(() => {
        if (window.liff.isLoggedIn()) {
          window.liff.getProfile().then(p => setLineProfile({ displayName: p.displayName, pictureUrl: p.pictureUrl, userId: p.userId }));
        }
      }).catch(err => console.error("LIFF Error", err));
    };

    if (window.liff) initializeLiff();
    else {
      const script = document.createElement('script');
      script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
      script.onload = initializeLiff;
      document.body.appendChild(script);
    }

    const unsubMenus = onSnapshot(collection(db, 'menus'), snapshot => { 
      setMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); 
      setIsLoading(false); 
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), snapshot => { 
       const fetchedOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp);
       setOrders(fetchedOrders); 
       setIsLoadingOrders(false);
    });

    const unsubToppings = onSnapshot(collection(db, 'toppings'), snapshot => { 
      setToppings(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoreSettings({ 
           ...data, 
           isStoreOpen: data.isStoreOpen !== false, 
           theme: data.theme || 'default', 
           customBgImage: data.customBgImage || '', 
           isBlendOut: data.isBlendOut || false, 
           shopLineUrl: data.shopLineUrl || ''
        });
      }
    });

    const unsubSearchStats = onSnapshot(doc(db, 'settings', 'search_stats'), docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8).map(entry => entry[0]);
        setPopularSearches(sorted);
      } else setPopularSearches([]);
    });

    return () => { unsubMenus(); unsubOrders(); unsubToppings(); unsubSettings(); unsubSearchStats(); };
  }, []);

  // 🌟 ระบบ Presence (บอกสถานะออนไลน์ของลูกค้า)
  useEffect(() => {
    if (!lineProfile.userId) return;
    const docRef = doc(db, 'active_users', lineProfile.userId);
    const sendPing = async () => {
      try { await setDoc(docRef, { displayName: lineProfile.displayName || 'ลูกค้าทั่วไป', lastActive: Date.now() }, { merge: true }); } 
      catch (e) { console.log(e); }
    };
    sendPing();
    const pingInterval = setInterval(sendPing, 60000);
    const handleBeforeUnload = () => { deleteDoc(docRef).catch(() => {}); };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [lineProfile.userId, lineProfile.displayName]);

  useEffect(() => {
    if (storeSettings.isStoreOpen === false) setShowStoreClosedModal(true);
    else setShowStoreClosedModal(false);
  }, [storeSettings.isStoreOpen]);

  const handleSearchSubmit = async (term) => {
    if (!term.trim()) return;
    const cleanTerm = term.trim().toLowerCase();
    setSearchHistory(prev => [cleanTerm, ...prev.filter(t => t !== cleanTerm)].slice(0, 5));
    setIsSearchFocused(false); setSearchQuery(term);
    try { await setDoc(doc(db, 'settings', 'search_stats'), { [cleanTerm]: increment(1) }, { merge: true }); } catch (e) {}
  };

  const openOptionModal = (item) => {
    if (item.isSoldOut || (item.isOnlyBlend && storeSettings.isBlendOut)) return;
    setOptionModalItem(item);
    setTempOptions({ 
      sweetness: '100%', isBlended: item.isOnlyBlend ? true : false, addPearl: item.hasFreePearl || false, 
      selectedToppings: [], bean: item.category === 'กาแฟ' ? 'คั่วเข้ม' : null, teaType: item.hasTeaType ? 'มัทฉะ' : null, addShot: false
    });
    if(searchQuery) handleSearchSubmit(searchQuery);
  };

  const getBlendText = (item) => {
    if (item.isOnlyBlend) return 'ปั่น';
    if (item.allowBlend === false) return 'เย็น/ปกติ';
    return item.isBlended ? 'ปั่น' : 'เย็น';
  };

  const copyPromptPay = () => { navigator.clipboard.writeText(storeSettings.promptPayNo || '0812345678').then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }); };

  const bestSellers = React.useMemo(() => {
    const defaultSlice = menuItems.slice(0, 4);
    if (orders.length === 0 || menuItems.length === 0) return defaultSlice;
    const salesCount = {};
    orders.forEach(order => { (order.items || []).forEach(item => { salesCount[item.name] = (salesCount[item.name] || 0) + item.qty; }); });
    let sortedMenus = menuItems.map(menu => ({ ...menu, sales: salesCount[menu.name] || 0 }));
    sortedMenus = sortedMenus.filter(m => m.sales > 0).sort((a, b) => b.sales - a.sales);
    return sortedMenus.length === 0 ? defaultSlice : sortedMenus.slice(0, 9);
  }, [orders, menuItems]);

  const displayedItems = React.useMemo(() => {
    if (searchQuery) return menuItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (activeCategory === '🔥 เมนูขายดี') return bestSellers;
    return menuItems.filter(i => {
       if (activeCategory === 'สมูทตี้โยเกิร์ต') return i.category === 'สมูทตี้โยเกิร์ต' || i.category === 'ผลไม้และสมูทตี้';
       if (activeCategory === 'วิปครีมและครีมชีส') return i.category === 'วิปครีมและครีมชีส' || i.category === 'ครีมและครีมชีส' || i.category === 'เมนูพิเศษ';
       return i.category === activeCategory;
    }).sort((a, b) => (a.sortOrder || a.createdAt || 0) - (b.sortOrder || b.createdAt || 0));
  }, [activeCategory, menuItems, bestSellers, searchQuery]);

  const promotedItems = React.useMemo(() => menuItems.filter(i => i.isPromoted).sort((a, b) => (a.sortOrder || a.createdAt || 0) - (b.sortOrder || b.createdAt || 0)), [menuItems]);

  useEffect(() => {
    if (view !== 'shop' || promotedItems.length <= 1 || searchQuery) return;
    const interval = setInterval(() => {
      if (sliderRef.current) {
         const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
         if (scrollLeft + clientWidth >= scrollWidth - 10) sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
         else sliderRef.current.scrollBy({ left: clientWidth * 0.85, behavior: 'smooth' });
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [view, promotedItems.length, searchQuery]);

  const currentThemeData = THEMES[storeSettings.theme] || THEMES.default;
  const cartTotal = cart.reduce((s,i)=>s+(i.price*i.qty),0);

  const mainContainerStyle = {
    backgroundColor: currentThemeData.bg,
    backgroundImage: storeSettings.theme === 'custom' && storeSettings.customBgImage ? `url(${storeSettings.customBgImage})` : 'none',
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col font-sans relative overflow-hidden transition-colors duration-500" style={mainContainerStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vollkorn:wght@700&family=Kanit:wght@400;600;700&display=swap');
        :root {
          --theme-primary: ${currentThemeData.primary};
          --theme-accent: ${currentThemeData.accent};
          --theme-bg: ${currentThemeData.bg};
        }
        .font-serif { font-family: 'Vollkorn', serif; }
        .font-kanit { font-family: 'Kanit', sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        
        .bg-primary { background-color: var(--theme-primary); color: #fff; }
        .text-primary { color: var(--theme-primary); }
        .bg-accent { background-color: var(--theme-accent); color: #fff; }
        .text-accent { color: var(--theme-accent); }
        .border-accent { border-color: var(--theme-accent); }
        .border-primary { border-color: var(--theme-primary); }
        
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { position: relative; overflow: hidden; }
        .animate-shimmer::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: shimmer 2.5s infinite; }
        
        @keyframes pulseGlow { from { box-shadow: 0 0 5px rgba(255, 165, 0, 0.2); } to { box-shadow: 0 0 15px rgba(255, 165, 0, 0.6); } }
        .glow-effect { animation: pulseGlow 2s infinite alternate; border: 2px solid #ffd700; }
        
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-3px); } 100% { transform: translateY(0px); } }
        .floating-badge { animation: float 3s ease-in-out infinite; }
        
        .special-bg { background: linear-gradient(135deg, rgba(255,249,240,0.8) 0%, rgba(255,255,255,0.9) 100%); }
        
        @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(360deg); opacity: 0; } }
        .falling-icon { position: fixed; z-index: 10; animation: fall linear infinite; pointer-events: none; font-size: 1.5rem; opacity: 0.6; }
      `}</style>

      {storeSettings.theme && storeSettings.theme !== 'default' && currentThemeData.icons && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
             <div key={i} className="falling-icon" style={{
                left: `${Math.random() * 100}vw`,
                animationDuration: `${10 + Math.random() * 15}s`,
                animationDelay: `-${Math.random() * 10}s`,
                fontSize: `${1 + Math.random() * 1.5}rem`
             }}>
                {currentThemeData.icons[Math.floor(Math.random() * currentThemeData.icons.length)]}
             </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-[50] bg-white/95 p-4 flex justify-between items-center border-b border-gray-100 shadow-sm relative backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('shop')}>
           {lineProfile.pictureUrl ? <img src={lineProfile.pictureUrl} className="w-10 h-10 rounded-full border-2 border-orange-100" alt="profile" /> : <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">🐮</div>}
           <div>
             <h1 className="font-serif font-bold text-lg leading-tight text-primary">วัวนมอารมณ์ดี</h1>
             <div className="flex items-center gap-1 mt-1">
               <p className="text-[9px] font-bold text-green-700 uppercase tracking-tighter">คุณ {(lineProfile.displayName || 'ลูกค้าทั่วไป').slice(0, 10)}</p>
               <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm flex items-center gap-1 ${storeSettings.isStoreOpen !== false ? 'bg-green-500' : 'bg-red-500'}`}>
                 {storeSettings.isStoreOpen !== false ? '🟢 เปิดแล้วค่ะ' : '🔴 ปิดแล้วค่ะ'}
               </span>
             </div>
           </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('myOrders')} className="p-2 text-gray-400 hover:text-primary transition-colors"><ClipboardList/></button>
          <button onClick={() => setView('cart')} className="relative p-2 bg-primary text-white rounded-xl w-10 h-10 flex items-center justify-center shadow-lg active:scale-90 transition-all">
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{cart.length}</span>}
            <ShoppingCart size={20}/>
          </button>
        </div>
      </header>

      {isSearchFocused && view === 'shop' && <div className="fixed inset-0 z-[40] bg-black/10 backdrop-blur-sm" onClick={() => setIsSearchFocused(false)}></div>}

      <main className="flex-1 pb-10 relative z-10">
        {/* --- Shop View --- */}
        {view === 'shop' && (
          <div className="animate-in fade-in">
            {/* โค้ดหน้าร้านค้าเหมือนเดิมทั้งหมด... */}
            <div className="px-5 pt-4 pb-2 sticky top-[73px] z-[45]" style={{ backgroundColor: currentThemeData.bg }}>
              <div className="relative z-[50]">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                   type="text" 
                   value={searchQuery} 
                   onChange={e => setSearchQuery(e.target.value)}
                   onFocus={() => setIsSearchFocused(true)}
                   placeholder="ค้นหาเมนูที่คุณอยากดื่ม..." 
                   className="w-full pl-11 pr-10 py-3.5 rounded-[1.5rem] text-sm outline-none shadow-sm focus:ring-2 focus:ring-[var(--theme-accent)] border border-gray-100 bg-white/90 backdrop-blur-sm" 
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setIsSearchFocused(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 active:scale-90 bg-gray-100 rounded-full p-1"><X size={14}/></button>
                )}
              </div>

              {isSearchFocused && !searchQuery && (searchHistory.length > 0 || popularSearches.length > 0) && (
                <div className="absolute top-[110%] left-5 right-5 bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl border border-gray-100 p-5 z-[50] animate-in fade-in slide-in-from-top-2">
                   {searchHistory.length > 0 && (
                      <div className="mb-5">
                         <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[11px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wider"><Clock size={14}/> ประวัติการค้นหา</h4>
                            <button onClick={() => setSearchHistory([])} className="text-[10px] text-red-400 font-bold bg-red-50 px-2 py-1 rounded-lg">ล้าง</button>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {searchHistory.map(h => (
                               <button key={h} onClick={() => handleSearchSubmit(h)} className="bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs border border-gray-200 transition-all">{h}</button>
                            ))}
                         </div>
                      </div>
                   )}
                   {popularSearches.length > 0 && (
                      <div>
                         <h4 className="text-[11px] font-bold text-orange-500 flex items-center gap-1 mb-3 uppercase tracking-wider"><TrendingUp size={14}/> คำค้นหายอดฮิต 🔥</h4>
                         <div className="flex flex-wrap gap-2">
                            {popularSearches.map(p => (
                               <button key={p} onClick={() => handleSearchSubmit(p)} className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-xs border border-orange-100 font-bold transition-all shadow-sm">{p}</button>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
              )}
            </div>

            {!searchQuery && promotedItems.length > 0 && (
              <div className="pt-2 pb-2">
                <div ref={sliderRef} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar scroll-smooth w-full px-5 gap-3">
                  {promotedItems.map(item => (
                    <div key={`promo-${item.id}`} className="w-[85%] flex-shrink-0 snap-center">
                      <div onClick={() => openOptionModal(item)} className={`bg-white/90 backdrop-blur-sm rounded-[2rem] p-3 shadow-md flex items-center gap-4 border border-orange-100 transition-all h-full relative overflow-hidden animate-shimmer glow-effect ${item.isSoldOut ? 'cursor-not-allowed opacity-80' : 'cursor-pointer active:scale-95'}`}>
                         <div className="relative">
                            <img src={item.image} className={`w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl shadow-sm flex-shrink-0`} alt={item.name} />
                            <div className="absolute -bottom-2 -right-2 text-2xl floating-badge drop-shadow-md">🔥</div>
                            {item.isSoldOut && (
                               <div className="absolute top-1 -left-1 bg-gray-700 text-white px-3 py-1 rounded-lg font-bold text-[10px] shadow-lg border border-gray-600 rotate-[-5deg] z-10">หมด</div>
                            )}
                         </div>
                         <div className="flex-1 flex flex-col justify-center py-1 pr-2">
                            <span className="text-[9px] bg-gradient-to-r from-red-500 to-orange-400 text-white px-2 py-1 rounded-full w-fit mb-1.5 font-bold flex items-center gap-1 shadow-md">
                               <Star size={10} fill="white"/> เมนูแนะนำ (Must Try!)
                            </span>
                            <h4 className="font-bold text-sm leading-tight line-clamp-2 text-primary">{item.name}</h4>
                            <p className="text-accent font-bold text-base mt-1">฿{item.price}</p>
                            <p className="text-[9px] text-orange-600 font-bold mt-1 bg-orange-50 w-fit px-1.5 py-0.5 rounded shadow-sm">สูตรลับเฉพาะทางร้าน ✨</p>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!searchQuery && (
              <div className="mx-5 mb-2 mt-4 p-4 bg-white/80 backdrop-blur-sm border-l-4 border-l-[var(--theme-accent)] rounded-r-2xl shadow-sm animate-in fade-in relative overflow-hidden">
                <h4 className="text-xs font-bold text-accent mb-2 flex items-center gap-1"><AlertCircle size={14}/> เงื่อนไขการสั่งซื้อ (รบกวนอ่านก่อนนะคะ 💖)</h4>
                <ul className="text-[10.5px] text-gray-700 space-y-1.5 pl-4 list-disc font-medium">
                  <li>ส่งถึงหน้าห้อง <span className="font-bold text-accent">เฉพาะกรณีเข้าตึกได้</span> เท่านั้น</li>
                  <li>หากเข้าตึกไม่ได้ / ฝนตก / ลิฟต์พัง ขออนุญาต <span className="font-bold text-accent">แขวนไว้ใต้ตึก</span></li>
                  <li>ระยะเวลารอออร์เดอร์ประมาณ <span className="font-bold">20 นาที (+/-)</span></li>
                  <li>ทางร้านรีบทำและจัดส่งตามคิว <span className="font-bold text-red-500">ขอความกรุณางดเร่งนะคะ 🙏</span></li>
                </ul>
              </div>
            )}

            {!searchQuery && storeSettings.isBlendOut && (
              <div className="mx-5 mb-2 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm animate-in fade-in text-center flex items-center justify-center gap-2">
                 <Zap size={16} className="text-blue-500"/>
                 <p className="text-xs font-bold text-blue-700">ขออภัยค่ะ วันนี้งดรับออร์เดอร์ <span className="text-red-500">เมนูปั่น</span> ชั่วคราวนะคะ 🙏</p>
              </div>
            )}

            {!searchQuery && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar px-5 py-3 sticky top-[138px] z-[40] backdrop-blur-md" style={{ backgroundColor: `${currentThemeData.bg}e6` }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeCategory === c && c === '🔥 เมนูขายดี' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : activeCategory === c ? 'bg-primary text-white border-primary shadow-md' : 'bg-white/90 text-gray-500 border-gray-100 hover:bg-white'}`}>{c}</button>
                ))}
              </div>
            )}

            <div className="px-5 pb-5 pt-2">
              {searchQuery && <p className="text-sm font-bold text-primary mb-4 ml-1">ผลการค้นหา "{searchQuery}" ({displayedItems.length} รายการ)</p>}
              {isLoading ? <div className="p-20 text-center opacity-30 italic font-bold text-primary animate-pulse">กำลังโหลดความสดชื่น... 🐮</div> : (
                <div className="grid grid-cols-2 gap-5">
                  {displayedItems.map((item, index) => {
                    const isSpecial = item.category === 'วิปครีมและครีมชีส' || item.category === 'ครีมและครีมชีส' || item.category === 'เมนูพิเศษ';
                    const isBestSeller = !searchQuery && activeCategory === '🔥 เมนูขายดี';
                    const isBlendUnavailable = item.isOnlyBlend && storeSettings.isBlendOut;
                    const isDisabled = item.isSoldOut || isBlendUnavailable;
                    return (
                    <div key={item.id} onClick={() => openOptionModal(item)} className={`rounded-[2rem] overflow-hidden shadow-sm transition-all relative ${isSpecial ? 'special-bg glow-effect border border-orange-100' : 'bg-white/90 backdrop-blur-sm border border-white/50'} ${isDisabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:-translate-y-1 active:scale-95'}`}>
                      
                      {item.isSoldOut && (
                         <div className="absolute top-2 left-2 bg-gray-700 text-white px-3 py-1.5 rounded-xl font-bold text-[11px] shadow-lg border border-gray-600 rotate-[-5deg] z-20 tracking-wider">หมด</div>
                      )}
                      
                      {!item.isSoldOut && isBlendUnavailable && (
                         <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
                            <div className="bg-blue-500 text-white px-4 py-1.5 rounded-full font-bold text-[11px] border border-blue-200 shadow-xl rotate-[-10deg] tracking-wider text-center leading-tight">เมนูปั่น<br/>หมดชั่วคราว</div>
                         </div>
                      )}

                      {item.hasFreePearl && !isDisabled && <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-400 to-red-400 text-white text-[8px] px-2 py-0.5 rounded-full font-bold shadow-md z-10 flex items-center gap-0.5 floating-badge"><Star size={8} fill="white"/> ฟรีไข่มุก!</div>}
                      
                      {isBestSeller && !item.isSoldOut && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg z-10 shadow-md flex items-center gap-1 border border-white/20">อันดับ {index + 1} 👑</div>
                      )}
                      
                      {isSpecial && !isBestSeller && !item.isSoldOut && (
                        <div className="absolute top-2 left-2 bg-accent text-white text-[9px] font-bold px-2 py-1 rounded-lg z-10 shadow-md">🌟 Limited</div>
                      )}

                      <div className="aspect-square bg-gray-50 relative">
                         <img src={item.image} className={`w-full h-full object-cover`} alt={item.name} />
                      </div>
                      <div className="p-4 text-center">
                        <h4 className="font-bold text-sm mb-1 line-clamp-1 text-primary">{item.name}</h4>
                        <p className="text-accent font-bold text-sm">฿{item.price}</p>
                        {isSpecial && !isBestSeller && <p className="text-[8px] text-accent mt-1 font-bold">เมนูสุดพรีเมียม</p>}
                      </div>
                    </div>
                  )})}
                  
                  {displayedItems.length === 0 && (
                    <div className="col-span-2 py-20 text-center flex flex-col items-center gap-4 bg-white/50 rounded-3xl backdrop-blur-sm">
                      <AlertCircle size={40} className="text-gray-300" />
                      <p className="text-gray-500 text-sm font-bold">
                        {searchQuery ? `ไม่พบเมนูที่ตรงกับ "${searchQuery}"` : `ยังไม่มีเมนูในหมวด "${activeCategory}"`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Cart View --- */}
        {view === 'cart' && (
          <div className="p-6 space-y-6 bg-white rounded-t-[3rem] mt-4 min-h-[85vh] shadow-2xl relative z-20">
            <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-gray-400 text-sm hover:text-primary transition-colors"><ChevronLeft size={20}/> เลือกเมนูเพิ่ม</button>
            <h2 className="text-3xl font-serif font-bold text-primary">ตะกร้าของคุณ</h2>
            <div className="space-y-4">
               {cart.map(i => (
                 <div key={i.cartId} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                   <div className="flex-1 font-bold text-sm text-primary">
                     {i.qty}x {i.name} <br/>
                     <span className="text-gray-400 text-[10px] uppercase">
                       ({getBlendText(i)} • หวาน {i.sweetness}{i.bean ? ` • ${i.bean}` : ''}{i.teaType ? ` • ${i.teaType}` : ''}{i.addShot ? ' • เพิ่มช็อต' : ''}{i.hasFreePearl ? (i.addPearl ? ' • มุกฟรี' : ' • ไม่รับมุกฟรี') : ''})
                       {i.selectedToppings?.length > 0 && ` • เพิ่ม: ${i.selectedToppings.map(t=>t.name).join(', ')}`}
                     </span>
                   </div>
                   <div className="flex items-center gap-4"><p className="font-bold text-accent">฿{i.price * i.qty}</p><button onClick={() => setCart(prev => prev.filter(item => item.cartId !== i.cartId))} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>
                 </div>
               ))}
               {cart.length === 0 && <div className="py-20 text-center opacity-30 italic font-bold text-gray-400">ยังไม่มีสินค้าในตะกร้า 🐮</div>}
            </div>

            {cart.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-gray-100">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-accent uppercase tracking-wider block">วิธีชำระเงิน</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setPaymentMethod('promptpay')} className={`py-4 px-1 rounded-2xl border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'promptpay' ? 'border-accent bg-[var(--theme-bg)] text-primary shadow-sm' : 'border-gray-50 text-gray-300 bg-white'}`}><CreditCard size={18}/><span className="text-[9px] text-center leading-tight">โอนพร้อมเพย์</span></button>
                    <button onClick={() => setPaymentMethod('cash')} className={`py-4 px-1 rounded-2xl border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-accent bg-[var(--theme-bg)] text-primary shadow-sm' : 'border-gray-50 text-gray-300 bg-white'}`}><Banknote size={18}/><span className="text-[9px] text-center leading-tight">ชำระเงินสด</span></button>
                    <button onClick={() => setPaymentMethod('thaichueithai')} className={`py-4 px-1 rounded-2xl border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'thaichueithai' ? 'border-accent bg-[var(--theme-bg)] text-primary shadow-sm' : 'border-gray-50 text-gray-300 bg-white'}`}><Sparkles size={18} className="text-orange-500" fill="currentColor"/><span className="text-[9px] text-center leading-tight">ไทยช่วยไทยพลัส</span></button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-2">ที่อยู่จัดส่ง</label>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="ระบุเลขที่ห้อง / ชื่อตึก / จุดสังเกต..." className="w-full p-5 rounded-3xl bg-gray-50 h-24 text-sm outline-none border border-transparent focus:border-accent focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-2 flex items-center gap-1"><MessageSquare size={14}/> หมายเหตุถึงร้านค้า</label>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น หวานน้อย, ไม่รับหลอด..." className="w-full p-4 rounded-2xl bg-gray-50 text-sm outline-none border border-transparent focus:border-accent focus:bg-white transition-all shadow-inner" />
                  </div>
                </div>
                
                {paymentMethod === 'promptpay' && (
                  <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center relative overflow-hidden">
                    <p className="text-xs font-bold mb-4 text-primary">สแกนชำระเงิน พร้อมแนบสลิป</p>
                    {storeSettings.qrCodeImage ? (
                      <img src={storeSettings.qrCodeImage} className="w-40 h-40 mx-auto mb-4 bg-white p-2 rounded-xl object-contain shadow-sm" alt="QR Code ร้าน" />
                    ) : (
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PROMPTPAY:${storeSettings.promptPayNo}:${cartTotal}`} className="w-40 h-40 mx-auto mb-4 bg-white p-2 rounded-xl" alt="QR Code อัตโนมัติ" />
                    )}
                    
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <p className="text-xs text-gray-500 font-bold">พร้อมเพย์: {storeSettings.promptPayNo || '0812345678'}</p>
                      <button onClick={copyPromptPay} className="flex items-center gap-1 bg-white border border-gray-200 text-accent px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-all">
                        {isCopied ? <CheckCircle size={14} className="text-green-500"/> : <Copy size={14}/>}
                        <span className="text-[10px] font-bold">{isCopied ? 'คัดลอกแล้ว' : 'คัดลอกเลข'}</span>
                      </button>
                    </div>

                    <label className="cursor-pointer bg-primary text-white py-4 px-8 rounded-2xl text-[11px] font-bold inline-flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                      <Upload size={18}/> {slipImage ? 'เปลี่ยนรูปสลิปใหม่' : 'แนบรูปสลิป'}
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const file = e.target.files[0];
                        if (file) {
                           setSlipImage('');
                           setSlipStatus('checking');
                           try {
                             const comp = await compressImage(file, 400, 400, 0.4);
                             setSlipImage(comp);
                             setTimeout(() => setSlipStatus('valid'), 1000);
                           } catch (err) {
                             console.error(err);
                             setSlipStatus('idle');
                           }
                        }
                      }} />
                    </label>

                    {slipImage && (
                       <div className="mt-5 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                          <img src={slipImage} className="h-32 mx-auto rounded-lg shadow-sm border border-gray-100 mb-3 object-contain bg-gray-50" alt="Slip Preview" />
                          {slipStatus === 'checking' && (
                             <div className="flex flex-col items-center gap-2 text-blue-500 animate-pulse">
                               <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                               <span className="text-[10px] font-bold">กำลังตรวจสอบความถูกต้องของสลิป...</span>
                             </div>
                          )}
                          {slipStatus === 'valid' && (
                             <div className="bg-green-50 text-green-600 p-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-green-100 animate-in zoom-in">
                               <CheckCircle size={14}/> ตรวจพบสลิปเรียบร้อย
                             </div>
                          )}
                       </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'thaichueithai' && (
                  <div className="bg-orange-50 p-6 rounded-[2.5rem] border-2 border-dashed border-orange-200 text-center relative overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="text-orange-500" size={24} fill="currentColor" />
                    </div>
                    <p className="text-sm font-bold text-orange-900 leading-snug mb-1">ชำระเงินด้วยไทยช่วยไทยพลัส</p>
                    <p className="text-xs text-orange-700 font-semibold leading-relaxed">
                      หากลูกค้าชำระเงินด้วยไทยช่วยไทยพลัส <br/>
                      <span className="text-red-500 font-bold underline">แอดมินจะส่งคิวอาร์โค้ดให้ใน LINE นะคะ 🐮💖</span>
                    </p>
                    <p className="text-[9.5px] text-gray-400 mt-4 leading-normal">*กรุณากดสั่งซื้อด้านล่างเพื่อบันทึกข้อมูลออเดอร์ในระบบก่อนค่ะ</p>
                  </div>
                )}
                
                <label className="flex items-start gap-3 p-4 rounded-2xl border bg-gray-50 transition-all cursor-pointer shadow-sm">
                  <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-green-600 cursor-pointer flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-primary mb-1">ยอมรับเงื่อนไขการส่งและสั่งซื้อ</p>
                    <ul className="text-[9.5px] text-gray-600 space-y-1 list-disc pl-3 font-medium">
                      <li>ส่งหน้าห้องเฉพาะเข้าตึกได้ (เข้าไม่ได้/ฝนตก = แขวนใต้ตึก)</li>
                      <li>รอออร์เดอร์ 20 นาที (+/-) / จัดส่งตามคิว งดเร่ง</li>
                    </ul>
                  </div>
                </label>
                
                {storeSettings.isStoreOpen !== false ? (
                  <button 
                    onClick={async () => {
                      if (!address) return showAlert("กรุณากรอกที่อยู่จัดส่งครับ");
                      if (paymentMethod === 'promptpay' && !slipImage) return showAlert("กรุณาแนบสลิปการโอนเงินครับ");
                      
                      setIsLoading(true);
                      const total = cartTotal;
                      const orderTime = Date.now();
                      const dateStr = new Date(orderTime).toLocaleString('th-TH');
                      
                      try {
                        const orderRef = await addDoc(collection(db, 'orders'), {
                          items: cart, total, status: 'pending', timestamp: orderTime,
                          userId: lineProfile.userId || "guest_user", lineName: lineProfile.displayName || "ลูกค้าทั่วไป", address, note,
                          paymentMethod,
                          hasSlip: paymentMethod === 'promptpay',
                          hasDeliveryImage: false
                        });

                        if (paymentMethod === 'promptpay' && slipImage) {
                          await setDoc(doc(db, 'slips', orderRef.id), {
                            slipImage: slipImage
                          }, { merge: true });
                        }

                        // 🌟 [ADDED] ยิงข้อมูลบันทึกลง Google Sheets เพื่อเก็บถาวร (Archive)
                        try {
                           fetch(GAS_WEB_APP_URL, {
                             method: 'POST',
                             body: JSON.stringify({
                               orderId: orderRef.id,
                               date: dateStr,
                               customerName: lineProfile.displayName || "ลูกค้าทั่วไป",
                               address: address,
                               paymentMethod: paymentMethod === 'cash' ? 'เงินสด' : (paymentMethod === 'thaichueithai' ? 'ไทยช่วยไทยพลัส' : 'โอนเงิน'),
                               items: cart.map(i => `${i.qty}x ${i.name}`).join(' | '),
                               total: total,
                               note: note || '-',
                               status: 'รอรับออเดอร์'
                             }),
                             mode: 'no-cors' // Use no-cors to avoid CORS errors from GAS
                           });
                        } catch(gasErr) { console.error("GAS Error", gasErr); }

                        const orderLink = `https://liff.line.me/${LIFF_ID}?action=viewOrders&orderId=${orderRef.id}`;
                        const orderSummaryText = `วัวนมอารมณ์ดี 🐮\nบิลเลขที่: #${orderRef.id.slice(0, 6)}\nวัน/เวลา: ${dateStr}\nลูกค้า: คุณ ${lineProfile.displayName || "ลูกค้าทั่วไป"}\n` + 
                          cart.map(i => {
                            const blendText = getBlendText(i);
                            const beanText = i.bean ? ` • เมล็ด: ${i.bean}` : '';
                            const teaText = i.teaType ? ` • รสชา: ${i.teaType}` : '';
                            const shotText = i.addShot ? ` • เพิ่มช็อตกาแฟ` : '';
                            const toppingsText = i.selectedToppings?.length > 0 ? ` • เพิ่มท็อปปิ้ง: ${i.selectedToppings.map(t => t.name).join(', ')}` : '';
                            const pearlText = i.hasFreePearl ? (i.addPearl ? ' • รับไข่มุกฟรี' : ' • ไม่รับไข่มุกฟรี') : '';
                            return `- ${i.qty}x ${i.name} (${blendText} • หวาน ${i.sweetness}${beanText}${teaText}${shotText}${pearlText}${toppingsText})`;
                          }).join('\n') + 
                          `\n\nยอดรวม: ฿${total}\nที่อยู่: ${address}\nช่องทางชำระเงิน: ${paymentMethod === 'cash' ? 'ชำระเงินสด' : (paymentMethod === 'thaichueithai' ? 'ไทยช่วยไทยพลัส' : 'โอนพร้อมเพย์')}\nหมายเหตุ: ${note || '-'}\n\n📄 เช็คบิล: ${orderLink}`;

                        let liffSuccess = false;
                        if (window.liff && window.liff.isLoggedIn() && window.liff.isInClient()) {
                           try {
                             await window.liff.sendMessages([{ type: "text", text: orderSummaryText }]);
                             liffSuccess = true;
                           } catch (err) { console.log("LIFF sendMessages Error:", err); }
                        }

                        setCart([]); setSlipImage(''); setSlipStatus('idle'); setAddress(''); setNote(''); setAcceptedTerms(false);

                        if (liffSuccess) {
                           setView('myOrders');
                           showAlert("สั่งซื้อสำเร็จ ระบบได้ยิงออร์เดอร์เข้าแชทร้านอัตโนมัติแล้วครับ! 🐮🎉");
                        } else {
                           setSuccessModalData({ orderId: orderRef.id, text: orderSummaryText });
                        }
                      } catch (err) {
                        showAlert("เกิดข้อผิดพลาดในการบันทึก: " + (err.message || err));
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading || !acceptedTerms || (paymentMethod === 'promptpay' && !slipImage)} 
                    className={`w-full py-5 rounded-[2.5rem] font-bold text-lg transition-all shadow-xl active:scale-95 flex justify-center items-center gap-2 ${acceptedTerms && !isLoading && !(paymentMethod === 'promptpay' && !slipImage) ? 'bg-accent text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                     {isLoading ? 'กำลังประมวลผล...' : `ยืนยันการสั่งซื้อ • ฿${cartTotal}`}
                  </button>
                ) : (
                  <button disabled className="w-full py-5 bg-gray-300 text-white rounded-[2.5rem] font-bold text-lg cursor-not-allowed">
                     ร้านปิดรับออเดอร์ชั่วคราว
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- My Orders View --- */}
        {view === 'myOrders' && (
          <div className="p-6 space-y-6 flex-1 bg-white rounded-t-[3rem] mt-4 min-h-[85vh] shadow-2xl relative z-20">
             <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-gray-400 text-sm hover:text-primary"><ChevronLeft size={20}/> กลับไปหน้าร้าน</button>
             <h2 className="text-3xl font-serif font-bold text-primary">ประวัติการสั่งซื้อ</h2>
             
             {isLoadingOrders ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 animate-in fade-in">
                   <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-accent font-bold text-sm text-center">กำลังเปิดประวัติการสั่งซื้อ<br/>รอระบบสักครู่นะคะ 🐮...</p>
                </div>
             ) : (
                 <div className="space-y-6">
                   {orders.filter(o => o.userId === lineProfile.userId).map(o => {
                     const dateStr = new Date(o.timestamp).toLocaleString('th-TH');
                     return (
                       <div key={o.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm border transition-all duration-500 border-gray-100`}>
                          <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                            <div>
                               <span className="text-[10px] font-bold text-accent uppercase tracking-wider">บิล #{o.id.slice(0,6)}</span>
                               <p className="text-xs font-bold text-orange-400 mt-1 uppercase">{o.status}</p>
                               <p className="text-[9px] text-gray-400 mt-1 font-bold"><Clock size={10} className="inline mr-1"/>{dateStr}</p>
                            </div>
                            <div className="text-2xl font-serif font-bold text-primary">฿{o.total}</div>
                          </div>
                          
                          <div className="space-y-1">{(o.items || []).map((item, idx) => (
                              <p key={idx} className="text-[11px] font-bold text-gray-500">
                                {item.qty}x {item.name} ({getBlendText(item)} • หวาน {item.sweetness}{item.bean ? ` • ${item.bean}` : ''}{item.teaType ? ` • ${item.teaType}` : ''}{item.addShot ? ' • เพิ่มช็อต' : ''})
                                {item.selectedToppings?.length > 0 && ` + ${item.selectedToppings.map(t=>t.name).join(', ')}`}
                              </p>
                          ))}</div>

                          {o.status === 'completed' && o.deliveryMessage && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 mb-3">
                                  <p className="text-[10px] font-bold text-accent mb-1 flex items-center gap-1"><MessageSquare size={12}/> ข้อความจากทางร้าน:</p>
                                  <p className="text-[11px] text-gray-600 font-bold">{o.deliveryMessage}</p>
                                </div>
                            </div>
                          )}
                       </div>
                   )})}
                   {orders.filter(o => o.userId === lineProfile.userId).length === 0 && (
                     <div className="py-10 text-center opacity-30 italic font-bold">ไม่พบประวัติการสั่งซื้อของคุณครับ 🐮</div>
                   )}
                 </div>
             )}
          </div>
        )}
      </main>

      {/* --- --- Modal เลือกออปชันเมนูเครื่องดื่มตอนสั่งซื้อ --- --- */}
      {optionModalItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4 animate-in fade-in">
          
          <div className="bg-white rounded-t-[3.5rem] w-full max-w-md animate-in slide-in-from-bottom-full duration-500 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="w-full h-[30vh] relative flex-shrink-0 bg-gray-50">
              <img src={optionModalItem.image} alt={optionModalItem.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent"></div>
            </div>

            <div className="p-10 pt-6 space-y-10 overflow-y-auto hide-scrollbar">
              <div className="flex justify-between items-center"><h3 className="text-2xl font-serif font-bold text-primary">{optionModalItem.name}</h3><button onClick={() => setOptionModalItem(null)} className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:bg-gray-100 transition-colors"><X/></button></div>
              <div className="space-y-8">
                <div><label className="text-[10px] font-bold block mb-4 text-gray-400 uppercase tracking-widest">ความหวาน</label>
                  <div className="grid grid-cols-3 gap-2">{SWEETNESS.map(l => (
                      <button key={l} onClick={() => setTempOptions({...tempOptions, sweetness: l})} className={`py-3.5 rounded-2xl text-[10px] font-bold border transition-all ${tempOptions.sweetness === l ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>{l}</button>
                  ))}</div>
                </div>

                {optionModalItem.category === 'กาแฟ' && (
                  <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-bold block mb-4 text-[#5c3a21] uppercase tracking-widest flex items-center gap-1"><Coffee size={14} fill="currentColor"/> เลือกระดับการคั่วเมล็ดกาแฟ</label>
                       <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => setTempOptions({...tempOptions, bean: 'คั่วกลาง'})} className={`py-4 rounded-2xl text-[11px] font-bold border transition-all ${tempOptions.bean === 'คั่วกลาง' ? 'bg-[#8c522d] text-white border-[#8c522d] shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>คั่วกลาง<br/><span className="text-[9px] font-normal">หอมนุ่ม ละมุน</span></button>
                         <button onClick={() => setTempOptions({...tempOptions, bean: 'คั่วเข้ม'})} className={`py-4 rounded-2xl text-[11px] font-bold border transition-all ${tempOptions.bean === 'คั่วเข้ม' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>คั่วเข้ม<br/><span className="text-[9px] font-normal">เข้มข้น ถึงใจ</span></button>
                       </div>
                     </div>
                     
                     <label className={`flex justify-between items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${tempOptions.addShot ? 'border-accent bg-[var(--theme-bg)]' : 'border-gray-50 bg-gray-50 hover:bg-gray-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${tempOptions.addShot ? 'bg-accent text-white' : 'bg-white border-2 border-gray-200'}`}>
                            {tempOptions.addShot && <CheckCircle size={14} />}
                          </div>
                          <span className={`text-sm font-bold ${tempOptions.addShot ? 'text-primary' : 'text-gray-500'}`}>เพิ่มช็อตกาแฟ</span>
                        </div>
                        <span className="text-sm font-bold text-accent">+฿20</span>
                        <input type="checkbox" className="hidden" checked={tempOptions.addShot || false} onChange={(e) => setTempOptions({...tempOptions, addShot: e.target.checked})} />
                     </label>
                  </div>
                )}

                {optionModalItem.hasTeaType && (
                  <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-bold block mb-4 text-[#4a5d23] uppercase tracking-widest flex items-center gap-1">🍵 เลือกรสชาติผงชา</label>
                       <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => setTempOptions({...tempOptions, teaType: 'มัทฉะ'})} className={`py-4 rounded-2xl text-[11px] font-bold border transition-all ${tempOptions.teaType === 'มัทฉะ' ? 'bg-[#4a5d23] text-white border-[#4a5d23] shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>มัทฉะ<br/><span className="text-[9px] font-normal">หอมเข้มข้น ดั้งเดิม</span></button>
                         <button onClick={() => setTempOptions({...tempOptions, teaType: 'โฮจิฉะ'})} className={`py-4 rounded-2xl text-[11px] font-bold border transition-all ${tempOptions.teaType === 'โฮจิฉะ' ? 'bg-[#8c522d] text-white border-[#8c522d] shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>โฮจิฉะ<br/><span className="text-[9px] font-normal">หอมคั่ว ละมุน</span></button>
                       </div>
                     </div>
                  </div>
                )}

                {optionModalItem.hasFreePearl && (
                  <div>
                     <label className="text-sm font-bold block mb-4 text-orange-400 uppercase tracking-widest text-[10px] flex items-center gap-1"><Star size={12} fill="currentColor"/> แถมมุกฟรี!</label>
                     <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setTempOptions({...tempOptions, addPearl: true})} className={`py-3.5 rounded-2xl text-[11px] font-bold border transition-all ${tempOptions.addPearl ? 'bg-orange-400 text-white border-orange-400 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>รับมุก (ฟรี)</button>
                       <button onClick={() => setTempOptions({...tempOptions, addPearl: false})} className={`py-3.5 rounded-2xl text-[11px] font-bold border transition-all ${!tempOptions.addPearl ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>ไม่รับมุกฟรี</button>
                     </div>
                  </div>
                )}

                {toppings.length > 0 && optionModalItem.allowTopping !== false && (
                  <div>
                    <label className="text-[10px] font-bold block mb-4 text-gray-400 uppercase tracking-widest">เพิ่มท็อปปิ้งอื่นๆ</label>
                    <div className="space-y-2">
                      {toppings.map(t => {
                        const isSelected = tempOptions.selectedToppings?.find(st => st.id === t.id);
                        return (
                          <label key={t.id} className={`flex justify-between items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-accent bg-[var(--theme-bg)]' : 'border-gray-50 bg-gray-50 hover:bg-gray-100'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-accent text-white' : 'bg-white border-2 border-gray-200'}`}>
                                {isSelected && <CheckCircle size={14} />}
                              </div>
                              <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-gray-500'}`}>{t.name}</span>
                            </div>
                            <span className="text-sm font-bold text-accent">+฿{t.price}</span>
                            <input type="checkbox" className="hidden" checked={!!isSelected} onChange={() => {
                              setTempOptions(prev => {
                                const currentToppings = prev.selectedToppings || [];
                                if (isSelected) return { ...prev, selectedToppings: currentToppings.filter(st => st.id !== t.id) };
                                return { ...prev, selectedToppings: [...currentToppings, t] };
                              });
                            }} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {optionModalItem.isOnlyBlend ? (
                  <div className="grid grid-cols-1 gap-5">
                     <button onClick={() => setTempOptions({...tempOptions, isBlended: true})} disabled={storeSettings.isBlendOut} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${storeSettings.isBlendOut ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-blue-400 bg-blue-50 text-blue-600 shadow-sm'}`}>
                       <Zap size={32}/><span className="text-xs uppercase">เฉพาะปั่น (สมูทตี้) {getAddedBlendPrice(optionModalItem) > 0 ? `(+฿${getAddedBlendPrice(optionModalItem)})` : ''}</span>
                       {storeSettings.isBlendOut && <span className="text-red-500 text-[10px] mt-1">วันนี้เมนูปั่นหมดค่ะ</span>}
                     </button>
                  </div>
                ) : optionModalItem.allowBlend !== false ? (
                  <div className="grid grid-cols-2 gap-5">
                     <button onClick={() => setTempOptions({...tempOptions, isBlended: false})} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${!tempOptions.isBlended ? 'border-accent bg-[var(--theme-bg)] text-primary shadow-sm' : 'border-gray-50 text-gray-300 bg-white hover:bg-gray-50'}`}><Coffee size={32}/><span className="text-xs uppercase">เย็น</span></button>
                     <button onClick={() => !storeSettings.isBlendOut && setTempOptions({...tempOptions, isBlended: true})} disabled={storeSettings.isBlendOut} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${storeSettings.isBlendOut ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : (tempOptions.isBlended ? 'border-accent bg-[var(--theme-bg)] text-primary shadow-sm' : 'border-gray-50 text-gray-300 bg-white hover:bg-gray-50')}`}><Zap size={32}/><span className="text-xs uppercase text-center">{storeSettings.isBlendOut ? 'เมนูปั่นหมด' : `ปั่น ${getAddedBlendPrice(optionModalItem) > 0 ? `(+฿${getAddedBlendPrice(optionModalItem)})` : ''}`}</span></button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5">
                     <button onClick={() => setTempOptions({...tempOptions, isBlended: false})} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all border-accent bg-[var(--theme-bg)] text-primary shadow-sm`}><Coffee size={32}/><span className="text-xs uppercase">เย็น / ปกติ</span></button>
                  </div>
                )}
              </div>
              
              <button onClick={() => {
                  const toppingsPrice = (tempOptions.selectedToppings || []).reduce((sum, t) => sum + Number(t.price), 0);
                  const shotPrice = tempOptions.addShot ? 20 : 0;
                  const isItemBlended = optionModalItem.isOnlyBlend || tempOptions.isBlended;
                  const finalP = optionModalItem.price + (isItemBlended ? getAddedBlendPrice(optionModalItem) : 0) + toppingsPrice + shotPrice;
                  const toppingsStr = (tempOptions.selectedToppings || []).map(t => t.id).sort().join('-');
                  const beanStr = tempOptions.bean ? `-${tempOptions.bean}` : '';
                  const teaStr = tempOptions.teaType ? `-${tempOptions.teaType}` : '';
                  const shotStr = tempOptions.addShot ? `-addShot` : '';
                  const cartId = `${optionModalItem.id}-${tempOptions.sweetness}-${isItemBlended}-${tempOptions.addPearl}-${toppingsStr}${beanStr}${teaStr}${shotStr}`;
                  
                  setCart(prev => {
                    const ex = prev.find(i => i.cartId === cartId);
                    if (ex) return prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i);
                    return [...prev, { ...optionModalItem, price: finalP, cartId, ...tempOptions, isBlended: isItemBlended, qty: 1 }];
                  });
                  setOptionModalItem(null);
                }} className="w-full py-6 bg-primary text-white rounded-[2.5rem] font-bold text-lg active:scale-95 flex items-center justify-center gap-3 shadow-xl hover:opacity-90 transition-all">
                  <Plus size={24}/> เพิ่มลงตะกร้า • ฿{optionModalItem.price + ((optionModalItem.isOnlyBlend || tempOptions.isBlended) ? getAddedBlendPrice(optionModalItem) : 0) + ((tempOptions.selectedToppings || []).reduce((sum, t) => sum + Number(t.price), 0)) + (tempOptions.addShot ? 20 : 0)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Pop Up แจ้งเตือนร้านปิด */}
      {showStoreClosedModal && (
        <div className="fixed inset-0 bg-black/80 z-[350] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center space-y-6 border-4 border-red-500 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-2xl font-bold text-red-600 leading-tight">🐮 ขณะนี้ร้านปิดให้บริการ</h3>
            <p className="text-sm text-gray-700 leading-relaxed font-bold">
              ขออภัยลูกค้าทุกท่านด้วยนะคะ <br />
              ขณะนี้ทางร้าน <span className="text-red-500 text-base underline font-extrabold">"ปิดรับออเดอร์ชั่วคราว"</span> ค่ะ <br />
              แต่ลูกค้ายังสามารถเลือกดูเมนูเครื่องดื่มต่างๆ ก่อนได้นะคะ 💖
            </p>
            <div className="space-y-3 pt-2">
              <button 
                onClick={() => setShowStoreClosedModal(false)}
                className="w-full bg-primary text-white py-4 rounded-full text-sm font-bold shadow-md active:scale-95 hover:bg-opacity-95 transition-all"
              >
                รับทราบ (เข้าชมเมนูเครื่องดื่ม)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Failsafe Modal สีแดง */}
      {successModalData && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center space-y-6 animate-in zoom-in border-4 border-red-500">
             <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce"><AlertCircle size={40}/></div>
             <h3 className="text-2xl font-bold text-red-600 leading-tight">⚠️ ขั้นตอนสุดท้าย!<br/>อย่าเพิ่งปิดหน้าจอนี้</h3>
             <p className="text-sm text-gray-700 leading-relaxed font-bold">เพื่อยืนยันการสั่งซื้อให้สมบูรณ์<br/><span className="text-red-500 text-base underline">ลูกค้าต้องกด "ส่งบิล" หรือ "คัดลอกข้อความ" ไปให้ที่แชทร้านด้วยนะคะ</span></p>
             
             <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-300 text-left max-h-32 overflow-y-auto shadow-inner">
                <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{successModalData.text}</pre>
             </div>

             <div className="space-y-3">
                <button 
                  onClick={() => {
                     navigator.clipboard.writeText(successModalData.text);
                     if (storeSettings.shopLineUrl) window.location.href = storeSettings.shopLineUrl;
                     else showAlert("คัดลอกข้อความสำเร็จ! รบกวนนำไปวางส่งในแชทร้านที่คุณทักมาด้วยนะคะ 🙏");
                  }}
                  className="flex items-center justify-center gap-2 w-full bg-[#06C755] text-white py-4 rounded-full text-base font-bold shadow-lg active:scale-95 hover:bg-green-600 transition-all"
                >
                   <Share2 size={20}/> กดคัดลอกบิล แล้วไปที่แชทร้านค้า
                </button>
                <button 
                  onClick={() => { setSuccessModalData(null); setView('myOrders'); }}
                  className="w-full text-gray-400 py-2 text-xs font-bold mt-2 hover:text-gray-600"
                >
                   ส่งเรียบร้อยแล้ว / ปิดหน้าต่างนี้
                </button>
             </div>
          </div>
        </div>
      )}

      {/* 🌟 Custom Message Box */}
      {msgBox.isOpen && (
        <div className="fixed inset-0 bg-black/70 z-[400] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-5" />
            <h3 className="font-bold text-sm text-gray-800 mb-8 whitespace-pre-line leading-relaxed">{msgBox.message}</h3>
            <button 
              onClick={() => {
                setMsgBox({ ...msgBox, isOpen: false });
                if (msgBox.message.includes("สำเร็จ") && window.liff && window.liff.isInClient() && msgBox.message.includes("คุณ")) {
                    window.liff.closeWindow();
                }
              }} 
              className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-bold hover:opacity-90 transition-opacity shadow-md"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

    </div>
  );
}