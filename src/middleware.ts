export { default } from "next-auth/middleware";

// Todas as rotas sob (dashboard) são protegidas. O matcher antigo listava só nove delas;
// as demais (leads, admin, pipelines, email-campaigns, email-warming, bot-flows, as análises
// e o api-docs) ficavam de fora, então uma visita não autenticada dava 500 no SSR em vez de
// redirecionar para /login. O backend já bloqueia o acesso a dados — isto é defesa em
// profundidade e corrige a experiência de quem não está logado.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/contacts/:path*",
    "/deals/:path*",
    "/activities/:path*",
    "/organizations/:path*",
    "/pipeline/:path*",
    "/pipelines/:path*",
    "/partners/:path*",
    "/projects/:path*",
    "/campaigns/:path*",
    "/leads/:path*",
    "/admin/:path*",
    "/email-campaigns/:path*",
    "/email-warming/:path*",
    "/bot-flows/:path*",
    "/call-analyses/:path*",
    "/calls/:path*",
    "/gk-analyses/:path*",
    "/gk-batches/:path*",
    "/meet-analyses/:path*",
    "/api-docs/:path*",
  ],
};
