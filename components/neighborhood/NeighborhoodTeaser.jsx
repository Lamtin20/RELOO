import Link from "next/link";
import Image from "next/image";
import { Building2,Package,MapPin,Leaf,Search } from "lucide-react";
import { text } from "@/lib/neighborhood/content";
import "./neighborhood.css";
import './neighborhood-banner.css';
export function NeighborhoodTeaser({ locale = "vi-VN" }) {
  return (
    <section className="nk-discovery-section">
      <div className="nk-discovery-banner"><div className="nk-discovery-copy"><span className="nk-discovery-kicker"><Building2 size={18}/>{text(locale,'brand')}</span><h2>{text(locale,'tagline')}</h2><Link href={'/noi-khu?lang='+locale}><Search size={18}/>{text(locale,'browse')}</Link></div><div className="nk-discovery-art nk-discovery-photo" aria-hidden="true"><Image src="/images/refresh-20261018/campaign-nearby-wide.webp" alt="" width={1600} height={1000} sizes="(max-width:650px) 90vw, 40vw"/></div></div>
    </section>
  );
}
