import { neighborhoodGet, neighborhoodPost } from "@/lib/neighborhood/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request) => neighborhoodGet(request);
export const POST = (request) => neighborhoodPost(request);
