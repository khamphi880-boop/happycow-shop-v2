import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Plus, Trash2, ChevronLeft, X, Upload, ClipboardList, Coffee, Zap, 
  MapPin, Settings, Copy, CheckCircle, AlertCircle, LogIn, Eye, Clock, Check, 
  Banknote, CreditCard, MessageSquare, Star, Edit, Save, Camera, Home, Building, 
  TrendingUp, Download, ArrowUp, ArrowDown, Search, Palette, BellRing, Share2, UserCheck,
  Sparkles, Database, Users
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';

// --- 1. Firebase Configuration (ตั้งค่าการเชื่อมต่อฐานข้อมูล) ---
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

const CATEGORIES = ['🔥 เมนูขายดี', 'นม', 'ชา', 'กาแฟ', 'มัทฉะ', 'สมูทตี้โยเกิร์ต', 'วิปครีมและครีมชีส'];
const SWEETNESS = ['0%', '25%', '50%', '75%', '100%', '120%'];
const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// [MODIFIED] SAUCES - รายการซอสเริ่มต้นสำหรับปุ่มนำเข้าเข้าสู่ฐานข้อมูล Firestore
const DEFAULT_SAUCES = [
  { name: 'ซอสช็อกโกแลต', price: 0 },
  { name: 'ซอสคาราเมล', price: 0 },
  { name: 'ซอสสตรอว์เบอร์รี่', price: 0 },
  { name: 'นมข้นหวาน', price: 0 },
  { name: 'ซอสมัทฉะ', price: 0 },
  { name: 'ซอสชาไทย', price: 0 }
];

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

// --- 2. ฟังก์ชันบีบอัดรูปภาพ (Image Compression) ---
const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
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

