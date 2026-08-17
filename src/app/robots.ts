import type { MetadataRoute } from "next";

// Internal CRM — no public content, nothing should be crawled or indexed (including /login).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
