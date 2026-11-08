import { Capacitor, registerPlugin } from "@capacitor/core";
// One proxy shared by settings and foreground reconciliation.
export const RelooCalendar = registerPlugin("RelooCalendar");
export const calendarAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("RelooCalendar");
