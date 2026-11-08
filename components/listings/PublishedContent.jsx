"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
export function PublishedContent() {
  const [items, setItems] = useState([]);
  useEffect(() => { fetch('/api/content').then((response) => response.json()).then((data) => { if (data.ok) setItems(data.items); }).catch(() => {}); }, []);
  if (!items.length) return null;
  return <section className="container" style={{ padding: '30px 20px', borderBottom: '1px solid #e2e9e5' }}><h2 style={{ fontSize: 20, marginBottom: 18 }}>Cập nhật từ RELOO</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 22 }}>{items.map((item) => <article key={item.id}>{item.imageUrl && <img src={item.imageUrl} alt={item.title} style={{ width: '100%', aspectRatio: '2/1', objectFit: 'cover', borderRadius: 6 }}/>}<h3 style={{ fontSize: 16, margin: '12px 0 8px' }}>{item.title}</h3><p style={{ fontSize: 13, lineHeight: 1.6 }}>{item.description}</p>{item.code && <strong>{item.code}</strong>}{item.href && <Link href={item.href} className="r-text-link">Xem nội dung <ArrowRight size={15}/></Link>}</article>)}</div></section>;
}
