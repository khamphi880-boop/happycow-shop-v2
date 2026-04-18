import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, ChevronLeft, X, Upload, ClipboardList, Coffee, Zap, MapPin, Settings, Copy, CheckCircle, AlertCircle, LogIn } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';

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
const LIFF_ID = "2009817000-ySEM8T5K"; 

const CATEGORIES = ['นม', 'ชา', 'กาแฟ', 'มัทฉะ', 'ผลไม้และสมูทตี้', 'เมนูพิเศษ'];
const SWEETNESS = ['0%', '25%', '50%', '75%', '100%'];

export default function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [view, setView] = useState('shop'); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [address, setAddress] = useState('');
  const [slipImage, setSlipImage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  // สเตทสำหรับเปิด/ปิดหน้าต่างแอดมิน และจัดการแท็บ
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTab, setAdminTab] = useState('orders'); // 'orders' | 'menus' | 'settings'
  
  // สเตทสำหรับตั้งค่าร้าน
  const [storeSettings, setStoreSettings] = useState({ promptPayNo: '0812345678' });
  const [editPromptPay, setEditPromptPay] = useState('');

  // สเตทสำหรับจัดการเมนูใหม่
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: CATEGORIES[0], image: '', blendPrice: 5 });
  
  const [optionModalItem, setOptionModalItem] = useState(null);
  const [tempOptions, setTempOptions] = useState({ sweetness: '100%', isBlended: false });
  const [lineProfile, setLineProfile] = useState({ displayName: 'ลูกค้าทั่วไป', pictureUrl: '', userId: '' });

  useEffect(() => {
    let cid = localStorage.getItem('happycow_uid') || 'guest_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('happycow_uid', cid);
    setLineProfile(prev => ({ ...prev, userId: cid }));

    if (window.liff) {
      window.liff.init({ liffId: LIFF_ID }).then(() => {
        if (window.liff.isLoggedIn()) {
          window.liff.getProfile().then(p => setLineProfile({
            displayName: p.displayName,
            pictureUrl: p.pictureUrl,
            userId: p.userId
          }));
        }
      }).catch(err => console.error("LIFF Error", err));
    }

    const unsubMenu = onSnapshot(collection(db, 'menus'), snapshot => {
      setMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), snapshot => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp));
    });

    // โหลดข้อมูลการตั้งค่าร้าน (พร้อมเพย์)
    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), docSnap => {
      if (docSnap.exists()) {
        setStoreSettings(docSnap.data());
        setEditPromptPay(docSnap.data().promptPayNo || '0812345678');
      } else {
        setEditPromptPay('0812345678');
      }
    });

    return () => { unsubMenu(); unsubOrders(); unsubSettings(); };
  }, []);

  const handleLineLogin = () => {
    if (window.liff && !window.liff.isLoggedIn()) {
      window.liff.login();
    }
  };

  const seedSampleData = async () => {
    const samples = [
      { name: "นมสดฮอกไกโดเย็น", price: 45, category: "นม", image: "https://images.unsplash.com/photo-1550583724-1255818c053b?w=400", blendPrice: 5 },
      { name: "ชาไทยต้นตำรับ", price: 40, category: "ชา", image: "https://images.unsplash.com/photo-1594631252845-29fc4586d517?w=400", blendPrice: 5 }
    ];
    for (const item of samples) await addDoc(collection(db, 'menus'), item);
    alert("สร้างเมนูแนะนำสำเร็จครับ!");
  };

  // ฟังก์ชันเพิ่มเมนู
  const handleAddMenu = async () => {
    if (!newMenu.name || !newMenu.price || !newMenu.image) {
      return alert('กรุณากรอกข้อมูลให้ครบถ้วนครับ');
    }
    try {
      await addDoc(collection(db, 'menus'), {
        name: newMenu.name,
        price: Number(newMenu.price),
        category: newMenu.category,
        image: newMenu.image,
        blendPrice: Number(newMenu.blendPrice)
      });
      alert('เพิ่มเมนูสำเร็จ! 🐮');
      setNewMenu({ name: '', price: '', category: CATEGORIES[0], image: '', blendPrice: 5 });
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  // ฟังก์ชันลบเมนู
  const handleDeleteMenu = async (id) => {
    if(window.confirm('ต้องการลบเมนูนี้ใช่หรือไม่?')) {
      try {
        await deleteDoc(doc(db, 'menus', id));
      } catch (e) {
        alert("Error: " + e.message);
      }
    }
  };

  const handleOrder = async () => {
    if ((lineProfile.userId || '').startsWith('guest_')) {
      return alert("เพื่อความถูกต้องในการส่งบิลใบเสร็จ กรุณากดปุ่ม 'ล็อกอิน LINE' สีเขียวด้านบนก่อนทำการสั่งซื้อนะครับ 🐮");
    }

    if (!address || !slipImage) return alert("กรุณากรอกที่อยู่และแนบสลิปเพื่อยืนยันออร์เดอร์ครับ 🐮");
    setIsLoading(true);
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const orderData = {
      items: cart, total, status: 'pending', timestamp: Date.now(),
      userId: lineProfile.userId, lineName: lineProfile.displayName, address, slipImage
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      
      const flexMessage = {
        type: "flex", altText: "ใบเสร็จจากร้านวัวนมอารมณ์ดี",
        contents: {
          type: "bubble",
          header: { type: "box", layout: "vertical", backgroundColor: "#3D2C1E", contents: [{ type: "text", text: "ร้านวัวนมอารมณ์ดี", color: "#ffffff", weight: "bold", size: "lg", align: "center" }] },
          body: {
            type: "box", layout: "vertical",
            contents: [
              { type: "text", text: `ขอบคุณคุณ ${lineProfile.displayName || 'ลูกค้า'}`, weight: "bold", size: "sm" },
              { type: "separator", margin: "md" },
              ...cart.map(i => ({ type: "box", layout: "horizontal", margin: "sm", contents: [{ type: "text", text: `${i.qty}x ${i.name}`, size: "xs", flex: 3 }, { type: "text", text: `฿${i.price * i.qty}`, size: "xs", align: "end", flex: 1, weight: "bold" }] })),
              { type: "separator", margin: "md" },
              { type: "box", layout: "horizontal", margin: "md", contents: [{ type: "text", text: "รวมทั้งสิ้น", weight: "bold" }, { type: "text", text: `฿${total}`, align: "end", weight: "bold", color: "#A67C52" }] }
            ]
          }
        }
      };

      const response = await fetch('/api/sendLine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: lineProfile.userId, flexMessage })
      });

      const resultData = await response.json();

      if (!response.ok || !resultData.success) {
        alert("⚠️ ออร์เดอร์เข้าแล้ว แต่บิลไม่เด้ง!\n\nสาเหตุ: ลูกค้ายังไม่ได้ 'เพิ่มเพื่อน' กับ LINE บอทของร้าน (บอทจึงทักไปไม่ได้ครับ)\nแนะนำให้แอดเพื่อนแล้วลองใหม่ครับ");
      } else {
        alert("สั่งซื้อสำเร็จ! บิลถูกส่งเข้าแชท LINE แล้วครับ 🐮");
      }

      setCart([]); setSlipImage(''); setAddress(''); setView('myOrders');
    } catch (e) { 
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + e.message); 
    }
    setIsLoading(false);
  };

  const copyPromptPay = () => {
    navigator.clipboard.writeText(storeSettings.promptPayNo).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const filteredItems = menuItems.filter(i => i.category === activeCategory);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F5EEDC] flex flex-col font-sans text-[#3D2C1E]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vollkorn:wght@700&display=swap');
        .font-serif { font-family: 'Vollkorn', serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* --- ส่วนหัว (Header) --- */}
      <header className="sticky top-0 z-[50] bg-white/95 p-4 flex justify-between items-center border-b border-[#A67C52]/10 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('shop')}>
           {lineProfile.pictureUrl ? <img src={lineProfile.pictureUrl} className="w-10 h-10 rounded-full border-2 border-orange-100" alt="profile" /> : <div className="w-10 h-10 bg-[#3D2C1E] text-white rounded-full flex items-center justify-center font-bold">🐮</div>}
           <div>
             <h1 className="font-serif font-bold text-lg leading-tight">วัวนมอารมณ์ดี</h1>
             {(lineProfile.userId || '').startsWith('guest_') ? (
               <button onClick={handleLineLogin} className="text-[10px] bg-[#06C755] text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 mt-1 active:scale-95"><LogIn size={10}/> ล็อกอิน LINE เพื่อรับบิล</button>
             ) : (
               <p className="text-[9px] font-bold text-green-700 uppercase">คุณ {(lineProfile.displayName || '').slice(0, 15)}</p>
             )}
           </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdminModal(true)} className="p-2 text-gray-300 hover:text-gray-500"><Settings size={18}/></button>
          <button onClick={() => setView('myOrders')} className="p-2 text-gray-400 hover:text-gray-600"><ClipboardList/></button>
          <button onClick={() => setView('cart')} className="relative p-2 bg-[#3D2C1E] text-white rounded-xl shadow-lg w-10 h-10 flex items-center justify-center">
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#A67C52] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#F5EEDC]">{cart.length}</span>}
            <ShoppingCart size={20}/>
          </button>
        </div>
      </header>

      {/* --- พื้นที่แสดงผลหลัก --- */}
      <main className="flex-1 pb-10">
        
        {view === 'shop' && (
          <div className="animate-in fade-in">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar p-4 sticky top-[73px] z-[40] bg-[#F5EEDC]/95">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeCategory === c ? 'bg-[#3D2C1E] text-white border-[#3D2C1E] shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}>{c}</button>
              ))}
            </div>

            <div className="p-5">
              {isLoading ? <div className="p-20 text-center opacity-30 italic">กำลังโหลดเมนู...</div> : (
                <div className="grid grid-cols-2 gap-5">
                  {filteredItems.map(item => (
                    <div key={item.id} onClick={() => { setOptionModalItem(item); setTempOptions({sweetness: '100%', isBlended: false}); }} className="bg-white rounded-[2rem] overflow-hidden shadow-sm active:scale-95 transition-all cursor-pointer">
                      <div className="aspect-square bg-gray-50"><img src={item.image} className="w-full h-full object-cover" alt={item.name} /></div>
                      <div className="p-4 text-center"><h4 className="font-bold text-sm mb-1 line-clamp-1">{item.name}</h4><p className="text-[#A67C52] font-bold text-sm">฿{item.price}</p></div>
                    </div>
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="col-span-2 py-20 text-center flex flex-col items-center gap-4">
                      <AlertCircle size={40} className="text-gray-200" />
                      <p className="text-gray-400 text-sm">ยังไม่มีเมนูในหมวด "{activeCategory}"</p>
                      <button onClick={seedSampleData} className="text-xs bg-[#3D2C1E] text-white px-6 py-3 rounded-full shadow-lg">คลิกเพื่อสร้างเมนูแนะนำ</button>
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
            <h2 className="text-3xl font-serif font-bold">ตะกร้าของคุณ</h2>
            
            <div className="space-y-4">
               {cart.map(i => (
                 <div key={i.cartId} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                   <div className="flex-1 font-bold text-sm">{i.qty}x {i.name} <br/><span className="text-gray-400 text-[10px] font-normal uppercase">({i.isBlended ? 'ปั่น' : 'เย็น'} • หวาน {i.sweetness})</span></div>
                   <div className="flex items-center gap-4"><p className="font-bold text-[#A67C52]">฿{i.price * i.qty}</p><button onClick={() => setCart(prev => prev.filter(item => item.cartId !== i.cartId))} className="text-red-300"><Trash2 size={16}/></button></div>
                 </div>
               ))}
               {cart.length === 0 && <div className="py-20 text-center opacity-20 italic">ตะกร้าว่างเปล่า 🐮</div>}
            </div>

            {cart.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-gray-100">
                <div>
                  <label className="text-sm font-bold block mb-2 text-[#A67C52]"><MapPin size={16} className="inline mr-1"/>ที่อยู่จัดส่ง / เบอร์โทร</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="ระบุเลขที่ห้อง / ชื่อตึก / จุดสังเกต..." className="w-full p-5 rounded-3xl bg-gray-50 border-none h-32 text-sm focus:ring-2 focus:ring-[#A67C52]" />
                </div>
                
                <div className="bg-gray-50 p-6 rounded-[2.5rem] text-center border-2 border-dashed border-gray-200">
                  <p className="text-xs font-bold mb-4">สแกนชำระเงิน พร้อมแนบสลิป</p>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PROMPTPAY:${storeSettings.promptPayNo}:${cart.reduce((s,i)=>s+(i.price*i.qty),0)}`} className="w-40 h-40 mx-auto mb-4 bg-white p-2 rounded-xl shadow-md" alt="QR Code" />
                  
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <p className="text-xs text-gray-500 font-bold">พร้อมเพย์: {storeSettings.promptPayNo}</p>
                    <button onClick={copyPromptPay} className="flex items-center gap-1 bg-white border border-gray-200 text-[#A67C52] px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-all">
                      {isCopied ? <CheckCircle size={14} className="text-green-500"/> : <Copy size={14}/>}
                      <span className="text-[10px] font-bold">{isCopied ? 'คัดลอกแล้ว' : 'คัดลอกเลข'}</span>
                    </button>
                  </div>

                  <label className="cursor-pointer bg-[#3D2C1E] text-white py-4 px-8 rounded-2xl text-[11px] font-bold inline-flex items-center gap-2 shadow-lg active:scale-95">
                    <Upload size={18}/> {slipImage ? 'เปลี่ยนรูปสลิป' : 'แนบรูปสลิป'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const fr = new FileReader(); fr.onload = (ev) => setSlipImage(ev.target.result); fr.readAsDataURL(e.target.files[0]);
                    }} />
                  </label>
                  {slipImage && <img src={slipImage} className="mt-4 h-32 mx-auto rounded-lg shadow-md border-2 border-white" alt="slip" />}
                </div>

                <button onClick={handleOrder} disabled={isLoading || !slipImage} className={`w-full py-5 rounded-[2.5rem] font-bold text-lg shadow-xl transition-all ${slipImage ? 'bg-[#A67C52] text-white shadow-[#A67C52]/30' : 'bg-gray-100 text-gray-300'}`}>
                  {isLoading ? 'กำลังประมวลผล...' : `ยืนยันการสั่งซื้อ • ฿${cart.reduce((s,i)=>s+(i.price*i.qty),0)}`}
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'myOrders' && (
          <div className="p-6 space-y-6 flex-1">
             <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-gray-400 text-sm"><ChevronLeft size={20}/> กลับไปหน้าร้าน</button>
             <h2 className="text-3xl font-serif font-bold">ประวัติการสั่งซื้อ</h2>
             <div className="space-y-6">
               {orders.filter(o => o.userId === lineProfile.userId).length > 0 ? (
                 orders.filter(o => o.userId === lineProfile.userId).map(o => (
                   <div key={o.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 p-4">
                      <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                        <div><span className="text-[10px] font-bold text-[#A67C52] uppercase">บิล #{o.id.slice(0,6)}</span><p className="text-xs font-bold text-orange-400 mt-1 uppercase">{o.status}</p></div>
                        <div className="text-2xl font-serif font-bold text-[#3D2C1E]">฿{o.total}</div>
                      </div>
                      <div className="space-y-1">{(o.items || []).map((item, idx) => (<p key={idx} className="text-[11px] font-bold text-gray-400">{item.qty}x {item.name} ({item.isBlended ? 'ปั่น' : 'เย็น'})</p>))}</div>
                   </div>
                 ))
               ) : (
                 <div className="py-24 text-center opacity-10 font-serif italic">คุณยังไม่มีประวัติการสั่งซื้อครับ 🐮</div>
               )}
             </div>
          </div>
        )}

        {/* หน้า 5: ระบบแอดมิน */}
        {view === 'admin' && (
          <div className="p-6 flex-1 bg-white min-h-screen">
            <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-gray-400 text-sm mb-6"><ChevronLeft size={20}/> กลับหน้าร้าน</button>
            <h2 className="text-2xl font-serif font-bold mb-6">ระบบจัดการหลังร้าน</h2>
            
            {/* แท็บเมนูแอดมิน */}
            <div className="flex gap-2 bg-gray-50 p-1 rounded-2xl mb-6">
              <button onClick={() => setAdminTab('orders')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${adminTab === 'orders' ? 'bg-[#3D2C1E] text-white shadow-md' : 'text-gray-500'}`}>ดูออร์เดอร์</button>
              <button onClick={() => setAdminTab('menus')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${adminTab === 'menus' ? 'bg-[#3D2C1E] text-white shadow-md' : 'text-gray-500'}`}>จัดการเมนู</button>
              <button onClick={() => setAdminTab('settings')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${adminTab === 'settings' ? 'bg-[#3D2C1E] text-white shadow-md' : 'text-gray-500'}`}>ตั้งค่าร้าน</button>
            </div>

            {/* ส่วนที่ 1: รายการสั่งซื้อ */}
            {adminTab === 'orders' && (
              <div className="space-y-4">
                {orders.map(o => (
                  <div key={o.id} className="border border-gray-100 p-4 rounded-2xl shadow-sm">
                    <div className="flex justify-between mb-2"><span className="font-bold text-sm">ลูกค้า: {o.lineName || 'ลูกค้า'}</span><span className="text-orange-600 font-bold">฿{o.total}</span></div>
                    <div className="text-xs text-gray-500 mb-2">ที่อยู่: {o.address}</div>
                    <div className="space-y-1 border-t border-gray-50 pt-2 mb-2">
                      {(o.items || []).map((i, idx) => <div key={idx} className="text-xs text-gray-600">{i.qty}x {i.name} ({i.isBlended?'ปั่น':'เย็น'})</div>)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => window.open(o.slipImage)} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-xs font-bold mb-2">ดูสลิปโอนเงิน</button>
                      <button onClick={() => deleteDoc(doc(db, 'orders', o.id))} className="bg-red-50 text-red-500 px-4 rounded-xl text-xs font-bold"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ส่วนที่ 2: ระบบจัดการเมนู */}
            {adminTab === 'menus' && (
              <div className="space-y-8">
                {/* ฟอร์มเพิ่มเมนู */}
                <div className="bg-gray-50 p-5 rounded-3xl border-2 border-dashed border-gray-200 space-y-4">
                  <h3 className="font-bold text-sm text-[#A67C52]">เพิ่มเมนูใหม่</h3>
                  <input type="text" placeholder="ชื่อเมนู" className="w-full p-3 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-[#A67C52]" value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} />
                  <div className="flex gap-2">
                    <input type="number" placeholder="ราคา (บาท)" className="w-1/2 p-3 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-[#A67C52]" value={newMenu.price} onChange={e => setNewMenu({...newMenu, price: e.target.value})} />
                    <select className="w-1/2 p-3 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-[#A67C52]" value={newMenu.category} onChange={e => setNewMenu({...newMenu, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer bg-white border border-gray-200 text-gray-500 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50 transition-all">
                      <Upload size={16}/> {newMenu.image ? 'เปลี่ยนรูปเมนู' : 'อัปโหลดรูปภาพจากเครื่อง'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files[0];
                        if(file) {
                          const fr = new FileReader();
                          fr.onload = (ev) => setNewMenu({...newMenu, image: ev.target.result});
                          fr.readAsDataURL(file);
                        }
                      }} />
                    </label>
                    {newMenu.image && <img src={newMenu.image} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-gray-100" alt="preview" />}
                  </div>
                  <button onClick={handleAddMenu} className="w-full bg-[#A67C52] text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-all shadow-md">บันทึกเมนูใหม่</button>
                </div>

                {/* รายการเมนูที่มีอยู่ */}
                <div className="space-y-3">
                   <h3 className="font-bold text-sm text-[#3D2C1E]">เมนูทั้งหมด ({menuItems.length} รายการ)</h3>
                   {menuItems.map(item => (
                     <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                       <div className="flex items-center gap-3">
                         <img src={item.image} className="w-12 h-12 rounded-xl object-cover" alt={item.name} />
                         <div>
                           <p className="font-bold text-sm line-clamp-1">{item.name}</p>
                           <p className="text-xs text-gray-400">฿{item.price} • {item.category}</p>
                         </div>
                       </div>
                       <button onClick={() => handleDeleteMenu(item.id)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all active:scale-95"><Trash2 size={18}/></button>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {/* ส่วนที่ 3: ตั้งค่าร้านค้า */}
            {adminTab === 'settings' && (
              <div className="space-y-8">
                <div className="bg-gray-50 p-5 rounded-3xl border-2 border-dashed border-gray-200 space-y-4">
                  <h3 className="font-bold text-sm text-[#A67C52]">ตั้งค่าช่องทางชำระเงิน</h3>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-bold">หมายเลขพร้อมเพย์ (เบอร์โทร หรือ บัตรประชาชน)</label>
                    <input type="text" placeholder="เช่น 0812345678" className="w-full p-3 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-[#A67C52]" value={editPromptPay} onChange={e => setEditPromptPay(e.target.value)} />
                  </div>
                  <button onClick={async () => {
                    try {
                      await setDoc(doc(db, 'settings', 'store'), { promptPayNo: editPromptPay }, { merge: true });
                      alert('อัปเดตหมายเลขพร้อมเพย์สำเร็จ! 🐮');
                    } catch(e) { alert("Error: " + e.message); }
                  }} className="w-full bg-[#3D2C1E] text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-all shadow-md">บันทึกการตั้งค่า</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- Modal กรอกรหัสแอดมิน --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <h3 className="font-bold text-xl mb-4 text-[#3D2C1E]">เข้าสู่ระบบแอดมิน</h3>
            <p className="text-xs text-gray-400 mb-8">กรุณากรอกรหัสผ่านเพื่อจัดการร้านค้า</p>
            
            <input 
              type="password" 
              value={adminPassword} 
              onChange={e => setAdminPassword(e.target.value)} 
              className="w-full bg-gray-50 border-2 border-gray-100 focus:border-[#A67C52] outline-none p-4 rounded-2xl mb-6 text-center text-2xl tracking-[0.5em]" 
              placeholder="••••••" 
            />
            
            <div className="flex gap-4">
               <button onClick={() => { setShowAdminModal(false); setAdminPassword(''); }} className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl active:scale-95">ยกเลิก</button>
               <button onClick={() => {
                 if(adminPassword === '570402') { setView('admin'); setShowAdminModal(false); setAdminPassword(''); }
                 else { alert('รหัสผ่านไม่ถูกต้องครับ!'); setAdminPassword(''); }
               }} className="flex-1 py-4 bg-[#3D2C1E] text-white font-bold rounded-2xl active:scale-95 shadow-lg">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal เลือกตัวเลือกสินค้า --- */}
      {optionModalItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-8 space-y-8 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-serif font-bold">{optionModalItem.name}</h3>
              <button onClick={() => setOptionModalItem(null)} className="p-3 bg-gray-50 rounded-2xl text-gray-400"><X/></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold block mb-4 text-gray-400">ระดับความหวาน</label>
                <div className="grid grid-cols-5 gap-2">{SWEETNESS.map(l => (
                    <button key={l} onClick={() => setTempOptions({...tempOptions, sweetness: l})} className={`py-3 rounded-2xl text-[10px] font-bold border transition-all ${tempOptions.sweetness === l ? 'bg-[#3D2C1E] text-white border-[#3D2C1E]' : 'bg-white text-gray-300 border-gray-100'}`}>{l}</button>
                ))}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setTempOptions({...tempOptions, isBlended: false})} className={`py-6 rounded-3xl border-2 font-bold flex flex-col items-center gap-3 transition-all ${!tempOptions.isBlended ? 'border-[#A67C52] bg-[#F5EEDC]/40 text-[#3D2C1E]' : 'border-gray-50 text-gray-300'}`}><Coffee size={28}/><span className="text-xs">เมนูเย็น</span></button>
                 <button onClick={() => setTempOptions({...tempOptions, isBlended: true})} className={`py-6 rounded-3xl border-2 font-bold flex flex-col items-center gap-3 transition-all ${tempOptions.isBlended ? 'border-[#A67C52] bg-[#F5EEDC]/40 text-[#3D2C1E]' : 'border-gray-50 text-gray-300'}`}><Zap size={28}/><span className="text-xs">เมนูปั่น (+฿{optionModalItem.blendPrice || 5})</span></button>
              </div>
            </div>
            <button onClick={() => {
                const finalP = optionModalItem.price + (tempOptions.isBlended ? (optionModalItem.blendPrice || 5) : 0);
                const cartId = `${optionModalItem.id}-${tempOptions.sweetness}-${tempOptions.isBlended}`;
                setCart(prev => {
                  const ex = prev.find(i => i.cartId === cartId);
                  if (ex) return prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i);
                  return [...prev, { ...optionModalItem, price: finalP, cartId, ...tempOptions, qty: 1 }];
                });
                setOptionModalItem(null);
              }} className="w-full py-5 bg-[#3D2C1E] text-white rounded-[2.5rem] font-bold text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"><Plus size={20}/> เพิ่มลงตะกร้า • ฿{optionModalItem.price + (tempOptions.isBlended ? (optionModalItem.blendPrice || 5) : 0)}</button>
          </div>
        </div>
      )}
    </div>
  );
}