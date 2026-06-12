import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, Coffee, Zap, MapPin, X, Upload, CheckCircle, AlertCircle, 
  Clock, Check, Banknote, CreditCard, MessageSquare, Star, Edit, Save, Camera, 
  Home, Building, TrendingUp, Download, ArrowUp, ArrowDown, Search, Palette, 
  BellRing, UserCheck, Database, Users, DatabaseBackup, Calendar, Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
// 🌟 เพิ่ม query และ where สำหรับการฟิลเตอร์ข้อมูลเฉพาะวันนี้
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';

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

// 🔗 นำ URL ของ Google Apps Script มาใส่ที่นี่ เพื่อให้แอดมินดึงประวัติได้
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwqAe51oA1eQ-uVnfnCVMLlBGV9CLfnW2FsbYLO3vxfTngXU8xydnpOzK3DGk6wkA/exec";

const CATEGORIES = ['🔥 เมนูขายดี', 'นม', 'ชา', 'กาแฟ', 'มัทฉะ', 'สมูทตี้โยเกิร์ต', 'วิปครีมและครีมชีส'];
const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const THEMES = {
  default: { bg: '#F5EEDC', primary: '#3D2C1E', accent: '#A67C52', name: 'ปกติ (มินิมอล)' },
  christmas: { bg: '#f0fdf4', primary: '#166534', accent: '#dc2626', name: '🎄 คริสต์มาส' },
  valentine: { bg: '#fdf2f8', primary: '#831843', accent: '#db2777', name: '💖 วาเลนไทน์' },
  songkran: { bg: '#e0f2fe', primary: '#0369a1', accent: '#0ea5e9', name: '💦 สงกรานต์' },
  halloween: { bg: '#fffbeb', primary: '#451a03', accent: '#ea580c', name: '🎃 ฮาโลวีน' },
  newyear: { bg: '#f8fafc', primary: '#0f172a', accent: '#ca8a04', name: '🎆 ปีใหม่' },
  loykrathong: { bg: '#f5f3ff', primary: '#2e1065', accent: '#7c3aed', name: '🌕 ลอยกระทง' },
  custom: { bg: '#F5EEDC', primary: '#3D2C1E', accent: '#A67C52', name: '🎨 อัปโหลดเอง' },
};

// --- 2. ฟังก์ชันบีบอัดรูปภาพ ---
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

