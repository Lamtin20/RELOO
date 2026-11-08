"use client";

import { useSyncExternalStore } from "react";
import { isNative } from "./client";

const subscribe = () => () => {};
const serverSnapshot = () => false;

// The server renders the website; Capacitor switches to the app shell at hydration.
export function useNativeApp() {
  return useSyncExternalStore(subscribe, isNative, serverSnapshot);
}
