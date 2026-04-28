export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", color: "#111" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Política de Privacidade</h1>
      <p style={{ color: "#555", marginBottom: 32 }}>WB Digital Solutions — WB-CRM</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>1. Dados coletados</h2>
        <p>O WB-CRM coleta apenas os dados necessários para o funcionamento do sistema de gestão de relacionamento com clientes (CRM), incluindo nome, e-mail, telefone e informações comerciais dos leads e contatos cadastrados pelos usuários.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>2. Uso dos dados</h2>
        <p>Os dados coletados são utilizados exclusivamente para fins operacionais do CRM: organização de pipeline de vendas, registro de atividades e comunicação comercial. Não compartilhamos dados com terceiros sem consentimento explícito.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3. Integrações com terceiros</h2>
        <p>O sistema pode utilizar APIs de terceiros (Meta, Google, WhatsApp) para consulta de informações públicas. Nenhum dado pessoal é enviado a essas plataformas sem autorização do usuário.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>4. Segurança</h2>
        <p>Todos os dados são armazenados em servidores seguros com acesso restrito. Utilizamos criptografia em trânsito (HTTPS) e em repouso.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>5. Contato</h2>
        <p>Para dúvidas sobre privacidade, entre em contato: <a href="mailto:bruno@wbdigitalsolutions.com" style={{ color: "#7c3aed" }}>bruno@wbdigitalsolutions.com</a></p>
      </section>

      <p style={{ color: "#888", fontSize: 13, marginTop: 48 }}>Última atualização: abril de 2026</p>
    </main>
  );
}
