import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// CNAE data from: https://github.com/devcosta/Tabelas-do-Governo
const cnaesData = [
  {"cod":"0111-3/01", "desc": "Cultivo de arroz"},
  {"cod":"0111-3/02", "desc": "Cultivo de milho"},
  {"cod":"0111-3/03", "desc": "Cultivo de trigo"},
  {"cod":"0111-3/99", "desc": "Cultivo de outros cereais não especificados anteriormente"},
  {"cod":"0112-1/01", "desc": "Cultivo de algodão herbáceo"},
  {"cod":"0112-1/02", "desc": "Cultivo de juta"},
  {"cod":"0112-1/99", "desc": "Cultivo de outras fibras de lavoura temporária não especificadas anteriormente"},
  {"cod":"0113-0/00", "desc": "Cultivo de cana-de-açúcar"},
  {"cod":"0114-8/00", "desc": "Cultivo de fumo"},
  {"cod":"0115-6/00", "desc": "Cultivo de soja"},
  // Add more common CNAEs manually, or fetch from API in production
  {"cod":"4751-2/01", "desc": "Comércio varejista especializado de equipamentos e suprimentos de informática"},
  {"cod":"6201-5/00", "desc": "Desenvolvimento de programas de computador sob encomenda"},
  {"cod":"6202-3/00", "desc": "Desenvolvimento e licenciamento de programas de computador customizáveis"},
  {"cod":"6203-1/00", "desc": "Desenvolvimento e licenciamento de programas de computador não customizáveis"},
  {"cod":"6204-0/00", "desc": "Consultoria em tecnologia da informação"},
  {"cod":"6209-1/00", "desc": "Suporte técnico, manutenção e outros serviços em tecnologia da informação"},
  {"cod":"6311-9/00", "desc": "Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet"},
  {"cod":"6319-4/00", "desc": "Portais, provedores de conteúdo e outros serviços de informação na internet"},
  {"cod":"7319-0/02", "desc": "Promoção de vendas"},
  {"cod":"7319-0/03", "desc": "Marketing direto"},
  {"cod":"7319-0/04", "desc": "Consultoria em publicidade"},
  {"cod":"7490-1/04", "desc": "Atividades de intermediação e agenciamento de serviços e negócios em geral, exceto imobiliários"},
];

async function main() {
  console.log('🌱 Seeding CNAEs...');

  let created = 0;
  let skipped = 0;

  for (const cnae of cnaesData) {
    try {
      const existing = await prisma.cNAE.findUnique({
        where: { code: cnae.cod },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.cNAE.create({
        data: {
          id: randomUUID(),
          code: cnae.cod,
          description: cnae.desc,
        },
      });
      created++;
    } catch (error) {
      console.error(`Error creating CNAE ${cnae.cod}:`, error);
    }
  }

  console.log(`✅ Seed completed: ${created} CNAEs created, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
