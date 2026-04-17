import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Settings, Clock, AlertCircle, CheckCircle, ChevronLeft, Image as ImageIcon, Store, X, Upload, Layers, BarChart3, ClipboardList, Check, XCircle, Edit, MapPin, User, Phone, Coffee, Leaf, Zap, ListOrdered, Copy, Download, Maximize } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy } from 'firebase/firestore';

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

const INITIAL_CATEGORIES = ['นม', 'ชา', 'กาแฟ', 'มัทฉะ', 'ผลไม้และสมูทตี้', 'เมนูพิเศษ'];
const INITIAL_SETTINGS = { isOpen: true, promptpayNo: '0812345678', qrImage: '', shopLogo: '' };
const SWEETNESS_LEVELS = ['0%', '25%', '50%', '75%', '100%'];
const CATEGORY_PALETTE = {
  'นม': { main: '#A1CFCD', light: '#D1E8E2', textOnMain: '#3D2C1E' },
  'ชา': { main: '#6B705C', light: '#8C9475', textOnMain: '#F5EEDC' },
  'มัทฉะ': { main: '#6B705C', light: '#8C9475', textOnMain: '#F5EEDC' },
  'กาแฟ': { main: '#A67C52', light: '#C69F78', textOnMain: '#F5EEDC' },
  'ผลไม้และสมูทตี้': { main: '#F08080', light: '#D96969', textOnMain: '#F5EEDC' },
  'เมนูพิเศษ': { main: '#3D2C1E', light: '#A67C52', textOnMain: '#F5EEDC' },
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Vollkorn:ital,wght@0,400..900;1,400..900&display=swap');
    :root { --dark-choco: #3D2C1E; --creamy-latte: #F5EEDC; --oak: #A67C52; }
    body { font-family: 'Lato', sans-serif; background-color: var(--creamy-latte); color: var(--dark-choco); margin: 0; -webkit-font-smoothing: antialiased; }
    .font-serif { font-family: 'Vollkorn', serif; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .admin-bg { background: linear-gradient(135deg, #F5EEDC 0%, #D1E8E2 40%, #E8DFCC 80%, #F5EEDC 100%); background-size: 200% 200%; animation: gradientMove 15s ease infinite; }
    @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
  `}</style>
);

export default function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [toppings, setToppings] = useState([]); 
  const [orders, setOrders] = useState([]); 
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState(INITIAL_CATEGORIES[0]);
  const [view, setView] = useState('shop'); 
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState({ address: '' });
  const [myCustomerId, setMyCustomerId] = useState('');
  const [newTopping, setNewTopping] = useState({ name: '', price: '' });
  const [optionModalItem, setOptionModalItem] = useState(null);
  const [tempOptions, setTempOptions] = useState({ sweetness: '100%', isBlended: false, selectedToppings: [] });
  const [slipImage, setSlipImage] = useState('');
  const [lineProfile, setLineProfile] = useState(null);

  useEffect(() => {
    let cid = localStorage.getItem('happycow_cid') || 'cus_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('happycow_cid', cid);
    setMyCustomerId(cid);
    
    if (LIFF_ID && window.liff) {
      window.liff.init({ liffId: LIFF_ID }).then(() => {
        if (window.liff.isLoggedIn()) {
          window.liff.getProfile().then(profile => {
            setLineProfile(profile);
            setMyCustomerId(profile.userId);
          });
        }
      });
    }

    onSnapshot(collection(db, 'menus'), s => { setMenuItems(s.docs.map(d => ({ id: d.id, ...d.data() }))); setIsLoading(false); });
    onSnapshot(collection(db, 'toppings'), s => setToppings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, 'orders')), s => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp)));
    onSnapshot(doc(db, 'settings', 'main'), d => { if (d.exists()) setSettings(d.data()); });
  }, []);

  const handleCheckout = async () => {
    if (!customerInfo.address || !slipImage) return alert('กรุณาระบุที่อยู่และแนบสลิปครับ');
    setIsLoading(true);
    
    const finalTotal = getTotalPrice();
    const orderData = {
      items: cart, total: finalTotal, status: 'pending', timestamp: Date.now(),
      customerId: myCustomerId, customerInfo: { ...customerInfo, lineName: lineProfile?.displayName || 'ลูกค้าทั่วไป', linePic: lineProfile?.pictureUrl || '' },
      slipImage
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      
      const flexMessage = {
        type: "flex", altText: "ใบเสร็จจากร้านวัวนมอารมณ์ดี",
        contents: {
          type: "bubble",
          header: { type: "box", layout: "vertical", backgroundColor: "#A67C52", contents: [ { type: "text", text: "ร้านวัวนมอารมณ์ดี", color: "#ffffff", weight: "bold", size: "lg" } ] },
          body: {
            type: "box", layout: "vertical", contents: [
              { type: "text", text: `ขอบคุณคุณ ${lineProfile?.displayName || 'ลูกค้า'}`, weight: "bold", size: "sm" },
              { type: "separator", margin: "md" },
              ...cart.map(i => ({ type: "box", layout: "horizontal", margin: "sm", contents: [ { type: "text", text: `${i.qty}x ${i.name}`, size: "xs", flex: 3 }, { type: "text", text: `฿${i.price * i.qty}`, size: "xs", align: "end", flex: 1 } ] })),
              { type: "separator", margin: "md" },
              { type: "box", layout: "horizontal", margin: "md", contents: [ { type: "text", text: "รวมทั้งสิ้น", weight: "bold" }, { type: "text", text: `฿${finalTotal}`, align: "end", weight: "bold", color: "#A67C52" } ] }
            ]
          }
        }
      };

      if (myCustomerId && !myCustomerId.startsWith('cus_')) {
        await fetch('/api/sendLine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: myCustomerId, flexMessage })
        });
      }

      setCart([]); setSlipImage(''); setView('myOrders');
      if (window.liff && window.liff.isInClient()) window.liff.closeWindow();
    } catch (e) { alert(e.message); }
    setIsLoading(false);
  };

  const getTotalPrice = () => cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const getCatAccent = (cat) => CATEGORY_PALETTE[cat] || CATEGORY_PALETTE['เมนูพิเศษ'];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-creamy relative flex flex-col">
      <GlobalStyles />
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-dark/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('shop')}>
           {lineProfile ? <img src={lineProfile.pictureUrl} className="w-10 h-10 rounded-full border-2 border-oak/20" /> : <div className="w-10 h-10 bg-dark text-white rounded-full flex items-center justify-center font-bold">🐮</div>}
           <div><h1 className="font-serif font-bold text-lg leading-tight">วัวนมอารมณ์ดี</h1><p className="text-[9px] font-bold text-olive uppercase tracking-tighter">เปิดให้บริการแล้ว</p></div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setView('myOrders')} className="p-2 text-dark/30"><ClipboardList/></button>
          <button onClick={() => setView('cart')} className="relative p-2.5 bg-dark text-white rounded-xl shadow-lg">{cart.length > 0 && <span className="absolute -top-1 -right-1 bg-oak text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-creamy">{cart.length}</span>}<ShoppingCart size={20}/></button>
        </div>
      </header>

      {view === 'shop' && (
        <div className="flex-1">
           <div className="flex gap-2 overflow-x-auto hide-scrollbar p-4 bg-creamy/50 sticky top-[73px] z-40">
             {INITIAL_CATEGORIES.map(c => <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeCategory === c ? 'bg-dark text-white border-dark shadow-md' : 'bg-white text-dark/40 border-dark/5'}`}>{c}</button>)}
           </div>
           <div className="p-5 grid grid-cols-2 gap-5">
             {menuItems.filter(i => i.category === activeCategory).map(i => (
               <div key={i.id} onClick={() => setOptionModalItem(i)} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-dark/5 active:scale-95 transition-transform">
                 <div className="relative aspect-square bg-creamy/20"><img src={i.image} className="object-cover w-full h-full" /></div>
                 <div className="p-4 text-center"><h4 className="font-bold text-sm mb-1 line-clamp-1">{i.name}</h4><p className="text-oak font-bold text-sm">฿{i.price}</p></div>
               </div>
             ))}
           </div>
        </div>
      )}

      {view === 'cart' && (
        <div className="p-6 space-y-6 flex-1 bg-white rounded-t-[3rem] mt-4 shadow-2xl">
          <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-dark/40 text-sm"><ChevronLeft size={20}/> กลับไปเลือกเพิ่ม</button>
          <h2 className="text-3xl font-serif font-bold">ตะกร้าของคุณ</h2>
          <div className="space-y-4">
             {cart.map(i => (
               <div key={i.cartItemId} className="flex justify-between items-center p-4 bg-creamy/20 rounded-2xl">
                 <div className="flex-1"><p className="font-bold text-sm">{i.qty}x {i.name}</p><p className="text-[10px] text-dark/40 uppercase font-bold">{i.isBlended?'ปั่น':'เย็น'} • หวาน {i.sweetness}</p></div>
                 <div className="text-right font-bold text-oak">฿{i.price * i.qty}</div>
               </div>
             ))}
             {cart.length === 0 && <div className="py-20 text-center opacity-20 italic font-serif">ไม่มีสินค้าในตะกร้า</div>}
          </div>
          {cart.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-dark/5">
              <div><label className="block text-sm font-bold mb-3 px-2">ที่อยู่จัดส่ง</label><textarea placeholder="ระบุที่อยู่..." value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} className="w-full p-5 rounded-3xl bg-creamy/30 border-none h-32 text-sm focus:ring-2 focus:ring-oak" /></div>
              <div className="bg-creamy/30 p-6 rounded-[2.5rem] text-center border-2 border-dashed border-dark/10">
                <p className="text-xs font-bold mb-4">สแกนชำระเงิน พร้อมแนบสลิป</p>
                <div className="flex justify-center mb-6">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PROMPTPAY:${settings.promptpayNo}:${getTotalPrice()}`} className="w-48 h-48 rounded-2xl shadow-lg bg-white p-3" />
                </div>
                <label className="cursor-pointer bg-dark text-white py-4 px-8 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xl active:scale-95 transition-all"><Upload size={18}/> แนบสลิป<input type="file" accept="image/*" className="hidden" onChange={e => { const fr = new FileReader(); fr.onload = (ev) => setSlipImage(ev.target.result); fr.readAsDataURL(e.target.files[0]); }} /></label>
                {slipImage && <img src={slipImage} className="mt-4 h-32 mx-auto rounded-lg shadow-sm" />}
              </div>
              <button onClick={handleCheckout} disabled={isLoading || !slipImage} className={`w-full py-5 rounded-[2rem] font-bold text-lg shadow-2xl transition-all ${slipImage ? 'bg-oak text-white shadow-oak/30' : 'bg-dark/10 text-dark/30'}`}>สั่งซื้อและส่งบิลไปที่ LINE</button>
            </div>
          )}
        </div>
      )}

      {view === 'myOrders' && (
        <div className="p-6 space-y-6 flex-1">
           <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-dark/40 text-sm"><ChevronLeft size={20}/> กลับไปหน้าร้าน</button>
           <h2 className="text-3xl font-serif font-bold">ประวัติการสั่งซื้อ</h2>
           <div className="space-y-6">
             {orders.filter(o => o.customerId === myCustomerId).map(o => (
               <div key={o.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-dark/5 transition-all hover:shadow-xl">
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-dark/5">
                    <div><span className="text-[10px] font-bold text-oak uppercase tracking-widest">บิล #{o.id.slice(0,8)}</span><p className="text-xs font-bold text-dark/60 mt-1 uppercase">{o.status}</p></div>
                    <div className="text-2xl font-serif font-bold text-dark">฿{o.total}</div>
                  </div>
                  <div className="space-y-1">{(o.items || []).map((item, idx) => <p key={idx} className="text-[11px] font-bold text-dark/40">{item.qty}x {item.name}</p>)}</div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Admin Logic */}
      {view === 'adminLogin' && (
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="w-full max-w-sm text-center space-y-8">
            <h2 className="text-4xl font-serif font-bold">Admin</h2>
            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-5 rounded-3xl text-center text-2xl font-serif bg-white shadow-inner" placeholder="รหัสผ่าน" />
            <button onClick={() => adminPassword === '570402' ? setIsAdminLoggedIn(true) || setView('admin') : alert('รหัสผิดครับ')} className="w-full bg-dark text-white py-5 rounded-[2rem] font-bold shadow-2xl">เข้าสู่ระบบหลังบ้าน</button>
          </div>
        </div>
      )}

      {optionModalItem && (
        <div className="fixed inset-0 bg-dark/60 z-[60] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white rounded-t-[3rem] w-full max-w-md p-8 space-y-8 animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-serif font-bold">{optionModalItem.name}</h3><button onClick={() => setOptionModalItem(null)} className="p-3 bg-creamy/20 rounded-2xl"><X/></button></div>
            <div className="space-y-6">
              <div><label className="text-sm font-bold block mb-3">ความหวาน</label><div className="grid grid-cols-5 gap-2">{SWEETNESS_LEVELS.map(l => <button key={l} onClick={() => setTempOptions({...tempOptions, sweetness: l})} className={`py-3 rounded-2xl text-[10px] font-bold border ${tempOptions.sweetness === l ? 'bg-dark text-white border-dark' : 'bg-white text-dark/30 border-dark/5'}`}>{l}</button>)}</div></div>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setTempOptions({...tempOptions, isBlended: false})} className={`py-5 rounded-3xl border-2 font-bold flex flex-col items-center gap-2 ${!tempOptions.isBlended ? 'border-oak bg-creamy/10' : 'border-transparent opacity-40'}`}><Coffee/><span className="text-[10px]">เย็น</span></button>
                 <button onClick={() => setTempOptions({...tempOptions, isBlended: true})} className={`py-5 rounded-3xl border-2 font-bold flex flex-col items-center gap-2 ${tempOptions.isBlended ? 'border-oak bg-creamy/10' : 'border-transparent opacity-40'}`}><Zap/><span className="text-[10px]">ปั่น</span></button>
              </div>
            </div>
            <button onClick={() => {
              const cartId = `${optionModalItem.id}-${tempOptions.sweetness}-${tempOptions.isBlended}`;
              setCart(prev => {
                const ex = prev.find(i => i.cartItemId === cartId);
                if (ex) return prev.map(i => i.cartItemId === cartId ? {...i, qty: i.qty+1} : i);
                return [...prev, {...optionModalItem, cartItemId: cartId, ...tempOptions, qty: 1}];
              });
              setOptionModalItem(null);
            }} className="w-full py-5 bg-dark text-white rounded-[2rem] font-bold text-lg shadow-xl">เพิ่มลงตะกร้า • ฿{optionModalItem.price + (tempOptions.isBlended ? (optionModalItem.blendPrice || 0) : 0)}</button>
          </div>
        </div>
      )}
    </div>
  );
}