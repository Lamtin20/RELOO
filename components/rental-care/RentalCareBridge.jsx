"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import { RelooCalendar as Calendar } from "@/lib/mobile/calendar";
import { App } from "@capacitor/app";
import { useAuth } from "@/lib/store";
import { careText } from "@/lib/rental-care/content";
import { careFetch } from "./PersonalizationProvider";
import "./rental-care.css";
import {setupDeviceCalendar} from '@/lib/rental-care/device-setup';
import {useLocale} from '@/components/settings/LocaleProvider';
export function RentalCareBridge() {
  const {locale:uiLocale}=useLocale();
  const { user, hydrated } = useAuth(),
    actor = user?.id;
  useEffect(() => {
    if (!hydrated || !Capacitor.isNativePlatform()) return;
    let live = true,
      running = false;
    const listeners = [];
    async function sync() {
      if (!live || running || document.visibilityState !== "visible") return;
      running = true;
      try {
        if (!actor) {
          if (Capacitor.isPluginAvailable("RelooCalendar"))
            await Calendar.bind({ account: "", enabled: false });
          return;
        }
        let data = await careFetch("/api/rental-care");
        if (!live || data.actor !== actor || !data.enabled) return;
        if (!Capacitor.isPluginAvailable("RelooCalendar")) return;
        const setup=await setupDeviceCalendar({actor,data,native:Calendar,post:careFetch,isCurrent:()=>live,locale:uiLocale});
        if(setup.created){data=await careFetch('/api/rental-care');if(!live||data.actor!==actor)return;}
        if (!["DEVICE", "BOTH"].includes(data.preferences.destination)) {
          await Calendar.bind({ account: "", enabled: false });
          return;
        }
        const identity = await Calendar.identity(),
          connection = data.connections.find(
            (c) =>
              c.provider === "DEVICE" &&
              c.device_id === identity.device &&
              c.status === "ACTIVE",
          );
        const enabled =
          ["DEVICE", "BOTH"].includes(data.preferences.destination) &&
          !!connection;
        await Calendar.bind({
          account: actor,
          device: identity.device,
          enabled,
        });
        if (!enabled) return;
        if (!identity.granted) {
          await careFetch("/api/rental-care", {
            subject: actor,
            action: "devicePermission",
            device: identity.device,
            granted: false,
          });
          return;
        }
        const { jobs } = await careFetch("/api/rental-care", {
          subject: actor,
          action: "claim",
          device: identity.device,
        });
        for (const job of jobs || []) {
          if (!live) break;
          let result = "SYNCED",
            remote = job.remoteId || "";
          try {
            const receipt = await Calendar.sync({ account: actor, job });
            remote = receipt.remoteId;
          } catch (e) {
            result =
              e.message === "REAUTH"
                ? "REAUTH"
                : e.message === "CALENDAR_REVIEW"
                  ? "REVIEW"
                  : "FAILED";
          }
          if (!live) break;
          await careFetch("/api/rental-care", {
            subject: actor,
            action: "ack",
            id: job.id,
            lease: job.lease,
            revision: job.revision,
            remote,
            result,
          });
        }
      } catch {
        /* Never report a successful sync without an acknowledged provider receipt. */
      } finally {
        running = false;
      }
    }
    const timer = setInterval(sync, 30000);
    sync();
    App.addListener("appStateChange", (state) => {
      if (state.isActive) sync();
    }).then((l) => {
      if (!live) l.remove();
      else listeners.push(l);
    });
    return () => {
      live = false;
      clearInterval(timer);
      listeners.forEach((l) => l.remove());
      if (Capacitor.isPluginAvailable("RelooCalendar"))
        Calendar.bind({ account: "", enabled: false }).catch(() => {});
    };
  }, [actor, hydrated,uiLocale]);
  return null;
}
