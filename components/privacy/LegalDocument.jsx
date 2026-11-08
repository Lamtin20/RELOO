"use client";
import { useEffect, useState } from "react";
import { FileCheck2, LoaderCircle } from "lucide-react";
import {BUSINESS_CHANGED} from '@/components/settings/useBusinessEntity';
export function LegalDocument({ slug }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let revision=0;
    const load=()=>{const current=++revision;return fetch("/api/legal/" + slug, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if(!controller.signal.aborted&&current===revision){setData(result.document);setError('');}
      })
      .catch((cause) => {
        if (!controller.signal.aborted&&current===revision) setError(cause.message);
      });};
    load();window.addEventListener('focus',load);window.addEventListener(BUSINESS_CHANGED,load);
    const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(BUSINESS_CHANGED):null;if(channel)channel.onmessage=load;
    const timer=setInterval(()=>{if(document.visibilityState==='visible')load()},60000);
    return () => {controller.abort();clearInterval(timer);channel?.close();window.removeEventListener('focus',load);window.removeEventListener(BUSINESS_CHANGED,load)};
  }, [slug]);
  if (error) return <p className="ops-error">{error}</p>;
  if (!data)
    return (
      <p>
        <LoaderCircle size={19} className="spin" />
        Đang tải tài liệu...
      </p>
    );
  return (
    <div className="legal-document">
      <header>
        <FileCheck2 size={25} />
        <div>
          <h1>{data.title}</h1>
          <p>
            Phiên bản {data.templateVersion} · Khai báo đơn vị v
            {data.entityVersion}
          </p>
        </div>
      </header>
      {data.draft && (
        <p className="legal-draft" role="status">
          Bản dự thảo. Đơn vị vận hành cần hoàn tất khai báo pháp nhân, rà soát
          pháp lý và thủ tục áp dụng trước khi ban hành chính thức.
        </p>
      )}
      {data.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
        </section>
      ))}
      <details className="legal-sources">
        <summary>Căn cứ & phạm vi pháp lý</summary>
        {data.sources.map((source) => (
          <div key={source.number}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title} · {source.number}
            </a>
            <p>{source.scope}</p>
          </div>
        ))}
      </details>
      <p className="legal-hash">Mã bản tài liệu: {data.hash}</p>
    </div>
  );
}
