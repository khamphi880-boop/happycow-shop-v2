import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, ChevronLeft, X, Upload, ClipboardList, Coffee, Zap, MapPin, Settings, Copy, CheckCircle, AlertCircle, LogIn, Eye, Clock, Check, Banknote, CreditCard, MessageSquare, Star, Edit, Save, Camera, Home, Building } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';

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

const CATEGORIES = ['🔥 เมนูขายดี', 'นม', 'ชา', 'กาแฟ', 'มัทฉะ', 'ผลไม้และสมูทตี้', 'เมนูพิเศษ'];
const SWEETNESS = ['0%', '25%', '50%', '75%', '100%'];

// --- ฟังก์ชันบีบอัดรูปภาพ (ลดขนาดไฟล์ให้เล็กลง) ---
const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // แปลงภาพเป็น JPEG และลด Quality ลงเหลือ 70%
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
};

export default function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [toppings, setToppings] = useState([]); 
  
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [view, setView] = useState('shop'); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [address, setAddress] = useState('');
  const [note, setNote] = useState(''); 
  const [slipImage, setSlipImage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('promptpay'); 
  const [isCopied, setIsCopied] = useState(false);
  
  // Admin State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTab, setAdminTab] = useState('orders');
  const [selectedSlip, setSelectedSlip] = useState(null); 
  
  // Admin Delivery State (จัดการการส่งสินค้า)
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [deliveryImage, setDeliveryImage] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('room');
  const [isDelivering, setIsDelivering] = useState(false);
  
  // Store Settings State
  const [storeSettings, setStoreSettings] = useState({ promptPayNo: '0812345678', qrCodeImage: '' });
  const [editPromptPay, setEditPromptPay] = useState('');
  const [editQrCodeImage, setEditQrCodeImage] = useState('');
  
  // Menu & Topping Management
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: 'นม', image: '', blendPrice: 5, hasFreePearl: false, allowTopping: true, allowBlend: true });
  const [editingMenu, setEditingMenu] = useState(null); 
  const [newTopping, setNewTopping] = useState({ name: '', price: '' }); 

  const [optionModalItem, setOptionModalItem] = useState(null);
  const [tempOptions, setTempOptions] = useState({ sweetness: '100%', isBlended: false, addPearl: true, selectedToppings: [] });
  const [lineProfile, setLineProfile] = useState({ displayName: 'ลูกค้าทั่วไป', pictureUrl: '', userId: '' });

  useEffect(() => {
    let cid = localStorage.getItem('happycow_uid') || 'guest_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('happycow_uid', cid);
    setLineProfile(prev => ({ ...prev, userId: cid }));

    const initializeLiff = () => {
      window.liff.init({ liffId: LIFF_ID }).then(() => {
        if (window.liff.isLoggedIn()) {
          window.liff.getProfile().then(p => setLineProfile({
            displayName: p.displayName,
            pictureUrl: p.pictureUrl,
            userId: p.userId
          }));
        } else {
          window.liff.login({ redirectUri: window.location.href });
        }
      }).catch(err => console.error("LIFF Error", err));
    };

    if (window.liff) {
      initializeLiff();
    } else {
      const script = document.createElement('script');
      script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
      script.onload = initializeLiff;
      document.body.appendChild(script);
    }

    onSnapshot(collection(db, 'menus'), snapshot => {
      setMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });

    onSnapshot(collection(db, 'orders'), snapshot => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp));
    });

    onSnapshot(collection(db, 'toppings'), snapshot => {
      setToppings(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(doc(db, 'settings', 'store'), docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoreSettings(data);
        setEditPromptPay(data.promptPayNo || '0812345678');
        setEditQrCodeImage(data.qrCodeImage || '');
      } else {
        setEditPromptPay('0812345678');
        setEditQrCodeImage('');
      }
    });
  }, []);

  const handleLineLogin = () => {
    if (window.liff && !window.liff.isLoggedIn()) window.liff.login();
  };

  const handleSaveMenu = async () => {
    const data = editingMenu || newMenu;
    if (!data.name || !data.price || !data.image) return alert('กรุณากรอกข้อมูลให้ครบครับ');
    if (data.category === '🔥 เมนูขายดี') return alert('หมวดหมู่ "เมนูขายดี" เป็นระบบอัตโนมัติ กรุณาเลือกหมวดหมู่อื่นครับ');
    
    try {
      if (editingMenu) {
        await updateDoc(doc(db, 'menus', editingMenu.id), {
          ...editingMenu, 
          price: Number(editingMenu.price), 
          blendPrice: Number(editingMenu.blendPrice), 
          allowTopping: editingMenu.allowTopping !== false,
          allowBlend: editingMenu.allowBlend !== false
        });
        alert('แก้ไขเมนูสำเร็จ! ✨');
        setEditingMenu(null);
      } else {
        await addDoc(collection(db, 'menus'), {
          ...newMenu, 
          price: Number(newMenu.price), 
          blendPrice: Number(newMenu.blendPrice), 
          allowTopping: newMenu.allowTopping !== false,
          allowBlend: newMenu.allowBlend !== false
        });
        alert('เพิ่มเมนูสำเร็จ! 🐮');
        setNewMenu({ name: '', price: '', category: 'นม', image: '', blendPrice: 5, hasFreePearl: false, allowTopping: true, allowBlend: true });
      }
    } catch (e) { alert(e.message); }
  };

  const handleDeleteMenu = async (id) => {
    if(window.confirm('ลบเมนูนี้ใช่หรือไม่?')) await deleteDoc(doc(db, 'menus', id));
  };

  const handleAddTopping = async () => {
    if (!newTopping.name || !newTopping.price) return alert('กรุณากรอกข้อมูลท็อปปิ้งให้ครบถ้วนครับ');
    try {
      await addDoc(collection(db, 'toppings'), { name: newTopping.name, price: Number(newTopping.price) });
      alert('เพิ่มท็อปปิ้งสำเร็จ!');
      setNewTopping({ name: '', price: '' });
    } catch (e) { alert(e.message); }
  };

  const handleDeleteTopping = async (id) => {
    if(window.confirm('ลบท็อปปิ้งนี้ใช่หรือไม่?')) await deleteDoc(doc(db, 'toppings', id));
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (e) { alert(e.message); }
  };

  // --- ฟังก์ชันยืนยันการส่งสินค้า (แอดมิน) ---
  const handleConfirmDelivery = async () => {
    if (!deliveryImage) return alert('กรุณาแนบรูปภาพการจัดส่งครับ 📸');
    setIsDelivering(true);
    
    try {
      const deliveryMessage = deliveryLocation === 'room' 
        ? 'ขอบคุณที่สั่งออเดอร์นะคะ 💖' 
        : 'ขออภัยแอดมินไม่สามารถเข้าตึกได้ รบกวนลูกค้าลงมารับเครื่องดื่มที่หน้าตึกนะคะ 🙏';

      // 1. อัปเดตข้อมูลลงฐานข้อมูล
      await updateDoc(doc(db, 'orders', deliveryModal.id), {
        status: 'completed',
        deliveryImage: deliveryImage,
        deliveryLocation: deliveryLocation,
        deliveryMessage: deliveryMessage
      });

      // 2. สร้าง Flex Message ส่งแจ้งเตือนลูกค้า
      const flexMessage = {
        type: "flex", altText: "อัปเดตสถานะการจัดส่ง",
        contents: {
          type: "bubble",
          header: {
            type: "box", layout: "vertical", backgroundColor: "#4caf50",
            contents: [{ type: "text", text: "ออร์เดอร์จัดส่งแล้ว!", color: "#ffffff", weight: "bold", align: "center", size: "md" }]
          },
          body: {
            type: "box", layout: "vertical", spacing: "md",
            contents: [
              { type: "text", text: `บิล #${deliveryModal.id.slice(0,6)}`, weight: "bold", size: "sm", color: "#A67C52" },
              { type: "text", text: deliveryMessage, wrap: true, size: "sm", weight: "bold", color: "#333333" },
              { type: "separator", margin: "md" },
              {
                type: "box", layout: "horizontal", margin: "md",
                contents: [
                  { type: "text", text: "📍 จุดส่ง:", size: "xs", color: "#888888", flex: 1 },
                  { type: "text", text: deliveryLocation === 'room' ? 'หน้าห้อง' : 'หน้าตึก', size: "xs", weight: "bold", flex: 3 }
                ]
              },
              { type: "text", text: "📌 ลูกค้าสามารถดูรูปถ่ายการจัดส่งได้ที่เมนู 'ประวัติการสั่งซื้อ' ในระบบร้านนะคะ", wrap: true, size: "xxs", color: "#aaaaaa", margin: "md" }
            ]
          }
        }
      };

      await fetch('/api/sendLine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deliveryModal.userId, flexMessage })
      });

      alert('บันทึกการจัดส่งและแจ้งเตือนลูกค้าเรียบร้อย! 🚀');
      setDeliveryModal(null);
    } catch (e) { alert("Error: " + e.message); }
    setIsDelivering(false);
  };

  // --- ฟังก์ชันสั่งซื้อ (ลูกค้า) ---
  const handleOrder = async () => {
    if ((lineProfile.userId || '').startsWith('guest_')) return alert("⚠️ กรุณาล็อกอิน LINE ก่อนครับ");
    if (!address) return alert("กรุณากรอกที่อยู่จัดส่งครับ");
    if (paymentMethod === 'promptpay' && !slipImage) return alert("กรุณาแนบสลิปการโอนเงินครับ");
    
    setIsLoading(true);
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const orderData = {
      items: cart, total, status: 'pending', timestamp: Date.now(),
      userId: lineProfile.userId, lineName: lineProfile.displayName, address, note, 
      slipImage: paymentMethod === 'promptpay' ? slipImage : 'cash_payment',
      paymentMethod: paymentMethod
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      
      const flexBodyContents = [
        { type: "text", text: `ขอบคุณคุณ ${lineProfile.displayName}`, weight: "bold", size: "md" },
        { type: "separator", margin: "md" },
        ...cart.map(i => {
          const toppingText = i.selectedToppings?.length > 0 ? ` + ${i.selectedToppings.map(t=>t.name).join(', ')}` : '';
          const blendText = i.allowBlend !== false ? (i.isBlended ? 'ปั่น' : 'เย็น') : 'เย็น/ปกติ';
          return { 
            type: "box", layout: "vertical", margin: "sm", 
            contents: [
              { type: "box", layout: "horizontal", contents: [{ type: "text", text: `${i.qty}x ${i.name}${toppingText}`, size: "xs", flex: 3, wrap: true, weight: "bold" }, { type: "text", text: `฿${i.price * i.qty}`, size: "xs", align: "end", flex: 1, weight: "bold" }] },
              { type: "text", text: `(${blendText} • หวาน ${i.sweetness}${i.hasFreePearl ? (i.addPearl ? ' • มุกฟรี' : ' • ไม่รับมุกฟรี') : ''})`, size: "xxs", color: "#888888", margin: "xs" }
            ]
          };
        }),
        { type: "separator", margin: "md" },
        { type: "box", layout: "vertical", margin: "md", contents: [
          { type: "text", text: "ที่อยู่จัดส่ง", size: "xs", color: "#888888", weight: "bold" },
          { type: "text", text: address, size: "xs", wrap: true, margin: "xs" }
        ]},
        note.trim() ? { 
          type: "box", layout: "vertical", margin: "sm", backgroundColor: "#F5F5F5", paddingAll: "sm", cornerRadius: "sm", 
          contents: [
            { type: "text", text: "หมายเหตุถึงร้าน", size: "xxs", color: "#888888", weight: "bold" },
            { type: "text", text: note, size: "xs", wrap: true, margin: "xs" }
          ] 
        } : null,
        { type: "separator", margin: "md" },
        { type: "box", layout: "horizontal", margin: "md", contents: [{ type: "text", text: "รวมทั้งสิ้น", weight: "bold", size: "md" }, { type: "text", text: `฿${total}`, align: "end", weight: "bold", color: "#A67C52", size: "md" }] }
      ].filter(Boolean);

      const flexMessage = {
        type: "flex", altText: "ใบเสร็จจากร้านวัวนมอารมณ์ดี",
        contents: {
          type: "bubble",
          header: { 
            type: "box", layout: "vertical", backgroundColor: "#3D2C1E",
            contents: [
              { type: "text", text: "ร้านวัวนมอารมณ์ดี", color: "#ffffff", weight: "bold", size: "lg", align: "center" },
              {
                type: "box", layout: "horizontal",
                backgroundColor: paymentMethod === 'promptpay' ? "#4caf50" : "#ff9800",
                cornerRadius: "sm", paddingAll: "xs", margin: "sm",
                contents: [{ type: "text", text: paymentMethod === 'promptpay' ? "ชำระเงินเรียบร้อยแล้ว" : "ชำระด้วยเงินสด", color: "#ffffff", size: "xxs", align: "center", weight: "bold" }]
              }
            ]
          },
          body: { type: "box", layout: "vertical", contents: flexBodyContents }
        }
      };

      await fetch('/api/sendLine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: lineProfile.userId, flexMessage })
      });

      setCart([]); setSlipImage(''); setAddress(''); setNote(''); setView('myOrders');
      alert("สั่งซื้อสำเร็จ! บิลส่งเข้าแชทแล้วนะครับ 🐮");
    } catch (e) { alert("Error: " + e.message); }
    setIsLoading(false);
  };

  const copyPromptPay = () => {
    const numToCopy = storeSettings.promptPayNo || '0812345678';
    navigator.clipboard.writeText(numToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const bestSellers = React.useMemo(() => {
    if (orders.length === 0 || menuItems.length === 0) return [];
    const salesCount = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        salesCount[item.name] = (salesCount[item.name] || 0) + item.qty;
      });
    });
    let sortedMenus = menuItems.map(menu => ({ ...menu, sales: salesCount[menu.name] || 0 }));
    sortedMenus = sortedMenus.filter(m => m.sales > 0).sort((a, b) => b.sales - a.sales);
    if (sortedMenus.length === 0) return menuItems.slice(0, 4); 
    return sortedMenus;
  }, [orders, menuItems]);

  const filteredItems = React.useMemo(() => {
    if (activeCategory === '🔥 เมนูขายดี') return bestSellers;
    return menuItems.filter(i => i.category === activeCategory);
  }, [activeCategory, menuItems, bestSellers]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F5EEDC] flex flex-col font-sans text-[#3D2C1E]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vollkorn:wght@700&display=swap');
        .font-serif { font-family: 'Vollkorn', serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-[50] bg-white/95 p-4 flex justify-between items-center border-b border-[#A67C52]/10 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('shop')}>
           {lineProfile.pictureUrl ? <img src={lineProfile.pictureUrl} className="w-10 h-10 rounded-full border-2 border-orange-100" alt="profile" /> : <div className="w-10 h-10 bg-[#3D2C1E] text-white rounded-full flex items-center justify-center font-bold">🐮</div>}
           <div>
             <h1 className="font-serif font-bold text-lg leading-tight">วัวนมอารมณ์ดี</h1>
             {(lineProfile.userId || '').startsWith('guest_') ? (
               <button onClick={handleLineLogin} className="text-[10px] bg-[#06C755] text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 mt-1 shadow-sm"><LogIn size={10}/> กำลังล็อกอิน...</button>
             ) : (
               <p className="text-[9px] font-bold text-green-700 uppercase tracking-tighter">คุณ {(lineProfile.displayName || '').slice(0, 15)}</p>
             )}
           </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdminModal(true)} className="p-2 text-gray-300"><Settings size={18}/></button>
          <button onClick={() => setView('myOrders')} className="p-2 text-gray-400"><ClipboardList/></button>
          <button onClick={() => setView('cart')} className="relative p-2 bg-[#3D2C1E] text-white rounded-xl w-10 h-10 flex items-center justify-center shadow-lg active:scale-90 transition-all">
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#A67C52] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#F5EEDC] shadow-sm">{cart.length}</span>}
            <ShoppingCart size={20}/>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-10">
        {view === 'shop' && (
          <div className="animate-in fade-in">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar p-4 sticky top-[73px] z-[40] bg-[#F5EEDC]/95">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeCategory === c && c === '🔥 เมนูขายดี' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : activeCategory === c ? 'bg-[#3D2C1E] text-white border-[#3D2C1E] shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}>{c}</button>
              ))}
            </div>

            <div className="p-5">
              {isLoading ? <div className="p-20 text-center opacity-30 italic">กำลังโหลดเมนู...</div> : (
                <div className="grid grid-cols-2 gap-5">
                  {filteredItems.map((item, index) => (
                    <div key={item.id} onClick={() => { setOptionModalItem(item); setTempOptions({sweetness: '100%', isBlended: false, addPearl: item.hasFreePearl, selectedToppings: []}); }} className="bg-white rounded-[2rem] overflow-hidden shadow-sm active:scale-95 transition-all cursor-pointer relative">
                      {item.hasFreePearl && <div className="absolute top-2 right-2 bg-orange-400 text-white text-[8px] px-2 py-0.5 rounded-full font-bold shadow-sm z-10 flex items-center gap-0.5"><Star size={8} fill="white"/> แถมมุกฟรี</div>}
                      
                      {activeCategory === '🔥 เมนูขายดี' && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg z-10 shadow-sm flex items-center gap-1">
                          อันดับ {index + 1}
                        </div>
                      )}

                      <div className="aspect-square bg-gray-50"><img src={item.image} className="w-full h-full object-cover" alt={item.name} /></div>
                      <div className="p-4 text-center">
                        <h4 className="font-bold text-sm mb-1 line-clamp-1">{item.name}</h4>
                        <p className="text-[#A67C52] font-bold text-sm">฿{item.price}</p>
                        
                        {activeCategory === '🔥 เมนูขายดี' && item.sales > 0 && (
                          <p className="text-[9px] text-gray-400 mt-1">ขายไปแล้ว {item.sales} แก้ว</p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {filteredItems.length === 0 && activeCategory !== '🔥 เมนูขายดี' && (
                    <div className="col-span-2 py-20 text-center flex flex-col items-center gap-4">
                      <AlertCircle size={40} className="text-gray-200" />
                      <p className="text-gray-400 text-sm">ยังไม่มีเมนูในหมวด "{activeCategory}"</p>
                    </div>
                  )}

                  {filteredItems.length === 0 && activeCategory === '🔥 เมนูขายดี' && (
                     <div className="col-span-2 py-20 text-center opacity-30 italic">
                        รอการสั่งซื้อครั้งแรก เพื่อจัดอันดับเมนูขายดีครับ 🐮
                     </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'cart' && (
          <div className="p-6 space-y-6 bg-white rounded-t-[3rem] mt-4 min-h-[85vh] shadow-2xl animate-in slide-in-from-bottom-10">
            <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-gray-400 text-sm"><ChevronLeft size={20}/> เลือกเมนูเพิ่ม</button>
            <h2 className="text-3xl font-serif font-bold text-[#3D2C1E]">ตะกร้าของคุณ</h2>
            <div className="space-y-4">
               {cart.map(i => {
                 const blendText = i.allowBlend !== false ? (i.isBlended ? 'ปั่น' : 'เย็น') : 'เย็น/ปกติ';
                 return (
                   <div key={i.cartId} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                     <div className="flex-1 font-bold text-sm">
                       {i.qty}x {i.name} <br/>
                       <span className="text-gray-400 text-[10px] uppercase">
                         ({blendText} • หวาน {i.sweetness}{i.hasFreePearl ? (i.addPearl ? ' • มุกฟรี' : ' • ไม่รับมุกฟรี') : ''})
                         {i.selectedToppings?.length > 0 && ` • เพิ่ม: ${i.selectedToppings.map(t=>t.name).join(', ')}`}
                       </span>
                     </div>
                     <div className="flex items-center gap-4"><p className="font-bold text-[#A67C52]">฿{i.price * i.qty}</p><button onClick={() => setCart(prev => prev.filter(item => item.cartId !== i.cartId))} className="text-red-300"><Trash2 size={16}/></button></div>
                   </div>
                 );
               })}
               {cart.length === 0 && <div className="py-20 text-center opacity-20 italic font-bold">ยังไม่มีสินค้าในตะกร้า 🐮</div>}
            </div>

            {cart.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-gray-100">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#A67C52] uppercase tracking-wider block">วิธีชำระเงิน</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPaymentMethod('promptpay')} className={`py-4 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${paymentMethod === 'promptpay' ? 'border-[#A67C52] bg-[#F5EEDC]/40 text-[#3D2C1E]' : 'border-gray-50 text-gray-300'}`}><CreditCard size={20}/><span className="text-[10px]">โอนพร้อมเพย์</span></button>
                    <button onClick={() => setPaymentMethod('cash')} className={`py-4 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-[#A67C52] bg-[#F5EEDC]/40 text-[#3D2C1E]' : 'border-gray-50 text-gray-300'}`}><Banknote size={20}/><span className="text-[10px]">ชำระเงินสด</span></button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#A67C52] uppercase tracking-wider block mb-2">ที่อยู่จัดส่ง / เบอร์โทร</label>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="เบอร์โทร และจุดส่งสินค้า..." className="w-full p-5 rounded-3xl bg-gray-50 h-24 text-sm outline-none border focus:border-[#A67C52]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#A67C52] uppercase tracking-wider block mb-2 flex items-center gap-1"><MessageSquare size={14}/> หมายเหตุถึงร้านค้า</label>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น หวานน้อย, แยกน้ำ..." className="w-full p-4 rounded-2xl bg-gray-50 text-sm outline-none border focus:border-[#A67C52]" />
                  </div>
                </div>
                {paymentMethod === 'promptpay' && (
                  <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center">
                    <p className="text-xs font-bold mb-4">สแกนชำระเงิน พร้อมแนบสลิป</p>
                    {storeSettings.qrCodeImage ? (
                      <img src={storeSettings.qrCodeImage} className="w-40 h-40 mx-auto mb-4 bg-white p-2 rounded-xl object-contain shadow-sm" alt="QR Code ร้าน" />
                    ) : (
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PROMPTPAY:${storeSettings.promptPayNo}:${cart.reduce((s,i)=>s+(i.price*i.qty),0)}`} className="w-40 h-40 mx-auto mb-4 bg-white p-2 rounded-xl" alt="QR Code อัตโนมัติ" />
                    )}
                    
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <p className="text-xs text-gray-500 font-bold">พร้อมเพย์: {storeSettings.promptPayNo || '0812345678'}</p>
                      <button onClick={copyPromptPay} className="flex items-center gap-1 bg-white border border-gray-200 text-[#A67C52] px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-all">
                        {isCopied ? <CheckCircle size={14} className="text-green-500"/> : <Copy size={14}/>}
                        <span className="text-[10px] font-bold">{isCopied ? 'คัดลอกแล้ว' : 'คัดลอกเลข'}</span>
                      </button>
                    </div>

                    <label className="cursor-pointer bg-[#3D2C1E] text-white py-4 px-8 rounded-2xl text-[11px] font-bold inline-flex items-center gap-2 shadow-lg active:scale-95">
                      <Upload size={18}/> {slipImage ? 'เปลี่ยนรูปสลิป' : 'แนบรูปสลิป'}
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const file = e.target.files[0];
                        if (file) {
                          const compressedImage = await compressImage(file);
                          setSlipImage(compressedImage);
                        }
                      }} />
                    </label>
                    {slipImage && <img src={slipImage} className="mt-4 h-32 mx-auto rounded-lg shadow-md border-2 border-white" alt="Slip" />}
                  </div>
                )}
                <button onClick={handleOrder} disabled={isLoading || (paymentMethod === 'promptpay' && !slipImage)} className={`w-full py-5 rounded-[2.5rem] font-bold text-lg transition-all shadow-xl active:scale-95 ${ (paymentMethod === 'cash' || slipImage) ? 'bg-[#A67C52] text-white' : 'bg-gray-100 text-gray-300'}`}>{isLoading ? 'กำลังประมวลผล...' : `สั่งซื้อสินค้า • ฿${cart.reduce((s,i)=>s+(i.price*i.qty),0)}`}</button>
              </div>
            )}
          </div>
        )}

        {/* --- ฝั่งลูกค้า: ประวัติการสั่งซื้อ --- */}
        {view === 'myOrders' && (
          <div className="p-6 space-y-6 flex-1 animate-in slide-in-from-right-10">
             <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-gray-400 text-sm"><ChevronLeft size={20}/> กลับไปหน้าร้าน</button>
             <h2 className="text-3xl font-serif font-bold text-[#3D2C1E]">ประวัติการสั่งซื้อ</h2>
             <div className="space-y-6">
               {orders.filter(o => o.userId === lineProfile.userId).map(o => (
                   <div key={o.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 p-4">
                      <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                        <div><span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-wider">บิล #{o.id.slice(0,6)}</span><p className="text-xs font-bold text-orange-400 mt-1 uppercase">{o.status}</p></div>
                        <div className="text-2xl font-serif font-bold text-[#3D2C1E]">฿{o.total}</div>
                      </div>
                      
                      {/* รายการสินค้า */}
                      <div className="space-y-1">{(o.items || []).map((item, idx) => {
                         const blendText = item.allowBlend !== false ? (item.isBlended ? 'ปั่น' : 'เย็น') : 'เย็น/ปกติ';
                         return (
                          <p key={idx} className="text-[11px] font-bold text-gray-400">
                            {item.qty}x {item.name} ({blendText})
                            {item.selectedToppings?.length > 0 && ` + ${item.selectedToppings.map(t=>t.name).join(', ')}`}
                          </p>
                         );
                      })}</div>

                      {/* แสดงข้อความจากแอดมิน และ ปุ่มดูรูปส่งของ */}
                      {o.status === 'completed' && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {o.deliveryMessage && (
                            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 mb-3">
                              <p className="text-[10px] font-bold text-[#A67C52] mb-1 flex items-center gap-1"><MessageSquare size={12}/> ข้อความจากแอดมิน:</p>
                              <p className="text-[11px] text-gray-600 font-bold">{o.deliveryMessage}</p>
                            </div>
                          )}
                          {o.deliveryImage && (
                            <button onClick={() => setSelectedSlip(o.deliveryImage)} className="w-full bg-[#3D2C1E] text-white py-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
                               <Camera size={16}/> ดูรูปถ่ายตอนจัดส่ง
                            </button>
                          )}
                        </div>
                      )}
                   </div>
               ))}
             </div>
          </div>
        )}

        {/* --- Admin Tab --- */}
        {view === 'admin' && (
          <div className="p-6 bg-white min-h-screen animate-in fade-in">
            <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-gray-400 text-sm mb-6"><ChevronLeft size={20}/> กลับหน้าร้าน</button>
            <h2 className="text-2xl font-serif font-bold mb-6 text-[#3D2C1E]">ระบบแอดมิน</h2>
            
            <div className="flex gap-2 bg-gray-50 p-1 rounded-2xl mb-6 shadow-inner">
              {['orders', 'menus', 'settings'].map(t => (
                <button key={t} onClick={() => setAdminTab(t)} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${adminTab === t ? 'bg-[#3D2C1E] text-white shadow-md' : 'text-gray-500 uppercase'}`}>
                  {t === 'orders' ? 'ออร์เดอร์' : t === 'menus' ? 'เมนู' : 'ตั้งค่าร้าน'}
                </button>
              ))}
            </div>

            {adminTab === 'orders' && (
              <div className="space-y-4">
                {orders.map((o, idx) => (
                    <div key={o.id} className="border border-gray-100 p-5 rounded-3xl shadow-sm bg-white animate-in fade-in">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2"><span className="bg-[#3D2C1E] text-white w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold">#{orders.length - idx}</span><span className="font-bold text-sm text-[#3D2C1E]">{o.lineName}</span></div>
                        <div className="text-right"><span className="text-orange-600 font-bold block">฿{o.total}</span><span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{o.paymentMethod === 'cash' ? '💵 จ่ายสด' : '📱 โอนเงิน'}</span></div>
                      </div>
                      <div className="text-[10px] text-gray-400 mb-3 flex items-center gap-2"><MapPin size={12}/> {o.address}</div>
                      
                      <div className="space-y-1 border-t pt-3 mb-3">{(o.items || []).map((i, idx) => {
                        const blendText = i.allowBlend !== false ? (i.isBlended?'ปั่น':'เย็น') : 'เย็น/ปกติ';
                        return (
                          <div key={idx} className="text-xs text-gray-600 flex justify-between">
                            <span>{i.qty}x {i.name} ({blendText}{i.hasFreePearl && i.addPearl ? '+มุกฟรี':''}{i.selectedToppings?.length > 0 ? ` + ${i.selectedToppings.map(t=>t.name).join(',')}` : ''})</span>
                            <span className="font-bold">฿{i.price * i.qty}</span>
                          </div>
                        );
                      })}</div>

                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {o.paymentMethod !== 'cash' && <button onClick={() => setSelectedSlip(o.slipImage)} className="bg-blue-50 text-blue-600 py-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"><Eye size={14}/> ดูสลิป</button>}
                        <button onClick={() => deleteDoc(doc(db, 'orders', o.id))} className="bg-red-50 text-red-400 py-3 rounded-xl flex items-center justify-center active:scale-95 transition-all"><Trash2 size={16}/></button>
                      </div>

                      <div className="flex gap-2 border-t pt-3 mt-2">
                        {o.status === 'pending' && <button onClick={() => updateOrderStatus(o.id, 'cooking')} className="flex-1 bg-orange-400 text-white py-4 rounded-xl text-[11px] font-bold shadow-lg animate-pulse active:scale-95 transition-all">กดยอมรับออเดอร์</button>}
                        
                        {/* เปลี่ยนปุ่มส่งสินค้า ให้เปิด Modal แนบรูปแทน */}
                        {o.status === 'cooking' && (
                          <button onClick={() => { setDeliveryModal(o); setDeliveryImage(''); setDeliveryLocation('room'); }} className="flex-1 bg-green-500 text-white py-4 rounded-xl text-[11px] font-bold shadow-md flex items-center justify-center gap-1 active:scale-95 transition-all">
                             <Check size={14}/> ส่งสินค้าแล้ว
                          </button>
                        )}
                        
                        {o.status === 'completed' && <div className="flex-1 text-center text-[10px] font-bold text-green-600 py-2 border border-green-200 rounded-xl bg-green-50">สำเร็จแล้ว</div>}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {adminTab === 'menus' && (
              <div className="space-y-8 animate-in fade-in">
                {/* ฟอร์มเพิ่ม/แก้ไขเมนูของแอดมิน */}
                <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 space-y-4 text-center shadow-inner relative">
                  <h3 className="font-bold text-sm text-[#A67C52] uppercase tracking-widest">{editingMenu ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h3>
                  <input type="text" placeholder="ชื่อเมนู" className="w-full p-4 rounded-2xl text-sm outline-none shadow-sm" value={editingMenu ? editingMenu.name : newMenu.name} onChange={e => editingMenu ? setEditingMenu({...editingMenu, name: e.target.value}) : setNewMenu({...newMenu, name: e.target.value})} />
                  
                  <div className="flex gap-2">
                    <input type="number" placeholder="ราคาปกติ" className="w-1/2 p-4 rounded-2xl text-sm outline-none shadow-sm" value={editingMenu ? editingMenu.price : newMenu.price} onChange={e => editingMenu ? setEditingMenu({...editingMenu, price: e.target.value}) : setNewMenu({...newMenu, price: e.target.value})} />
                    
                    <select className="w-1/2 p-4 rounded-2xl text-sm outline-none shadow-sm bg-white" value={editingMenu ? editingMenu.category : newMenu.category} onChange={e => editingMenu ? setEditingMenu({...editingMenu, category: e.target.value}) : setNewMenu({...newMenu, category: e.target.value})}>
                      {CATEGORIES.filter(c => c !== '🔥 เมนูขายดี').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <label className="flex items-center justify-center gap-1 p-3 bg-white rounded-2xl shadow-sm border border-orange-50 cursor-pointer">
                      <input type="checkbox" checked={editingMenu ? editingMenu.hasFreePearl : newMenu.hasFreePearl} onChange={e => editingMenu ? setEditingMenu({...editingMenu, hasFreePearl: e.target.checked}) : setNewMenu({...newMenu, hasFreePearl: e.target.checked})} className="w-4 h-4 accent-orange-400" />
                      <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><Star size={12} className="text-orange-400" fill="currentColor"/> มุกฟรี</span>
                    </label>

                    <label className="flex items-center justify-center gap-1 p-3 bg-white rounded-2xl shadow-sm border border-gray-50 cursor-pointer">
                      <input type="checkbox" checked={editingMenu ? editingMenu.allowTopping !== false : newMenu.allowTopping !== false} onChange={e => editingMenu ? setEditingMenu({...editingMenu, allowTopping: e.target.checked}) : setNewMenu({...newMenu, allowTopping: e.target.checked})} className="w-4 h-4 accent-[#A67C52]" />
                      <span className="text-[10px] font-bold text-gray-500">ท็อปปิ้งได้</span>
                    </label>

                    <label className="flex items-center justify-center gap-1 p-3 bg-white rounded-2xl shadow-sm border border-blue-50 cursor-pointer">
                      <input type="checkbox" checked={editingMenu ? editingMenu.allowBlend !== false : newMenu.allowBlend !== false} onChange={e => editingMenu ? setEditingMenu({...editingMenu, allowBlend: e.target.checked}) : setNewMenu({...newMenu, allowBlend: e.target.checked})} className="w-4 h-4 accent-blue-400" />
                      <span className="text-[10px] font-bold text-gray-500">มีเมนูปั่น</span>
                    </label>
                  </div>

                  {(editingMenu ? editingMenu.allowBlend !== false : newMenu.allowBlend !== false) && (
                    <div className="mt-2 text-left">
                      <label className="text-[10px] font-bold text-gray-400 ml-2">บวกราคาเพิ่มสำหรับเมนูปั่น (บาท)</label>
                      <input type="number" placeholder="เช่น 5 หรือ 10" className="w-full mt-1 p-4 rounded-2xl text-sm outline-none shadow-sm focus:border-blue-400 transition-all bg-white" value={editingMenu ? editingMenu.blendPrice : newMenu.blendPrice} onChange={e => editingMenu ? setEditingMenu({...editingMenu, blendPrice: e.target.value}) : setNewMenu({...newMenu, blendPrice: e.target.value})} />
                    </div>
                  )}

                  <label className="cursor-pointer bg-white border p-4 rounded-2xl text-xs font-bold block shadow-sm text-gray-400 hover:text-[#A67C52] transition-all mt-4">
                    <Upload size={18} className="inline mr-2"/> {(editingMenu ? editingMenu.image : newMenu.image) ? 'เปลี่ยนรูปเมนู' : 'อัปโหลดรูปภาพเมนู'}
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const file = e.target.files[0];
                      if (file) {
                        const compressedImage = await compressImage(file);
                        editingMenu ? setEditingMenu({...editingMenu, image: compressedImage}) : setNewMenu({...newMenu, image: compressedImage});
                      }
                    }} />
                  </label>
                  <div className="flex gap-2">
                    {editingMenu && <button onClick={() => setEditingMenu(null)} className="flex-1 bg-gray-200 text-gray-500 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all">ยกเลิก</button>}
                    <button onClick={handleSaveMenu} className="flex-[2] bg-[#A67C52] text-white py-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">{editingMenu ? <Save size={18}/> : <Plus size={18}/>}{editingMenu ? 'บันทึกการแก้ไข' : 'บันทึกเมนูใหม่'}</button>
                  </div>
                </div>

                <div className="bg-orange-50 p-6 rounded-[2.5rem] border-2 border-dashed border-orange-200 space-y-4 text-center shadow-inner relative mt-8">
                  <h3 className="font-bold text-sm text-orange-600 uppercase tracking-widest">เพิ่มท็อปปิ้งเสริม</h3>
                  <div className="flex gap-2">
                    <input type="text" placeholder="ชื่อท็อปปิ้ง (เช่น วิปครีม)" className="w-2/3 p-4 rounded-2xl text-sm outline-none shadow-sm" value={newTopping.name} onChange={e => setNewTopping({...newTopping, name: e.target.value})} />
                    <input type="number" placeholder="ราคา" className="w-1/3 p-4 rounded-2xl text-sm outline-none shadow-sm" value={newTopping.price} onChange={e => setNewTopping({...newTopping, price: e.target.value})} />
                  </div>
                  <button onClick={handleAddTopping} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">บันทึกท็อปปิ้งใหม่</button>

                  {toppings.length > 0 && (
                    <div className="space-y-2 mt-4 text-left">
                      {toppings.map(t => (
                        <div key={t.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                          <span className="text-sm font-bold text-[#3D2C1E]">{t.name} <span className="text-orange-500 text-xs">(+฿{t.price})</span></span>
                          <button onClick={() => handleDeleteTopping(t.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                   {menuItems.map(item => (
                     <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
                       <div className="flex items-center gap-4">
                         <img src={item.image} className="w-14 h-14 rounded-2xl object-cover" alt="list" />
                         <div>
                            <p className="font-bold text-sm text-[#3D2C1E]">{item.name}</p>
                            <p className="text-xs text-[#A67C52] font-bold">฿{item.price} {item.hasFreePearl ? '🌟' : ''}</p>
                            <div className="flex gap-1 mt-1">
                              {item.allowBlend === false && <p className="text-[9px] text-blue-400 bg-blue-50 px-1 rounded-sm">ไม่มีปั่น</p>}
                              {item.allowTopping === false && <p className="text-[9px] text-red-400 bg-red-50 px-1 rounded-sm">ห้ามเพิ่มท็อปปิ้ง</p>}
                            </div>
                         </div>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => setEditingMenu(item)} className="p-3 text-blue-400 active:scale-90 transition-all"><Edit size={18}/></button>
                         <button onClick={() => handleDeleteMenu(item.id)} className="p-3 text-red-300 active:scale-90 transition-all"><Trash2 size={18}/></button>
                       </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {adminTab === 'settings' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 space-y-4 shadow-inner relative">
                  <h3 className="font-bold text-sm text-[#A67C52] uppercase tracking-widest text-center">ตั้งค่าช่องทางชำระเงิน</h3>
                  
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block font-bold">หมายเลขพร้อมเพย์ (เบอร์โทร หรือ บัตรประชาชน)</label>
                    <input type="text" placeholder="เช่น 0812345678" className="w-full p-4 rounded-2xl text-sm outline-none shadow-sm focus:border-[#A67C52]" value={editPromptPay} onChange={e => setEditPromptPay(e.target.value)} />
                  </div>

                  <div className="pt-2">
                    <label className="text-xs text-gray-500 mb-2 block font-bold">อัปโหลดรูป QR Code ของร้าน (ถ้ามี)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer bg-white border border-gray-200 text-gray-500 py-4 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50 transition-all">
                        <Upload size={16}/> {editQrCodeImage ? 'เปลี่ยนรูป QR Code' : 'เลือกรูปจากเครื่อง'}
                        <input type="file" accept="image/*" className="hidden" onChange={async e => {
                          const file = e.target.files[0];
                          if(file) {
                            const compressedImage = await compressImage(file);
                            setEditQrCodeImage(compressedImage);
                          }
                        }} />
                      </label>
                      {editQrCodeImage && <img src={editQrCodeImage} className="w-16 h-16 rounded-xl object-cover shadow-sm border border-gray-100" alt="QR Preview" />}
                      {editQrCodeImage && <button onClick={() => setEditQrCodeImage('')} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all active:scale-95"><Trash2 size={18}/></button>}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">*หากอัปโหลดรูป ระบบจะแสดงรูปนี้แทนการสร้าง QR Code อัตโนมัติในหน้าตะกร้าของลูกค้า</p>
                  </div>

                  <button onClick={async () => {
                    try {
                      await setDoc(doc(db, 'settings', 'store'), { promptPayNo: editPromptPay, qrCodeImage: editQrCodeImage }, { merge: true });
                      alert('อัปเดตการตั้งค่าร้านสำเร็จ! 🐮');
                    } catch(e) { alert("Error: " + e.message); }
                  }} className="w-full bg-[#3D2C1E] text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-md mt-4">
                    บันทึกการตั้งค่าร้าน
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- Modal ตัวเลือกสินค้า --- */}
      {optionModalItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-t-[3.5rem] w-full max-w-md p-10 space-y-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-serif font-bold text-[#3D2C1E]">{optionModalItem.name}</h3><button onClick={() => setOptionModalItem(null)} className="p-4 bg-gray-50 rounded-2xl text-gray-400 transition-all hover:text-gray-600"><X/></button></div>
            <div className="space-y-8">
              <div><label className="text-[10px] font-bold block mb-4 text-gray-400 uppercase tracking-widest">ความหวาน</label>
                <div className="grid grid-cols-5 gap-2">{SWEETNESS.map(l => (
                    <button key={l} onClick={() => setTempOptions({...tempOptions, sweetness: l})} className={`py-3.5 rounded-2xl text-[10px] font-bold border transition-all ${tempOptions.sweetness === l ? 'bg-[#3D2C1E] text-white border-[#3D2C1E] shadow-md' : 'bg-white text-gray-300 border-gray-100'}`}>{l}</button>
                ))}</div>
              </div>

              {optionModalItem.hasFreePearl && (
                <div>
                   <label className="text-sm font-bold block mb-4 text-orange-400 uppercase tracking-widest text-[10px] flex items-center gap-1"><Star size={12} fill="currentColor"/> แถมมุกฟรี!</label>
                   <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => setTempOptions({...tempOptions, addPearl: true})} className={`py-3.5 rounded-2xl text-[11px] font-bold border transition-all ${tempOptions.addPearl ? 'bg-orange-400 text-white border-orange-400 shadow-md' : 'bg-white text-gray-300 border-gray-100'}`}>รับมุก (ฟรี)</button>
                     <button onClick={() => setTempOptions({...tempOptions, addPearl: false})} className={`py-3.5 rounded-2xl text-[11px] font-bold border transition-all ${!tempOptions.addPearl ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white text-gray-300 border-gray-100'}`}>ไม่รับมุกฟรี</button>
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
                        <label key={t.id} className={`flex justify-between items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#A67C52] bg-[#F5EEDC]/20' : 'border-gray-50 bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-[#A67C52] text-white' : 'bg-white border-2 border-gray-200'}`}>
                              {isSelected && <CheckCircle size={14} />}
                            </div>
                            <span className={`text-sm font-bold ${isSelected ? 'text-[#3D2C1E]' : 'text-gray-500'}`}>{t.name}</span>
                          </div>
                          <span className="text-sm font-bold text-[#A67C52]">+฿{t.price}</span>
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

              {optionModalItem.allowBlend !== false ? (
                <div className="grid grid-cols-2 gap-5">
                   <button onClick={() => setTempOptions({...tempOptions, isBlended: false})} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${!tempOptions.isBlended ? 'border-[#A67C52] bg-[#F5EEDC]/40 text-[#3D2C1E] shadow-sm' : 'border-gray-50 text-gray-300'}`}><Coffee size={32}/><span className="text-xs uppercase">เย็น</span></button>
                   <button onClick={() => setTempOptions({...tempOptions, isBlended: true})} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${tempOptions.isBlended ? 'border-[#A67C52] bg-[#F5EEDC]/40 text-[#3D2C1E] shadow-sm' : 'border-gray-50 text-gray-300'}`}><Zap size={32}/><span className="text-xs uppercase">ปั่น (+฿{optionModalItem.blendPrice || 5})</span></button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                   <button onClick={() => setTempOptions({...tempOptions, isBlended: false})} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all border-[#A67C52] bg-[#F5EEDC]/40 text-[#3D2C1E] shadow-sm`}><Coffee size={32}/><span className="text-xs uppercase">เย็น / ปกติ</span></button>
                </div>
              )}
            </div>
            
            <button onClick={() => {
                const toppingsPrice = (tempOptions.selectedToppings || []).reduce((sum, t) => sum + Number(t.price), 0);
                const finalP = optionModalItem.price + (tempOptions.isBlended ? (optionModalItem.blendPrice || 5) : 0) + toppingsPrice;
                
                const toppingsStr = (tempOptions.selectedToppings || []).map(t => t.id).sort().join('-');
                const cartId = `${optionModalItem.id}-${tempOptions.sweetness}-${tempOptions.isBlended}-${tempOptions.addPearl}-${toppingsStr}`;
                
                setCart(prev => {
                  const ex = prev.find(i => i.cartId === cartId);
                  if (ex) return prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i);
                  return [...prev, { ...optionModalItem, price: finalP, cartId, ...tempOptions, qty: 1 }];
                });
                setOptionModalItem(null);
              }} className="w-full py-6 bg-[#3D2C1E] text-white rounded-[2.5rem] font-bold text-lg active:scale-95 flex items-center justify-center gap-3 shadow-2xl transition-all sticky bottom-0">
                <Plus size={24}/> เพิ่มลงตะกร้า • ฿{
                  optionModalItem.price + (tempOptions.isBlended ? (optionModalItem.blendPrice || 5) : 0) + (tempOptions.selectedToppings || []).reduce((sum, t) => sum + Number(t.price), 0)
                }
            </button>
          </div>
        </div>
      )}

      {/* Modal จัดการการส่งสินค้า (แอดมิน) */}
      {deliveryModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#3D2C1E]">ยืนยันการจัดส่งออร์เดอร์</h3>
              <button onClick={() => setDeliveryModal(null)} className="text-gray-400 p-2"><X size={20}/></button>
            </div>

            <div className="space-y-3">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">จุดส่งสินค้า</label>
               <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeliveryLocation('room')} className={`py-4 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${deliveryLocation === 'room' ? 'border-orange-400 bg-orange-50 text-orange-600 shadow-sm' : 'border-gray-50 text-gray-400'}`}><Home size={24}/><span className="text-[10px]">ส่งหน้าห้อง</span></button>
                 <button onClick={() => setDeliveryLocation('building')} className={`py-4 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${deliveryLocation === 'building' ? 'border-orange-400 bg-orange-50 text-orange-600 shadow-sm' : 'border-gray-50 text-gray-400'}`}><Building size={24}/><span className="text-[10px]">ส่งหน้าตึก</span></button>
               </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-center">
               <p className="text-xs font-bold mb-3">แนบรูปถ่ายเป็นหลักฐาน</p>
               <label className="cursor-pointer bg-white border border-gray-200 text-gray-500 py-3 px-6 rounded-xl text-[11px] font-bold inline-flex items-center gap-2 shadow-sm active:scale-95 transition-all">
                  <Camera size={16}/> {deliveryImage ? 'เปลี่ยนรูปภาพ' : 'ถ่ายรูป / เลือกรูป'}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async e => {
                     const file = e.target.files[0];
                     if(file){
                        // บีบอัดรูปถ่ายตอนส่งสินค้าให้เล็กลงก่อนเซฟ
                        const compressedImage = await compressImage(file);
                        setDeliveryImage(compressedImage);
                     }
                  }} />
               </label>
               {deliveryImage && <img src={deliveryImage} className="mt-4 h-32 w-full object-cover rounded-xl shadow-sm border border-gray-100" alt="Delivery Proof"/>}
            </div>

            <button onClick={handleConfirmDelivery} disabled={isDelivering || !deliveryImage} className={`w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${deliveryImage ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
               {isDelivering ? 'กำลังบันทึกและส่งข้อความ...' : <><CheckCircle size={18}/> ยืนยันและแจ้งเตือนลูกค้า</>}
            </button>
          </div>
        </div>
      )}

      {/* Modal ดูรูปสลิป / รูปตอนจัดส่ง (ดูรูปขนาดใหญ่) */}
      {selectedSlip && selectedSlip !== 'cash_payment' && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedSlip(null)}>
          <img src={selectedSlip} className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl border-4 border-white/10 animate-in zoom-in" alt="slip or delivery preview" />
        </div>
      )}

      {/* Modal แอดมินล็อกอิน */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <h3 className="font-bold text-xl mb-8 text-[#3D2C1E]">แอดมินเข้าสู่ระบบ</h3>
            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl mb-8 text-center text-3xl outline-none tracking-[0.5em] focus:border-[#A67C52] transition-all" placeholder="••••••" />
            <div className="flex gap-4">
               <button onClick={() => { setShowAdminModal(false); setAdminPassword(''); }} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold rounded-2xl">ยกเลิก</button>
               <button onClick={() => {
                 if(adminPassword === '570402') { setView('admin'); setShowAdminModal(false); setAdminPassword(''); }
                 else { alert('รหัสผ่านไม่ถูกต้องครับ!'); setAdminPassword(''); }
               }} className="flex-1 py-4 bg-[#3D2C1E] text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}