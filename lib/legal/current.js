import { publicBusiness } from "../operations/settings.js";
import { legalDocument } from "./documents.js";
import { digest } from "../assurance/journal.js";
export const LEGAL_SLUGS = [
  "terms",
  "rental-guide",
  "help",
  "privacy-annex",
  "deposit-terms",
];
export async function currentLegal(db, slug) {
  // Publication identity binds the stored entity shape. Normalizing legacy blanks
  // in a public projection must not silently alter an unchanged accepted document.
  const business = await publicBusiness(db,{normalizeEntity:false}),
    document = legalDocument(slug, business);
  if (!document) return null;
  const edit=await db.from('legal_content_drafts').select('content,version').eq('slug',slug).maybeSingle();
  if(edit.error)throw Error('LEGAL_CONTENT_UNAVAILABLE');
  if(edit.data)Object.assign(document,edit.data.content);
  if(edit.data)document.contentVersion=edit.data.version;
  delete document.draft;
  const hash = digest(document),
    publication = await db
      .from("legal_publications")
      .select("document_hash,published_at")
      .eq("slug", slug)
      .maybeSingle();
  if (publication.error) throw new Error("LEGAL_PUBLICATION_UNAVAILABLE");
  return {
    ...document,
    hash,
    draft: !business.entityReady || publication.data?.document_hash !== hash,
    publishedAt:
      publication.data?.document_hash === hash
        ? publication.data.published_at
        : null,
  };
}
