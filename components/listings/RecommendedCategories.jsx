"use client";
import {useStorageSnapshot} from "@/lib/hooks/useStorageSnapshot";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCookieConsent } from "@/lib/cookie-consent";
import { CATEGORIES } from "@/lib/constants";
export function RecommendedCategories() {
  const consent=useCookieConsent();
  const interests=useStorageSnapshot(()=>consent?.marketing?JSON.parse(localStorage.getItem('reloo_marketing_interests')||'[]'):[]);
  const categories=(Array.isArray(interests)?interests:[]).map(slug=>CATEGORIES.find(c=>c.slug===slug)).filter(Boolean);
  if (!categories.length) return null;
  return <section className="container" style={{ padding: "24px 20px", borderBottom: "1px solid #e2e9e5" }}><h2 style={{ fontSize: 19, marginBottom: 14 }}>Gợi ý theo nhu cầu của bạn</h2><div className="ops-actions">{categories.map((category) => <Link key={category.slug} href={`/explore?category=${category.slug}`} className="btn btn-ghost">{category.name}<ArrowUpRight size={16}/></Link>)}</div></section>;
}
