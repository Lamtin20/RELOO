export default function robots() {
  if(process.env.RELOO_ENVIRONMENT==='staging')return {rules:{userAgent:'*',disallow:'/'}};
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/media/", "/api/brand/", "/api/agent/"],
      disallow: ["/crm", "/admin", "/dashboard", "/api/", "/auth", "/account"],
    },
    sitemap: "https://reloo.vn/sitemap.xml",
  };
}
