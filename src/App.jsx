import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, ChevronLeft, X, Upload, ClipboardList, Coffee, Zap, MapPin, Settings, Copy, CheckCircle, AlertCircle, LogIn, Eye, Clock, Check } from 'lucide-react';
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
  
  // สเตทสำหรับแอดมิน
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTab, setAdminTab] = useState('orders');
  const [selectedSlip, setSelectedSlip] = useState(null); 
  
  // สเตทสำหรับตั้งค่าร้าน
  const [storeSettings, setStoreSettings] = useState({ promptPayNo: '0812345678', qrCodeImage: '' });
  const [editPromptPay, setEditPromptPay] = useState('');
  const [editQrCodeImage, setEditQrCodeImage] = useState('');

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

    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), docSnap => {
      if (docSnap.exists()) {
        setStoreSettings(docSnap.data());
        setEditPromptPay(docSnap.data().promptPayNo || '0812345678');
        setEditQrCodeImage(docSnap.data().qrCodeImage || '');
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

  const handleAddMenu = async () => {
    if (!newMenu.name || !newMenu.price || !newMenu.image) return alert('กรุณากรอกข้อมูลให้ครบครับ');
    try {
      await addDoc(collection(db, 'menus'), {
        ...newMenu, price: Number(newMenu.price), blendPrice: Number(newMenu.blendPrice)
      });
      alert('เพิ่มเมนูสำเร็จ! 🐮');
      setNewMenu({ name: '', price: '', category: CATEGORIES[0], image: '', blendPrice: 5 });
    } catch (e) { alert(e.message); }
  };

  const handleDeleteMenu = async (id) => {
    if(window.confirm('ลบเมนูนี้ใช่หรือไม่?')) await deleteDoc(doc(db, 'menus', id));
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (e) { alert(e.message); }
  };

  const handleOrder = async () => {
    if ((lineProfile.userId || '').startsWith('guest_')) return alert("กรุณาล็อกอิน LINE ก่อนครับ");
    if (!address || !slipImage) return alert("กรุณากรอกที่อยู่และแนบสลิปครับ");
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
              { type: "text", text: `ขอบคุณคุณ ${lineProfile.displayName}`, weight: "bold", size: "sm" },
              { type: "separator", margin: "md" },
              ...cart.map(i => ({ type: "box", layout: "horizontal", margin: "sm", contents: [{ type: "text", text: `${i.qty}x ${i.name}`, size: "xs", flex: 3 }, { type: "text", text: `฿${i.price * i.qty}`, size: "xs", align: "end", flex: 1, weight: "bold" }] })),
              { type: "separator", margin: "md" },
              { type: "box", layout: "horizontal", margin: "md", contents: [{ type: "text", text: "รวมทั้งสิ้น", weight: "bold" }, { type: "text", text: `฿${total}`, align: "end", weight: "bold", color: "#A67C52" }] }
            ]
          }
        }
      };

      await fetch('/api/sendLine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: lineProfile.userId, flexMessage })
      });

      setCart([]); setSlipImage(''); setAddress(''); setView('myOrders');
      alert("สั่งซื้อสำเร็จ! คิวของคุณถูกบันทึกแล้วครับ 🐮");
    } catch (e) { alert("Error: " + e.message); }
    setIsLoading(false);
  };

  const copyPromptPay = () => {
    navigator.clipboard.writeText(storeSettings.promptPayNo).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // ฟังก์ชันคำนวณคิว
  const getQueueInfo = (orderId) => {
    const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'cooking').sort((a,b) => a.timestamp - b.timestamp);
    const index = activeOrders.findIndex(o => o.id === orderId);
    if (index === -1) return null;
    return {
      currentQueue: index + 1,
      totalWait: index
    };
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F5EEDC] flex flex-col font-sans text-[#3D2C1E]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vollkorn:wght@700&display=swap');
        .font-serif { font-family: 'Vollkorn', serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <header className="sticky top-0 z-[50] bg-white/95 p-4 flex justify-between items-center border-b border-[#A67C52]/10 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('shop')}>
           {lineProfile.pictureUrl ? <img src={lineProfile.pictureUrl} className="w-10 h-10 rounded-full border-2 border-orange-100" /> : <div className="w-10 h-10 bg-[#3D2C1E] text-white rounded-full flex items-center justify-center font-bold">🐮</div>}
           <div>
             <h1 className="font-serif font-bold text-lg">วัวนมอารมณ์ดี</h1>
             {(lineProfile.userId || '').startsWith('guest_') ? (
               <button onClick={handleLineLogin} className="text-[10px] bg-[#06C755] text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 mt-1"><LogIn size={10}/> ล็อกอิน LINE</button>
             ) : (
               <p className="text-[9px] font-bold text-green-700 uppercase">คุณ {(lineProfile.displayName || '').slice(0, 15)}</p>
             )}
           </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdminModal(true)} className="p-2 text-gray-300"><Settings size={18}/></button>
          <button onClick={() => setView('myOrders')} className="p-2 text-gray-400"><ClipboardList/></button>
          <button onClick={() => setView('cart')} className="relative p-2 bg-[#3D2C1E] text-white rounded-xl w-10 h-10 flex items-center justify-center">
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#A67C52] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#F5EEDC]">{cart.length}</span>}
            <ShoppingCart size={20}/>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-10">
        {view === 'shop' && (
          <div className="animate-in fade-in">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar p-4 sticky top-[73px] z-[40] bg-[#F5EEDC]/95">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-bold whitespace-nowrap border ${activeCategory === c ? 'bg-[#3D2C1E] text-white' : 'bg-white text-gray-400'}`}>{c}</button>
              ))}
            </div>
            <div className="p-5 grid grid-cols-2 gap-5">
              {menuItems.filter(i => i.category === activeCategory).map(item => (
                <div key={item.id} onClick={() => { setOptionModalItem(item); setTempOptions({sweetness: '100%', isBlended: false}); }} className="bg-white rounded-[2rem] overflow-hidden shadow-sm active:scale-95 transition-all cursor-pointer">
                  <div className="aspect-square bg-gray-50"><img src={item.image} className="w-full h-full object-cover" /></div>
                  <div className="p-4 text-center"><h4 className="font-bold text-sm mb-1">{item.name}</h4><p className="text-[#A67C52] font-bold text-sm">฿{item.price}</p></div>
                </div>
              ))}
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
                   <div className="flex-1 font-bold text-sm">{i.qty}x {i.name} <br/><span className="text-gray-400 text-[10px]">({i.isBlended ? 'ปั่น' : 'เย็น'} • หวาน {i.sweetness})</span></div>
                   <div className="flex items-center gap-4"><p className="font-bold text-[#A67C52]">฿{i.price * i.qty}</p><button onClick={() => setCart(prev => prev.filter(item => item.cartId !== i.cartId))} className="text-red-300"><Trash2 size={16}/></button></div>
                 </div>
               ))}
            </div>
            {cart.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-gray-100 text-center">
                <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="ที่อยู่จัดส่ง / เบอร์โทร..." className="w-full p-5 rounded-3xl bg-gray-50 h-32 text-sm outline-none border border-gray-100 focus:border-[#A67C52]" />
                <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                  <p className="text-xs font-bold mb-4">สแกนชำระเงิน พร้อมแนบสลิป</p>
                  {storeSettings.qrCodeImage ? <img src={storeSettings.qrCodeImage} className="w-40 h-40 mx-auto mb-4 bg-white p-2 rounded-xl object-contain shadow-sm" /> : <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PROMPTPAY:${storeSettings.promptPayNo}:${cart.reduce((s,i)=>s+(i.price*i.qty),0)}`} className="w-40 h-40 mx-auto mb-4 bg-white p-2 rounded-xl" />}
                  <button onClick={copyPromptPay} className="mb-6 bg-white border px-3 py-1.5 rounded-full text-[10px] font-bold inline-flex items-center gap-2 shadow-sm">
                    {isCopied ? <CheckCircle size={14} className="text-green-500"/> : <Copy size={14}/>} {storeSettings.promptPayNo}
                  </button><br/>
                  <label className="cursor-pointer bg-[#3D2C1E] text-white py-4 px-8 rounded-2xl text-[11px] font-bold inline-flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                    <Upload size={18}/> {slipImage ? 'เปลี่ยนรูปสลิป' : 'แนบรูปสลิป'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const fr = new FileReader(); fr.onload = (ev) => setSlipImage(ev.target.result); fr.readAsDataURL(e.target.files[0]);
                    }} />
                  </label>
                  {slipImage && <img src={slipImage} className="mt-4 h-32 mx-auto rounded-lg shadow-md border-2 border-white" />}
                </div>
                <button onClick={handleOrder} disabled={isLoading || !slipImage} className={`w-full py-5 rounded-[2.5rem] font-bold text-lg transition-all shadow-xl ${slipImage ? 'bg-[#A67C52] text-white' : 'bg-gray-100 text-gray-300'}`}>{isLoading ? 'กำลังประมวลผล...' : `ยืนยันการสั่งซื้อ • ฿${cart.reduce((s,i)=>s+(i.price*i.qty),0)}`}</button>
              </div>
            )}
          </div>
        )}

        {view === 'myOrders' && (
          <div className="p-6 space-y-6 flex-1 animate-in slide-in-from-right-10">
             <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-gray-400 text-sm"><ChevronLeft size={20}/> กลับไปหน้าร้าน</button>
             <h2 className="text-3xl font-serif font-bold">ประวัติการสั่งซื้อ</h2>
             <div className="space-y-6">
               {orders.filter(o => o.userId === lineProfile.userId).map(o => {
                 const qInfo = getQueueInfo(o.id);
                 return (
                   <div key={o.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                        <div>
                          <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-wider">บิล #{o.id.slice(0,6)}</span>
                          <div className="flex items-center gap-2 mt-1">
                             <div className={`w-2 h-2 rounded-full ${o.status === 'pending' ? 'bg-orange-400' : o.status === 'cooking' ? 'bg-blue-400 animate-pulse' : 'bg-green-500'}`}></div>
                             <p className="text-xs font-bold text-[#3D2C1E] uppercase">{o.status === 'pending' ? 'รอตรวจสอบ' : o.status === 'cooking' ? 'กำลังปรุง' : 'สำเร็จแล้ว'}</p>
                          </div>
                        </div>
                        <div className="text-2xl font-serif font-bold text-[#3D2C1E]">฿{o.total}</div>
                      </div>
                      
                      {/* ส่วนแสดงสถานะคิว */}
                      {(o.status === 'pending' || o.status === 'cooking') && qInfo && (
                        <div className="bg-[#F5EEDC] p-4 rounded-2xl mb-4 flex items-center justify-between border border-[#A67C52]/20">
                          <div className="flex items-center gap-3">
                            <Clock size={20} className="text-[#A67C52]" />
                            <div>
                              <p className="text-[10px] font-bold text-[#A67C52] uppercase">สถานะคิวของคุณ</p>
                              <p className="text-sm font-bold">คิวที่ {qInfo.currentQueue}</p>
                            </div>
                          </div>
                          <p className="text-[10px] font-bold bg-white px-3 py-1 rounded-full text-gray-500 shadow-sm">อีก {qInfo.totalWait} คิวข้างหน้า</p>
                        </div>
                      )}

                      <div className="space-y-1">
                        {(o.items || []).map((item, idx) => (
                          <p key={idx} className="text-[11px] font-bold text-gray-400">{item.qty}x {item.name} ({item.isBlended ? 'ปั่น' : 'เย็น'})</p>
                        ))}
                      </div>
                   </div>
                 );
               })}
               {orders.filter(o => o.userId === lineProfile.userId).length === 0 && <div className="py-24 text-center opacity-10 font-serif italic">ยังไม่มีประวัติการสั่งซื้อครับ 🐮</div>}
             </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="p-6 bg-white min-h-screen">
            <button onClick={() => setView('shop')} className="flex items-center gap-2 font-bold text-gray-400 text-sm mb-6"><ChevronLeft size={20}/> กลับหน้าร้าน</button>
            <h2 className="text-2xl font-serif font-bold mb-6">ระบบจัดการหลังร้าน</h2>
            <div className="flex gap-2 bg-gray-50 p-1 rounded-2xl mb-6">
              {['orders', 'menus', 'settings'].map(t => (
                <button key={t} onClick={() => setAdminTab(t)} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${adminTab === t ? 'bg-[#3D2C1E] text-white shadow-md' : 'text-gray-500'}`}>{t === 'orders' ? 'ออร์เดอร์' : t === 'menus' ? 'เมนู' : 'ตั้งค่า'}</button>
              ))}
            </div>

            {adminTab === 'orders' && (
              <div className="space-y-4">
                {orders.map((o, idx) => {
                  const qInfo = getQueueInfo(o.id);
                  return (
                    <div key={o.id} className="border border-gray-100 p-5 rounded-3xl shadow-sm bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#3D2C1E] text-white w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold">#{orders.length - idx}</span>
                          <span className="font-bold text-sm">{o.lineName}</span>
                        </div>
                        <span className="text-orange-600 font-bold">฿{o.total}</span>
                      </div>
                      
                      <div className="text-[10px] text-gray-400 mb-3 flex items-center gap-2"><MapPin size={12}/> {o.address}</div>
                      
                      <div className="space-y-1 border-t pt-3 mb-4">
                        {(o.items || []).map((i, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex justify-between">
                            <span>{i.qty}x {i.name} ({i.isBlended?'ปั่น':'เย็น'} • {i.sweetness})</span>
                            <span className="font-bold">฿{i.price * i.qty}</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button onClick={() => setSelectedSlip(o.slipImage)} className="bg-blue-50 text-blue-600 py-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 shadow-sm"><Eye size={14}/> ดูสลิป</button>
                        <button onClick={() => deleteDoc(doc(db, 'orders', o.id))} className="bg-red-50 text-red-400 py-3 rounded-xl flex items-center justify-center"><Trash2 size={16}/></button>
                      </div>

                      {/* ส่วนจัดการสถานะ */}
                      <div className="flex gap-2 border-t pt-3 mt-2">
                        {o.status === 'pending' && (
                          <button onClick={() => updateOrderStatus(o.id, 'cooking')} className="flex-1 bg-orange-400 text-white py-3 rounded-xl text-[10px] font-bold shadow-md">เริ่มทำ (ปรุง)</button>
                        )}
                        {o.status === 'cooking' && (
                          <button onClick={() => updateOrderStatus(o.id, 'completed')} className="flex-1 bg-green-500 text-white py-3 rounded-xl text-[10px] font-bold shadow-md flex items-center justify-center gap-1"><Check size={14}/> เสร็จสิ้น (ส่ง)</button>
                        )}
                        {o.status === 'completed' && (
                          <div className="flex-1 text-center text-[10px] font-bold text-green-600 py-2 border border-green-200 rounded-xl bg-green-50">ออร์เดอร์สำเร็จแล้ว</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {adminTab === 'menus' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 space-y-4 text-center">
                  <h3 className="font-bold text-sm text-[#A67C52]">เพิ่มเมนูใหม่</h3>
                  <input type="text" placeholder="ชื่อเมนู" className="w-full p-4 rounded-2xl text-sm outline-none shadow-sm" value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} />
                  <div className="flex gap-2">
                    <input type="number" placeholder="ราคา" className="w-1/2 p-4 rounded-2xl text-sm outline-none shadow-sm" value={newMenu.price} onChange={e => setNewMenu({...newMenu, price: e.target.value})} />
                    <select className="w-1/2 p-4 rounded-2xl text-sm outline-none shadow-sm bg-white" value={newMenu.category} onChange={e => setNewMenu({...newMenu, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <label className="cursor-pointer bg-white border p-4 rounded-2xl text-xs font-bold block shadow-sm text-gray-400 hover:text-[#A67C52] transition-all">
                    <Upload size={18} className="inline mr-2"/> {newMenu.image ? 'เปลี่ยนรูปเมนู' : 'อัปโหลดรูปภาพเมนู'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const fr = new FileReader(); fr.onload = (ev) => setNewMenu({...newMenu, image: ev.target.result}); fr.readAsDataURL(e.target.files[0]);
                    }} />
                  </label>
                  {newMenu.image && <img src={newMenu.image} className="w-24 h-24 mx-auto rounded-3xl object-cover border-4 border-white shadow-md" />}
                  <button onClick={handleAddMenu} className="w-full bg-[#A67C52] text-white py-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">บันทึกเมนูใหม่</button>
                </div>
                <div className="space-y-3">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">รายการเมนูทั้งหมด</h4>
                   {menuItems.map(item => (
                     <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
                       <div className="flex items-center gap-4">
                         <img src={item.image} className="w-14 h-14 rounded-2xl object-cover" />
                         <div><p className="font-bold text-sm text-[#3D2C1E]">{item.name}</p><p className="text-xs text-[#A67C52] font-bold">฿{item.price}</p></div>
                       </div>
                       <button onClick={() => handleDeleteMenu(item.id)} className="p-3 text-red-300 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {adminTab === 'settings' && (
              <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 space-y-5 text-center animate-in fade-in">
                <h3 className="font-bold text-sm text-[#A67C52]">ตั้งค่าช่องทางชำระเงิน</h3>
                <div className="text-left">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">หมายเลขพร้อมเพย์</label>
                  <input type="text" placeholder="หมายเลขพร้อมเพย์" className="w-full p-4 rounded-2xl text-sm outline-none shadow-sm" value={editPromptPay} onChange={e => setEditPromptPay(e.target.value)} />
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">อัปโหลด QR Code ร้าน</label>
                  <label className="cursor-pointer bg-white border p-4 rounded-2xl text-xs font-bold block shadow-sm text-gray-400">
                    <Upload size={18} className="inline mr-2"/> {editQrCodeImage ? 'เปลี่ยนรูป QR Code' : 'อัปโหลดรูป QR Code'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const fr = new FileReader(); fr.onload = (ev) => setEditQrCodeImage(ev.target.result); fr.readAsDataURL(e.target.files[0]);
                    }} />
                  </label>
                </div>
                {editQrCodeImage && <img src={editQrCodeImage} className="w-32 h-32 mx-auto rounded-3xl object-contain border-4 border-white shadow-md" />}
                <button onClick={async () => {
                  await setDoc(doc(db, 'settings', 'store'), { promptPayNo: editPromptPay, qrCodeImage: editQrCodeImage }, { merge: true });
                  alert('บันทึกการตั้งค่าสำเร็จ! 🐮');
                }} className="w-full bg-[#3D2C1E] text-white py-4 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all">บันทึกการตั้งค่า</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- Modal ดูสลิป (ขยายใหญ่) --- */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setSelectedSlip(null)}>
          <button className="absolute top-10 right-10 text-white p-3 bg-white/20 rounded-full hover:bg-white/30 transition-all"><X size={30}/></button>
          <img src={selectedSlip} className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl animate-in zoom-in duration-300 border-4 border-white/10" />
        </div>
      )}

      {/* --- Modal กรอกรหัสแอดมิน --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="w-16 h-16 bg-[#F5EEDC] rounded-full flex items-center justify-center mx-auto mb-6"><Settings className="text-[#A67C52]" size={32}/></div>
            <h3 className="font-bold text-xl mb-2 text-[#3D2C1E]">แอดมินเข้าสู่ระบบ</h3>
            <p className="text-xs text-gray-400 mb-8">กรุณากรอกรหัสผ่านเพื่อจัดการหลังบ้าน</p>
            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl mb-8 text-center text-3xl outline-none tracking-[0.5em] focus:border-[#A67C52] transition-all" placeholder="••••••" />
            <div className="flex gap-4">
               <button onClick={() => { setShowAdminModal(false); setAdminPassword(''); }} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold rounded-2xl hover:bg-gray-200 transition-all">ยกเลิก</button>
               <button onClick={() => {
                 if(adminPassword === '570402') { setView('admin'); setShowAdminModal(false); setAdminPassword(''); }
                 else { alert('รหัสผ่านไม่ถูกต้องครับ!'); setAdminPassword(''); }
               }} className="flex-1 py-4 bg-[#3D2C1E] text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal เลือกตัวเลือกสินค้า --- */}
      {optionModalItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-t-[3.5rem] w-full max-w-md p-10 space-y-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-serif font-bold text-[#3D2C1E]">{optionModalItem.name}</h3><button onClick={() => setOptionModalItem(null)} className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-600 transition-all"><X/></button></div>
            <div className="space-y-8">
              <div><label className="text-[10px] font-bold block mb-4 text-gray-400 uppercase tracking-widest">เลือกระดับความหวาน</label>
                <div className="grid grid-cols-5 gap-2">{SWEETNESS.map(l => (
                    <button key={l} onClick={() => setTempOptions({...tempOptions, sweetness: l})} className={`py-3.5 rounded-2xl text-[10px] font-bold border transition-all ${tempOptions.sweetness === l ? 'bg-[#3D2C1E] text-white border-[#3D2C1E] shadow-md' : 'bg-white text-gray-300 border-gray-100 hover:border-[#A67C52]'}`}>{l}</button>
                ))}</div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                 <button onClick={() => setTempOptions({...tempOptions, isBlended: false})} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${!tempOptions.isBlended ? 'border-[#A67C52] bg-[#F5EEDC]/40 text-[#3D2C1E] shadow-sm' : 'border-gray-50 text-gray-300'}`}><Coffee size={32}/><span className="text-xs uppercase">เมนูเย็น</span></button>
                 <button onClick={() => setTempOptions({...tempOptions, isBlended: true})} className={`py-8 rounded-[2.5rem] border-2 font-bold flex flex-col items-center gap-4 transition-all ${tempOptions.isBlended ? 'border-[#A67C52] bg-[#F5EEDC]/40 text-[#3D2C1E] shadow-sm' : 'border-gray-50 text-gray-300'}`}><Zap size={32}/><span className="text-xs uppercase">เมนูปั่น (+฿{optionModalItem.blendPrice || 5})</span></button>
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
              }} className="w-full py-6 bg-[#3D2C1E] text-white rounded-[2.5rem] font-bold text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"><Plus size={24}/> เพิ่มลงตะกร้า • ฿{optionModalItem.price + (tempOptions.isBlended ? (optionModalItem.blendPrice || 5) : 0)}</button>
          </div>
        </div>
      )}
    </div>
  );
}