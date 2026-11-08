"use client";
import { useEffect, useState } from "react";
import {RuntimeSync} from './RuntimeSync';
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Network } from "@capacitor/network";
import { isNative } from "@/lib/mobile/client";
import {mobileRentalDestination} from '@/lib/mobile/routes';
import {RentalBrowseMemory} from '@/components/neighborhood/RentalBrowseMemory';
import {deviceAvailable,RelooDevice} from '@/lib/mobile/device';
import {usePathname,useRouter} from 'next/navigation';
import {CalendarInstallSetup} from '@/components/rental-care/CalendarInstallSetup';
function hasVisibleModal(){
  return [...document.querySelectorAll('dialog[open],[role=dialog][aria-modal=true]')].some(node=>{
    if(node.tagName==='DIALOG')return node.open;
    const r=node.getBoundingClientRect();
    return node.getAttribute('aria-hidden')!=='true'&&getComputedStyle(node).visibility!=='hidden'&&r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
  });
}
export function NativeBridge() {
  const router=useRouter();
  const pathname=usePathname();
  useEffect(()=>{if(isNative())document.dispatchEvent(new Event('reloo-primary-route'));},[pathname]);
  useEffect(()=>{if(deviceAvailable())RelooDevice.immersive({enabled:true}).catch(()=>{});},[pathname]);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (!isNative()) return;
    document.documentElement.classList.add("reloo-native");
    const handles = [];
    let disposed = false;
    let exchanging = false;
    async function listen(plugin, event, callback) {
      const h = await plugin.addListener(event, callback);
      if (disposed) h.remove();
      else handles.push(h);
    }
    async function receive(url) {
      try {
        const parsed = new URL(url);
        const rentalDestination=mobileRentalDestination(url);if(rentalDestination){window.location.assign(rentalDestination);return;}
        if(parsed.protocol==='reloo:'&&parsed.hostname==='calendar'){await Browser.close().catch(()=>{});router.push('/account/calendar');return;}
        if (parsed.protocol !== "reloo:" || parsed.hostname !== "auth") return;
        const pending = JSON.parse(
          sessionStorage.getItem("reloo-native-auth") || "null",
        );
        if (
          exchanging ||
          !pending ||
          pending.flow !== parsed.searchParams.get("flow") ||
          pending.expires < Date.now()
        )
          return;
        exchanging = true;
        const response = await fetch("/api/mobile/auth/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              flow: pending.flow,
              verifier: pending.verifier,
            }),
          }),
          result = await response.json();
        if (!response.ok) throw new Error(result.error);
        sessionStorage.removeItem("reloo-native-auth");
        await Browser.close().catch(() => {});
        window.location.replace(result.next || "/");
      } catch (error) {
        exchanging = false;
        window.dispatchEvent(
          new CustomEvent("reloo-native-auth-error", { detail: error.message }),
        );
      }
    }
    listen(App, "appUrlOpen", (e) => receive(e.url));
    App.getLaunchUrl().then((e) => {
      if (e?.url) receive(e.url);
    }).catch(() => {});
    listen(App, "backButton", ({ canGoBack }) => {
      const inline=[...document.querySelectorAll('.loc-picker__dropdown[role="dialog"]')].some(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0;});
      if(inline&&!document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})))return;
      const nativeDialog=[...document.querySelectorAll('dialog[open]')].at(-1);
      if(nativeDialog){const cancel=new Event('cancel',{cancelable:true});if(nativeDialog.dispatchEvent(cancel))nativeDialog.close();return;}
      if (hasVisibleModal())
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      else {const escape=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});if(!document.dispatchEvent(escape))return;if(canGoBack)window.history.back();else App.exitApp();}
    });
    listen(Network, "networkStatusChange", (status) =>
      setOffline(!status.connected),
    );
    listen(App,'appStateChange',state=>{document.documentElement.dataset.relooAppActive=String(state.isActive);document.dispatchEvent(new Event('reloo-native-active'));});
    Network.getStatus().then((status) => setOffline(!status.connected));
    const external = (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a || e.defaultPrevented) return;
      const target = new URL(a.href, location.origin);
      if (target.protocol === "https:" && target.origin !== location.origin) {
        e.preventDefault();
        Browser.open({ url: target.href, toolbarColor: "#087f56" });
      }
    };
    document.addEventListener("click", external);
    return () => {
      disposed = true;
      handles.forEach((h) => h.remove());
      document.removeEventListener("click", external);
      document.documentElement.classList.remove("reloo-native");
    };
  }, [router]);
  return <><RuntimeSync/><CalendarInstallSetup/><RentalBrowseMemory/>{offline ? (
    <div role="status" className="native-offline">
      Đang mất kết nối mạng. RELOO sẽ tiếp tục khi có mạng.
    </div>
  ) : null}</>;
}
