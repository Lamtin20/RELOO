'use client';
import {useEffect,useState} from 'react';
import {History,ShieldCheck} from 'lucide-react';
export function RentalHistory({listingId}){
  const [items,setItems]=useState([]);
  useEffect(()=>{const controller=new AbortController();fetch('/api/rental/history?'+new URLSearchParams({listing:listingId}),{signal:controller.signal}).then(response=>response.json()).then(data=>{if(data.ok)setItems(data.items);}).catch(()=>{});return()=>controller.abort();},[listingId]);
  if(!items.length)return null;
  return <section className="product-rental-history"><h2><History size={20}/>Lịch sử hoàn trả được ghi nhận</h2>{items.map((item,index)=><div key={item.digest||index}><ShieldCheck size={18}/><span><strong>{item.month} · Hai bên đã xác nhận hoàn trả</strong><small>{item.integrity?'Kiểm tra chữ ký hệ thống đã đạt':'Đang đối chiếu toàn vẹn'} · {item.anchored?'Đã neo EVM':'Chưa neo EVM'}</small></span></div>)}</section>;
}
