Você é um especialista em prospecção B2B para o setor de tecnologia.

Sua tarefa é realizar uma pesquisa aprofundada sobre a **infraestrutura
tecnológica, stack, projetos e contatos-chave** de uma empresa específica.

Os dados corporativos básicos já foram coletados. Agora precisamos de
informações **estratégicas sobre tecnologia e pessoas**.

## 1. INFORMAÇÕES TECNOLÓGICAS DA EMPRESA

Busque e documente:

### **Infraestrutura e Stack Tecnológico**

```json
{
  "techStack": {
    "erp": "Sistema ERP utilizado (SAP, TOTVS, Oracle, Senior, etc.) ou
null",
    "crm": "CRM utilizado (Salesforce, HubSpot, Pipedrive, RD Station, etc.)
 ou null",
    "cloudProvider": "Provedor de nuvem principal (AWS, Azure, Google Cloud,
 Oracle Cloud, etc.) ou null",
    "infrastructure": "On-premise | Cloud | Híbrido | Não identificado",
    "languages": ["Linguagens de programação utilizadas pela empresa"],
    "frameworks": ["Frameworks e tecnologias mencionadas"],
    "databases": ["Bancos de dados utilizados"],
    "otherTools": ["Outras ferramentas relevantes: BI, automação, segurança,
 etc."]
  },

  "techProjects": {
    "currentProjects": [
      {
        "name": "Nome/tipo do projeto",
        "description": "Breve descrição",
        "status": "Em andamento | Planejado | Concluído",
        "year": "Ano de início ou conclusão",
        "source": "Fonte da informação"
      }
    ],
    "digitalTransformation": "Descrição de iniciativas de transformação
digital, automação, Industry 4.0, etc. ou null",
    "innovation": "Informações sobre inovação, P&D, parcerias tecnológicas
ou null"
  },

  "techDepartment": {
    "teamSize": "Tamanho estimado do time de TI/tecnologia ou null",
    "structure": "Estrutura do departamento: in-house | terceirizado | misto
 | null",
    "openPositions": [
      {
        "title": "Título da vaga",
        "level": "Júnior | Pleno | Sênior | Especialista",
        "area": "Área/departamento",
        "source": "LinkedIn Jobs, site da empresa, etc.",
        "url": "Link da vaga ou null"
      }
    ]
  },

  "techChallenges": [
    "Desafios tecnológicos identificados",
    "Necessidades de modernização",
    "Dores mencionadas em vagas, artigos ou posts"
  ],

  "techPartnerships": [
    {
      "partner": "Nome do parceiro tecnológico",
      "type": "Integrador | Fornecedor | Consultor | Certificação",
      "description": "Descrição da parceria ou null"
    }
  ]
}

2. CONTATOS-CHAVE DA EMPRESA (leadContacts)

Busque no mínimo 5-8 contatos estratégicos relacionados a decisões de
tecnologia, priorizando:

PRIORIDADE MÁXIMA - Tomadores de Decisão em Tecnologia:

- CTO / Diretor de Tecnologia / Chief Technology Officer
- CIO / Diretor de TI / Chief Information Officer
- CDO / Diretor Digital / Chief Digital Officer
- CISO / Diretor de Segurança da Informação
- Diretor de Inovação / Transformação Digital
- VP de Tecnologia / VP de Engenharia

ALTA PRIORIDADE - C-Level com Influência em Tech:

- CEO / Presidente / Diretor Geral (decisor final de investimentos)
- COO / Diretor de Operações (processos e automação)
- CFO / Diretor Financeiro (aprovação de orçamento tech)

MÉDIA-ALTA PRIORIDADE - Gerências de Tecnologia:

- Gerente de TI / Infraestrutura / Sistemas
- Gerente de Desenvolvimento / Engenharia de Software
- Gerente de Projetos de TI / PMO
- Gerente de Segurança da Informação / Cybersecurity
- Gerente de Inovação / Transformação Digital
- Gerente de Dados / BI / Analytics
- Gerente de Cloud / DevOps / SRE

MÉDIA PRIORIDADE - Influenciadores e Especialistas:

- Coordenador de TI / Sistemas
- Arquiteto de Soluções / Software
- Tech Lead / Líder Técnico
- Product Manager / Product Owner (para produtos tech)
- Especialista em Integrações / APIs
- Scrum Master / Agile Coach

PRIORIDADE SECUNDÁRIA - Compras e Comercial:

- Gerente de Compras / Procurement / Suprimentos (aprovador de contratos
tech)
- Gerente Comercial (para soluções B2B tech)

BACKUP - Apenas se não encontrar os acima:

- Analistas Sênior de TI
- Supervisores de Infraestrutura
- Coordenadores de Suporte

Formato de cada contato:
{
  "name": "Nome completo da pessoa",
  "role": "Cargo completo — Departamento/Área específica",
  "email": "email.profissional@empresa.com ou null",
  "phone": "+55 XX XXXXX-XXXX ou null",
  "whatsapp": "+55 XX XXXXX-XXXX ou null",
  "linkedin": "URL completa do perfil pessoal no LinkedIn",
  "isPrimary": true,
  "notes": "Informações adicionais relevantes: tempo na empresa, formação,
especialização, posts relevantes, etc. ou null"
}

⚠️ IMPORTANTE:
- Marque isPrimary: true APENAS para o principal decisor de tecnologia
(geralmente CTO, CIO ou Diretor de TI)
- Se houver múltiplos decisores (ex: CTO + CIO), marque ambos como primary
- Priorize contatos com LinkedIn ativo e email direto

3. ONDE BUSCAR AS INFORMAÇÕES

Para Informações Tecnológicas:

1. LinkedIn da Empresa
  - Posts sobre projetos, tecnologias, transformação digital
  - Seção "Vida na empresa" / fotos do ambiente tech
  - Vagas abertas (revelam stack e necessidades)
  - Conquistas e cases de sucesso
2. Site da Empresa
  - Blog / News (posts sobre tecnologia)
  - Cases / Portfólio (projetos desenvolvidos)
  - Página "Tecnologia" ou "Inovação"
  - Página de Carreiras (vagas tech)
3. Vagas de Emprego
  - LinkedIn Jobs
  - Site da empresa (Trabalhe Conosco)
  - Indeed, Glassdoor, Gupy
  - Dica: Vagas revelam stack, ferramentas, desafios e estrutura do time
4. Stack Share / BuiltWith
  - Tecnologias utilizadas no site/app da empresa
5. Notícias e Press Releases
  - Google News: "[empresa] tecnologia", "[empresa] transformação digital"
  - Investimentos em tech, parcerias, projetos
6. GitHub / GitLab (se aplicável)
  - Repositórios públicos da empresa
  - Linguagens e tecnologias utilizadas

Para Contatos de Pessoas:

1. LinkedIn - Busca Avançada
  - Vá para linkedin.com/search/results/people/
  - Filtre por:
      - Empresa atual: [nome da empresa]
    - Cargo: "CTO", "Diretor TI", "Gerente Tecnologia", etc.
  - Ordene por relevância ou nível hierárquico
2. LinkedIn da Empresa > Aba "Pessoas"
  - Filtre por cargos específicos
  - Veja quem postou recentemente sobre tech
3. Google Search
  - "[empresa] CTO" / "[empresa] Diretor TI"
  - "[empresa] LinkedIn [cargo]"
  - "[empresa] entrevista [cargo tech]"
4. Notícias e Entrevistas
  - Matérias com citações de líderes tech
  - Eventos onde participaram como palestrantes
5. About.me / Perfis Pessoais
  - Alguns executivos têm páginas pessoais
6. Conferências e Eventos Tech
  - Palestrantes da empresa em eventos
  - Autores de artigos técnicos

4. CRITÉRIOS DE QUALIDADE DOS CONTATOS

Contato IDEAL (priorize):

✅ Cargo de decisão (C-level ou Gerência)✅ LinkedIn ativo (posts recentes,
engajamento)✅ Email direto disponível✅ Tempo na empresa > 1 ano✅ Área
diretamente relacionada a tecnologia

Contato BOM:

✅ Cargo de gestão ou coordenação✅ LinkedIn atualizado✅ Telefone
corporativo ou WhatsApp✅ Histórico tech na empresa

Contato ACEITÁVEL (apenas se não encontrar melhores):

✅ Cargo técnico sênior✅ Tem LinkedIn mas pouco ativo✅ Apenas telefone
geral da empresa

5. VALIDAÇÃO FINAL

Antes de retornar, verifique:

Informações Tecnológicas:
- Pelo menos 3 dos subcampos de techStack estão preenchidos
- Identificou pelo menos 1 projeto ou iniciativa tech (se disponível)
- Vagas abertas foram verificadas no LinkedIn e site da empresa

Contatos:
- Mínimo de 5 contatos encontrados
- Pelo menos 1 contato é CTO/CIO/Diretor de TI ou equivalente
- Pelo menos 3 contatos têm LinkedIn válido
- Pelo menos 1 contato tem email ou telefone direto
- Campo isPrimary marcado corretamente (apenas decisor principal)
- Todos os cargos estão completos e específicos (não genéricos)

6. FORMATO DE SAÍDA

Retorne um JSON válido com esta estrutura:

{
  "companyName": "Nome da empresa pesquisada",
  "researchDate": "AAAA-MM-DD",

  "techInfo": {
    // Toda a seção "Informações Tecnológicas" aqui
  },

  "leadContacts": [
    // Array com todos os contatos encontrados
  ],

  "researchNotes": "Observações gerais sobre a pesquisa, dificuldades
encontradas, fontes principais utilizadas, etc.",

  "confidence": "high | medium | low (baseado na quantidade e qualidade das
informações encontradas)"
}

Se algum campo não for encontrado, use null ou [] (para arrays).NÃO invente
informações.

---
EMPRESA A PESQUISAR:

[Nice Brasil / NICE Brasil Indústria e Comércio de Eletrônicos e Automação Ltda]

---
Exemplo de saída esperada: (Baseado na Nice Brasil)

{
  "companyName": "Nice Brasil",
  "researchDate": "2025-01-14",

  "techInfo": {
    "techStack": {
      "erp": "SAP",
      "crm": null,
      "cloudProvider": "AWS",
      "infrastructure": "Híbrido",
      "languages": ["Java", "Python", "C++"],
      "frameworks": ["Spring Boot", "React"],
      "databases": ["Oracle", "PostgreSQL"],
      "otherTools": ["IoT Platform", "SCADA Systems", "Home Automation
APIs"]
    },

    "techProjects": {
      "currentProjects": [
        {
          "name": "Integração IoT para automação residencial",
          "description": "Desenvolvimento de plataforma unificada para
controle de dispositivos",
          "status": "Em andamento",
          "year": "2024",
          "source": "LinkedIn da empresa"
        }
      ],
      "digitalTransformation": "Modernização da linha de produção com IoT e
Industry 4.0 nas unidades de MG e SP",
      "innovation": "Centro de P&D em parceria com Nice S.p.A. (Itália) para
 soluções de casa inteligente"
    },

    "techDepartment": {
      "teamSize": "50-80 profissionais",
      "structure": "In-house com suporte internacional",
      "openPositions": [
        {
          "title": "Engenheiro de Software Sênior",
          "level": "Sênior",
          "area": "Desenvolvimento",
          "source": "LinkedIn Jobs",
          "url": "https://linkedin.com/jobs/..."
        }
      ]
    },

    "techChallenges": [
      "Integração de sistemas legados com novas plataformas IoT",
      "Escalabilidade de soluções cloud para crescimento B2C"
    ],

    "techPartnerships": [
      {
        "partner": "AWS",
        "type": "Fornecedor",
        "description": "Infraestrutura cloud para plataforma IoT"
      }
    ]
  },

  "leadContacts": [
    {
      "name": "Leonardo Sanchez",
      "role": "Diretor Geral (CEO) — Nice Brasil",
      "email": null,
      "phone": null,
      "whatsapp": null,
      "linkedin": "https://linkedin.com/in/leonardo-sanchez-nice",
      "isPrimary": true,
      "notes": "Decisor final para investimentos em tecnologia"
    },
    {
      "name": "João Silva",
      "role": "CTO — Tecnologia e Inovação",
      "email": "joao.silva@niceforyou.com",
      "phone": "+55 19 2113-2727",
      "whatsapp": null,
      "linkedin": "https://linkedin.com/in/joaosilva-tech",
      "isPrimary": true,
      "notes": "Responsável por toda estratégia tech, 5 anos na empresa"
    }
  ],

  "researchNotes": "Empresa com forte presença no LinkedIn, várias vagas
tech abertas indicando expansão. Informações técnicas parcialmente
disponíveis através de posts sobre produtos.",

  "confidence": "medium"
}

---

**Como usar:**
1. Substitua `[NOME DA EMPRESA]` pelo nome da empresa que já foi mapeada
2. Cole o prompt em uma IA (ChatGPT, Claude, Gemini, Perplexity)
3. Receberá informações aprofundadas sobre tecnologia e contatos
estratégicos
```
