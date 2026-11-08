import { notFound, redirect } from "next/navigation";
import { branding } from "@/lib/content/branding";
export default async function ShippingPage() {
  if (!(await branding()).shippingEnabled) notFound();
  redirect("/dashboard/agreements");
}