export default function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [toppings, setToppings] = useState([]); 
  const [sauces, setSauces] = useState([]);
  
  const [cart, setCart] = useState(() => {
    try { const saved = localStorage.getItem('happycow_cart'); return saved ? JSON.parse(saved) : []; }
    catch(e) { return []; }
  });

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action === 'viewOrders') {
      const isAdmin = localStorage.getItem('happycow_isAdmin') === 'true';
      if (isAdmin) return 'admin'; 
      return 'myOrders';
    }
    if (action === 'admin') {
      return localStorage.getItem('happycow_isAdmin') === 'true' ? 'admin' : 'shop';
    }
    
    const isFirstTimeSession = !sessionStorage.getItem('happycow_session_active');
    sessionStorage.setItem('happycow_session_active', 'true');
    if (isFirstTimeSession) {
      return 'shop';
    }
    return localStorage.getItem('happycow_view') || 'shop';
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
  const showAlert = (message, onConfirm = null) => setMsgBox({ isOpen: true, type: 'alert', message, onConfirm });
  const showConfirm = (message, onConfirm) => setMsgBox({ isOpen: true, type: 'confirm', message, onConfirm });
  
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTab, setAdminTab] = useState('orders'); 
  const [selectedSlip, setSelectedSlip] = useState(null); 
  const [downloadPreview, setDownloadPreview] = useState(null); 
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  
  const [selectedOrderId, setSelectedOrderId] = useState('');

  const [deliveryModal, setDeliveryModal] = useState(null);
  const [deliveryImage, setDeliveryImage] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('room');
  const [isDelivering, setIsDelivering] = useState(false);

  // [MODIFIED] เพิ่ม googleSheetUrl ใน storeSettings
  const [storeSettings, setStoreSettings] = useState({ 
    promptPayNo: '0812345678', qrCodeImage: '', isStoreOpen: true, theme: 'default', 
    customBgImage: '', isBlendOut: false, notifyAdmin: false, adminLineId: '',
    shopLineUrl: '', autoCloseEnabled: false, maxQueue: 3, autoCloseDays: [],
    googleSheetUrl: '' 
  });
  const [editPromptPay, setEditPromptPay] = useState('');
  const [editQrCodeImage, setEditQrCodeImage] = useState('');
  const [editCustomBgImage, setEditCustomBgImage] = useState('');
  const [editNotifyAdmin, setEditNotifyAdmin] = useState(false);
  const [editAdminLineId, setEditAdminLineId] = useState('');
  const [editShopLineUrl, setEditShopLineUrl] = useState('');
  const [editAutoCloseEnabled, setEditAutoCloseEnabled] = useState(false);
  const [editMaxQueue, setEditMaxQueue] = useState(3);
  const [editAutoCloseDays, setEditAutoCloseDays] = useState([]);
  const [editGoogleSheetUrl, setEditGoogleSheetUrl] = useState(''); // [MODIFIED]
  
  const [isSyncingAll, setIsSyncingAll] = useState(false); // [MODIFIED] State กำลังซิงค์ทั้งหมดไป Google Sheets

  const [newMenu, setNewMenu] = useState({ 
    name: '', price: '', category: 'นม', image: '', blendPrice: 5, 
    hasFreePearl: false, allowTopping: true, allowSauce: false, allowBlend: true, 
    isOnlyBlend: false, isPromoted: false, isSoldOut: false, hasTeaType: false,
    allowedSweetness: ['0%', '25%', '50%', '75%', '100%', '120%']
  });
  const [editingMenu, setEditingMenu] = useState(null); 
  const [newTopping, setNewTopping] = useState({ name: '', price: '' }); 
  const [newSauce, setNewSauce] = useState({ name: '', price: 0 });

  const [showAddMenuForm, setShowAddMenuForm] = useState(false);
  const [showAddToppingForm, setShowAddToppingForm] = useState(false);
  const [showAddSauceForm, setShowAddSauceForm] = useState(false);

  const [successModalData, setSuccessModalData] = useState(null);
  const [adminDeliverySuccessData, setAdminDeliverySuccessData] = useState(null);

  const [optionModalItem, setOptionModalItem] = useState(null);
  const [tempOptions, setTempOptions] = useState({ sweetness: '100%', isBlended: false, addPearl: true, selectedToppings: [], selectedSauces: [], separateIce: false });
  const [lineProfile, setLineProfile] = useState({ displayName: 'ลูกค้าทั่วไป', pictureUrl: '', userId: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try { const saved = localStorage.getItem('happycow_searchHistory'); return saved ? JSON.parse(saved) : []; }
    catch(e) { return []; }
  });
  const [popularSearches, setPopularSearches] = useState([]);
  const [visitStats, setVisitStats] = useState({});
  const [loadingSlipId, setLoadingSlipId] = useState(null);

  const [activeUsers, setActiveUsers] = useState([]);
  const [showStoreClosedModal, setShowStoreClosedModal] = useState(false);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const audioRef = useRef(null);
  const previousOrderCount = useRef(0);
  const isProcessingOrder = useRef(false);

  // Helper Function ตรวจสอบว่าเมนูนี้เป็นวิปครีมหรือครีมชีสหรือไม่
  const isWhipOrCreamCheeseItem = (item) => {
    if (!item) return false;
    return item.category === 'วิปครีมและครีมชีส' || 
           item.category === 'ครีมและครีมชีส' || 
           (item.name && (item.name.includes('วิปครีม') || item.name.includes('ครีมชีส')));
  };

  const getAddedBlendPrice = (item) => {
    if (item.category === 'สมูทตี้โยเกิร์ต' || item.category === 'ผลไม้และสมูทตี้') return 0;
    return (item.blendPrice !== undefined && item.blendPrice !== null && item.blendPrice !== '') ? Number(item.blendPrice) : 5;
  };

  // [MODIFIED] ฟังก์ชันส่งข้อมูลออร์เดอร์ไปยัง Google Sheets (Background Fetch)
  const sendOrderToGoogleSheets = async (orderData) => {
    const endpoint = storeSettings.googleSheetUrl;
    if (!endpoint || !endpoint.startsWith('http')) return;

    try {
      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
    } catch (err) {
      console.error("Google Sheets Sync Error:", err);
    }
  };

  // [MODIFIED] ฟังก์ชันซิงค์ออร์เดอร์ทั้งหมดลง Google Sheets ในคลิกเดียว
  const syncAllToGoogleSheets = async () => {
    if (!storeSettings.googleSheetUrl) {
      return showAlert("กรุณาตั้งค่า Google Sheet Web App URL ในเมนูตั้งค่าก่อนครับ");
    }
    setIsSyncingAll(true);
    try {
      const activeOrders = orders.filter(o => !o.isDeleted);
      await fetch(storeSettings.googleSheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeOrders)
      });
      showAlert(`ซิงค์ข้อมูลทั้งหมด ${activeOrders.length} รายการ เข้า Google Sheets เรียบร้อยแล้วค่ะ! ✨`);
    } catch (e) {
      showAlert("เกิดข้อผิดพลาดในการซิงค์: " + e.message);
    } finally {
      setIsSyncingAll(false);
    }
  };

  useEffect(() => { localStorage.setItem('happycow_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('happycow_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('happycow_address', address); }, [address]);
  useEffect(() => { localStorage.setItem('happycow_note', note); }, [note]);
  useEffect(() => { localStorage.setItem('happycow_paymentMethod', paymentMethod); }, [paymentMethod]);
  useEffect(() => { localStorage.setItem('happycow_searchHistory', JSON.stringify(searchHistory)); }, [searchHistory]);

  // --- 🌟 useEffect หลัก (Core Data) ---
  useEffect(() => {
    const recordVisit = async () => {
      const isAdmin = localStorage.getItem('happycow_isAdmin') === 'true';
      if (isAdmin) return;

      const todayStr = new Date().toLocaleDateString('en-CA'); 
      const isVisited = sessionStorage.getItem('happycow_visited_today');
      if (!isVisited) {
        sessionStorage.setItem('happycow_visited_today', 'true');
        try {
          await setDoc(doc(db, 'settings', 'visit_stats'), {
            [todayStr]: increment(1)
          }, { merge: true });
        } catch (e) { console.error("Visit Stats Log Error:", e); }
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

    const unsubToppings = onSnapshot(collection(db, 'toppings'), snapshot => { 
      setToppings(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    const unsubSauces = onSnapshot(collection(db, 'sauces'), snapshot => { 
      const fetchedSauces = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSauces(fetchedSauces); 
    });

    // [MODIFIED] อ่านค่า googleSheetUrl จาก Firestore
    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoreSettings({ 
           ...data, 
           isStoreOpen: data.isStoreOpen !== false, 
           theme: data.theme || 'default', 
           customBgImage: data.customBgImage || '', 
           isBlendOut: data.isBlendOut || false, 
           notifyAdmin: data.notifyAdmin || false, 
           adminLineId: data.adminLineId || '',
           shopLineUrl: data.shopLineUrl || '',
           autoCloseEnabled: data.autoCloseEnabled || false,
           maxQueue: data.maxQueue || 3,
           autoCloseDays: data.autoCloseDays || [],
           googleSheetUrl: data.googleSheetUrl || '' // [MODIFIED]
        });
        setEditPromptPay(data.promptPayNo || '0812345678'); 
        setEditQrCodeImage(data.qrCodeImage || '');
        setEditCustomBgImage(data.customBgImage || '');
        setEditNotifyAdmin(data.notifyAdmin || false);
        setEditAdminLineId(data.adminLineId || '');
        setEditShopLineUrl(data.shopLineUrl || '');
        setEditAutoCloseEnabled(data.autoCloseEnabled || false);
        setEditMaxQueue(data.maxQueue || 3);
        setEditAutoCloseDays(data.autoCloseDays || []);
        setEditGoogleSheetUrl(data.googleSheetUrl || ''); // [MODIFIED]
      }
    });

    return () => { unsubMenus(); unsubToppings(); unsubSauces(); unsubSettings(); };
  }, []);

  // --- 🌟 useEffect (Lazy Load Orders) ---
  useEffect(() => {
    const isAdmin = localStorage.getItem('happycow_isAdmin') === 'true';
    if (view !== 'admin' && view !== 'myOrders' && !isAdmin) return;

    setIsLoadingOrders(true);
    const unsubOrders = onSnapshot(collection(db, 'orders'), snapshot => { 
       const fetchedOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp);
       setOrders(fetchedOrders); 
       setIsLoadingOrders(false);
    });
    return () => unsubOrders();
  }, [view]);

  // --- 🌟 useEffect (Lazy Load Admin Stats) ---
  useEffect(() => {
    const isAdmin = localStorage.getItem('happycow_isAdmin') === 'true';
    if (view !== 'admin' && !isAdmin) return;

    const unsubActive = onSnapshot(collection(db, 'active_users'), snapshot => {
      const now = Date.now();
      const threshold = 120000;
      const activeList = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(user => now - user.lastActive < threshold);
      setActiveUsers(activeList);
    });

    const pruneInterval = setInterval(() => {
      setActiveUsers(prev => {
        const now = Date.now();
        return prev.filter(user => now - user.lastActive < 120000);
      });
    }, 30000);

    const unsubSearchStats = onSnapshot(doc(db, 'settings', 'search_stats'), docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8).map(entry => entry[0]);
        setPopularSearches(sorted);
      } else setPopularSearches([]);
    });

    const unsubVisits = onSnapshot(doc(db, 'settings', 'visit_stats'), docSnap => {
      if (docSnap.exists()) {
        setVisitStats(docSnap.data());
      }
    });

    return () => { unsubActive(); clearInterval(pruneInterval); unsubSearchStats(); unsubVisits(); };
  }, [view]);

  // ระบบ Presence (บอกสถานะออนไลน์ของลูกค้า)
  useEffect(() => {
    if (!lineProfile.userId) return;
    const isAdmin = localStorage.getItem('happycow_isAdmin') === 'true';
    if (isAdmin) return;

    const docRef = doc(db, 'active_users', lineProfile.userId);
    const sendPing = async () => {
      try { await setDoc(docRef, { displayName: lineProfile.displayName || 'ลูกค้าทั่วไป', lastActive: Date.now() }, { merge: true }); } catch (e) { }
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

  // ตรวจจับสถานะของร้านค้าแบบเรียลไทม์
  useEffect(() => {
    const isAdmin = localStorage.getItem('happycow_isAdmin') === 'true';
    if (storeSettings.isStoreOpen === false && !isAdmin) {
      setShowStoreClosedModal(true);
    } else {
      setShowStoreClosedModal(false);
    }
  }, [storeSettings.isStoreOpen]);

  // ระบบ Auto-Close
  useEffect(() => {
    if (storeSettings.autoCloseEnabled && storeSettings.isStoreOpen && orders.length > 0) {
      const todayDayIndex = new Date().getDay(); 
      const enabledDays = storeSettings.autoCloseDays || [];
      
      if (enabledDays.includes(todayDayIndex)) {
        const activeQueueCount = orders.filter(o => !o.isDeleted && (o.status === 'pending' || o.status === 'cooking')).length;
        if (activeQueueCount >= storeSettings.maxQueue) {
           updateDoc(doc(db, 'settings', 'store'), { isStoreOpen: false });
           showAlert(`🤖 ระบบปิดร้านชั่วคราวอัตโนมัติทำงาน เนื่องจากขณะนี้มีคิวสั่งซื้อคงค้างสะสม ${activeQueueCount} คิวในระบบ`);
        }
      }
    }
  }, [orders, storeSettings.autoCloseEnabled, storeSettings.maxQueue, storeSettings.isStoreOpen, storeSettings.autoCloseDays]);

  const viewImage = async (orderId, type) => {
    setLoadingSlipId(orderId);
    try {
      const slipSnap = await getDoc(doc(db, 'slips', orderId));
      if (slipSnap.exists()) {
        const data = slipSnap.data();
        const img = type === 'slip' ? data.slipImage : data.deliveryImage;
        if (img) {
          setSelectedSlip(img);
        } else {
          showAlert("ขออภัยค่ะ ไม่พบหลักฐานรูปภาพนี้ในระบบคลาวด์");
        }
      } else {
        showAlert("ไม่พบข้อมูลหลักฐานรูปภาพของบิลนี้");
      }
    } catch (e) {
      showAlert("เกิดข้อผิดพลาดในการโหลดรูปภาพ: " + e.message);
    } finally {
      setLoadingSlipId(null);
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setTimeout(() => {
          if (audioRef.current) {
            const secondBell = audioRef.current.cloneNode();
            secondBell.play().catch(e => console.log('Autoplay blocked', e));
          }
        }, 600); 
      }).catch(e => console.log('Autoplay blocked by browser policy', e));
    }
  };

  useEffect(() => {
    if (orders.length > previousOrderCount.current && previousOrderCount.current !== 0) {
      const newOrders = orders.slice(0, orders.length - previousOrderCount.current);
      const hasNewPending = newOrders.some(o => o.status === 'pending' && !o.isDeleted);
      if (hasNewPending && view === 'admin') playNotificationSound();
    }
    previousOrderCount.current = orders.length;
  }, [orders, view]);

  const handleLineLogin = () => { if (window.liff && !window.liff.isLoggedIn()) window.liff.login(); };

  const handleAddNewMenu = async () => {
    if (!newMenu.name || !newMenu.price || !newMenu.image) return showAlert('กรุณากรอกข้อมูลให้ครบครับ');
    if (newMenu.category === '🔥 เมนูขายดี') return showAlert('หมวดหมู่ "เมนูขายดี" เป็นระบบอัตโนมัติ กรุณาเลือกหมวดหมู่อื่นครับ');
    try {
      await addDoc(collection(db, 'menus'), { 
        ...newMenu, 
        price: Number(newMenu.price), 
        blendPrice: Number(newMenu.blendPrice), 
        allowTopping: newMenu.allowTopping !== false, 
        allowSauce: newMenu.allowSauce || false,
        isOnlyBlend: newMenu.isOnlyBlend || false, 
        allowBlend: newMenu.isOnlyBlend ? true : (newMenu.allowBlend !== false), 
        isPromoted: newMenu.isPromoted || false, 
        isSoldOut: newMenu.isSoldOut || false, 
        hasTeaType: newMenu.hasTeaType || false, 
        allowedSweetness: newMenu.allowedSweetness || SWEETNESS,
        createdAt: Date.now(), 
        sortOrder: Date.now() 
      });
      showAlert('เพิ่มเมนูสำเร็จ! 🐮'); 
      setNewMenu({ 
        name: '', price: '', category: 'นม', image: '', blendPrice: 5, 
        hasFreePearl: false, allowTopping: true, allowSauce: false, allowBlend: true, 
        isOnlyBlend: false, isPromoted: false, isSoldOut: false, hasTeaType: false,
        allowedSweetness: ['0%', '25%', '50%', '75%', '100%', '120%'] 
      });
      setShowAddMenuForm(false);
    } catch (e) { showAlert(e.message); }
  };

  const handleUpdateMenu = async () => {
    if (!editingMenu.name || !editingMenu.price || !editingMenu.image) return showAlert('กรุณากรอกข้อมูลให้ครบครับ');
    try {
      await updateDoc(doc(db, 'menus', editingMenu.id), { 
        ...editingMenu, 
        price: Number(editingMenu.price), 
        blendPrice: Number(editingMenu.blendPrice), 
        allowTopping: editingMenu.allowTopping !== false, 
        allowSauce: editingMenu.allowSauce || false,
        isOnlyBlend: editingMenu.isOnlyBlend || false, 
        allowBlend: editingMenu.isOnlyBlend ? true : (editingMenu.allowBlend !== false), 
        isPromoted: editingMenu.isPromoted || false, 
        isSoldOut: editingMenu.isSoldOut || false, 
        hasTeaType: editingMenu.hasTeaType || false,
        allowedSweetness: editingMenu.allowedSweetness || SWEETNESS
      });
      showAlert('แก้ไขเมนูสำเร็จ! ✨'); 
      setEditingMenu(null);
    } catch (e) { showAlert(e.message); }
  };

  const handleDeleteMenu = (id) => { 
      showConfirm('ลบเมนูนี้ใช่หรือไม่?', async () => {
          await deleteDoc(doc(db, 'menus', id));
      });
  };

  const handleSortDrop = async (itemsInCategory) => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) { dragItem.current = null; dragOverItem.current = null; return; }
    const newItems = [...itemsInCategory];
    const draggedItemContent = newItems[dragItem.current];
    newItems.splice(dragItem.current, 1);
    newItems.splice(dragOverItem.current, 0, draggedItemContent);
    setIsLoading(true);
    try {
      const updatePromises = newItems.map((item, index) => updateDoc(doc(db, 'menus', item.id), { sortOrder: Date.now() + index * 1000 }));
      await Promise.all(updatePromises);
    } catch (e) { console.error(e); }
    setIsLoading(false);
    dragItem.current = null; dragOverItem.current = null;
  };

  const handleMoveMenu = async (item, direction, itemsInCategory) => {
    const currentIndex = itemsInCategory.findIndex(i => i.id === item.id);
    if (direction === 'up' && currentIndex > 0) {
      const prevItem = itemsInCategory[currentIndex - 1];
      const currentOrder = item.sortOrder || item.createdAt || Date.now();
      let prevOrder = prevItem.sortOrder || prevItem.createdAt || (Date.now() - 1000);
      if (currentOrder === prevOrder) prevOrder -= 1;
      await updateDoc(doc(db, 'menus', item.id), { sortOrder: prevOrder });
      await updateDoc(doc(db, 'menus', prevItem.id), { sortOrder: currentOrder });
    } else if (direction === 'down' && currentIndex < itemsInCategory.length - 1) {
      const nextItem = itemsInCategory[currentIndex + 1];
      const currentOrder = item.sortOrder || item.createdAt || Date.now();
      let nextOrder = nextItem.sortOrder || nextItem.createdAt || (Date.now() + 1000);
      if (currentOrder === nextOrder) nextOrder += 1;
      await updateDoc(doc(db, 'menus', item.id), { sortOrder: nextOrder });
      await updateDoc(doc(db, 'menus', nextItem.id), { sortOrder: currentOrder });
    }
  };

  const handleAddTopping = async () => {
    if (!newTopping.name || !newTopping.price) return showAlert('กรุณากรอกข้อมูลท็อปปิ้งให้ครบถ้วนครับ');
    try { await addDoc(collection(db, 'toppings'), { name: newTopping.name, price: Number(newTopping.price) }); showAlert('เพิ่มท็อปปิ้งสำเร็จ!'); setNewTopping({ name: '', price: '' }); setShowAddToppingForm(false); } catch (e) { showAlert(e.message); }
  };

  const handleDeleteTopping = (id) => { 
      showConfirm('ลบท็อปปิ้งนี้ใช่หรือไม่?', async () => {
          await deleteDoc(doc(db, 'toppings', id));
      });
  };

  const handleAddSauce = async () => {
    if (!newSauce.name) return showAlert('กรุณากรอกชื่อซอสราดครับ');
    try { 
      await addDoc(collection(db, 'sauces'), { name: newSauce.name.trim(), price: Number(newSauce.price || 0) }); 
      showAlert('เพิ่มซอสราดแต่งหน้าสำเร็จ! ✨'); 
      setNewSauce({ name: '', price: 0 }); 
      setShowAddSauceForm(false); 
    } catch (e) { showAlert(e.message); }
  };

  const handleDeleteSauce = (id) => { 
      showConfirm('ลบซอสราดนี้ใช่หรือไม่?', async () => {
          try {
            await deleteDoc(doc(db, 'sauces', id));
            showAlert('ลบซอสราดเรียบร้อยค่ะ');
          } catch (e) {
            showAlert('เกิดข้อผิดพลาด: ' + e.message);
          }
      });
  };

  const handleSeedDefaultSauces = async () => {
    try {
      setIsLoading(true);
      for (const sauce of DEFAULT_SAUCES) {
        await addDoc(collection(db, 'sauces'), { name: sauce.name, price: sauce.price });
      }
      showAlert('นำเข้าซอสเริ่มต้นเข้าสู่ระบบเรียบร้อยแล้วค่ะ! ✨');
    } catch (e) {
      showAlert('เกิดข้อผิดพลาดในการนำเข้าซอส: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = async (term) => {
    if (!term.trim()) return;
    const cleanTerm = term.trim().toLowerCase();
    setSearchHistory(prev => [cleanTerm, ...prev.filter(t => t !== cleanTerm)].slice(0, 5));
    setIsSearchFocused(false); setSearchQuery(term);
    try { await setDoc(doc(db, 'settings', 'search_stats'), { [cleanTerm]: increment(1) }, { merge: true }); } catch (e) { console.error("Error saving search stats", e); }
  };

  // [MODIFIED] อัปเดตการยอมรับออร์เดอร์พร้อมซิงค์ Google Sheets
  const handleAcceptOrder = async (order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'cooking' });
      
      sendOrderToGoogleSheets({
        ...order,
        orderId: order.id,
        status: 'cooking'
      });

      showAlert(`รับออร์เดอร์ของ ${order.lineName} แล้ว! 👩‍🍳`);
    } catch (e) { showAlert("เกิดข้อผิดพลาด: " + e.message); }
  };

  // [MODIFIED] อัปเดตการจัดส่งเรียบร้อยพร้อมซิงค์ Google Sheets
  const handleConfirmDelivery = async () => {
    if (deliveryLocation !== 'pickup' && !deliveryImage) return showAlert('กรุณาแนบรูปภาพการจัดส่งครับ 📸');
    setIsDelivering(true);
    try {
      let deliveryMessage = '';
      if (deliveryLocation === 'pickup') deliveryMessage = 'ลูกค้ารับสินค้าที่หน้าร้านเรียบร้อยแล้ว ขอบคุณที่อุดหนุนนะคะ 💖';
      else if (deliveryLocation === 'room') deliveryMessage = 'จัดส่งถึงหน้าห้องเรียบร้อยแล้ว ขอบคุณที่สั่งออเดอร์นะคะ 💖';
      else deliveryMessage = 'ขออภัยแอดมินไม่สามารถเข้าตึกได้ รบกวนลูกค้าลงมารับเครื่องดื่มที่หน้าตึกนะคะ 🙏';

      await updateDoc(doc(db, 'orders', deliveryModal.id), { 
         status: 'completed', deliveryLocation, deliveryMessage, hasDeliveryImage: deliveryLocation !== 'pickup' 
      });

      if (deliveryLocation !== 'pickup' && deliveryImage) {
         await setDoc(doc(db, 'slips', deliveryModal.id), {
            deliveryImage: deliveryImage
         }, { merge: true });
      }

      sendOrderToGoogleSheets({
        ...deliveryModal,
        orderId: deliveryModal.id,
        status: 'completed',
        deliveryLocation: deliveryLocation
      });

      const locationText = deliveryLocation === 'room' ? 'หน้าห้อง' : (deliveryLocation === 'building' ? 'หน้าตึก' : 'รับเองที่หน้าร้าน');
      const deliverySummaryText = `🛵 อัปเดตสถานะจัดส่ง!\nบิล #${deliveryModal.id.slice(0,6)}\nลูกค้า: คุณ ${deliveryModal.lineName}\n\n${deliveryMessage}\n📍 จุดส่ง: ${locationText}\n\n📄 เช็คสถานะ: https://liff.line.me/${LIFF_ID}?action=viewOrders&orderId=${deliveryModal.id}`;

      setDeliveryModal(null); 
      setAdminDeliverySuccessData({ text: deliverySummaryText, orderId: deliveryModal.id });
      
    } catch (e) { showAlert("เกิดข้อผิดพลาด: " + e.message); }
    setIsDelivering(false);
  };

  const getRecentVisits = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA'); 
      const thaiDateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      const count = visitStats[dateStr] || 0;
      list.push({ dateStr, thaiDateStr, count });
    }
    return list;
  };

  const recentVisits = getRecentVisits();
  const maxVisitCount = Math.max(...recentVisits.map(v => v.count), 1);

  const calculateRevenue = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    let daily = 0, monthly = 0, yearly = 0;
    
    const last7DaysMap = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        last7DaysMap[d.toLocaleDateString('th-TH')] = 0;
    }

    orders.filter(o => o.status === 'completed' && !o.isDeleted).forEach(o => {
      if (o.timestamp >= startOfDay) daily += o.total;
      if (o.timestamp >= startOfMonth) monthly += o.total;
      if (o.timestamp >= startOfYear) yearly += o.total;
      const oDate = new Date(o.timestamp).toLocaleDateString('th-TH');
      if(last7DaysMap[oDate] !== undefined) last7DaysMap[oDate] += o.total;
    });
    
    const dailyHistory = Object.keys(last7DaysMap).map(date => ({ date, total: last7DaysMap[date] }));
    return { daily, monthly, yearly, dailyHistory };
  };

  const getStorageEstimation = () => {
     const orderImagesCount = orders.filter(o => o.hasSlip || o.hasDeliveryImage).length;
     const menuImagesCount = menuItems.filter(m => m.image && m.image.length > 100).length;
     
     const estStorageUsageKB = (orderImagesCount * 100) + (menuImagesCount * 80);
     const maxStorageKB = 5 * 1024 * 1024; 
     const storagePercent = Math.min((estStorageUsageKB / maxStorageKB) * 100, 100);
     const usageMB = (estStorageUsageKB / 1024).toFixed(2);
     
     return { usageMB, storagePercent };
  };

  const exportToCSV = () => {
    const completedOrders = orders.filter(o => o.status === 'completed' && !o.isDeleted);
    if (completedOrders.length === 0) return showAlert('ยังไม่มีข้อมูลคำสั่งซื้อที่เสร็จสมบูรณ์ครับ');
    let csv = "\uFEFFวันที่และเวลา,ชื่อลูกค้า,ยอดรวม(บาท),ช่องทางชำระเงิน,จุดจัดส่ง,ที่อยู่\n"; 
    completedOrders.forEach(o => {
      const date = new Date(o.timestamp).toLocaleString('th-TH');
      const payment = o.paymentMethod === 'cash' ? 'เงินสด' : (o.paymentMethod === 'thaichueithai' ? 'ไทยช่วยไทยพลัส' : 'โอนเงิน');
      const location = o.deliveryLocation === 'room' ? 'หน้าห้อง' : (o.deliveryLocation === 'building' ? 'หน้าตึก' : (o.deliveryLocation === 'pickup' ? 'รับเองที่ร้าน' : '-'));
      csv += `"${date}","${(o.lineName||'').replace(/"/g, '""')}",${o.total},${payment},${location},"${(o.address||'').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `สรุปรายรับ_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportMenuToCSV = () => {
    if (menuItems.length === 0) return showAlert('ยังไม่มีเมนูในระบบครับ');
    let csv = "\uFEFFหมวดหมู่,ชื่อเมนู,ราคาปกติ (เย็น),ราคาปั่น,สถานะ\n";
    const sortedMenus = [...menuItems].sort((a, b) => a.category.localeCompare(b.category));
    sortedMenus.forEach(m => {
      const coldPrice = m.isOnlyBlend ? '-' : m.price;
      const blendPrice = (m.allowBlend === false && !m.isOnlyBlend) ? '-' : (m.price + getAddedBlendPrice(m));
      const status = m.isSoldOut ? 'หมดชั่วคราว' : 'พร้อมขาย';
      csv += `"${m.category}","${(m.name||'').replace(/"/g, '""')}",${coldPrice},${blendPrice},${status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `รายการเมนู_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const updateStoreStatus = async (status) => { try { await setDoc(doc(db, 'settings', 'store'), { isStoreOpen: status }, { merge: true }); showAlert(`เปลี่ยนสถานะเรียบร้อย! 🐮`); } catch(e) { showAlert("Error: " + e.message); } };
  const updateTheme = async (newTheme) => { try { await setDoc(doc(db, 'settings', 'store'), { theme: newTheme }, { merge: true }); showAlert(`เปลี่ยนธีมร้านเป็น ${THEMES[newTheme].name} เรียบร้อย! 🎨`); } catch(e) { showAlert("Error: " + e.message); } };

  const openOptionModal = (item) => {
    if (item.isSoldOut || (item.isOnlyBlend && storeSettings.isBlendOut)) return;
    setOptionModalItem(item);

    const allowed = (item.allowedSweetness && item.allowedSweetness.length > 0) ? item.allowedSweetness : SWEETNESS;
    const defaultSweetness = allowed.includes('100%') ? '100%' : (allowed[0] || '100%');

    setTempOptions({ 
      sweetness: defaultSweetness, isBlended: item.isOnlyBlend ? true : false, addPearl: item.hasFreePearl || false, 
      selectedToppings: [], selectedSauces: [], bean: item.category === 'กาแฟ' ? 'คั่วเข้ม' : null, teaType: item.hasTeaType ? 'มัทฉะ' : null, addShot: false,
      separateIce: false
    });
    if(searchQuery) handleSearchSubmit(searchQuery);
  };

  const getBlendText = (item) => {
    if (isWhipOrCreamCheeseItem(item)) return ''; 
    if (item.isOnlyBlend) return 'ปั่น';
    if (item.allowBlend === false) return 'เย็น/ปกติ';
    return item.isBlended ? 'ปั่น' : 'เย็น';
  };

  const copyPromptPay = () => { navigator.clipboard.writeText(storeSettings.promptPayNo || '0812345678').then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }); };

  const handleDownloadImage = (url, name) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      setDownloadPreview(url);
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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

  const filteredOrders = React.useMemo(() => {
    const activeOrders = orders.filter(o => !o.isDeleted);
    if (!adminSearchQuery) return activeOrders;
    const q = adminSearchQuery.trim().toLowerCase();
    return activeOrders.filter(o => 
      o.id.toLowerCase().includes(q) || 
      (o.lineName || '').toLowerCase().includes(q) || 
      (o.address || '').toLowerCase().includes(q) ||
      (o.paymentMethod || '').toLowerCase().includes(q)
    );
  }, [orders, adminSearchQuery]);

  // [MODIFIED] คำนวณข้อมูลสำหรับ Web Dashboard
  const pendingCount = orders.filter(o => !o.isDeleted && o.status === 'pending').length;
  const cookingCount = orders.filter(o => !o.isDeleted && o.status === 'cooking').length;
  const completedCount = orders.filter(o => !o.isDeleted && o.status === 'completed').length;

  const completedOrdersList = React.useMemo(() => orders.filter(o => o.status === 'completed' && !o.isDeleted), [orders]);
  const promptPayTotal = React.useMemo(() => completedOrdersList.filter(o => o.paymentMethod === 'promptpay').reduce((sum, o) => sum + o.total, 0), [completedOrdersList]);
  const cashTotal = React.useMemo(() => completedOrdersList.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0), [completedOrdersList]);
  const thaiChueiThaiTotal = React.useMemo(() => completedOrdersList.filter(o => o.paymentMethod === 'thaichueithai').reduce((sum, o) => sum + o.total, 0), [completedOrdersList]);
  const grandTotal = calculateRevenue().yearly || 1;

  const peakHoursData = React.useMemo(() => {
    const hoursMap = { '08:00-11:00': 0, '11:00-14:00': 0, '14:00-17:00': 0, '17:00-20:00': 0, '20:00+': 0 };
    completedOrdersList.forEach(o => {
      const h = new Date(o.timestamp).getHours();
      if (h >= 8 && h < 11) hoursMap['08:00-11:00'] += 1;
      else if (h >= 11 && h < 14) hoursMap['11:00-14:00'] += 1;
      else if (h >= 14 && h < 17) hoursMap['14:00-17:00'] += 1;
      else if (h >= 17 && h < 20) hoursMap['17:00-20:00'] += 1;
      else hoursMap['20:00+'] += 1;
    });
    return hoursMap;
  }, [completedOrdersList]);
  const maxPeakCount = Math.max(...Object.values(peakHoursData), 1);

  const topProducts = React.useMemo(() => {
    const map = {};
    completedOrdersList.forEach(o => {
      (o.items || []).forEach(item => {
        if (!map[item.name]) map[item.name] = { qty: 0, revenue: 0 };
        map[item.name].qty += item.qty;
        map[item.name].revenue += (item.price * item.qty);
      });
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [completedOrdersList]);
  const maxTopQty = topProducts[0]?.qty || 1;

  const sliderRef = useRef(null);
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

  const revData = calculateRevenue();
  const storageData = getStorageEstimation();
  const currentThemeData = THEMES[storeSettings.theme] || THEMES.default;
  const cartTotal = cart.reduce((s,i)=>s+(i.price*i.qty),0);

  const mainContainerStyle = {
    backgroundColor: currentThemeData.bg,
    backgroundImage: storeSettings.theme === 'custom' && storeSettings.customBgImage ? `url(${storeSettings.customBgImage})` : 'none',
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col font-sans relative overflow-hidden transition-colors duration-500" style={mainContainerStyle}>
      <audio id="orderNotification" ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2854/2854-preview.mp3" preload="auto"></audio>
      
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
        
        @keyframes borderGlowPulse { 
          0% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0.7); border-color: #f59e0b; }
          50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); border-color: #f59e0b; }
          100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0); border-color: #f59e0b; }
        }
        .order-highlight { animation: borderGlowPulse 2.5s infinite ease-in-out; border-width: 3px !important; }

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
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('shop'); setActiveCategory('🔥 เมนูขายดี'); }}>
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
          <button onClick={() => {
            if (localStorage.getItem('happycow_isAdmin') === 'true') {
              setView('admin');
              setAdminTab('orders'); 
            } else {
              setShowAdminModal(true);
            }
          }} className="p-2 text-gray-400 hover:text-primary transition-colors"><Settings size={18}/></button>
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
                  <button onClick={() => { setSearchQuery(''); setIsSearchFocused(false); setView('shop'); setActiveCategory('🔥 เมนูขายดี'); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 active:scale-90 bg-gray-100 rounded-full p-1"><X size={14}/></button>
                )}
              </div>

              {isSearchFocused && !searchQuery && (searchHistory.length > 0 || popularSearches.length > 0) && (
                <div className="absolute top-[110%] left-5 right-5 bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl border border-gray-100 p-5 z-[50] animate-in fade-in slide-in-from-top-2">
                   {searchHistory.length > 0 && (
                      <div className="mb-5">
                         <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[11px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wider"><Clock size={14}/> ประวัติการค้นหา</h4>
                            <button onClick={() => { setSearchHistory([]); setSearchQuery(''); setIsSearchFocused(false); setView('shop'); setActiveCategory('🔥 เมนูขายดี'); }} className="text-[10px] text-red-400 font-bold bg-red-50 px-2 py-1 rounded-lg">ล้าง</button>
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
            <button onClick={() => { setView('shop'); setActiveCategory('🔥 เมนูขายดี'); }} className="flex items-center gap-2 font-bold text-gray-400 text-sm hover:text-primary transition-colors"><ChevronLeft size={20}/> เลือกเมนูเพิ่ม</button>
            <h2 className="text-3xl font-serif font-bold text-primary">ตะกร้าของคุณ</h2>
            <div className="space-y-4">
               {cart.map(i => (
                 <div key={i.cartId} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                   <div className="flex-1 font-bold text-sm text-primary">
                     {i.qty}x {i.name} <br/>
                     <span className="text-gray-400 text-[10px] uppercase">
                       ({getBlendText(i)}{isWhipOrCreamCheeseItem(i) ? '' : ` • หวาน ${i.sweetness}`}{i.bean ? ` • ${i.bean}` : ''}{i.teaType ? ` • ${i.teaType}` : ''}{i.addShot ? ' • เพิ่มช็อต' : ''}{i.separateIce ? ' • แยกน้ำแข็ง (+฿5)' : ''}{i.hasFreePearl ? (i.addPearl ? ' • มุกฟรี' : ' • ไม่รับมุกฟรี') : ''})
                       {i.selectedSauces?.length > 0 && ` • ราดซอส: ${i.selectedSauces.map(s => typeof s === 'object' ? s.name : s).join(', ')}`}
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
                             const comp = await compressImage(file);
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
                    onClick={async (e) => {
                      e.preventDefault();
                      if (isProcessingOrder.current) return; 
                      if (!address) return showAlert("กรุณากรอกที่อยู่จัดส่งครับ");
                      if (paymentMethod === 'promptpay' && !slipImage) return showAlert("กรุณาแนบสลิปการโอนเงินครับ");
                      
                      isProcessingOrder.current = true; 
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
                          hasDeliveryImage: false,
                          isDeleted: false
                        });

                        if (paymentMethod === 'promptpay' && slipImage) {
                          await setDoc(doc(db, 'slips', orderRef.id), {
                            slipImage: slipImage
                          }, { merge: true });
                        }

                        // [MODIFIED] ซิงค์ออร์เดอร์ใหม่ลง Google Sheets ทันที
                        sendOrderToGoogleSheets({
                          orderId: orderRef.id,
                          timestamp: orderTime,
                          lineName: lineProfile.displayName || "ลูกค้าทั่วไป",
                          items: cart,
                          total,
                          paymentMethod,
                          status: 'pending',
                          address,
                          note
                        });

                        const orderLink = `https://liff.line.me/${LIFF_ID}?action=viewOrders&orderId=${orderRef.id}`;
                        
                        const orderSummaryText = `วัวนมอารมณ์ดี 🐮\nบิลเลขที่: #${orderRef.id.slice(0, 6)}\nวัน/เวลา: ${dateStr}\nลูกค้า: คุณ ${lineProfile.displayName || "ลูกค้าทั่วไป"}\n` + 
                          cart.map(i => {
                            const blendText = getBlendText(i);
                            const beanText = i.bean ? ` • เมล็ด: ${i.bean}` : '';
                            const teaText = i.teaType ? ` • รสชา: ${i.teaType}` : '';
                            const shotText = i.addShot ? ` • เพิ่มช็อตกาแฟ` : '';
                            const iceText = i.separateIce ? ` • แยกน้ำแข็ง (+฿5)` : '';
                            const saucesText = i.selectedSauces?.length > 0 ? ` • ราดซอส: ${i.selectedSauces.map(s => typeof s === 'object' ? s.name : s).join(', ')}` : '';
                            const toppingsText = i.selectedToppings?.length > 0 ? ` • เพิ่มท็อปปิ้ง: ${i.selectedToppings.map(t => t.name).join(', ')}` : '';
                            const pearlText = i.hasFreePearl ? (i.addPearl ? ' • รับไข่มุกฟรี' : ' • ไม่รับไข่มุกฟรี') : '';
                            const sweetText = isWhipOrCreamCheeseItem(i) ? '' : ` • หวาน ${i.sweetness}`;
                            return `- ${i.qty}x ${i.name} (${blendText}${sweetText}${beanText}${teaText}${shotText}${iceText}${pearlText}${saucesText}${toppingsText})`;
                          }).join('\n') + 
                          `\n\nยอดรวม: ฿${total}\nที่อยู่: ${address}\nช่องทางชำระเงิน: ${paymentMethod === 'cash' ? 'ชำระเงินสด' : (paymentMethod === 'thaichueithai' ? 'ไทยช่วยไทยพลัส' : 'โอนพร้อมเพย์')}\nหมายเหตุ: ${note || '-'}\n\n📄 สั่งน้ำกดลิ้งค์ได้เลย: ${orderLink}`;

                        let liffSuccess = false;
                        if (window.liff && window.liff.isLoggedIn() && window.liff.isInClient()) {
                           try {
                             await window.liff.sendMessages([{
                               type: "text",
                               text: orderSummaryText
                             }]);
                             liffSuccess = true;
                           } catch (err) {
                             console.log("LIFF sendMessages Error:", err);
                           }
                        }

                        setCart([]); setSlipImage(''); setSlipStatus('idle'); setAddress(''); setNote(''); setAcceptedTerms(false);

                        setSuccessModalData({
                           orderId: orderRef.id,
                           text: orderSummaryText,
                           autoSent: liffSuccess
                        });
                      } catch (err) {
                        showAlert("เกิดข้อผิดพลาดในการบันทึก: " + (err.message || err));
                      } finally {
                        isProcessingOrder.current = false; 
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
             <button onClick={() => { setView('shop'); setActiveCategory('🔥 เมนูขายดี'); }} className="flex items-center gap-2 font-bold text-gray-400 text-sm hover:text-primary"><ChevronLeft size={20}/> กลับไปหน้าร้าน</button>
             <h2 className="text-3xl font-serif font-bold text-primary">ประวัติการสั่งซื้อ</h2>
             
             {isLoadingOrders ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 animate-in fade-in">
                   <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-accent font-bold text-sm text-center">กำลังเปิดประวัติการสั่งซื้อ<br/>รอระบบสักครู่นะคะ 🐮...</p>
                </div>
             ) : (
                 <div className="space-y-6">
                   {orders.filter(o => o.userId === lineProfile.userId && !o.isDeleted).map(o => {
                     const dateStr = new Date(o.timestamp).toLocaleString('th-TH');
                     return (
                       <div key={o.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm border transition-all duration-500 ${selectedOrderId === o.id ? 'order-highlight bg-amber-50/20' : 'border-gray-100'}`}>
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
                                {item.qty}x {item.name} ({getBlendText(item)}{isWhipOrCreamCheeseItem(item) ? '' : ` • หวาน ${item.sweetness}`}{item.bean ? ` • ${item.bean}` : ''}{item.teaType ? ` • ${item.teaType}` : ''}{item.addShot ? ' • เพิ่มช็อต' : ''}{item.separateIce ? ' • แยกน้ำแข็ง' : ''})
                                {item.selectedSauces?.length > 0 && ` + ราดซอส: ${item.selectedSauces.map(s => typeof s === 'object' ? s.name : s).join(', ')}`}
                                {item.selectedToppings?.length > 0 && ` + ${item.selectedToppings.map(t=>t.name).join(', ')}`}
                              </p>
                          ))}</div>

                          {o.status === 'completed' && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              {o.deliveryMessage && (
                                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 mb-3">
                                  <p className="text-[10px] font-bold text-accent mb-1 flex items-center gap-1"><MessageSquare size={12}/> ข้อความจากทางร้าน:</p>
                                  <p className="text-[11px] text-gray-600 font-bold">{o.deliveryMessage}</p>
                                </div>
                              )}
                              {o.hasDeliveryImage && (
                                <button 
                                  onClick={() => viewImage(o.id, 'delivery')} 
                                  disabled={loadingSlipId === o.id}
                                  className="w-full bg-primary text-white py-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                                >
                                   {loadingSlipId === o.id ? (
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                   ) : <Camera size={16}/>}
                                   ดูรูปถ่ายตอนจัดส่งสินค้า
                                </button>
                              )}
                            </div>
                          )}
                       </div>
                   )})}
                   {orders.filter(o => o.userId === lineProfile.userId && !o.isDeleted).length === 0 && (
                      <div className="py-20 text-center text-gray-400 font-bold opacity-50">คุณยังไม่เคยสั่งซื้อสินค้าเลยครับ 🐮</div>
                   )}
                 </div>
             )}
          </div>
        )}

        {/* --- Admin View --- */}
        {view === 'admin' && (
          <div className="p-6 bg-white min-h-screen animate-in fade-in relative z-20">
            <button onClick={() => { setView('shop'); setActiveCategory('🔥 เมนูขายดี'); }} className="flex items-center gap-2 font-bold text-gray-400 text-sm mb-6 hover:text-primary"><ChevronLeft size={20}/> กลับหน้าร้าน</button>
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-serif font-bold text-primary">ระบบแอดมินร้าน</h2>
               <button onClick={playNotificationSound} className="text-[10px] bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 shadow-sm border border-blue-100"><BellRing size={12}/> เทสเสียงเตือนบิล</button>
            </div>
            
            <div className="flex gap-1 bg-gray-50 p-1 rounded-2xl mb-6 shadow-inner border border-gray-100">
              {['orders', 'menus', 'dashboard', 'settings'].map(t => (
                <button key={t} onClick={() => setAdminTab(t)} className={`flex-1 py-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${adminTab === t ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-primary uppercase hover:bg-gray-200'}`}>
                  {t === 'orders' ? 'ออร์เดอร์' : t === 'menus' ? 'เมนู' : t === 'dashboard' ? 'แดชบอร์ด' : 'ตั้งค่า'}
                </button>
              ))}
            </div>

            {/* [MODIFIED] TAB: แดชบอร์ดวิเคราะห์และจัดการข้อมูลในเว็บ */}
            {adminTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in">
                
                {/* 🌟 1. Google Sheets Live Sync Control Bar */}
                <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 rounded-[2.5rem] shadow-lg flex flex-col sm:flex-row justify-between items-center gap-3 border border-emerald-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                      <Database size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs flex items-center gap-1.5">
                        Google Sheets Real-time Sync
                        <span className={`w-2 h-2 rounded-full ${storeSettings.googleSheetUrl ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                      </h4>
                      <p className="text-[10px] text-emerald-200/80 font-medium">
                        {storeSettings.googleSheetUrl ? 'เชื่อมต่อระบบคลาวด์สำเร็จ (พร้อมซิงค์ข้อมูล)' : 'ยังไม่ได้ใส่ URL Google Sheets ในหน้าตั้งค่า'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={syncAllToGoogleSheets} 
                      disabled={isSyncingAll}
                      className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSyncingAll ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Sparkles size={14}/>}
                      {isSyncingAll ? 'กำลังซิงค์...' : 'ซิงค์ประวัติทั้งหมด'}
                    </button>
                  </div>
                </div>

                {/* 🌟 2. สถานะออร์เดอร์ Real-time (Order Status Cards) */}
                <div>
                  <h3 className="font-bold text-sm text-primary mb-3 flex items-center gap-2">
                    <BellRing size={16} className="text-orange-500"/> สถานะคิวออร์เดอร์ปัจจุบัน
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div 
                      onClick={() => setAdminTab('orders')}
                      className="bg-orange-50 border-2 border-orange-200 p-4 rounded-[2rem] text-center cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md"
                    >
                      <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">รอยืนยัน 🟠</p>
                      <h2 className="text-3xl font-bold text-orange-600">{pendingCount}</h2>
                      <p className="text-[8px] text-orange-400 font-bold mt-1">ออร์เดอร์ใหม่</p>
                    </div>

                    <div 
                      onClick={() => setAdminTab('orders')}
                      className="bg-blue-50 border-2 border-blue-200 p-4 rounded-[2rem] text-center cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md"
                    >
                      <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">กำลังปรุง 👩‍🍳</p>
                      <h2 className="text-3xl font-bold text-blue-600">{cookingCount}</h2>
                      <p className="text-[8px] text-blue-400 font-bold mt-1">กำลังทำเครื่องดื่ม</p>
                    </div>

                    <div 
                      onClick={() => setAdminTab('orders')}
                      className="bg-green-50 border-2 border-green-200 p-4 rounded-[2rem] text-center cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md"
                    >
                      <p className="text-[10px] font-bold text-green-600 uppercase mb-1">สำเร็จแล้ว 🟢</p>
                      <h2 className="text-3xl font-bold text-green-600">{completedCount}</h2>
                      <p className="text-[8px] text-green-400 font-bold mt-1">จัดส่งเสร็จสิ้น</p>
                    </div>
                  </div>
                </div>

                {/* 🌟 3. การ์ดสรุปยอดขาย (Sales Summary Header) */}
                <div className="bg-primary text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10"><TrendingUp size={120}/></div>
                  <div className="flex justify-between items-center mb-2 opacity-80 relative z-10">
                    <span className="font-bold text-xs flex items-center gap-1"><TrendingUp size={16}/> ยอดขายวันนี้</span>
                    <span className="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-bold">{new Date().toLocaleDateString('th-TH')}</span>
                  </div>
                  <h1 className="text-5xl font-serif font-bold relative z-10 my-2">฿{revData.daily.toLocaleString()}</h1>
                  <div className="flex gap-4 mt-4 pt-4 border-t border-white/10 text-xs relative z-10">
                    <div>
                      <span className="opacity-70 text-[10px] block">เดือนนี้</span>
                      <span className="font-bold text-base">฿{revData.monthly.toLocaleString()}</span>
                    </div>
                    <div className="border-l border-white/20 pl-4">
                      <span className="opacity-70 text-[10px] block">ปีนี้</span>
                      <span className="font-bold text-base">฿{revData.yearly.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 🌟 4. จำแนกช่องทางชำระเงิน (Payment Method Breakdown) */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                    <Banknote size={16} className="text-emerald-600"/> สัดส่วนช่องทางชำระเงิน
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-gray-600 flex items-center gap-1"><CreditCard size={12}/> โอนพร้อมเพย์</span>
                        <span className="text-primary">฿{promptPayTotal.toLocaleString()} ({Math.round((promptPayTotal/grandTotal)*100 || 0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((promptPayTotal/grandTotal)*100, 100)}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-gray-600 flex items-center gap-1"><Banknote size={12}/> เงินสด</span>
                        <span className="text-primary">฿{cashTotal.toLocaleString()} ({Math.round((cashTotal/grandTotal)*100 || 0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((cashTotal/grandTotal)*100, 100)}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-gray-600 flex items-center gap-1"><Sparkles size={12} className="text-orange-500"/> ไทยช่วยไทยพลัส</span>
                        <span className="text-primary">฿{thaiChueiThaiTotal.toLocaleString()} ({Math.round((thaiChueiThaiTotal/grandTotal)*100 || 0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((thaiChueiThaiTotal/grandTotal)*100, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🌟 5. สินค้าขายดี 5 อันดับแรก (Top 5 Best Sellers Leaderboard) */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-sm text-primary mb-4 flex items-center gap-2">
                    <Star size={16} className="text-amber-500" fill="currentColor"/> 5 อันดับเมนูขายดีที่สุด
                  </h3>
                  
                  {topProducts.length > 0 ? (
                    <div className="space-y-3.5">
                      {topProducts.map((p, idx) => (
                        <div key={p.name} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700 flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {idx + 1}
                              </span>
                              {p.name}
                            </span>
                            <span className="font-bold text-primary">{p.qty} แก้ว <span className="text-gray-400 font-normal">(฿{p.revenue.toLocaleString()})</span></span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-amber-500' : 'bg-accent'}`} 
                              style={{ width: `${(p.qty / maxTopQty) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-gray-400 py-6 font-bold">ยังไม่มีข้อมูลยอดขายเมนู</p>
                  )}
                </div>

                {/* 🌟 6. ช่วงเวลาขายดี (Peak Hours Analytics Bar Chart) */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-sm text-primary mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-indigo-500"/> ช่วงเวลาที่มีการสั่งซื้อเยอะที่สุด (Peak Hours)
                  </h3>
                  
                  <div className="flex items-end gap-2 h-32 pt-4 px-2">
                    {Object.entries(peakHoursData).map(([slot, count]) => {
                      const heightPercent = (count / maxPeakCount) * 100;
                      return (
                        <div key={slot} className="flex-1 flex flex-col items-center h-full justify-end gap-1 group">
                          <span className="text-[9px] font-bold text-primary opacity-80">{count} บิล</span>
                          <div className="w-full bg-indigo-50 rounded-t-xl overflow-hidden flex items-end h-20">
                            <div 
                              className="w-full bg-indigo-500 rounded-t-xl transition-all duration-700 group-hover:bg-indigo-600" 
                              style={{ height: `${Math.max(heightPercent, 8)}%` }}
                            ></div>
                          </div>
                          <span className="text-[8px] font-bold text-gray-400 tracking-tighter truncate w-full text-center">{slot}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 🌟 7. ผู้ใช้ออนไลน์ (Real-time Active Users) */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-green-100 shadow-sm">
                   <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
                     <h3 className="font-bold text-sm text-green-600 flex items-center gap-2">
                       <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                       ผู้ใช้ออนไลน์ขณะนี้ (Real-time)
                     </h3>
                     <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">{activeUsers.length} คน</span>
                   </div>

                   {activeUsers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {activeUsers.map(u => (
                           <div key={u.id} className="bg-green-50 text-green-700 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-green-200 flex items-center gap-1.5 shadow-sm">
                             <UserCheck size={12}/> {u.displayName}
                           </div>
                        ))}
                      </div>
                   ) : (
                      <p className="text-center text-xs text-gray-400 font-bold py-4">ยังไม่มีลูกค้าออนไลน์ในขณะนี้</p>
                   )}
                </div>

                {/* 📊 สถิติผู้เข้าชม 7 วัน */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                   <h3 className="font-bold text-sm text-primary mb-4 flex items-center gap-2"><Users size={16}/> 📊 สถิติผู้เข้าชมเว็บย้อนหลัง 7 วัน</h3>
                   <div className="space-y-3.5">
                      {recentVisits.map((v, index) => {
                         const percent = (v.count / maxVisitCount) * 100;
                         const isToday = index === 6;
                         return (
                            <div key={v.dateStr} className="space-y-1">
                               <div className="flex justify-between items-center text-xs">
                                  <span className={`font-bold ${isToday ? 'text-accent' : 'text-gray-500'}`}>{v.thaiDateStr} {isToday && '(วันนี้)'}</span>
                                  <span className="font-bold text-primary">{v.count} คน</span>
                               </div>
                               <div className="w-full bg-gray-50 rounded-full h-2.5 overflow-hidden border border-gray-100/50">
                                  <div className={`h-full rounded-full transition-all duration-1000 ${isToday ? 'bg-accent' : 'bg-primary/70'}`} style={{ width: `${percent}%` }}></div>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>

                {/* Storage Graph */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                   <div className="flex justify-between items-center mb-2">
                     <h3 className="font-bold text-sm text-primary flex items-center gap-2"><Database size={16}/> พื้นที่เก็บรูปภาพ (Storage)</h3>
                     <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full border">ประมาณการ</span>
                   </div>
                   <p className="text-xs font-bold text-gray-500 mb-3">ใช้ไปประมาณ <span className="text-accent">{storageData.usageMB} MB</span> / 5,000 MB</p>
                   <div className="w-full bg-gray-100 rounded-full h-3 mb-1 overflow-hidden shadow-inner">
                     <div className={`h-3 rounded-full transition-all duration-1000 ${storageData.storagePercent > 80 ? 'bg-red-500' : storageData.storagePercent > 50 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.max(storageData.storagePercent, 1)}%` }}></div>
                   </div>
                </div>

                {/* สรุปรายรับรายวัน */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                   <h3 className="font-bold text-sm text-primary mb-4 border-b border-gray-50 pb-3 flex items-center gap-2"><Clock size={16}/> สรุปรายรับรายวัน (7 วันล่าสุด)</h3>
                   <div className="space-y-3">
                      {revData.dailyHistory.map((d, idx) => (
                         <div key={idx} className="flex justify-between items-center text-sm">
                            <span className={idx === 0 ? "font-bold text-accent" : "text-gray-500 font-bold"}>{idx === 0 ? `วันนี้ (${d.date})` : d.date}</span>
                            <span className={`font-bold ${idx === 0 ? "text-accent" : "text-primary"}`}>฿{d.total.toLocaleString()}</span>
                         </div>
                      ))}
                   </div>
                </div>

                {/* ปุ่มล้างออร์เดอร์ที่ซ่อนไว้ */}
                <div className="bg-red-50 p-6 rounded-[2.5rem] border-2 border-dashed border-red-200 space-y-3">
                   <h3 className="font-bold text-sm text-red-700 flex items-center gap-2"><Trash2 size={16}/> ล้างข้อมูลยอดขายถาวร</h3>
                   <p className="text-[10px] text-gray-500 leading-relaxed font-semibold">เมื่อแอดมินสั่งลบออเดอร์ในหน้ารายการ ระบบจะทำการ "ซ่อน" เอาไว้เพื่อไม่ให้กระทบยอดรวมของ Dashboard หากต้องการล้างประวัติออเดอร์ที่ถูกซ่อนไว้ทิ้งอย่างถาวร ให้กดปุ่มด้านล่างนี้ได้เลยค่ะ</p>
                   <button 
                      onClick={() => {
                         showConfirm("คุณต้องการลบข้อมูลออเดอร์ที่ถูกซ่อนไว้ทั้งหมดออกจากคลาวด์ถาวรใช่หรือไม่?", async () => {
                            setIsLoading(true);
                            try {
                               const hiddenOrders = orders.filter(o => o.isDeleted);
                               const promises = hiddenOrders.map(o => deleteDoc(doc(db, 'orders', o.id)));
                               await Promise.all(promises);
                               showAlert("ทำความสะอาดระบบและลบออเดอร์ที่ซ่อนถาวรเรียบร้อยค่ะ! ✨🐮");
                            } catch (e) {
                               showAlert("เกิดข้อผิดพลาดในการลบ: " + e.message);
                            } finally {
                               setIsLoading(false);
                            }
                         });
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                      <Trash2 size={14}/> ล้างข้อมูลออเดอร์ที่ถูกซ่อนทั้งหมดถาวร
                   </button>
                </div>

                <div className="flex gap-2">
                  <button onClick={exportToCSV} className="flex-1 bg-[#0F9D58] text-white py-5 rounded-[2rem] font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Download size={16} /> Export รายรับ (CSV)
                  </button>
                  <button onClick={exportMenuToCSV} className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Download size={16} /> Export เมนู (CSV)
                  </button>
                </div>
              </div>
            )}

            {/* TAB: ตรวจสอบออร์เดอร์ของแอดมิน */}
            {adminTab === 'orders' && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-2 rounded-2xl border border-gray-100 relative mb-4">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input type="text" value={adminSearchQuery} onChange={e => setAdminSearchQuery(e.target.value)} placeholder="ค้นหารหัสบิล, ชื่อ หรือที่อยู่ลูกค้า..." className="w-full pl-10 pr-10 py-3 rounded-xl text-xs outline-none bg-white font-bold text-gray-600"/>
                   {adminSearchQuery && <button onClick={() => setAdminSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-100 p-1 rounded-full"><X size={12}/></button>}
                </div>

                {filteredOrders.map((o, idx) => {
                    const dateStr = new Date(o.timestamp).toLocaleString('th-TH');
                    return (
                    <div key={o.id} className={`border p-5 rounded-3xl shadow-sm bg-white animate-in fade-in transition-all duration-500 ${selectedOrderId === o.id ? 'order-highlight bg-amber-50/20' : o.status === 'pending' ? 'border-orange-300 bg-orange-50/30' : 'border-gray-100'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                           <span className="bg-primary text-white w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold">#{filteredOrders.length - idx}</span>
                           <div>
                              <span className="font-bold text-sm text-primary">{o.lineName}</span>
                              <p className="text-[9px] text-gray-400 font-bold"><Clock size={10} className="inline mr-1"/>{dateStr}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <span className="text-orange-600 font-bold block">฿{o.total}</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                            {o.paymentMethod === 'cash' ? '💵 จ่ายสด' : (o.paymentMethod === 'thaichueithai' ? '🇹🇭 ไทยช่วยไทยพลัส' : '📱 โอนเงิน')}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 mb-3 flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100"><MapPin size={12} className="flex-shrink-0 text-accent"/> {o.address}</div>
                      
                      <div className="space-y-1 border-t border-gray-100 pt-3 mb-3">{(o.items || []).map((i, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex justify-between font-medium">
                            <span>{i.qty}x {i.name} ({getBlendText(i)}{isWhipOrCreamCheeseItem(i) ? '' : ` • หวาน ${i.sweetness}`}{i.bean ? ` • ${i.bean}` : ''}{i.teaType ? ` • ${i.teaType}` : ''}{i.addShot ? ' • เพิ่มช็อต' : ''}{i.separateIce ? ' • แยกน้ำแข็ง' : ''}{i.hasFreePearl && i.addPearl ? ' +มุกฟรี':''}{i.selectedSauces?.length > 0 ? ` + ราดซอส:${i.selectedSauces.map(s=>typeof s==='object'?s.name:s).join(',')}` : ''}{i.selectedToppings?.length > 0 ? ` + ${i.selectedToppings.map(t=>t.name).join(',')}` : ''})</span>
                            <span className="font-bold">฿{i.price * i.qty}</span>
                          </div>
                      ))}</div>

                      {(o.hasSlip || o.hasDeliveryImage) && (
                        <div className="flex flex-wrap gap-3 mb-3">
                          {o.hasSlip && (
                            <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100 flex-1 min-w-[120px] max-w-[180px] text-center">
                              <p className="text-[9px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">📄 สลิปโอนเงิน:</p>
                              <button 
                                onClick={() => viewImage(o.id, 'slip')}
                                disabled={loadingSlipId === o.id}
                                className="w-full bg-white hover:bg-gray-100 transition-colors py-3 rounded-xl border text-[10px] font-bold text-blue-600 flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                {loadingSlipId === o.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : <Eye size={12}/>}
                                ตรวจสอบสลิป
                              </button>
                            </div>
                          )}
                          {o.hasDeliveryImage && (
                            <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100 flex-1 min-w-[120px] max-w-[180px] text-center">
                              <p className="text-[9px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">🛵 รูปส่งสินค้า:</p>
                              <button 
                                onClick={() => viewImage(o.id, 'delivery')}
                                disabled={loadingSlipId === o.id}
                                className="w-full bg-white hover:bg-gray-100 transition-colors py-3 rounded-xl border text-[10px] font-bold text-green-600 flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                {loadingSlipId === o.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : <Camera size={12}/>}
                                ดูรูปจัดส่ง
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 mb-2 mt-4">
                        {o.hasSlip && <button onClick={() => viewImage(o.id, 'slip')} className="bg-blue-50 text-blue-600 py-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all border border-blue-100"><Eye size={14}/> ตรวจสลิป</button>}
                        
                        <button 
                          type="button" 
                          onClick={() => {
                             showConfirm("ซ่อนออร์เดอร์นี้ใช่หรือไม่?", async () => {
                                try {
                                   await updateDoc(doc(db, 'orders', o.id), { isDeleted: true });
                                } catch (e) {
                                   showAlert("เกิดข้อผิดพลาด: " + e.message);
                                }
                             });
                          }} 
                          className="bg-red-50 text-red-500 py-3 rounded-xl flex items-center justify-center active:scale-95 transition-all border border-red-100"
                        >
                           <Trash2 size={16}/>
                        </button>
                      </div>

                      <div className="flex gap-2 border-t border-gray-100 pt-3 mt-2">
                        {o.status === 'pending' && <button onClick={() => handleAcceptOrder(o)} className="flex-1 bg-orange-400 text-white py-4 rounded-xl text-[11px] font-bold shadow-lg animate-pulse active:scale-95 transition-all">กดยอมรับออเดอร์</button>}
                        
                        {o.status === 'cooking' && (
                          <button onClick={() => { setDeliveryModal(o); setDeliveryImage(''); setDeliveryLocation('room'); }} className="flex-1 bg-green-500 text-white py-4 rounded-xl text-[11px] font-bold shadow-md flex items-center justify-center gap-1 active:scale-95 transition-all">
                             <Check size={14}/> จัดส่ง/ลูกค้ารับแล้ว
                          </button>
                        )}
                        
                        {o.status === 'completed' && <div className="flex-1 text-center text-[10px] font-bold text-green-600 py-2 border border-green-200 rounded-xl bg-green-50">สำเร็จเรียบร้อย</div>}
                      </div>
                    </div>
                )})}
                {filteredOrders.length === 0 && <div className="py-20 text-center text-gray-400 font-bold opacity-50">ไม่พบข้อมูลออร์เดอร์ 🐮</div>}
              </div>
            )}

            {/* TAB: ระบบจัดการคลังเมนูของร้าน */}
            {adminTab === 'menus' && (
              <div className="space-y-8 animate-in fade-in">
                
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center">
                  <div className="bg-blue-50 p-4 rounded-full text-blue-500 mb-3 border border-blue-100">
                     <ClipboardList size={28} />
                  </div>
                  <h3 className="font-bold text-sm text-primary mb-1">ส่งออกรายการเมนู (Excel/CSV)</h3>
                  <p className="text-[10px] text-gray-500 mb-5 leading-relaxed">
                     ดาวน์โหลดรายชื่อเครื่องดื่ม ราคา และสถานะทั้งหมด ออกเป็นไฟล์ตาราง
                  </p>
                  <button onClick={exportMenuToCSV} className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-blue-600">
                     <Download size={18} /> โหลดรายการเมนูลงเครื่อง
                  </button>
                </div>

                <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100 relative">
                   <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input type="text" value={adminSearchQuery} onChange={e => setAdminSearchQuery(e.target.value)} placeholder="ค้นหาชื่อเมนู เพื่อแก้ไข..." className="w-full pl-12 pr-10 py-4 rounded-2xl text-sm outline-none bg-white focus:ring-2 focus:ring-[var(--theme-accent)] transition-all font-bold"/>
                   {adminSearchQuery && <button onClick={() => setAdminSearchQuery('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-100 p-1.5 rounded-full hover:bg-gray-200"><X size={14}/></button>}
                </div>

                <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 shadow-inner relative">
                  {!showAddMenuForm ? (
                     <button onClick={() => setShowAddMenuForm(true)} className="w-full py-2 text-accent font-bold flex items-center justify-center gap-2 hover:bg-gray-100 rounded-2xl transition-all">
                        <Plus size={18}/> คลิกเพื่อเพิ่มเมนูใหม่
                     </button>
                  ) : (
                    <div className="space-y-4 text-center animate-in fade-in slide-in-from-top-2">
                      <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-2">
                        <h3 className="font-bold text-sm text-accent uppercase tracking-widest flex items-center gap-2"><Plus size={16}/> เพิ่มเมนูใหม่</h3>
                        <button onClick={() => setShowAddMenuForm(false)} className="text-gray-400 p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={16}/></button>
                      </div>
                      <input type="text" placeholder="ชื่อเมนู" className="w-full p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-[var(--theme-accent)] border border-transparent bg-white font-bold" value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} />
                      
                      <div className="flex gap-2">
                        <input type="number" placeholder="ราคาปกติ" className="w-1/2 p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-[var(--theme-accent)] border border-transparent bg-white font-bold" value={newMenu.price} onChange={e => setNewMenu({...newMenu, price: e.target.value})} />
                        
                        <select className="w-1/2 p-4 rounded-2xl text-sm outline-none shadow-sm bg-white focus:ring-2 focus:ring-[var(--theme-accent)] border border-transparent font-bold text-gray-600" value={newMenu.category} onChange={e => setNewMenu({...newMenu, category: e.target.value})}>
                          {CATEGORIES.filter(c => c !== '🔥 เมนูขายดี').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-gray-100 text-left">
                        <label className="text-[11px] font-bold text-gray-500 block mb-2">ระดับความหวานที่เลือกได้:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {SWEETNESS.map(level => {
                            const isSelected = (newMenu.allowedSweetness || SWEETNESS).includes(level);
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => {
                                  const current = newMenu.allowedSweetness || SWEETNESS;
                                  const updated = isSelected 
                                    ? current.filter(s => s !== level) 
                                    : [...current, level];
                                  setNewMenu({ ...newMenu, allowedSweetness: updated });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                  isSelected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100'
                                }`}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <label className="col-span-2 flex items-center justify-center gap-1 p-3 bg-blue-50 rounded-2xl shadow-sm border border-blue-100 cursor-pointer transition-all hover:bg-blue-100">
                          <input type="checkbox" checked={newMenu.isOnlyBlend} onChange={e => setNewMenu({...newMenu, isOnlyBlend: e.target.checked, allowBlend: e.target.checked ? true : newMenu.allowBlend})} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                          <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1"><Zap size={14} className="text-blue-500" fill="currentColor"/> เป็นเมนูเฉพาะปั่นเท่านั้น (เช่น สมูทตี้)</span>
                        </label>

                        <label className={`flex items-center justify-center gap-1 p-3 rounded-2xl shadow-sm border cursor-pointer transition-all ${newMenu.isOnlyBlend ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white border-blue-50 hover:bg-blue-50'}`}>
                          <input type="checkbox" disabled={newMenu.isOnlyBlend} checked={newMenu.isOnlyBlend || newMenu.allowBlend !== false} onChange={e => setNewMenu({...newMenu, allowBlend: e.target.checked})} className="w-4 h-4 accent-blue-400 cursor-pointer" />
                          <span className="text-[10px] font-bold text-gray-500">มีเมนูปั่น</span>
                        </label>

                        <label className="flex items-center justify-center gap-1 p-3 bg-white rounded-2xl shadow-sm border border-gray-50 cursor-pointer transition-all hover:bg-gray-50">
                          <input type="checkbox" checked={newMenu.allowTopping !== false} onChange={e => setNewMenu({...newMenu, allowTopping: e.target.checked})} className="w-4 h-4 accent-[#A67C52] cursor-pointer" />
                          <span className="text-[10px] font-bold text-gray-500">ท็อปปิ้งได้</span>
                        </label>

                        <label className="flex items-center justify-center gap-1 p-3 bg-white rounded-2xl shadow-sm border border-orange-50 cursor-pointer transition-all hover:bg-orange-50">
                          <input type="checkbox" checked={newMenu.hasFreePearl} onChange={e => setNewMenu({...newMenu, hasFreePearl: e.target.checked})} className="w-4 h-4 accent-orange-400 cursor-pointer" />
                          <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><Star size={12} className="text-orange-400" fill="currentColor"/> มุกฟรี</span>
                        </label>

                        <label className="flex items-center justify-center gap-1 p-3 bg-gray-100 rounded-2xl shadow-sm border border-gray-200 cursor-pointer transition-all hover:bg-gray-200">
                          <input type="checkbox" checked={newMenu.isSoldOut} onChange={e => setNewMenu({...newMenu, isSoldOut: e.target.checked})} className="w-4 h-4 accent-gray-600 cursor-pointer" />
                          <span className="text-[10px] font-bold text-gray-600 flex items-center gap-1">ปิดขายชั่วคราว</span>
                        </label>

                        <label className="col-span-2 flex items-center justify-center gap-1 p-3 bg-red-50 rounded-2xl shadow-sm border border-red-100 cursor-pointer transition-all hover:bg-red-100">
                          <input type="checkbox" checked={newMenu.isPromoted} onChange={e => setNewMenu({...newMenu, isPromoted: e.target.checked})} className="w-4 h-4 accent-red-500 cursor-pointer" />
                          <span className="text-[11px] font-bold text-red-600 flex items-center gap-1"><Star size={14} className="text-red-500" fill="currentColor"/> ตั้งเป็นเมนูแนะนำ</span>
                        </label>

                        {newMenu.category === 'มัทฉะ' && (
                          <label className="col-span-2 flex items-center justify-center gap-1 p-3 bg-green-50 rounded-2xl shadow-sm border border-green-100 cursor-pointer transition-all hover:bg-green-100">
                            <input type="checkbox" checked={newMenu.hasTeaType} onChange={e => setNewMenu({...newMenu, hasTeaType: e.target.checked})} className="w-4 h-4 accent-green-600 cursor-pointer" />
                            <span className="text-[11px] font-bold text-green-700 flex items-center gap-1">🍵 ให้ลูกค้าเลือกผงชาได้</span>
                          </label>
                        )}
                      </div>

                      {newMenu.allowBlend !== false && newMenu.category !== 'สมูทตี้โยเกิร์ต' && newMenu.category !== 'ผลไม้และสมูทตี้' && (
                        <div className="text-left mt-2">
                          <label className="text-[10px] font-bold text-gray-400 ml-2">บวกราคาเพิ่มสำหรับเมนูปั่น (บาท)</label>
                          <input type="number" placeholder="เช่น 5 หรือ 10" className="w-full mt-1 p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-[var(--theme-accent)] transition-all bg-white border border-transparent font-bold" value={newMenu.blendPrice} onChange={e => setNewMenu({...newMenu, blendPrice: e.target.value})} />
                        </div>
                      )}

                      <label className="cursor-pointer bg-white border border-gray-200 p-4 rounded-2xl text-xs font-bold block shadow-sm text-gray-400 hover:text-accent hover:border-accent transition-all mt-4">
                        <Upload size={18} className="inline mr-2"/> {newMenu.image ? 'เปลี่ยนรูปเมนู' : 'อัปโหลดรูปภาพเมนู'}
                        <input type="file" accept="image/*" className="hidden" onChange={async e => {
                          const file = e.target.files[0];
                          if (file) { try { setNewMenu({...newMenu, image: await compressImage(file)}); } catch(err) { console.error(err); } }
                        }} />
                      </label>
                      <button onClick={handleAddNewMenu} className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-[#8e6843]"><Plus size={18}/> บันทึกเมนูใหม่</button>
                    </div>
                  )}
                </div>

                {/* บริหารจัดการซอสราดแต่งหน้า */}
                <div className="bg-amber-50 p-6 rounded-[2.5rem] border-2 border-dashed border-amber-200 shadow-inner relative mt-8">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-sm text-amber-900 uppercase tracking-widest flex items-center justify-center gap-2">
                      ✨ บริหารจัดการซอสราดแต่งหน้า (สำหรับวิปครีม/ครีมชีส)
                    </h3>
                  </div>

                  {!showAddSauceForm ? (
                     <div className="space-y-2">
                       <button onClick={() => setShowAddSauceForm(true)} className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-xs">
                          <Plus size={18}/> เพิ่มซอสราดแต่งหน้าใหม่เข้าสู่ระบบ
                       </button>
                       {sauces.length === 0 && (
                         <button onClick={handleSeedDefaultSauces} className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-xl transition-all text-xs border border-amber-300 flex items-center justify-center gap-2">
                            ⚡ นำเข้าซอสเริ่มต้น (ช็อกโกแลต, คาราเมล ฯลฯ)
                         </button>
                       )}
                     </div>
                  ) : (
                    <div className="space-y-4 text-center animate-in fade-in slide-in-from-top-2 bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
                      <div className="flex justify-between items-center border-b border-amber-100 pb-3 mb-2">
                        <h3 className="font-bold text-sm text-amber-800 uppercase tracking-widest flex items-center gap-2"><Plus size={16}/> เพิ่มซอสราดแต่งหน้าใหม่</h3>
                        <button onClick={() => setShowAddSauceForm(false)} className="text-amber-400 p-1 hover:bg-amber-100 rounded-full transition-colors"><X size={16}/></button>
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="ชื่อซอส" className="w-2/3 p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-amber-500 border border-amber-100 bg-gray-50 font-bold" value={newSauce.name} onChange={e => setNewSauce({...newSauce, name: e.target.value})} />
                        <input type="number" placeholder="ราคา (+฿)" className="w-1/3 p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-amber-500 border border-amber-100 bg-gray-50 font-bold" value={newSauce.price} onChange={e => setNewSauce({...newSauce, price: e.target.value})} />
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => setShowAddSauceForm(false)} className="w-1/3 bg-gray-100 text-gray-500 py-3 rounded-2xl font-bold text-xs">ยกเลิก</button>
                         <button onClick={handleAddSauce} className="w-2/3 bg-amber-600 text-white py-3 rounded-2xl font-bold text-xs shadow-lg active:scale-95 transition-all hover:bg-amber-700">บันทึกซอสราดใหม่</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mt-4 text-left pt-4 border-t border-amber-200/50">
                    <p className="text-xs font-bold text-amber-900 mb-2 flex justify-between items-center">
                      <span>รายการซอสราดที่มีในระบบ ({sauces.length} รายการ)</span>
                    </p>
                    {sauces.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                        <span className="text-sm font-bold text-primary">{s.name} <span className="text-amber-600 text-xs font-bold">({s.price > 0 ? `+฿${s.price}` : 'ฟรี'})</span></span>
                        <button onClick={() => handleDeleteSauce(s.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-50 p-6 rounded-[2.5rem] border-2 border-dashed border-orange-200 shadow-inner relative mt-8">
                  {!showAddToppingForm ? (
                     <button onClick={() => setShowAddToppingForm(true)} className="w-full py-2 text-orange-600 font-bold flex items-center justify-center gap-2 hover:bg-orange-100 rounded-2xl transition-all">
                        <Plus size={18}/> คลิกเพื่อเพิ่มท็อปปิ้งเสริม
                     </button>
                  ) : (
                    <div className="space-y-4 text-center animate-in fade-in slide-in-from-top-2">
                      <div className="flex justify-between items-center border-b border-orange-200 pb-3 mb-2">
                        <h3 className="font-bold text-sm text-orange-600 uppercase tracking-widest flex items-center gap-2"><Plus size={16}/> เพิ่มท็อปปิ้งเสริม</h3>
                        <button onClick={() => setShowAddToppingForm(false)} className="text-orange-400 p-1 hover:bg-orange-200 rounded-full transition-colors"><X size={16}/></button>
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="ชื่อท็อปปิ้ง" className="w-2/3 p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-400 border border-transparent bg-white font-bold" value={newTopping.name} onChange={e => setNewTopping({...newTopping, name: e.target.value})} />
                        <input type="number" placeholder="ราคา" className="w-1/3 p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-400 border border-transparent bg-white font-bold" value={newTopping.price} onChange={e => setNewTopping({...newTopping, price: e.target.value})} />
                      </div>
                      <button onClick={handleAddTopping} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all hover:bg-orange-600">บันทึกท็อปปิ้งใหม่</button>
                    </div>
                  )}

                  {toppings.length > 0 && (
                    <div className="space-y-2 mt-4 text-left pt-4 border-t border-orange-200/50">
                      <p className="text-xs font-bold text-orange-500 mb-2">ท็อปปิ้งที่มีในระบบ</p>
                      {toppings.map(t => (
                        <div key={t.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                          <span className="text-sm font-bold text-primary">{t.name} <span className="text-orange-500 text-xs">(+฿{t.price})</span></span>
                          <button onClick={() => handleDeleteTopping(t.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-8">
                  {CATEGORIES.filter(c => c !== '🔥 เมนูขายดี').map(category => {
                    let itemsInCategory = menuItems
                      .filter(item => {
                         if (category === 'สมูทตี้โยเกิร์ต') return item.category === 'สมูทตี้โยเกิร์ต' || item.category === 'ผลไม้และสมูทตี้';
                         if (category === 'วิปครีมและครีมชีส') return item.category === 'วิปครีมและครีมชีส' || item.category === 'ครีมและครีมชีส' || item.category === 'เมนูพิเศษ';
                         return item.category === category;
                      })
                      .sort((a, b) => (a.sortOrder || a.createdAt || 0) - (b.sortOrder || b.createdAt || 0));

                    if (adminSearchQuery) itemsInCategory = itemsInCategory.filter(item => item.name.toLowerCase().includes(adminSearchQuery.toLowerCase()));
                    if (itemsInCategory.length === 0) return null;

                    return (
                      <div key={category} className="space-y-3">
                        <h4 className="font-bold text-lg text-primary border-b-2 border-accent/20 pb-2 ml-1">{category}</h4>
                        {itemsInCategory.map((item, idx) => (
                          <div key={item.id} className="flex flex-col gap-1">
                            <div 
                              draggable={!(editingMenu && editingMenu.id === item.id)}
                              onDragStart={(e) => { dragItem.current = idx; e.currentTarget.classList.add('opacity-50', 'scale-95'); }}
                              onDragEnter={(e) => dragOverItem.current = idx}
                              onDragEnd={(e) => { e.currentTarget.classList.remove('opacity-50', 'scale-95'); handleSortDrop(itemsInCategory); }}
                              onDragOver={(e) => e.preventDefault()}
                              className="flex justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:shadow-md cursor-grab active:cursor-grabbing"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1 z-10">
                                  <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveMenu(item, 'up', itemsInCategory); }} disabled={idx === 0 || adminSearchQuery} className={`p-1.5 rounded-lg transition-all ${idx === 0 || adminSearchQuery ? 'text-gray-200' : 'text-accent bg-orange-50 active:scale-90 hover:bg-orange-100'}`}><ArrowUp size={14}/></button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveMenu(item, 'down', itemsInCategory); }} disabled={idx === itemsInCategory.length - 1 || adminSearchQuery} className={`p-1.5 rounded-lg transition-all ${idx === itemsInCategory.length - 1 || adminSearchQuery ? 'text-gray-200' : 'text-accent bg-orange-50 active:scale-90 hover:bg-orange-100'}`}><ArrowDown size={14}/></button>
                                </div>
                                <img src={item.image} className={`w-14 h-14 rounded-2xl object-cover pointer-events-none ${item.isSoldOut ? 'grayscale opacity-50' : ''}`} alt="list" />
                                <div>
                                  <p className="font-bold text-sm text-primary flex items-center gap-1 flex-wrap">
                                    {item.name} 
                                    {item.isPromoted && <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">แนะนำ</span>}
                                    {item.isSoldOut && <span className="text-[8px] bg-gray-500 text-white px-1.5 py-0.5 rounded-full">หมด</span>}
                                  </p>
                                  <p className="text-xs text-accent font-bold">฿{item.price}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 z-10">
                                <button type="button" onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (editingMenu && editingMenu.id === item.id) {
                                    setEditingMenu(null); 
                                  } else {
                                    setEditingMenu(item); 
                                  }
                                }} className={`p-3 active:scale-90 transition-all rounded-xl ${editingMenu && editingMenu.id === item.id ? 'bg-orange-500 text-white shadow-md' : 'text-blue-500 hover:bg-blue-100 bg-blue-50'}`}>
                                  {editingMenu && editingMenu.id === item.id ? <X size={16}/> : <Edit size={16}/>}
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteMenu(item.id); }} className="p-3 text-red-500 hover:bg-red-100 active:scale-90 transition-all bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: ตั้งค่าบัญชีและธีมร้าน */}
            {adminTab === 'settings' && (
              <div className="space-y-8 animate-in fade-in">
                
                {/* 1. ตั้งค่าธีมร้าน */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-[2.5rem] border-2 border-dashed border-indigo-200 space-y-4 shadow-inner relative overflow-hidden">
                  <h3 className="font-bold text-sm text-indigo-700 uppercase tracking-widest text-center flex items-center justify-center gap-2"><Palette size={16}/> เลือกธีมร้านค้า</h3>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                     {Object.entries(THEMES).map(([key, theme]) => (
                        <button key={key} onClick={() => updateTheme(key)} className={`py-3 px-2 rounded-2xl font-bold text-[11px] shadow-sm transition-all border-2 flex items-center justify-center gap-1 ${storeSettings.theme === key ? 'border-indigo-500 bg-indigo-600 text-white scale-105 shadow-md' : 'border-white bg-white text-gray-600 hover:border-indigo-200'}`}>
                           {theme.name}
                        </button>
                     ))}
                  </div>
                </div>
                
                {/* 2. สถานะร้าน */}
                <div className="bg-orange-50 p-6 rounded-[2.5rem] border-2 border-dashed border-orange-200 space-y-4 shadow-inner relative">
                  <h3 className="font-bold text-sm text-accent uppercase tracking-widest text-center">สถานะร้าน และ วัตถุดิบ</h3>
                  <div className="flex justify-center gap-3 pt-2">
                    <button onClick={() => updateStoreStatus(true)} className={`flex-1 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 shadow-sm transition-all ${storeSettings.isStoreOpen !== false ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100 hover:border-green-200'}`}><CheckCircle size={18}/> เปิดร้านแล้ว</button>
                    <button onClick={() => updateStoreStatus(false)} className={`flex-1 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 shadow-sm transition-all ${storeSettings.isStoreOpen === false ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100 hover:border-red-200'}`}><X size={18}/> ปิดร้านแล้ว</button>
                  </div>
                </div>

                {/* 3. ตั้งค่าช่องทางชำระเงิน */}
                <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 space-y-4 shadow-inner relative">
                  <h3 className="font-bold text-sm text-accent uppercase tracking-widest text-center">ตั้งค่าช่องทางชำระเงิน</h3>
                  
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block font-bold">หมายเลขพร้อมเพย์</label>
                    <input type="text" placeholder="เช่น 0812345678" className="w-full p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-accent border border-transparent transition-all font-bold" value={editPromptPay} onChange={e => setEditPromptPay(e.target.value)} />
                  </div>

                  <button onClick={async () => {
                    try { await setDoc(doc(db, 'settings', 'store'), { promptPayNo: editPromptPay, qrCodeImage: editQrCodeImage }, { merge: true }); showAlert('อัปเดตการตั้งค่าร้านสำเร็จ! 🐮'); } catch(e) { showAlert("Error: " + e.message); }
                  }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-md mt-4 hover:opacity-90">
                    บันทึกการตั้งค่าร้าน
                  </button>
                </div>

                {/* [MODIFIED] 4. ตั้งค่าเชื่อมต่อ Google Sheets Web App */}
                <div className="bg-emerald-50 p-6 rounded-[2.5rem] border-2 border-dashed border-emerald-200 space-y-4 shadow-inner relative">
                  <h3 className="font-bold text-sm text-emerald-800 uppercase tracking-widest text-center flex items-center justify-center gap-2">
                    <Database size={16}/> เชื่อมต่อ Google Sheets & Dashboard
                  </h3>
                  
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block font-bold">Google Apps Script Web App URL</label>
                    <input 
                      type="text" 
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec" 
                      className="w-full p-4 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-emerald-400 border border-transparent transition-all font-mono font-bold text-emerald-900 bg-white" 
                      value={editGoogleSheetUrl} 
                      onChange={e => setEditGoogleSheetUrl(e.target.value)} 
                    />
                    <p className="text-[9px] text-emerald-600 font-bold mt-2 leading-relaxed">
                      * ระบบจะทำการบันทึกทุกๆ ออร์เดอร์และอัปเดตสถานะ (กำลังปรุง/จัดส่งสำเร็จ) ส่งตรงเข้า Google Sheets แบบ Real-time ทันที
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={async () => {
                        if (!editGoogleSheetUrl) return showAlert('กรุณากรอก Web App URL ก่อนกดทดสอบครับ');
                        showAlert('กำลังส่งข้อมูลทดสอบ...');
                        await sendOrderToGoogleSheets({
                          orderId: "TEST-" + Math.floor(Math.random()*1000),
                          timestamp: Date.now(),
                          lineName: "ทดสอบระบบ",
                          items: [{ name: "นมสดเย็น (ทดสอบ)", qty: 1, price: 45, sweetness: "100%" }],
                          total: 45,
                          paymentMethod: "promptpay",
                          status: "completed",
                          deliveryLocation: "room",
                          address: "ทดสอบการเชื่อมต่อ Google Sheets",
                          note: "ระบบทำงานปกติ ✨"
                        });
                        showAlert('ส่งข้อมูลทดสอบเรียบร้อยแล้วค่ะ! กรุณาเช็คในตาราง Google Sheets ของคุณ 🐮');
                      }} 
                      className="w-1/3 bg-white border border-emerald-300 text-emerald-700 py-3.5 rounded-2xl font-bold text-xs shadow-sm active:scale-95 transition-all hover:bg-emerald-100"
                    >
                      🧪 ทดสอบส่ง
                    </button>

                    <button 
                      onClick={async () => {
                        try { 
                          await setDoc(doc(db, 'settings', 'store'), { googleSheetUrl: editGoogleSheetUrl }, { merge: true }); 
                          showAlert('บันทึกการเชื่อมต่อ Google Sheets สำเร็จ! 📊'); 
                        } catch(e) { showAlert("Error: " + e.message); }
                      }} 
                      className="w-2/3 bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all shadow-md hover:bg-emerald-700"
                    >
                      บันทึก URL Google Sheets
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </main>

      {/* --- Modal เลือกออปชันเมนูเครื่องดื่มตอนสั่งซื้อ --- */}
      {optionModalItem && (() => {
        const isItemBlendedInPreview = optionModalItem.isOnlyBlend || tempOptions.isBlended;
        const previewToppingsPrice = (tempOptions.selectedToppings || []).reduce((sum, t) => sum + Number(t.price), 0);
        const previewSaucesPrice = (tempOptions.selectedSauces || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
        const previewShotPrice = tempOptions.addShot ? 20 : 0;
        const isWhipOrCreamCheese = isWhipOrCreamCheeseItem(optionModalItem);
        const previewIcePrice = (!isItemBlendedInPreview && !isWhipOrCreamCheese && tempOptions.separateIce) ? 5 : 0;
        const previewTotalPrice = optionModalItem.price + (isItemBlendedInPreview ? getAddedBlendPrice(optionModalItem) : 0) + previewToppingsPrice + previewSaucesPrice + previewShotPrice + previewIcePrice;

        const isWhipCreamOrSauceItem = isWhipOrCreamCheese;

        const allowedSweetnessList = (optionModalItem.allowedSweetness && optionModalItem.allowedSweetness.length > 0) 
          ? optionModalItem.allowedSweetness 
          : SWEETNESS;

        return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4 animate-in fade-in">
          
          <div className="bg-white rounded-t-[3.5rem] w-full max-w-md animate-in slide-in-from-bottom-full duration-500 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="w-full h-[30vh] relative flex-shrink-0 bg-gray-50">
              <img src={optionModalItem.image} alt={optionModalItem.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent"></div>
            </div>

            <div className="p-10 pt-6 space-y-10 overflow-y-auto hide-scrollbar">
              <div className="flex justify-between items-center"><h3 className="text-2xl font-serif font-bold text-primary">{optionModalItem.name}</h3><button onClick={() => setOptionModalItem(null)} className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:bg-gray-100 transition-colors"><X/></button></div>
              <div className="space-y-8">
                
                {!isWhipOrCreamCheese && allowedSweetnessList.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold block mb-4 text-gray-400 uppercase tracking-widest">ความหวาน</label>
                    <div className="grid grid-cols-3 gap-2">
                      {allowedSweetnessList.map(l => (
                        <button key={l} onClick={() => setTempOptions({...tempOptions, sweetness: l})} className={`py-3.5 rounded-2xl text-[10px] font-bold border transition-all ${tempOptions.sweetness === l ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                )}

                {optionModalItem.category === 'กาแฟ' && (
                  <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-bold block mb-4 text-[#5c3a21] uppercase tracking-widest flex items-center gap-1"><Coffee size={14} fill="currentColor"/> เลือกระดับการคั่วเมล็ดกาแฟ</label>
                       <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => setTempOptions({...tempOptions, bean: 'คั่วกลาง'})} className={`py-4 rounded-2xl text-[11px] font-bold border transition-all ${tempOptions.bean === 'คั่วกลาง' ? 'bg-[#8c522d] text-white border-[#8c522d] shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>คั่วกลาง<br/><span className="text-[9px] font-normal">หอมนุ่ม ละมุน</span></button>
                         <button onClick={() => setTempOptions({...tempOptions, bean: 'คั่วเข้ม'})} className={`py-4 rounded-2xl text-[11px] font-bold border transition-all ${tempOptions.bean === 'คั่วเข้ม' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>คั่วเข้ม<br/><span className="text-[9px] font-normal">เข้มข้น ถึงใจ</span></button>
                       </div>
                     </div>
                  </div>
                )}

                {isWhipCreamOrSauceItem && (
                  <div>
                    <label className="text-[10px] font-bold block mb-4 text-[#A67C52] uppercase tracking-widest flex items-center gap-1">
                      ✨ เลือกราดซอสแต่งหน้า
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {sauces.map(s => {
                        const isSelected = tempOptions.selectedSauces?.some(item => typeof item === 'object' ? item.id === s.id : item === s.name);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setTempOptions(prev => {
                                const currentSauces = prev.selectedSauces || [];
                                if (isSelected) {
                                  return { ...prev, selectedSauces: currentSauces.filter(item => typeof item === 'object' ? item.id !== s.id : item !== s.name) };
                                } else {
                                  return { ...prev, selectedSauces: [...currentSauces, { id: s.id, name: s.name, price: Number(s.price || 0) }] };
                                }
                              });
                            }}
                            className={`py-3 px-3 rounded-2xl text-[11px] font-bold border transition-all flex items-center justify-between ${isSelected ? 'bg-amber-700 text-white border-amber-700 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}
                          >
                            <span className="truncate">{s.name}</span>
                            {isSelected ? <Check size={14} className="text-white flex-shrink-0" /> : <Plus size={14} className="text-gray-300 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!isWhipOrCreamCheese && (
                  optionModalItem.isOnlyBlend ? (
                    <div className="grid grid-cols-1 gap-5">
                       <button onClick={() => setTempOptions({...tempOptions, isBlended: true, separateIce: false})} disabled={storeSettings.isBlendOut} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${storeSettings.isBlendOut ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-blue-400 bg-blue-50 text-blue-600 shadow-sm'}`}>
                         <Zap size={32}/><span className="text-xs uppercase">เฉพาะปั่น (สมูทตี้) {getAddedBlendPrice(optionModalItem) > 0 ? `(+฿${getAddedBlendPrice(optionModalItem)})` : ''}</span>
                       </button>
                    </div>
                  ) : optionModalItem.allowBlend !== false ? (
                    <div className="grid grid-cols-2 gap-5">
                       <button onClick={() => setTempOptions({...tempOptions, isBlended: false})} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${!tempOptions.isBlended ? 'border-accent bg-[var(--theme-bg)] text-primary shadow-sm' : 'border-gray-50 text-gray-300 bg-white hover:bg-gray-50'}`}><Coffee size={32}/><span className="text-xs uppercase">เย็น / ปกติ</span></button>
                       <button onClick={() => !storeSettings.isBlendOut && setTempOptions({...tempOptions, isBlended: true, separateIce: false})} disabled={storeSettings.isBlendOut} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${storeSettings.isBlendOut ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : (tempOptions.isBlended ? 'border-accent bg-[var(--theme-bg)] text-primary shadow-sm' : 'border-gray-50 text-gray-300 bg-white hover:bg-gray-50')}`}><Zap size={32}/><span className="text-xs uppercase text-center">{storeSettings.isBlendOut ? 'เมนูปั่นหมด' : `ปั่น ${getAddedBlendPrice(optionModalItem) > 0 ? `(+฿${getAddedBlendPrice(optionModalItem)})` : ''}`}</span></button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5">
                       <button onClick={() => setTempOptions({...tempOptions, isBlended: false})} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all border-accent bg-[var(--theme-bg)] text-primary shadow-sm`}><Coffee size={32}/><span className="text-xs uppercase">เย็น / ปกติ</span></button>
                    </div>
                  )
                )}
              </div>
              
              <button onClick={() => {
                  const toppingsPrice = (tempOptions.selectedToppings || []).reduce((sum, t) => sum + Number(t.price), 0);
                  const saucesPrice = (tempOptions.selectedSauces || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
                  const shotPrice = tempOptions.addShot ? 20 : 0;
                  const isItemBlended = optionModalItem.isOnlyBlend || tempOptions.isBlended;
                  const icePrice = (!isItemBlended && !isWhipOrCreamCheese && tempOptions.separateIce) ? 5 : 0;
                  const finalP = optionModalItem.price + (isItemBlended ? getAddedBlendPrice(optionModalItem) : 0) + toppingsPrice + saucesPrice + shotPrice + icePrice;
                  
                  const toppingsStr = (tempOptions.selectedToppings || []).map(t => t.id).sort().join('-');
                  const saucesStr = (tempOptions.selectedSauces || []).map(s => typeof s === 'object' ? s.id : s).sort().join('-');
                  
                  const cartId = `${optionModalItem.id}-${isWhipOrCreamCheese ? 'nowhip' : tempOptions.sweetness}-${isItemBlended}-${tempOptions.addPearl}-${toppingsStr}-${saucesStr}`;
                  
                  setCart(prev => {
                    const ex = prev.find(i => i.cartId === cartId);
                    if (ex) return prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i);
                    return [...prev, { ...optionModalItem, price: finalP, cartId, ...tempOptions, isBlended: isItemBlended, qty: 1 }];
                  });
                  setOptionModalItem(null);
                }} className="w-full py-6 bg-primary text-white rounded-[2.5rem] font-bold text-lg active:scale-95 flex items-center justify-center gap-3 shadow-xl hover:opacity-90 transition-all">
                  <Plus size={24}/> เพิ่มลงตะกร้า • ฿{previewTotalPrice}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal ถ่ายรูปยืนยันการส่งของ */}
      {deliveryModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-primary">ยืนยันการจัดส่งออร์เดอร์</h3>
              <button onClick={() => setDeliveryModal(null)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <div className="space-y-3">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">จุดส่งสินค้า</label>
               <div className="grid grid-cols-3 gap-2">
                 <button onClick={() => setDeliveryLocation('room')} className={`py-3 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${deliveryLocation === 'room' ? 'border-orange-400 bg-orange-50 text-orange-600 shadow-sm' : 'border-gray-50 text-gray-400 bg-white'}`}><Home size={20}/><span className="text-[10px]">หน้าห้อง</span></button>
                 <button onClick={() => setDeliveryLocation('building')} className={`py-3 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${deliveryLocation === 'building' ? 'border-orange-400 bg-orange-50 text-orange-600 shadow-sm' : 'border-gray-50 text-gray-400 bg-white'}`}><Building size={20}/><span className="text-[10px]">หน้าตึก</span></button>
                 <button onClick={() => { setDeliveryLocation('pickup'); setDeliveryImage(''); }} className={`py-3 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${deliveryLocation === 'pickup' ? 'border-green-400 bg-green-50 text-green-600 shadow-sm' : 'border-gray-50 text-gray-400 bg-white'}`}><UserCheck size={20}/><span className="text-[10px]">รับเองที่ร้าน</span></button>
               </div>
            </div>

            {deliveryLocation !== 'pickup' && (
                <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-center animate-in fade-in zoom-in-95">
                   <p className="text-xs font-bold mb-3 text-primary">แนบรูปถ่ายเป็นหลักฐาน</p>
                   <label className="cursor-pointer bg-white border border-gray-200 text-gray-500 py-3 px-6 rounded-xl text-[11px] font-bold inline-flex items-center gap-2 shadow-sm active:scale-95 transition-all hover:border-accent hover:text-accent">
                      <Camera size={16}/> {deliveryImage ? 'เปลี่ยนรูปภาพ' : 'ถ่ายรูป / เลือกจากแกลเลอรี'}
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                         const file = e.target.files[0];
                         if(file){ setDeliveryImage(await compressImage(file)); }
                      }} />
                   </label>
                   {deliveryImage && <img src={deliveryImage} className="mt-4 h-32 w-full object-cover rounded-xl shadow-sm border border-gray-100" alt="Delivery Proof"/>}
                </div>
            )}

            <button onClick={handleConfirmDelivery} disabled={isDelivering || (deliveryLocation !== 'pickup' && !deliveryImage)} className={`w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${deliveryLocation === 'pickup' || deliveryImage ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              {isDelivering ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
              {isDelivering ? 'กำลังบันทึกและแจ้งเตือน...' : <><CheckCircle size={18}/> ยืนยันการจัดส่ง</>}
            </button>
          </div>
        </div>
      )}

      {/* Modal ดูรูปภาพสลิปแบบขยายใหญ่ */}
      {selectedSlip && selectedSlip !== 'cash_payment' && selectedSlip !== 'thaichueithai_payment' && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedSlip(null)}>
          <img src={selectedSlip} className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl border-4 border-white/10 animate-in zoom-in" alt="slip preview" />
        </div>
      )}

      {/* Modal แจ้งเตือนร้านปิด */}
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

      {/* Modal สั่งซื้อสำเร็จ */}
      {successModalData && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center space-y-6 animate-in zoom-in border-4 border-accent">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
              <CheckCircle size={32}/>
            </div>
            <h3 className="text-2xl font-bold text-primary leading-tight">
              {successModalData.autoSent ? "🐮 สั่งซื้อสำเร็จแล้วค่ะ!" : "⚠️ ขั้นตอนสุดท้าย!"}
            </h3>
            <p className="text-xs text-gray-700 leading-relaxed font-bold">
              {successModalData.autoSent 
                ? "ระบบได้ส่งข้อมูลบิลเข้าไปในแชทห้องสั่งซื้อของคุณเรียบร้อยแล้วค่ะ สามารถกดปุ่มแชร์ด้านล่างเพื่อแชร์บิลเพิ่มเติมได้เลยค่ะ" 
                : "รบกวนกดปุ่มสีเขียวด้านล่างเพื่อแชร์ข้อมูลบิลใบนี้ส่งตรงไปยัง LINE ของทางร้านนะคะ 💖"
              }
            </p>

            <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-300 text-left max-h-32 overflow-y-auto shadow-inner">
              <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{successModalData.text}</pre>
            </div>

            <div className="space-y-3">
              <button 
                onClick={async () => {
                  navigator.clipboard.writeText(successModalData.text);
                  
                  if (window.liff && window.liff.isLoggedIn() && window.liff.isApiAvailable('shareTargetPicker')) {
                    try {
                      await window.liff.shareTargetPicker([{ type: "text", text: successModalData.text }]);
                    } catch (err) {
                      window.open(`https://line.me/R/share?text=${encodeURIComponent(successModalData.text)}`, '_blank');
                    }
                  } else {
                    window.open(`https://line.me/R/share?text=${encodeURIComponent(successModalData.text)}`, '_blank');
                    if (storeSettings.shopLineUrl) {
                      setTimeout(() => { window.location.href = storeSettings.shopLineUrl; }, 1200);
                    }
                  }
                }}
                className="flex items-center justify-center gap-2 w-full bg-[#06C755] text-white py-4 rounded-full text-base font-bold shadow-lg active:scale-95 hover:bg-green-600 transition-all"
              >
                <Share2 size={20}/> แชร์บิลไปที่ LINE 💬
              </button>
              <button 
                onClick={() => { setSuccessModalData(null); setView('myOrders'); }}
                className="w-full text-gray-400 py-2 text-xs font-bold mt-2 hover:text-gray-600"
              >
                เสร็จสิ้น / ดูรายการคำสั่งซื้อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal สรุปผลส่งของสำเร็จ (แอดมิน) */}
      {adminDeliverySuccessData && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center space-y-6 animate-in zoom-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl"><CheckCircle size={32}/></div>
            <h3 className="text-xl font-bold text-primary">อัปเดตสถานะสำเร็จ! 🛵</h3>
            <p className="text-xs text-gray-500 leading-relaxed">ระบบบันทึกการส่งแล้ว คุณสามารถแชร์ข้อความนี้ให้ลูกค้าผ่านแอป LINE ได้</p>

            <div className="bg-gray-50 p-4 rounded-2xl border border-dashed text-left max-h-40 overflow-y-auto">
              <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{adminDeliverySuccessData.text}</pre>
            </div>

            <div className="space-y-3">
              <a 
                href={`https://line.me/R/share?text=${encodeURIComponent(adminDeliverySuccessData.text)}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#06C755] text-white py-4 rounded-full text-sm font-bold shadow-md active:scale-95 hover:bg-green-600"
              >
                <Share2 size={18}/> แชร์สถานะผ่านแอป LINE
              </a>
              <button onClick={() => setAdminDeliverySuccessData(null)} className="w-full text-gray-400 py-2 text-xs font-bold mt-2">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แอดมินล็อกอิน */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <h3 className="font-bold text-xl mb-8 text-primary">แอดมินเข้าสู่ระบบ</h3>
            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl mb-8 text-center text-3xl outline-none tracking-[0.5em] focus:border-accent focus:bg-white transition-all shadow-inner font-bold text-primary" placeholder="••••••" />
            <div className="flex gap-4">
              <button onClick={() => { setShowAdminModal(false); setAdminPassword(''); }} className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-colors">ยกเลิก</button>
              <button onClick={() => {
                if(adminPassword === '570402') { 
                  localStorage.setItem('happycow_isAdmin', 'true');
                  setView('admin'); 
                  setAdminTab('orders'); 
                  setShowAdminModal(false); 
                  setAdminPassword(''); 
                }
                else { showAlert('รหัสผ่านไม่ถูกต้องครับ!'); setAdminPassword(''); }
              }} className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 hover:opacity-90">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Message Box */}
      {msgBox.isOpen && (
        <div className="fixed inset-0 bg-black/70 z-[400] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            {msgBox.type === 'confirm' ? (
              <AlertCircle size={48} className="text-orange-500 mx-auto mb-5" />
            ) : (
              <CheckCircle size={48} className="text-green-500 mx-auto mb-5" />
            )}

            <h3 className="font-bold text-sm text-gray-800 mb-8 whitespace-pre-line leading-relaxed">{msgBox.message}</h3>

            {msgBox.type === 'confirm' ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => setMsgBox({ ...msgBox, isOpen: false })} 
                  className="flex-1 py-4 bg-gray-100 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => {
                    if (msgBox.onConfirm) msgBox.onConfirm();
                    setMsgBox({ ...msgBox, isOpen: false });
                  }} 
                  className="flex-1 py-4 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-opacity-90 transition-opacity shadow-md"
                >
                  ยืนยันตกลง
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}

    </div>
  );
}