export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/contacts/:path*", "/deals/:path*", "/activities/:path*", "/organizations/:path*", "/pipeline/:path*", "/partners/:path*", "/projects/:path*"],
};
