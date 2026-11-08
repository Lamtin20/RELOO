"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, LoaderCircle } from "lucide-react";
import {listingImageSources} from '@/lib/listing-image-sources';
import {useLocale} from '@/components/settings/LocaleProvider';

export function ListingImage({ images = [], ...props }) {
  const sources = listingImageSources(images);
  const {locale}=useLocale(),en=locale==='en-US';
  return <ImageFallback key={sources.join("|")} sources={sources} {...props} fallbackLabel={props.fallbackLabel??(en?'Image unavailable':'Ảnh chưa khả dụng')} loadingLabel={props.loadingLabel??(en?'Loading image':'Đang tải ảnh')}/>;
}

function ImageFallback({ sources, alt='', className = "", loading = "lazy",fallbackLabel='Ảnh chưa khả dụng',loadingLabel='Đang tải ảnh',width,height,sizes,fetchPriority,style }) {
  const [index, setIndex] = useState(0);
  const [loadedIndex, setLoadedIndex] = useState(null);
  const imageRef = useRef(null);
  useEffect(() => {
    if (
      loadedIndex === index ||
      index >= sources.length
    )
      return;
    let timer;
    if(typeof IntersectionObserver!=='function')return;
    // Lazy images get a bounded wait only once their card enters the viewport.
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      timer = setTimeout(
        () =>
          setIndex((current) => (current === index ? current + 1 : current)),
        8000,
      );
    });
    if (imageRef.current) observer.observe(imageRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [className, index, loadedIndex, sources.length]);
  if (index >= sources.length) {
    return (
      <span
        className={`r-image-empty ${className}`}
        role="img"
        aria-label={alt?`${fallbackLabel}: ${alt}`:fallbackLabel}
      >
        <ImageOff size={28} />
        <span>{fallbackLabel}</span>
      </span>
    );
  }
  return (
    <>
      {loadedIndex !== index && (
        <span
          className="r-image-loading"
          role="status"
          aria-label={alt?`${loadingLabel}: ${alt}`:loadingLabel}
          aria-live="off"
        >
          <LoaderCircle size={22} className="spin" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </span>
      )}
      <img
        key={sources[index]}
        src={sources[index]}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        width={Number.isFinite(width)&&width>0?width:undefined}
        height={Number.isFinite(height)&&height>0?height:undefined}
        sizes={sizes}
        fetchPriority={fetchPriority}
        style={{...style, opacity: loadedIndex === index ? 1 : 0 }}
        ref={(element) => {
          imageRef.current = element;
          if (!element?.complete) return;
          if (element.naturalWidth === 0) setIndex(current=>current===index?current+1:current);
          else if (loadedIndex !== index) setLoadedIndex(index);
        }}
        onLoad={event=>{if(event.currentTarget===imageRef.current)setLoadedIndex(index)}}
        onError={()=>setIndex(current=>current===index?current+1:current)}
      />
    </>
  );
}