export default function AdminApp() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('happycow_isAdmin') === 'true');
  const [adminPassword, setAdminPassword] = useState('');

  // Core Data States
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]); // ออร์เดอร์ของวันนี้เท่านั้น
  const [toppings, setToppings] = useState([]); 
  
  // Google Sheets Archive State
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [adminTab, setAdminTab] = useState('dashboard'); // Tabs: dashboard, orders, menus, settings, history
  const [isLoading, setIsLoading] = useState(true);

  // Settings States
  const [storeSettings, setStoreSettings] = useState({ 
    promptPayNo: '0812345678', qrCodeImage: '', isStoreOpen: true, theme: 'default', 
    customBgImage: '', isBlendOut: false, notifyAdmin: false, adminLineId: '',
    shopLineUrl: '', autoCloseEnabled: false, maxQueue: 3, autoCloseDays: []
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

  // Menu Management States
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: 'นม', image: '', blendPrice: 5, hasFreePearl: false, allowTopping: true, allowBlend: true, isOnlyBlend: false, isPromoted: false, isSoldOut: false, hasTeaType: false });
  const [editingMenu, setEditingMenu] = useState(null); 
  const [newTopping, setNewTopping] = useState({ name: '', price: '' }); 
  const [showAddMenuForm, setShowAddMenuForm] = useState(false);
  const [showAddToppingForm, setShowAddToppingForm] = useState(false);

  // Order Management States
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [deliveryImage, setDeliveryImage] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('room');
  const [isDelivering, setIsDelivering] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null); 
  const [loadingSlipId, setLoadingSlipId] = useState(null);
  const [adminDeliverySuccessData, setAdminDeliverySuccessData] = useState(null);

  // Stats States
  const [activeUsers, setActiveUsers] = useState([]);
  const [visitStats, setVisitStats] = useState({});

  // UI States
  const [msgBox, setMsgBox] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });
  const showAlert = (message) => setMsgBox({ isOpen: true, type: 'alert', message, onConfirm: null });
  const showConfirm = (message, onConfirm) => setMsgBox({ isOpen: true, type: 'confirm', message, onConfirm });
  
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const audioRef = useRef(null);
  const previousOrderCount = useRef(0);

  const getAddedBlendPrice = (item) => {
    if (item.category === 'สมูทตี้โยเกิร์ต' || item.category === 'ผลไม้และสมูทตี้') return 0;
    return (item.blendPrice !== undefined && item.blendPrice !== null && item.blendPrice !== '') ? Number(item.blendPrice) : 5;
  };

  const getBlendText = (item) => {
    if (item.isOnlyBlend) return 'ปั่น';
    if (item.allowBlend === false) return 'เย็น/ปกติ';
    return item.isBlended ? 'ปั่น' : 'เย็น';
  };

  // --- โหลดข้อมูลแบบเรียลไทม์จาก Firestore ---
  useEffect(() => {
    if (!isAuthenticated) return;

    // ดึงข้อมูลเมนู
    const unsubMenus = onSnapshot(collection(db, 'menus'), snapshot => { 
      setMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); 
      setIsLoading(false); 
    });

    // 🌟 [ปรับปรุงใหม่]: ดึงเฉพาะออร์เดอร์ของ "วันนี้" เท่านั้น เพื่อประหยัดโควตาและทำให้ระบบลื่นไหล
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const ordersQuery = query(
      collection(db, 'orders'), 
      where('timestamp', '>=', startOfToday.getTime())
    );

    const unsubOrders = onSnapshot(ordersQuery, snapshot => { 
       const fetchedOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp);
       setOrders(fetchedOrders); 
    });

    // ดึงข้อมูลท็อปปิ้ง
    const unsubToppings = onSnapshot(collection(db, 'toppings'), snapshot => { 
      setToppings(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    // ดึงข้อมูล Active Users
    const unsubActive = onSnapshot(collection(db, 'active_users'), snapshot => {
      const now = Date.now();
      const threshold = 120000;
      setActiveUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(user => now - user.lastActive < threshold));
    });

    const pruneInterval = setInterval(() => {
      setActiveUsers(prev => prev.filter(user => Date.now() - user.lastActive < 120000));
    }, 30000);

    // ดึงข้อมูล Settings
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
           autoCloseDays: data.autoCloseDays || []
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
      }
    });

    // ดึงข้อมูล Visits
    const unsubVisits = onSnapshot(doc(db, 'settings', 'visit_stats'), docSnap => {
      if (docSnap.exists()) setVisitStats(docSnap.data());
    });

    return () => { 
      unsubMenus(); unsubOrders(); unsubToppings(); unsubSettings(); unsubVisits(); 
      unsubActive(); clearInterval(pruneInterval);
    };
  }, [isAuthenticated]);

  // ระบบเสียงเตือน
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setTimeout(() => {
          if (audioRef.current) {
            const secondBell = audioRef.current.cloneNode();
            secondBell.play().catch(e => console.log(e));
          }
        }, 600); 
      }).catch(e => console.log(e));
    }
  };

  useEffect(() => {
    if (orders.length > previousOrderCount.current && previousOrderCount.current !== 0) {
      const newOrders = orders.slice(0, orders.length - previousOrderCount.current);
      if (newOrders.some(o => o.status === 'pending')) playNotificationSound();
    }
    previousOrderCount.current = orders.length;
  }, [orders]);

  // 🌟 ฟังก์ชันดึงประวัติจาก Google Sheets (On-Demand)
  const fetchHistoricalData = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(GAS_WEB_APP_URL);
      const data = await response.json();
      // เรียงจากใหม่ไปเก่า
      setHistoricalData(data.reverse());
      showAlert("ดึงข้อมูลประวัติจาก Google Sheets สำเร็จ! 📁");
    } catch (error) {
      showAlert("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Sheets: " + error.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const viewImage = async (orderId, type) => {
    setLoadingSlipId(orderId);
    try {
      const slipSnap = await getDoc(doc(db, 'slips', orderId));
      if (slipSnap.exists()) {
        const data = slipSnap.data();
        const img = type === 'slip' ? data.slipImage : data.deliveryImage;
        if (img) setSelectedSlip(img);
        else showAlert("ขออภัยค่ะ ไม่พบหลักฐานรูปภาพนี้ในระบบคลาวด์");
      } else {
        showAlert("ไม่พบข้อมูลหลักฐานรูปภาพของบิลนี้");
      }
    } catch (e) {
      showAlert("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setLoadingSlipId(null);
    }
  };

  const handleAcceptOrder = async (order) => {
    try { await updateDoc(doc(db, 'orders', order.id), { status: 'cooking' }); showAlert(`รับออร์เดอร์ของ ${order.lineName} แล้ว! 👩‍🍳`); } 
    catch (e) { showAlert("Error: " + e.message); }
  };

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
         await setDoc(doc(db, 'slips', deliveryModal.id), { deliveryImage: deliveryImage }, { merge: true });
      }

      // อัปเดตสถานะใน Google Sheets ด้วย
      try {
        fetch(GAS_WEB_APP_URL, {
          method: 'POST',
          body: JSON.stringify({
            orderId: deliveryModal.id,
            action: 'updateStatus',
            status: 'สำเร็จ',
            deliveryMessage: deliveryMessage
          }),
          mode: 'no-cors'
        });
      } catch(gasErr) { console.log(gasErr); }

      const locationText = deliveryLocation === 'room' ? 'หน้าห้อง' : (deliveryLocation === 'building' ? 'หน้าตึก' : 'รับเองที่หน้าร้าน');
      const deliverySummaryText = `🛵 อัปเดตสถานะจัดส่ง!\nบิล #${deliveryModal.id.slice(0,6)}\nลูกค้า: คุณ ${deliveryModal.lineName}\n\n${deliveryMessage}\n📍 จุดส่ง: ${locationText}`;

      setDeliveryModal(null); 
      setAdminDeliverySuccessData({ text: deliverySummaryText, orderId: deliveryModal.id });
    } catch (e) { showAlert("Error: " + e.message); }
    setIsDelivering(false);
  };

  // Menu Management Functions
  const handleAddNewMenu = async () => { /* เหมือนเดิม */
    if (!newMenu.name || !newMenu.price || !newMenu.image) return showAlert('กรุณากรอกข้อมูลให้ครบครับ');
    if (newMenu.category === '🔥 เมนูขายดี') return showAlert('หมวดหมู่ "เมนูขายดี" เป็นระบบอัตโนมัติ กรุณาเลือกหมวดหมู่อื่นครับ');
    try {
      await addDoc(collection(db, 'menus'), { ...newMenu, price: Number(newMenu.price), blendPrice: Number(newMenu.blendPrice), allowTopping: newMenu.allowTopping !== false, isOnlyBlend: newMenu.isOnlyBlend || false, allowBlend: newMenu.isOnlyBlend ? true : (newMenu.allowBlend !== false), isPromoted: newMenu.isPromoted || false, isSoldOut: newMenu.isSoldOut || false, hasTeaType: newMenu.hasTeaType || false, createdAt: Date.now(), sortOrder: Date.now() });
      showAlert('เพิ่มเมนูสำเร็จ! 🐮'); 
      setNewMenu({ name: '', price: '', category: 'นม', image: '', blendPrice: 5, hasFreePearl: false, allowTopping: true, allowBlend: true, isOnlyBlend: false, isPromoted: false, isSoldOut: false, hasTeaType: false });
      setShowAddMenuForm(false);
    } catch (e) { showAlert(e.message); }
  };

  const handleUpdateMenu = async () => { /* เหมือนเดิม */
    if (!editingMenu.name || !editingMenu.price || !editingMenu.image) return showAlert('กรุณากรอกข้อมูลให้ครบครับ');
    try {
      await updateDoc(doc(db, 'menus', editingMenu.id), { ...editingMenu, price: Number(editingMenu.price), blendPrice: Number(editingMenu.blendPrice), allowTopping: editingMenu.allowTopping !== false, isOnlyBlend: editingMenu.isOnlyBlend || false, allowBlend: editingMenu.isOnlyBlend ? true : (editingMenu.allowBlend !== false), isPromoted: editingMenu.isPromoted || false, isSoldOut: editingMenu.isSoldOut || false, hasTeaType: editingMenu.hasTeaType || false });
      showAlert('แก้ไขเมนูสำเร็จ! ✨'); setEditingMenu(null);
    } catch (e) { showAlert(e.message); }
  };

  const handleDeleteMenu = (id) => { showConfirm('ลบเมนูนี้ใช่หรือไม่?', async () => { await deleteDoc(doc(db, 'menus', id)); }); };
  const handleAddTopping = async () => {
    if (!newTopping.name || !newTopping.price) return showAlert('กรุณากรอกข้อมูลท็อปปิ้งให้ครบถ้วนครับ');
    try { await addDoc(collection(db, 'toppings'), { name: newTopping.name, price: Number(newTopping.price) }); showAlert('เพิ่มท็อปปิ้งสำเร็จ!'); setNewTopping({ name: '', price: '' }); setShowAddToppingForm(false); } catch (e) { showAlert(e.message); }
  };
  const handleDeleteTopping = (id) => { showConfirm('ลบท็อปปิ้งนี้ใช่หรือไม่?', async () => { await deleteDoc(doc(db, 'toppings', id)); }); };

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

  const getRecentVisits = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const thaiDateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      list.push({ dateStr, thaiDateStr, count: visitStats[dateStr] || 0 });
    }
    return list;
  };

  const recentVisits = getRecentVisits();
  const maxVisitCount = Math.max(...recentVisits.map(v => v.count), 1);

  // คำนวณรายรับจากออร์เดอร์ของ *วันนี้* เท่านั้น
  const dailyRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);

  const getStorageEstimation = () => {
     const orderImagesCount = orders.filter(o => o.hasSlip || o.hasDeliveryImage).length;
     const menuImagesCount = menuItems.filter(m => m.image && m.image.length > 100).length;
     const estStorageUsageKB = (orderImagesCount * 100) + (menuImagesCount * 80);
     const maxStorageKB = 5 * 1024 * 1024;
     return { 
       usageMB: (estStorageUsageKB / 1024).toFixed(2), 
       storagePercent: Math.min((estStorageUsageKB / maxStorageKB) * 100, 100) 
     };
  };

  const filteredOrders = React.useMemo(() => {
    if (!adminSearchQuery) return orders;
    const q = adminSearchQuery.trim().toLowerCase();
    return orders.filter(o => 
      o.id.toLowerCase().includes(q) || (o.lineName || '').toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q)
    );
  }, [orders, adminSearchQuery]);

  const updateStoreStatus = async (status) => { try { await setDoc(doc(db, 'settings', 'store'), { isStoreOpen: status }, { merge: true }); showAlert(`เปลี่ยนสถานะเรียบร้อย! 🐮`); } catch(e) { showAlert(e.message); } };
  const updateTheme = async (newTheme) => { try { await setDoc(doc(db, 'settings', 'store'), { theme: newTheme }, { merge: true }); showAlert(`เปลี่ยนธีมร้านเป็น ${THEMES[newTheme].name} เรียบร้อย! 🎨`); } catch(e) { showAlert(e.message); } };

  // --- Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center border-t-8 border-primary">
          <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto text-3xl mb-4 shadow-lg">🐮</div>
          <h3 className="font-bold text-xl mb-2 text-primary">ระบบจัดการหลังร้าน</h3>
          <p className="text-xs text-gray-500 mb-8">วัวนมอารมณ์ดี (Admin Only)</p>
          <input 
            type="password" 
            value={adminPassword} 
            onChange={e => setAdminPassword(e.target.value)} 
            className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl mb-8 text-center text-3xl outline-none tracking-[0.5em] focus:border-accent focus:bg-white transition-all shadow-inner font-bold text-primary" 
            placeholder="••••••" 
            onKeyDown={(e) => {
              if(e.key === 'Enter') {
                if(adminPassword === '570402') { localStorage.setItem('happycow_isAdmin', 'true'); setIsAuthenticated(true); }
                else { showAlert('รหัสผ่านไม่ถูกต้องครับ!'); setAdminPassword(''); }
              }
            }}
          />
          <button onClick={() => {
            if(adminPassword === '570402') { localStorage.setItem('happycow_isAdmin', 'true'); setIsAuthenticated(true); }
            else { showAlert('รหัสผ่านไม่ถูกต้องครับ!'); setAdminPassword(''); }
          }} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 hover:opacity-90">เข้าสู่ระบบแอดมิน</button>
        </div>
        
        {/* Alerts for Login Screen */}
        {msgBox.isOpen && (
          <div className="fixed inset-0 bg-black/70 z-[400] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
            <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
              <AlertCircle size={48} className="text-red-500 mx-auto mb-5" />
              <h3 className="font-bold text-sm text-gray-800 mb-8 whitespace-pre-line leading-relaxed">{msgBox.message}</h3>
              <button onClick={() => setMsgBox({ ...msgBox, isOpen: false })} className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-bold hover:opacity-90 transition-opacity shadow-md">ลองใหม่</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const storageData = getStorageEstimation();
  const currentThemeData = THEMES[storeSettings.theme] || THEMES.default;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col font-sans relative overflow-hidden bg-gray-50">
      <audio id="orderNotification" ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2854/2854-preview.mp3" preload="auto"></audio>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vollkorn:wght@700&family=Kanit:wght@400;600;700&display=swap');
        :root { --theme-primary: ${currentThemeData.primary}; --theme-accent: ${currentThemeData.accent}; }
        .font-serif { font-family: 'Vollkorn', serif; }
        .font-kanit { font-family: 'Kanit', sans-serif; }
        .bg-primary { background-color: var(--theme-primary); color: #fff; }
        .text-primary { color: var(--theme-primary); }
        .bg-accent { background-color: var(--theme-accent); color: #fff; }
        .text-accent { color: var(--theme-accent); }
        .border-accent { border-color: var(--theme-accent); }
        .border-primary { border-color: var(--theme-primary); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        
        @keyframes borderGlowPulse { 
          0% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0.7); border-color: #f59e0b; }
          50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); border-color: #f59e0b; }
          100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0); border-color: #f59e0b; }
        }
        .order-highlight { animation: borderGlowPulse 2.5s infinite ease-in-out; border-width: 3px !important; }
      `}</style>

      {/* Admin Header */}
      <header className="sticky top-0 z-[50] bg-white p-4 flex justify-between items-center border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
           <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold shadow-md">Admin</div>
           <div>
             <h1 className="font-serif font-bold text-lg leading-tight text-primary">ระบบแอดมินร้าน</h1>
             <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm flex items-center gap-1 mt-1 ${storeSettings.isStoreOpen !== false ? 'bg-green-500' : 'bg-red-500'}`}>
               {storeSettings.isStoreOpen !== false ? '🟢 สถานะ: เปิดร้าน' : '🔴 สถานะ: ปิดร้าน'}
             </span>
           </div>
        </div>
        <div className="flex gap-2">
          <button onClick={playNotificationSound} className="p-2 text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors" title="ทดสอบเสียงเตือน"><BellRing size={18}/></button>
          <button onClick={() => { localStorage.removeItem('happycow_isAdmin'); setIsAuthenticated(false); }} className="p-2 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors" title="ออกจากระบบแอดมิน"><X size={18}/></button>
        </div>
      </header>

      <main className="flex-1 p-5 relative z-10 pb-10">
        
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-white p-1.5 rounded-2xl mb-6 shadow-sm border border-gray-100 overflow-x-auto hide-scrollbar">
          {[
            { id: 'dashboard', label: 'สรุปรายวัน', icon: <TrendingUp size={14}/> },
            { id: 'orders', label: `ออร์เดอร์ ${orders.filter(o=>o.status==='pending').length>0 ? `(${orders.filter(o=>o.status==='pending').length})` : ''}`, icon: <ClipboardList size={14}/> },
            { id: 'menus', label: 'จัดการเมนู', icon: <Coffee size={14}/> },
            { id: 'history', label: 'คลังประวัติ', icon: <DatabaseBackup size={14}/> },
            { id: 'settings', label: 'ตั้งค่าร้าน', icon: <Palette size={14}/> }
          ].map(t => (
            <button key={t.id} onClick={() => setAdminTab(t.id)} className={`flex-1 min-w-fit py-3 px-3 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${adminTab === t.id ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Dashboard (สรุปเฉพาะของวันนี้) */}
        {adminTab === 'dashboard' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-primary text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10"><TrendingUp size={120}/></div>
              <div className="flex items-center gap-2 mb-4 opacity-80 relative z-10">
                <Calendar size={20} />
                <h3 className="font-bold text-sm">ยอดขายวันนี้ (Today)</h3>
              </div>
              <h1 className="text-5xl font-serif font-bold relative z-10">฿{dailyRevenue.toLocaleString()}</h1>
              <p className="text-[10px] opacity-70 mt-4 leading-relaxed">* ยอดขายของเดือนและปี กรุณากดดูที่แท็บ "คลังประวัติ" เพื่อดึงข้อมูลจาก Google Sheets ครับ</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 text-center">
                 <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">ออร์เดอร์สำเร็จวันนี้</p>
                 <h2 className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'completed').length} บิล</h2>
               </div>
               <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 text-center">
                 <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">ออร์เดอร์รอคิว</p>
                 <h2 className="text-2xl font-bold text-orange-500">{orders.filter(o => o.status === 'pending' || o.status === 'cooking').length} บิล</h2>
               </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-green-100 shadow-sm">
               <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
                 <h3 className="font-bold text-sm text-green-600 flex items-center gap-2">
                   <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                   ลูกค้าที่กำลังเปิดแอป (Real-time)
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

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <h3 className="font-bold text-sm text-primary mb-4 flex items-center gap-2"><Users size={16}/> 📊 สถิติคนเข้าเว็บ 7 วันล่าสุด</h3>
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

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="font-bold text-sm text-primary flex items-center gap-2"><Database size={16}/> พื้นที่เก็บรูปภาพ (Firebase Storage)</h3>
               </div>
               <p className="text-xs font-bold text-gray-500 mb-3">ใช้ไปประมาณ <span className="text-accent">{storageData.usageMB} MB</span> จาก 5,000 MB</p>
               <div className="w-full bg-gray-100 rounded-full h-3 mb-1 overflow-hidden shadow-inner">
                 <div className={`h-3 rounded-full transition-all duration-1000 ${storageData.storagePercent > 80 ? 'bg-red-500' : storageData.storagePercent > 50 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.max(storageData.storagePercent, 1)}%` }}></div>
               </div>
            </div>
          </div>
        )}
        {/* TAB 2: ตรวจสอบออร์เดอร์ของแอดมิน (เฉพาะวันนี้) */}
        {adminTab === 'orders' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl border border-orange-100 flex items-center gap-3 shadow-sm mb-4">
               <AlertCircle size={20} className="flex-shrink-0" />
               <p className="text-[11px] font-bold leading-relaxed">
                 ระบบนี้แสดงเฉพาะ <span className="underline">ออร์เดอร์ของวันนี้เท่านั้น</span> เพื่อให้แอปทำงานได้ลื่นไหลที่สุด<br/>
                 หากต้องการดูประวัติย้อนหลัง กรุณาไปที่แท็บ <b>"คลังประวัติ"</b> ครับ
               </p>
            </div>

            <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm relative mb-4">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" value={adminSearchQuery} onChange={e => setAdminSearchQuery(e.target.value)} placeholder="ค้นหารหัสบิล, ชื่อ หรือที่อยู่ลูกค้า..." className="w-full pl-10 pr-10 py-3 rounded-xl text-xs outline-none bg-white font-bold text-gray-600"/>
               {adminSearchQuery && <button onClick={() => setAdminSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-100 p-1 rounded-full"><X size={12}/></button>}
            </div>

            {filteredOrders.map((o) => {
                const dateStr = new Date(o.timestamp).toLocaleString('th-TH');
                return (
                <div key={o.id} className={`border p-5 rounded-3xl shadow-sm bg-white animate-in fade-in transition-all duration-500 ${selectedOrderId === o.id ? 'order-highlight bg-amber-50/20' : o.status === 'pending' ? 'border-orange-300 bg-orange-50/30' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                       <span className="bg-primary text-white w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold">#{orders.length - orders.indexOf(orders.find(item=>item.id===o.id))}</span>
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
                        <span>{i.qty}x {i.name} ({getBlendText(i)} • หวาน {i.sweetness}{i.bean ? ` • ${i.bean}` : ''}{i.teaType ? ` • ${i.teaType}` : ''}{i.addShot ? ' • เพิ่มช็อต' : ''}{i.hasFreePearl && i.addPearl ? '+มุกฟรี':''}{i.selectedToppings?.length > 0 ? ` + ${i.selectedToppings.map(t=>t.name).join(',')}` : ''})</span>
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
                            {loadingSlipId === o.id ? <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <Eye size={12}/>}
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
                            {loadingSlipId === o.id ? <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div> : <Camera size={12}/>}
                            ดูรูปจัดส่ง
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-2 mt-4">
                    {o.hasSlip && <button onClick={() => viewImage(o.id, 'slip')} className="bg-blue-50 text-blue-600 py-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all border border-blue-100"><Eye size={14}/> ตรวจสลิป</button>}
                    <button onClick={() => deleteDoc(doc(db, 'orders', o.id))} className="bg-red-50 text-red-500 py-3 rounded-xl flex items-center justify-center active:scale-95 transition-all border border-red-100"><Trash2 size={16}/></button>
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
            {filteredOrders.length === 0 && <div className="py-20 text-center text-gray-400 font-bold opacity-50">ไม่มีออร์เดอร์ของวันนี้ 🐮</div>}
          </div>
        )}

        {/* TAB 3: ระบบจัดการคลังเมนูของร้าน */}
        {adminTab === 'menus' && (
          <div className="space-y-8 animate-in fade-in">
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
                        <span className="text-[11px] font-bold text-green-700 flex items-center gap-1">🍵 ให้ลูกค้าเลือกผงชา (มัทฉะ / โฮจิฉะ) ได้</span>
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
                              <div className="text-gray-300 flex-col items-center justify-center px-1 hidden sm:flex">
                                <div className="w-1 h-1 bg-gray-300 rounded-full mb-1"></div>
                                <div className="w-1 h-1 bg-gray-300 rounded-full mb-1"></div>
                                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                              </div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveMenu(item, 'down', itemsInCategory); }} disabled={idx === itemsInCategory.length - 1 || adminSearchQuery} className={`p-1.5 rounded-lg transition-all ${idx === itemsInCategory.length - 1 || adminSearchQuery ? 'text-gray-200' : 'text-accent bg-orange-50 active:scale-90 hover:bg-orange-100'}`}><ArrowDown size={14}/></button>
                            </div>
                            <img src={item.image} className={`w-14 h-14 rounded-2xl object-cover pointer-events-none ${item.isSoldOut ? 'grayscale opacity-50' : ''}`} alt="list" />
                            <div>
                              <p className="font-bold text-sm text-primary flex items-center gap-1 flex-wrap">
                                {item.name} 
                                {item.isPromoted && <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">แนะนำ</span>}
                                {item.isSoldOut && <span className="text-[8px] bg-gray-500 text-white px-1.5 py-0.5 rounded-full">หมด</span>}
                              </p>
                              <p className="text-xs text-accent font-bold">฿{item.price} {item.hasFreePearl && !item.isSoldOut ? '🌟' : ''}</p>
                              <div className="flex gap-1 mt-1">
                                {item.isOnlyBlend && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-sm">เฉพาะปั่น</span>}
                                {item.allowBlend === false && !item.isOnlyBlend && <p className="text-[9px] text-blue-400 bg-blue-50 px-1 rounded-sm">ไม่มีปั่น</p>}
                                {item.allowTopping === false && <p className="text-[9px] text-red-400 bg-red-50 px-1 rounded-sm">ห้ามเพิ่มท็อปปิ้ง</p>}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 z-10">
                            <button type="button" onClick={(e) => { 
                              e.stopPropagation(); 
                              if (editingMenu && editingMenu.id === item.id) setEditingMenu(null); 
                              else setEditingMenu(item); 
                            }} className={`p-3 active:scale-90 transition-all rounded-xl ${editingMenu && editingMenu.id === item.id ? 'bg-orange-500 text-white shadow-md' : 'text-blue-500 hover:bg-blue-100 bg-blue-50'}`}>
                              {editingMenu && editingMenu.id === item.id ? <X size={16}/> : <Edit size={16}/>}
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteMenu(item.id); }} className="p-3 text-red-500 hover:bg-red-100 active:scale-90 transition-all bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                          </div>
                        </div>
                        
                        {editingMenu && editingMenu.id === item.id && (
                          <div className="bg-orange-50 p-5 rounded-3xl border border-orange-200 shadow-inner mt-2 mb-4 mx-1 animate-in slide-in-from-top-4 space-y-4">
                            <div className="flex justify-between items-center mb-1 border-b border-orange-100 pb-2">
                               <h4 className="font-bold text-sm text-orange-600 flex items-center gap-2"><Edit size={16}/> แก้ไขเมนู</h4>
                            </div>
                            <input type="text" placeholder="ชื่อเมนู" className="w-full p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-400 border border-transparent bg-white font-bold" value={editingMenu.name} onChange={e => setEditingMenu({...editingMenu, name: e.target.value})} />
                            <div className="flex gap-2">
                              <input type="number" placeholder="ราคาปกติ" className="w-1/2 p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-400 border border-transparent bg-white font-bold" value={editingMenu.price} onChange={e => setEditingMenu({...editingMenu, price: e.target.value})} />
                              <select className="w-1/2 p-4 rounded-2xl text-sm outline-none shadow-sm bg-white focus:ring-2 focus:ring-orange-400 border border-transparent font-bold text-gray-600" value={editingMenu.category} onChange={e => setEditingMenu({...editingMenu, category: e.target.value})}>
                                {CATEGORIES.filter(c => c !== '🔥 เมนูขายดี').map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <label className="col-span-2 flex items-center justify-center gap-1 p-3 bg-blue-50 rounded-2xl shadow-sm border border-blue-100 cursor-pointer transition-all hover:bg-blue-100">
                                <input type="checkbox" checked={editingMenu.isOnlyBlend} onChange={e => setEditingMenu({...editingMenu, isOnlyBlend: e.target.checked, allowBlend: e.target.checked ? true : editingMenu.allowBlend})} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                                <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1"><Zap size={14} className="text-blue-500" fill="currentColor"/> เป็นเมนูเฉพาะปั่นเท่านั้น</span>
                              </label>

                              <label className={`flex items-center justify-center gap-1 p-3 rounded-2xl shadow-sm border cursor-pointer transition-all ${editingMenu.isOnlyBlend ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white border-blue-50 hover:bg-blue-50'}`}>
                                <input type="checkbox" disabled={editingMenu.isOnlyBlend} checked={editingMenu.isOnlyBlend || editingMenu.allowBlend !== false} onChange={e => setEditingMenu({...editingMenu, allowBlend: e.target.checked})} className="w-4 h-4 accent-blue-400 cursor-pointer" />
                                <span className="text-[10px] font-bold text-gray-500">มีเมนูปั่น</span>
                              </label>

                              <label className="flex items-center justify-center gap-1 p-3 bg-white rounded-2xl shadow-sm border border-gray-50 cursor-pointer transition-all hover:bg-gray-50">
                                <input type="checkbox" checked={editingMenu.allowTopping !== false} onChange={e => setEditingMenu({...editingMenu, allowTopping: e.target.checked})} className="w-4 h-4 accent-[#A67C52] cursor-pointer" />
                                <span className="text-[10px] font-bold text-gray-500">ท็อปปิ้งได้</span>
                              </label>

                              <label className="flex items-center justify-center gap-1 p-3 bg-white rounded-2xl shadow-sm border border-orange-50 cursor-pointer transition-all hover:bg-orange-50">
                                <input type="checkbox" checked={editingMenu.hasFreePearl} onChange={e => setEditingMenu({...editingMenu, hasFreePearl: e.target.checked})} className="w-4 h-4 accent-orange-400 cursor-pointer" />
                                <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><Star size={12} className="text-orange-400" fill="currentColor"/> มุกฟรี</span>
                              </label>

                              <label className="flex items-center justify-center gap-1 p-3 bg-gray-100 rounded-2xl shadow-sm border border-gray-200 cursor-pointer transition-all hover:bg-gray-200">
                                <input type="checkbox" checked={editingMenu.isSoldOut} onChange={e => setEditingMenu({...editingMenu, isSoldOut: e.target.checked})} className="w-4 h-4 accent-gray-600 cursor-pointer" />
                                <span className="text-[10px] font-bold text-gray-600 flex items-center gap-1">ปิดขายชั่วคราว</span>
                              </label>

                              <label className="col-span-2 flex items-center justify-center gap-1 p-3 bg-red-50 rounded-2xl shadow-sm border border-red-100 cursor-pointer transition-all hover:bg-red-100">
                                <input type="checkbox" checked={editingMenu.isPromoted} onChange={e => setEditingMenu({...editingMenu, isPromoted: e.target.checked})} className="w-4 h-4 accent-red-500 cursor-pointer" />
                                <span className="text-[11px] font-bold text-red-600 flex items-center gap-1"><Star size={14} className="text-red-500" fill="currentColor"/> ตั้งเป็นเมนูแนะนำ</span>
                              </label>
                              
                              {editingMenu.category === 'มัทฉะ' && (
                                <label className="col-span-2 flex items-center justify-center gap-1 p-3 bg-green-50 rounded-2xl shadow-sm border border-green-100 cursor-pointer transition-all hover:bg-green-100">
                                  <input type="checkbox" checked={editingMenu.hasTeaType} onChange={e => setEditingMenu({...editingMenu, hasTeaType: e.target.checked})} className="w-4 h-4 accent-green-600 cursor-pointer" />
                                  <span className="text-[11px] font-bold text-green-700 flex items-center gap-1">🍵 ให้ลูกค้าเลือกผงชา (มัทฉะ / โฮจิฉะ) ได้</span>
                                </label>
                              )}
                            </div>

                            {editingMenu.allowBlend !== false && editingMenu.category !== 'สมูทตี้โยเกิร์ต' && editingMenu.category !== 'ผลไม้และสมูทตี้' && (
                              <div className="mt-2 text-left">
                                <label className="text-[10px] font-bold text-gray-400 ml-2">บวกราคาเพิ่มสำหรับเมนูปั่น (บาท)</label>
                                <input type="number" placeholder="เช่น 5 หรือ 10" className="w-full mt-1 p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-400 transition-all bg-white border border-transparent font-bold" value={editingMenu.blendPrice} onChange={e => setEditingMenu({...editingMenu, blendPrice: e.target.value})} />
                              </div>
                            )}

                            <label className="cursor-pointer bg-white border border-gray-200 p-4 rounded-2xl text-xs font-bold block shadow-sm text-gray-400 hover:text-orange-500 hover:border-orange-300 transition-all mt-4">
                              <Upload size={18} className="inline mr-2"/> {editingMenu.image ? 'เปลี่ยนรูปเมนู' : 'อัปโหลดรูปภาพเมนู'}
                              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                const file = e.target.files[0];
                                if (file) { try { setEditingMenu({...editingMenu, image: await compressImage(file)}); } catch(err) { console.error(err); } }
                              }} />
                            </label>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingMenu(null)} className="flex-1 bg-white border border-gray-200 text-gray-500 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-sm hover:bg-gray-50">ยกเลิก</button>
                              <button onClick={handleUpdateMenu} className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-orange-600"><Save size={18}/> บันทึกการแก้ไข</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 🌟 TAB 4: คลังประวัติ (ดึงจาก Google Sheets On-Demand) */}
        {adminTab === 'history' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 shadow-sm text-center">
               <DatabaseBackup size={48} className="mx-auto text-blue-400 mb-4" />
               <h3 className="font-bold text-lg text-blue-800 mb-2">คลังข้อมูลและประวัติการสั่งซื้อ</h3>
               <p className="text-xs text-blue-600 mb-6 leading-relaxed">
                  ประวัติออร์เดอร์ย้อนหลังทั้งหมดถูกจัดเก็บอย่างปลอดภัยบน Google Sheets<br/>
                  กดปุ่มด้านล่างเพื่อดึงข้อมูลมาดูในหน้านี้โดยไม่ทำให้ระบบหลักช้าลง
               </p>
               <button 
                  onClick={fetchHistoricalData} 
                  disabled={isLoadingHistory}
                  className="bg-blue-600 text-white py-4 px-8 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all hover:bg-blue-700 flex items-center justify-center gap-2 mx-auto"
               >
                  {isLoadingHistory ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Download size={18}/>}
                  {isLoadingHistory ? 'กำลังดึงข้อมูลจาก Sheets...' : 'ดึงประวัติการสั่งซื้อทั้งหมด'}
               </button>
             </div>

             {historicalData.length > 0 && (
                <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                   <div className="flex justify-between items-center mb-4">
                     <h4 className="font-bold text-sm text-primary">ประวัติย้อนหลัง ({historicalData.length} รายการ)</h4>
                   </div>
                   
                   <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                     {historicalData.map((row, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
                           <div className="flex justify-between items-start border-b border-gray-200 pb-2 mb-2">
                              <div>
                                 <span className="font-bold text-primary">{row.Customer || row.customerName}</span>
                                 <p className="text-[10px] text-gray-500 mt-1">{row.Date || row.date}</p>
                              </div>
                              <div className="text-right">
                                 <span className="font-bold text-accent">฿{row.Total || row.total}</span>
                                 <p className="text-[9px] text-green-600 font-bold mt-1 bg-green-50 px-2 py-0.5 rounded-full">{row.Status || row.status}</p>
                              </div>
                           </div>
                           <p className="text-gray-600 font-medium mb-1"><MapPin size={10} className="inline mr-1"/>{row.Address || row.address}</p>
                           <p className="text-gray-500 leading-relaxed bg-white p-2 rounded-lg border border-gray-100">{row.Items || row.items}</p>
                        </div>
                     ))}
                   </div>
                </div>
             )}
          </div>
        )}

        {/* TAB 5: ตั้งค่าบัญชีและธีมร้าน */}
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
              {storeSettings.theme === 'custom' && (
                 <div className="mt-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <label className="text-[11px] font-bold text-indigo-900 mb-3 block text-center">🖼️ อัปโหลดรูปพื้นหลังร้าน</label>
                    <div className="flex flex-col gap-3">
                       <label className="cursor-pointer bg-white border-2 border-dashed border-indigo-200 text-indigo-500 py-4 px-4 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-2 shadow-sm hover:bg-indigo-50 transition-all">
                         <Upload size={20}/> {editCustomBgImage ? 'คลิกเพื่อเปลี่ยนรูปพื้นหลัง' : 'คลิกเลือกรูปภาพ'}
                         <input type="file" accept="image/*" className="hidden" onChange={async e => {
                           const file = e.target.files[0];
                           if(file) {
                             try {
                               const compressedImage = await compressImage(file, 800, 800, 0.5); 
                               setEditCustomBgImage(compressedImage);
                             } catch(err) { console.error(err); }
                           }
                         }} />
                       </label>
                       {editCustomBgImage && <img src={editCustomBgImage} className="w-full h-32 object-cover rounded-xl shadow-sm border border-gray-100" alt="Bg Preview" />}
                       {editCustomBgImage && (
                          <button onClick={async () => {
                             try { await setDoc(doc(db, 'settings', 'store'), { customBgImage: editCustomBgImage }, { merge: true }); showAlert('บันทึกรูปพื้นหลังสำเร็จ! 🎨 ลูกค้าจะเห็นพื้นหลังนี้ทันทีครับ'); } catch(e) { showAlert(e.message); }
                          }} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all">
                             บันทึกรูปพื้นหลัง
                          </button>
                       )}
                    </div>
                 </div>
              )}
            </div>
            
            {/* 2. สถานะร้าน และปิดออเดอร์ปั่นชั่วคราว */}
            <div className="bg-orange-50 p-6 rounded-[2.5rem] border-2 border-dashed border-orange-200 space-y-4 shadow-inner relative">
              <h3 className="font-bold text-sm text-accent uppercase tracking-widest text-center">สถานะร้าน และ วัตถุดิบ</h3>
              <div className="flex justify-center gap-3 pt-2">
                <button onClick={() => updateStoreStatus(true)} className={`flex-1 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 shadow-sm transition-all ${storeSettings.isStoreOpen !== false ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100 hover:border-green-200 hover:text-green-500'}`}><CheckCircle size={18}/> เปิดร้านแล้ว</button>
                <button onClick={() => updateStoreStatus(false)} className={`flex-1 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 shadow-sm transition-all ${storeSettings.isStoreOpen === false ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100 hover:border-red-200 hover:text-red-500'}`}><X size={18}/> ปิดร้านแล้ว</button>
              </div>

              <div className="mt-4 pt-4 border-t border-orange-200/50">
                <label className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-orange-100 cursor-pointer transition-all hover:bg-orange-50">
                  <div>
                    <p className="font-bold text-sm text-primary flex items-center gap-1">🚫 วันนี้ไม่มีเมนูปั่น</p>
                    <p className="text-[10px] text-gray-500 mt-1">ปิดรับออร์เดอร์ที่เป็นเมนูปั่นทั้งหมด</p>
                  </div>
                  <input type="checkbox" checked={storeSettings.isBlendOut || false} onChange={async (e) => {
                     try { await setDoc(doc(db, 'settings', 'store'), { isBlendOut: e.target.checked }, { merge: true }); } catch(err) { showAlert(err.message); }
                  }} className="w-5 h-5 accent-orange-500 cursor-pointer" />
                </label>
              </div>
            </div>

            {/* 3. ระบบปิดร้านอัตโนมัติ (คิวล้น) */}
            <div className="bg-red-50 p-6 rounded-[2.5rem] border-2 border-dashed border-red-200 space-y-4 shadow-inner relative mt-8">
              <h3 className="font-bold text-sm text-red-700 uppercase tracking-widest text-center flex items-center justify-center gap-2">🤖 ปิดร้านอัตโนมัติ (คิวล้น)</h3>
              <div className="mt-2">
                <label className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-red-100 cursor-pointer transition-all hover:bg-red-50">
                  <div>
                    <p className="font-bold text-sm text-primary flex items-center gap-1">🛑 ระบบปิดร้านออโต้เมื่อคิวเยอะ</p>
                    <p className="text-[10px] text-gray-500 mt-1">ช่วยปิดร้านแทนแอดมิน เพื่อกันลูกค้ารอนาน</p>
                  </div>
                  <input type="checkbox" checked={editAutoCloseEnabled} onChange={e => setEditAutoCloseEnabled(e.target.checked)} className="w-5 h-5 accent-red-500 cursor-pointer" />
                </label>
              </div>

              <div className={`transition-all space-y-3 ${editAutoCloseEnabled ? 'opacity-100 h-auto' : 'opacity-40 h-auto pointer-events-none'}`}>
                <label className="text-[11px] text-gray-500 block font-bold">จำนวนคิวสูงสุดก่อนปิดรับออร์เดอร์</label>
                <input type="number" placeholder="เช่น 3 คิว" className="w-full p-4 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-red-400 border border-transparent transition-all bg-white text-gray-700 font-bold" value={editMaxQueue} onChange={e => setEditMaxQueue(Number(e.target.value))} />

                <div className="pt-2">
                  <label className="text-[11px] text-gray-500 mb-2 block font-bold">เลือกวันที่จะให้ระบบคิวอัตโนมัติทำงาน</label>
                  <div className="flex flex-wrap gap-1.5">
                    {THAI_DAYS.map((day, idx) => {
                      const isSelected = editAutoCloseDays.includes(idx);
                      return (
                        <button
                          key={day} type="button"
                          onClick={() => {
                            setEditAutoCloseDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${isSelected ? 'bg-red-500 text-white border-red-500 shadow-sm' : 'bg-white text-gray-500 border-gray-100 hover:border-red-200'}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button onClick={async () => {
                try { 
                  await setDoc(doc(db, 'settings', 'store'), { autoCloseEnabled: editAutoCloseEnabled, maxQueue: editMaxQueue, autoCloseDays: editAutoCloseDays }, { merge: true }); 
                  showAlert('อัปเดตระบบปิดร้านอัตโนมัติเรียบร้อย! 🛑'); 
                } catch(e) { showAlert("Error: " + e.message); }
              }} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-md mt-4 hover:opacity-90">
                บันทึกระบบคิวอัตโนมัติ
              </button>
            </div>

            {/* 4. ตั้งค่าช่องทางชำระเงิน */}
            <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 space-y-4 shadow-inner relative">
              <h3 className="font-bold text-sm text-accent uppercase tracking-widest text-center">ตั้งค่าช่องทางชำระเงิน</h3>
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-bold">หมายเลขพร้อมเพย์</label>
                <input type="text" placeholder="เช่น 0812345678" className="w-full p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-accent border border-transparent transition-all font-bold" value={editPromptPay} onChange={e => setEditPromptPay(e.target.value)} />
              </div>
              <div className="pt-2">
                <label className="text-xs text-gray-500 mb-2 block font-bold">อัปโหลดรูป QR Code ของร้าน</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer bg-white border border-gray-200 text-gray-500 py-4 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50 hover:text-accent transition-all">
                    <Upload size={16}/> {editQrCodeImage ? 'เปลี่ยนรูป' : 'เลือกรูปจากเครื่อง'}
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const file = e.target.files[0];
                      if(file) { try { const compressedImage = await compressImage(file); setEditQrCodeImage(compressedImage); } catch(err) { console.error(err); } }
                    }} />
                  </label>
                  {editQrCodeImage && <img src={editQrCodeImage} className="w-16 h-16 rounded-xl object-cover shadow-sm border border-gray-100 bg-white" alt="QR Preview" />}
                  {editQrCodeImage && <button onClick={() => setEditQrCodeImage('')} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all active:scale-95"><Trash2 size={18}/></button>}
                </div>
              </div>
              <button onClick={async () => {
                try { await setDoc(doc(db, 'settings', 'store'), { promptPayNo: editPromptPay, qrCodeImage: editQrCodeImage }, { merge: true }); showAlert('อัปเดตการตั้งค่าร้านสำเร็จ! 🐮'); } catch(e) { showAlert("Error: " + e.message); }
              }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-md mt-4 hover:opacity-90">
                บันทึกการตั้งค่าร้าน
              </button>
            </div>

            {/* 5. การแจ้งเตือนและลิงก์ร้าน */}
            <div className="bg-blue-50 p-6 rounded-[2.5rem] border-2 border-dashed border-blue-200 space-y-4 shadow-inner relative">
              <h3 className="font-bold text-sm text-blue-700 uppercase tracking-widest text-center flex items-center justify-center gap-2"><BellRing size={16}/> แจ้งเตือนออร์เดอร์ (LINE)</h3>
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-bold">ลิงก์เพิ่มเพื่อนร้าน (LINE OA)</label>
                <input type="text" placeholder="เช่น https://lin.ee/xxxxx" className="w-full p-4 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-400 border border-transparent transition-all text-blue-700 font-bold" value={editShopLineUrl} onChange={e => setEditShopLineUrl(e.target.value)} />
              </div>
              <div className="mt-4 pt-4 border-t border-blue-100">
                <label className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-blue-100 cursor-pointer transition-all hover:bg-blue-50">
                  <div>
                    <p className="font-bold text-sm text-primary flex items-center gap-1">🔔 เปิดแจ้งเตือนผ่าน LINE ส่วนตัว</p>
                  </div>
                  <input type="checkbox" checked={editNotifyAdmin} onChange={e => setEditNotifyAdmin(e.target.checked)} className="w-5 h-5 accent-blue-500 cursor-pointer" />
                </label>
              </div>
              <div className={`transition-all ${editNotifyAdmin ? 'opacity-100 h-auto' : 'opacity-40 h-auto pointer-events-none'}`}>
                <label className="text-[11px] text-gray-500 mb-2 block font-bold">LINE User ID ของแอดมิน</label>
                <div className="flex gap-2">
                   <input type="text" placeholder="พิมพ์ LINE ID ที่นี่..." className="flex-1 p-4 rounded-2xl text-[10px] outline-none shadow-sm focus:ring-2 focus:ring-blue-400 border border-transparent transition-all bg-white text-gray-500 font-bold" value={editAdminLineId} onChange={e => setEditAdminLineId(e.target.value)} />
                </div>
              </div>
              <button onClick={async () => {
                if (editNotifyAdmin && !editAdminLineId) return showAlert('กรุณาใส่ LINE ID ก่อนบันทึกครับ');
                try { await setDoc(doc(db, 'settings', 'store'), { notifyAdmin: editNotifyAdmin, adminLineId: editAdminLineId, shopLineUrl: editShopLineUrl }, { merge: true }); showAlert('อัปเดตการแจ้งเตือนสำเร็จ! 🎉'); } catch(e) { showAlert("Error: " + e.message); }
              }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-md mt-4 hover:opacity-90">
                บันทึกการแจ้งเตือน
              </button>
            </div>
          </div>
        )}
      </main>

      {/* --- Modals --- */}
      {/* Modal ถ่ายรูปยืนยันการส่งของ */}
      {deliveryModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-primary">ยืนยันการจัดส่ง</h3>
              <button onClick={() => setDeliveryModal(null)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
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
                   <p className="text-xs font-bold mb-3 text-primary">แนบรูปถ่าย</p>
                   <label className="cursor-pointer bg-white border border-gray-200 text-gray-500 py-3 px-6 rounded-xl text-[11px] font-bold inline-flex items-center gap-2 shadow-sm hover:border-accent hover:text-accent">
                      <Camera size={16}/> {deliveryImage ? 'เปลี่ยนรูปภาพ' : 'ถ่ายรูป'}
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                         const file = e.target.files[0];
                         if(file){ setDeliveryImage(await compressImage(file)); }
                      }} />
                   </label>
                   {deliveryImage && <img src={deliveryImage} className="mt-4 h-32 w-full object-cover rounded-xl shadow-sm border border-gray-100" alt="Delivery Proof"/>}
                </div>
            )}
            <button onClick={handleConfirmDelivery} disabled={isDelivering || (deliveryLocation !== 'pickup' && !deliveryImage)} className={`w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${deliveryLocation === 'pickup' || deliveryImage ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
               {isDelivering ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle size={18}/>}
               {isDelivering ? 'กำลังบันทึก...' : 'ยืนยันการจัดส่ง'}
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

      {/* Custom Message Box */}
      {msgBox.isOpen && (
        <div className="fixed inset-0 bg-black/70 z-[400] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            {msgBox.type === 'confirm' ? <AlertCircle size={48} className="text-orange-500 mx-auto mb-5" /> : <CheckCircle size={48} className="text-green-500 mx-auto mb-5" />}
            <h3 className="font-bold text-sm text-gray-800 mb-8 whitespace-pre-line leading-relaxed">{msgBox.message}</h3>
            {msgBox.type === 'confirm' ? (
              <div className="flex gap-3">
                <button onClick={() => setMsgBox({ ...msgBox, isOpen: false })} className="flex-1 py-4 bg-gray-100 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-200">ยกเลิก</button>
                <button onClick={() => { if (msgBox.onConfirm) msgBox.onConfirm(); setMsgBox({ ...msgBox, isOpen: false }); }} className="flex-1 py-4 bg-primary text-white rounded-2xl text-xs font-bold shadow-md">ยืนยัน</button>
              </div>
            ) : (
              <button onClick={() => setMsgBox({ ...msgBox, isOpen: false })} className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-bold shadow-md">รับทราบ</button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}