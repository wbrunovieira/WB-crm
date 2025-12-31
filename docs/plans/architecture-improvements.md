# Plano de Melhorias de Arquitetura e Testes

**Data de Criação:** 2024-12-31
**Última Atualização:** 2024-12-31
**Status:** Em Progresso
**Prioridade:** Alta (Sistema entrando em produção com múltiplos usuários)

---

## Histórico de Atualizações

| Data       | Descrição                                                                 |
|------------|---------------------------------------------------------------------------|
| 2024-12-31 | Criação do plano e implementação dos testes de isolamento (Server Actions) |
| 2024-12-31 | Implementação dos testes de isolamento (API Routes) - Fase 1 completa     |
| 2024-12-31 | Implementação dos testes de autenticação e autorização - Fase 2 completa  |
| 2024-12-31 | Implementação dos testes de Leads (54 testes) - Fase 3.1 completa         |
| 2024-12-31 | Implementação dos testes de Lead Contacts (42 testes) - Fase 3.2 completa |
| 2024-12-31 | Implementação dos testes de Organizations (49 testes) - Fase 3.3 completa |
| 2024-12-31 | Implementação dos testes de Contacts (56 testes) - Fase 3.4 completa      |
| 2024-12-31 | Implementação dos testes de Deals (48 testes) - Fase 3.5 completa         |
| 2024-12-31 | Implementação dos testes de Activities (61 testes) - Fase 3.6 completa    |
| 2024-12-31 | Implementação dos testes de Partners (45 testes) - Fase 3.7 completa      |

---

## Sumário Executivo

Este documento define o plano de melhorias para tornar o sistema mais robusto antes de ir para produção. As melhorias são organizadas por prioridade, considerando o tempo disponível e o impacto na segurança/estabilidade.

---

## Fase 1: Testes Críticos de Segurança (PRIORIDADE MÁXIMA)

### 1.1 Isolamento de Dados Entre Usuários

> **CRÍTICO:** Com múltiplos usuários, garantir que um usuário NUNCA acesse dados de outro.

#### Testes de Isolamento - Server Actions

| Status | Arquivo                                 | Teste                     | Descrição                                    |
| ------ | --------------------------------------- | ------------------------- | -------------------------------------------- |
| [x]    | `tests/security/data-isolation.test.ts` | Criar arquivo base        | Setup com 2 usuários mock                    |
| [x]    |                                         | `deals-isolation`         | Usuário A não vê deals do Usuário B          |
| [x]    |                                         | `contacts-isolation`      | Usuário A não vê contacts do Usuário B       |
| [x]    |                                         | `leads-isolation`         | Usuário A não vê leads do Usuário B          |
| [x]    |                                         | `organizations-isolation` | Usuário A não vê organizations do Usuário B  |
| [x]    |                                         | `activities-isolation`    | Usuário A não vê activities do Usuário B     |
| [x]    |                                         | `partners-isolation`      | Usuário A não vê partners do Usuário B       |
| [x]    |                                         | `update-ownership-check`  | Não pode atualizar registro de outro usuário |
| [x]    |                                         | `delete-ownership-check`  | Não pode deletar registro de outro usuário   |

#### Testes de Isolamento - API Routes

| Status | Arquivo                                | Teste                       | Descrição                                           |
| ------ | -------------------------------------- | --------------------------- | --------------------------------------------------- |
| [x]    | `tests/security/api-isolation.test.ts` | `GET /api/deals`            | Retorna apenas deals do usuário autenticado         |
| [x]    |                                        | `GET /api/contacts`         | Retorna apenas contacts do usuário autenticado      |
| [x]    |                                        | `GET /api/activities`       | Retorna apenas activities do usuário autenticado    |
| [x]    |                                        | `GET /api/organizations`    | Retorna apenas organizations do usuário autenticado |
| [x]    |                                        | `PUT /api/deals/[id]`       | Não permite editar deal de outro usuário            |
| [x]    |                                        | `PUT /api/contacts/[id]`    | Não permite editar contact de outro usuário         |
| [x]    |                                        | `DELETE /api/deals/[id]`    | Não permite deletar deal de outro usuário           |
| [x]    |                                        | `DELETE /api/contacts/[id]` | Não permite deletar contact de outro usuário        |

---

## Fase 2: Testes de Autenticação e Autorização

### 2.1 Autenticação

| Status | Arquivo                             | Teste                    | Descrição                     |
| ------ | ----------------------------------- | ------------------------ | ----------------------------- |
| [x]    | `tests/auth/authentication.test.ts` | `login-success`          | Login com credenciais válidas |
| [x]    |                                     | `login-invalid-email`    | Rejeita email inválido        |
| [x]    |                                     | `login-invalid-password` | Rejeita senha incorreta       |
| [x]    |                                     | `login-nonexistent-user` | Rejeita usuário inexistente   |
| [x]    |                                     | `session-token-valid`    | Token JWT válido após login   |
| [x]    |                                     | `session-expiry`         | Sessão expira corretamente    |

### 2.2 Proteção de Rotas

| Status | Arquivo                               | Teste                  | Descrição                               |
| ------ | ------------------------------------- | ---------------------- | --------------------------------------- |
| [x]    | `tests/auth/route-protection.test.ts` | `middleware-redirects` | Middleware redireciona não autenticados |
| [x]    |                                       | `api-returns-401`      | API retorna 401 sem autenticação        |
| [x]    |                                       | `server-action-throws` | Server Action lança erro sem sessão     |

### 2.3 Autorização por Role

| Status | Arquivo                            | Teste                     | Descrição                         |
| ------ | ---------------------------------- | ------------------------- | --------------------------------- |
| [x]    | `tests/auth/authorization.test.ts` | `admin-access-admin-area` | Admin acessa /admin               |
| [x]    |                                    | `sdr-no-admin-access`     | SDR não acessa /admin             |
| [x]    |                                    | `closer-no-admin-access`  | Closer não acessa /admin          |
| [x]    |                                    | `owner-filter-admin-only` | OwnerFilter só aparece para admin |

---

## Fase 3: Testes de Server Actions - Core CRM

### 3.1 Leads (`src/actions/leads.ts`)

| Status | Arquivo                       | Teste                       | Descrição                             |
| ------ | ----------------------------- | --------------------------- | ------------------------------------- |
| [x]    | `tests/actions/leads.test.ts` | `createLead-success`        | Cria lead com dados válidos           |
| [x]    |                               | `createLead-validation`     | Rejeita dados inválidos               |
| [x]    |                               | `createLead-sets-owner`     | Define ownerId do usuário logado      |
| [x]    |                               | `getLeads-filters-by-owner` | Retorna apenas leads do owner         |
| [x]    |                               | `getLeadById-returns-own`   | Retorna lead próprio                  |
| [x]    |                               | `getLeadById-blocks-other`  | Bloqueia lead de outro usuário        |
| [x]    |                               | `updateLead-success`        | Atualiza lead com dados válidos       |
| [x]    |                               | `updateLead-ownership`      | Verifica ownership antes de atualizar |
| [x]    |                               | `deleteLead-success`        | Deleta lead próprio                   |
| [x]    |                               | `deleteLead-ownership`      | Verifica ownership antes de deletar   |
| [x]    |                               | `convertLeadToOrganization` | Converte lead para organization       |

### 3.2 Lead Contacts (`src/actions/leads.ts`)

| Status | Arquivo                               | Teste                                    | Descrição                  |
| ------ | ------------------------------------- | ---------------------------------------- | -------------------------- |
| [x]    | `tests/actions/lead-contacts.test.ts` | `createLeadContact-success`              | Cria contato de lead       |
| [x]    |                                       | `createLeadContact-validates-lead-owner` | Verifica owner do lead pai |
| [x]    |                                       | `getLeadContacts-filters`                | Retorna contatos do lead   |
| [x]    |                                       | `updateLeadContact-success`              | Atualiza contato           |
| [x]    |                                       | `deleteLeadContact-success`              | Deleta contato             |

### 3.3 Organizations (`src/actions/organizations.ts`)

| Status | Arquivo                               | Teste                               | Descrição                 |
| ------ | ------------------------------------- | ----------------------------------- | ------------------------- |
| [x]    | `tests/actions/organizations.test.ts` | `createOrganization-success`        | Cria organization         |
| [x]    |                                       | `createOrganization-validation`     | Valida dados obrigatórios |
| [x]    |                                       | `createOrganization-sets-owner`     | Define ownerId            |
| [x]    |                                       | `getOrganizations-filters-by-owner` | Filtra por owner          |
| [x]    |                                       | `getOrganizationById-returns-own`   | Retorna próprio           |
| [x]    |                                       | `getOrganizationById-blocks-other`  | Bloqueia de outro         |
| [x]    |                                       | `updateOrganization-success`        | Atualiza                  |
| [x]    |                                       | `updateOrganization-ownership`      | Verifica ownership        |
| [x]    |                                       | `deleteOrganization-success`        | Deleta próprio            |
| [x]    |                                       | `deleteOrganization-ownership`      | Verifica ownership        |

### 3.4 Contacts (`src/actions/contacts.ts`)

| Status | Arquivo                          | Teste                             | Descrição                |
| ------ | -------------------------------- | --------------------------------- | ------------------------ |
| [x]    | `tests/actions/contacts.test.ts` | `createContact-success`           | Cria contact             |
| [x]    |                                  | `createContact-with-organization` | Cria vinculado a org     |
| [x]    |                                  | `createContact-with-lead`         | Cria vinculado a lead    |
| [x]    |                                  | `createContact-with-partner`      | Cria vinculado a partner |
| [x]    |                                  | `createContact-sets-owner`        | Define ownerId           |
| [x]    |                                  | `getContacts-filters-by-owner`    | Filtra por owner         |
| [x]    |                                  | `getContactById-returns-own`      | Retorna próprio          |
| [x]    |                                  | `getContactById-blocks-other`     | Bloqueia de outro        |
| [x]    |                                  | `updateContact-success`           | Atualiza                 |
| [x]    |                                  | `updateContact-ownership`         | Verifica ownership       |
| [x]    |                                  | `deleteContact-success`           | Deleta próprio           |
| [x]    |                                  | `deleteContact-ownership`         | Verifica ownership       |

### 3.5 Deals (`src/actions/deals.ts`)

| Status | Arquivo                       | Teste                          | Descrição            |
| ------ | ----------------------------- | ------------------------------ | -------------------- |
| [x]    | `tests/actions/deals.test.ts` | `createDeal-success`           | Cria deal            |
| [x]    |                               | `createDeal-validation`        | Valida dados         |
| [x]    |                               | `createDeal-sets-owner`        | Define ownerId       |
| [x]    |                               | `createDeal-with-contact`      | Vincula contact      |
| [x]    |                               | `createDeal-with-organization` | Vincula organization |
| [x]    |                               | `getDeals-filters-by-owner`    | Filtra por owner     |
| [x]    |                               | `getDealById-returns-own`      | Retorna próprio      |
| [x]    |                               | `getDealById-blocks-other`     | Bloqueia de outro    |
| [x]    |                               | `updateDeal-success`           | Atualiza             |
| [x]    |                               | `updateDeal-ownership`         | Verifica ownership   |
| [x]    |                               | `updateDealStage-success`      | Move de stage        |
| [x]    |                               | `deleteDeal-success`           | Deleta próprio       |
| [x]    |                               | `deleteDeal-ownership`         | Verifica ownership   |

### 3.6 Activities (`src/actions/activities.ts`)

| Status | Arquivo                            | Teste                              | Descrição                  |
| ------ | ---------------------------------- | ---------------------------------- | -------------------------- |
| [x]    | `tests/actions/activities.test.ts` | `createActivity-success`           | Cria activity              |
| [x]    |                                    | `createActivity-types`             | Suporta todos os tipos     |
| [x]    |                                    | `createActivity-sets-owner`        | Define ownerId             |
| [x]    |                                    | `createActivity-with-deal`         | Vincula a deal             |
| [x]    |                                    | `createActivity-with-contact`      | Vincula a contact          |
| [x]    |                                    | `createActivity-with-lead`         | Vincula a lead             |
| [x]    |                                    | `createActivity-multiple-contacts` | Suporta múltiplos contacts |
| [x]    |                                    | `getActivities-filters-by-owner`   | Filtra por owner           |
| [x]    |                                    | `getActivityById-returns-own`      | Retorna própria            |
| [x]    |                                    | `getActivityById-blocks-other`     | Bloqueia de outro          |
| [x]    |                                    | `updateActivity-success`           | Atualiza                   |
| [x]    |                                    | `updateActivityDueDate-success`    | Atualiza dueDate           |
| [x]    |                                    | `toggleActivityCompleted`          | Toggle completed           |
| [x]    |                                    | `deleteActivity-success`           | Deleta própria             |
| [x]    |                                    | `deleteActivity-ownership`         | Verifica ownership         |

### 3.7 Partners (`src/actions/partners.ts`)

| Status | Arquivo                          | Teste                          | Descrição               |
| ------ | -------------------------------- | ------------------------------ | ----------------------- |
| [x]    | `tests/actions/partners.test.ts` | `createPartner-success`        | Cria partner            |
| [x]    |                                  | `createPartner-types`          | Suporta todos os tipos  |
| [x]    |                                  | `createPartner-sets-owner`     | Define ownerId          |
| [x]    |                                  | `getPartners-filters-by-owner` | Filtra por owner        |
| [x]    |                                  | `getPartnerById-returns-own`   | Retorna próprio         |
| [x]    |                                  | `getPartnerById-blocks-other`  | Bloqueia de outro       |
| [x]    |                                  | `updatePartner-success`        | Atualiza                |
| [x]    |                                  | `updatePartnerLastContact`     | Atualiza último contato |
| [x]    |                                  | `deletePartner-success`        | Deleta próprio          |
| [x]    |                                  | `deletePartner-ownership`      | Verifica ownership      |

---

## Fase 4: Testes de Server Actions - Pipeline

### 4.1 Pipelines (`src/actions/pipelines.ts`)

| Status | Arquivo                           | Teste                        | Descrição                     |
| ------ | --------------------------------- | ---------------------------- | ----------------------------- |
| [ ]    | `tests/actions/pipelines.test.ts` | `createPipeline-success`     | Cria pipeline                 |
| [ ]    |                                   | `getPipelines-returns-all`   | Retorna todos (não tem owner) |
| [ ]    |                                   | `getPipelineById-success`    | Retorna por ID                |
| [ ]    |                                   | `updatePipeline-success`     | Atualiza                      |
| [ ]    |                                   | `setDefaultPipeline-success` | Define default                |
| [ ]    |                                   | `deletePipeline-success`     | Deleta                        |

### 4.2 Stages (`src/actions/stages.ts`)

| Status | Arquivo                        | Teste                         | Descrição                  |
| ------ | ------------------------------ | ----------------------------- | -------------------------- |
| [ ]    | `tests/actions/stages.test.ts` | `createStage-success`         | Cria stage                 |
| [ ]    |                                | `getStagesByPipeline-success` | Retorna stages do pipeline |
| [ ]    |                                | `updateStage-success`         | Atualiza                   |
| [ ]    |                                | `reorderStages-success`       | Reordena stages            |
| [ ]    |                                | `deleteStage-success`         | Deleta                     |

### 4.3 Pipeline View (`src/actions/pipeline-view.ts`)

| Status | Arquivo                               | Teste                              | Descrição                |
| ------ | ------------------------------------- | ---------------------------------- | ------------------------ |
| [ ]    | `tests/actions/pipeline-view.test.ts` | `getPipelineView-filters-by-owner` | Filtra deals por owner   |
| [ ]    |                                       | `getPipelineView-returns-stages`   | Retorna stages com deals |

---

## Fase 5: Testes de Server Actions - Produtos

### 5.1 Business Lines (`src/actions/business-lines.ts`)

| Status | Arquivo                                | Teste                            | Descrição             |
| ------ | -------------------------------------- | -------------------------------- | --------------------- |
| [ ]    | `tests/actions/business-lines.test.ts` | `createBusinessLine-success`     | Cria business line    |
| [ ]    |                                        | `getBusinessLines-returns-all`   | Retorna todos         |
| [ ]    |                                        | `getActiveBusinessLines-filters` | Retorna apenas ativos |
| [ ]    |                                        | `updateBusinessLine-success`     | Atualiza              |
| [ ]    |                                        | `toggleBusinessLineActive`       | Toggle ativo          |
| [ ]    |                                        | `deleteBusinessLine-success`     | Deleta                |

### 5.2 Products (`src/actions/products.ts`)

| Status | Arquivo                          | Teste                       | Descrição             |
| ------ | -------------------------------- | --------------------------- | --------------------- |
| [ ]    | `tests/actions/products.test.ts` | `createProduct-success`     | Cria product          |
| [ ]    |                                  | `getProducts-returns-all`   | Retorna todos         |
| [ ]    |                                  | `getActiveProducts-filters` | Retorna apenas ativos |
| [ ]    |                                  | `updateProduct-success`     | Atualiza              |
| [ ]    |                                  | `toggleProductActive`       | Toggle ativo          |
| [ ]    |                                  | `deleteProduct-success`     | Deleta                |

### 5.3 Product Links (`src/actions/product-links.ts`)

| Status | Arquivo                               | Teste                                   | Descrição                 |
| ------ | ------------------------------------- | --------------------------------------- | ------------------------- |
| [ ]    | `tests/actions/product-links.test.ts` | `addProductToLead-success`              | Adiciona a lead           |
| [ ]    |                                       | `addProductToOrganization-success`      | Adiciona a organization   |
| [ ]    |                                       | `addProductToDeal-success`              | Adiciona a deal           |
| [ ]    |                                       | `addProductToPartner-success`           | Adiciona a partner        |
| [ ]    |                                       | `getDealProducts-success`               | Lista produtos do deal    |
| [ ]    |                                       | `getLeadProducts-success`               | Lista produtos do lead    |
| [ ]    |                                       | `getOrganizationProducts-success`       | Lista produtos da org     |
| [ ]    |                                       | `getPartnerProducts-success`            | Lista produtos do partner |
| [ ]    |                                       | `updateDealProduct-success`             | Atualiza produto do deal  |
| [ ]    |                                       | `removeProductFromDeal-success`         | Remove do deal            |
| [ ]    |                                       | `removeProductFromLead-success`         | Remove do lead            |
| [ ]    |                                       | `removeProductFromOrganization-success` | Remove da org             |
| [ ]    |                                       | `removeProductFromPartner-success`      | Remove do partner         |

---

## Fase 6: Testes de Server Actions - Tech Profile & Tech Stack

### 6.1 Tech Categories (`src/actions/tech-categories.ts`)

| Status | Arquivo                                 | Teste                           | Descrição      |
| ------ | --------------------------------------- | ------------------------------- | -------------- |
| [ ]    | `tests/actions/tech-categories.test.ts` | `createTechCategory-success`    | Cria categoria |
| [ ]    |                                         | `getTechCategories-returns-all` | Retorna todas  |
| [ ]    |                                         | `updateTechCategory-success`    | Atualiza       |
| [ ]    |                                         | `toggleTechCategoryActive`      | Toggle ativo   |
| [ ]    |                                         | `deleteTechCategory-success`    | Deleta         |

### 6.2 Tech Languages (`src/actions/tech-languages.ts`)

| Status | Arquivo                                | Teste                          | Descrição      |
| ------ | -------------------------------------- | ------------------------------ | -------------- |
| [ ]    | `tests/actions/tech-languages.test.ts` | `createTechLanguage-success`   | Cria linguagem |
| [ ]    |                                        | `getTechLanguages-returns-all` | Retorna todas  |
| [ ]    |                                        | `updateTechLanguage-success`   | Atualiza       |
| [ ]    |                                        | `toggleTechLanguageActive`     | Toggle ativo   |
| [ ]    |                                        | `deleteTechLanguage-success`   | Deleta         |

### 6.3 Tech Frameworks (`src/actions/tech-frameworks.ts`)

| Status | Arquivo                                 | Teste                           | Descrição      |
| ------ | --------------------------------------- | ------------------------------- | -------------- |
| [ ]    | `tests/actions/tech-frameworks.test.ts` | `createTechFramework-success`   | Cria framework |
| [ ]    |                                         | `getTechFrameworks-returns-all` | Retorna todos  |
| [ ]    |                                         | `updateTechFramework-success`   | Atualiza       |
| [ ]    |                                         | `toggleTechFrameworkActive`     | Toggle ativo   |
| [ ]    |                                         | `deleteTechFramework-success`   | Deleta         |

### 6.4 Tech Profile Options (`src/actions/tech-profile-options.ts`)

| Status | Arquivo                                      | Teste                                | Descrição      |
| ------ | -------------------------------------------- | ------------------------------------ | -------------- |
| [ ]    | `tests/actions/tech-profile-options.test.ts` | `createTechProfileLanguage-success`  | Cria language  |
| [ ]    |                                              | `createTechProfileFramework-success` | Cria framework |
| [ ]    |                                              | `createTechProfileHosting-success`   | Cria hosting   |
| [ ]    |                                              | `createTechProfileDatabase-success`  | Cria database  |
| [ ]    |                                              | `createTechProfileERP-success`       | Cria ERP       |
| [ ]    |                                              | `createTechProfileCRM-success`       | Cria CRM       |
| [ ]    |                                              | `createTechProfileEcommerce-success` | Cria ecommerce |
| [ ]    |                                              | `getActiveTechProfileLanguages`      | Lista ativos   |
| [ ]    |                                              | `getActiveTechProfileFrameworks`     | Lista ativos   |
| [ ]    |                                              | `getActiveTechProfileHosting`        | Lista ativos   |
| [ ]    |                                              | `getActiveTechProfileDatabases`      | Lista ativos   |
| [ ]    |                                              | `getActiveTechProfileERPs`           | Lista ativos   |
| [ ]    |                                              | `getActiveTechProfileCRMs`           | Lista ativos   |
| [ ]    |                                              | `getActiveTechProfileEcommerces`     | Lista ativos   |

### 6.5 Lead Tech Profile (`src/actions/lead-tech-profile.ts`)

| Status | Arquivo                                   | Teste                            | Descrição          |
| ------ | ----------------------------------------- | -------------------------------- | ------------------ |
| [ ]    | `tests/actions/lead-tech-profile.test.ts` | `addLanguageToLead-success`      | Adiciona language  |
| [ ]    |                                           | `addFrameworkToLead-success`     | Adiciona framework |
| [ ]    |                                           | `addHostingToLead-success`       | Adiciona hosting   |
| [ ]    |                                           | `addDatabaseToLead-success`      | Adiciona database  |
| [ ]    |                                           | `addERPToLead-success`           | Adiciona ERP       |
| [ ]    |                                           | `addCRMToLead-success`           | Adiciona CRM       |
| [ ]    |                                           | `addEcommerceToLead-success`     | Adiciona ecommerce |
| [ ]    |                                           | `getLeadTechProfile-success`     | Lista tech profile |
| [ ]    |                                           | `removeLanguageFromLead-success` | Remove language    |
| [ ]    |                                           | `setPrimaryLanguage-success`     | Define primary     |

### 6.6 Organization Tech Profile (`src/actions/organization-tech-profile.ts`)

| Status | Arquivo                                           | Teste                                | Descrição          |
| ------ | ------------------------------------------------- | ------------------------------------ | ------------------ |
| [ ]    | `tests/actions/organization-tech-profile.test.ts` | `addLanguageToOrganization-success`  | Adiciona language  |
| [ ]    |                                                   | `addFrameworkToOrganization-success` | Adiciona framework |
| [ ]    |                                                   | `addHostingToOrganization-success`   | Adiciona hosting   |
| [ ]    |                                                   | `addDatabaseToOrganization-success`  | Adiciona database  |
| [ ]    |                                                   | `addERPToOrganization-success`       | Adiciona ERP       |
| [ ]    |                                                   | `addCRMToOrganization-success`       | Adiciona CRM       |
| [ ]    |                                                   | `addEcommerceToOrganization-success` | Adiciona ecommerce |
| [ ]    |                                                   | `getOrganizationTechProfile-success` | Lista tech profile |

### 6.7 Deal Tech Stack (`src/actions/deal-tech-stack.ts`)

| Status | Arquivo                                 | Teste                             | Descrição          |
| ------ | --------------------------------------- | --------------------------------- | ------------------ |
| [ ]    | `tests/actions/deal-tech-stack.test.ts` | `addCategoryToDeal-success`       | Adiciona categoria |
| [ ]    |                                         | `addLanguageToDeal-success`       | Adiciona language  |
| [ ]    |                                         | `addFrameworkToDeal-success`      | Adiciona framework |
| [ ]    |                                         | `getDealTechStack-success`        | Lista tech stack   |
| [ ]    |                                         | `removeCategoryFromDeal-success`  | Remove categoria   |
| [ ]    |                                         | `removeLanguageFromDeal-success`  | Remove language    |
| [ ]    |                                         | `removeFrameworkFromDeal-success` | Remove framework   |

---

## Fase 7: Testes de Server Actions - Auxiliares

### 7.1 Labels (`src/actions/labels.ts`)

| Status | Arquivo                        | Teste                          | Descrição        |
| ------ | ------------------------------ | ------------------------------ | ---------------- |
| [ ]    | `tests/actions/labels.test.ts` | `createLabel-success`          | Cria label       |
| [ ]    |                                | `createLabel-unique-per-owner` | Única por owner  |
| [ ]    |                                | `getLabels-filters-by-owner`   | Filtra por owner |
| [ ]    |                                | `updateLabel-success`          | Atualiza         |
| [ ]    |                                | `deleteLabel-success`          | Deleta           |

### 7.2 CNAEs (`src/actions/cnaes.ts`)

| Status | Arquivo                       | Teste                                    | Descrição        |
| ------ | ----------------------------- | ---------------------------------------- | ---------------- |
| [ ]    | `tests/actions/cnaes.test.ts` | `searchCNAEs-success`                    | Busca CNAEs      |
| [ ]    |                               | `getCNAEByCode-success`                  | Busca por código |
| [ ]    |                               | `getCNAEById-success`                    | Busca por ID     |
| [ ]    |                               | `addSecondaryCNAEToLead-success`         | Adiciona a lead  |
| [ ]    |                               | `addSecondaryCNAEToOrganization-success` | Adiciona a org   |
| [ ]    |                               | `getLeadSecondaryCNAEs-success`          | Lista do lead    |
| [ ]    |                               | `getOrganizationSecondaryCNAEs-success`  | Lista da org     |

### 7.3 External Projects (`src/actions/external-projects.ts`)

| Status | Arquivo                                   | Teste                                   | Descrição          |
| ------ | ----------------------------------------- | --------------------------------------- | ------------------ |
| [ ]    | `tests/actions/external-projects.test.ts` | `linkProjectToOrganization-success`     | Vincula projeto    |
| [ ]    |                                           | `unlinkProjectFromOrganization-success` | Desvincula projeto |
| [ ]    |                                           | `getOrganizationProjects-success`       | Lista projetos     |

### 7.4 Users (`src/actions/users.ts`)

| Status | Arquivo                       | Teste                  | Descrição                |
| ------ | ----------------------------- | ---------------------- | ------------------------ |
| [ ]    | `tests/actions/users.test.ts` | `getUsers-admin-only`  | Apenas admin pode listar |
| [ ]    |                               | `getUsers-returns-all` | Retorna todos usuários   |

### 7.5 List Actions

| Status | Arquivo                       | Teste                                   | Descrição             |
| ------ | ----------------------------- | --------------------------------------- | --------------------- |
| [ ]    | `tests/actions/lists.test.ts` | `getOrganizationsList-filters-by-owner` | Lista orgs do owner   |
| [ ]    |                               | `getLeadsList-filters-by-owner`         | Lista leads do owner  |
| [ ]    |                               | `getLeadContactsList-filters-by-owner`  | Lista lead contacts   |
| [ ]    |                               | `getCompaniesList-filters-by-owner`     | Lista todas companies |

---

## Fase 8: Testes de API Routes

### 8.1 Auth API (`/api/auth`, `/api/register`)

| Status | Arquivo                  | Teste                             | Descrição               |
| ------ | ------------------------ | --------------------------------- | ----------------------- |
| [ ]    | `tests/api/auth.test.ts` | `POST /api/register - success`    | Registra usuário        |
| [ ]    |                          | `POST /api/register - duplicate`  | Rejeita email duplicado |
| [ ]    |                          | `POST /api/register - validation` | Valida dados            |

### 8.2 Deals API (`/api/deals`)

| Status | Arquivo                   | Teste                                | Descrição             |
| ------ | ------------------------- | ------------------------------------ | --------------------- |
| [ ]    | `tests/api/deals.test.ts` | `GET /api/deals - success`           | Lista deals do owner  |
| [ ]    |                           | `GET /api/deals - unauthorized`      | 401 sem auth          |
| [ ]    |                           | `POST /api/deals - success`          | Cria deal             |
| [ ]    |                           | `GET /api/deals/[id] - success`      | Retorna deal próprio  |
| [ ]    |                           | `GET /api/deals/[id] - forbidden`    | 403 deal de outro     |
| [ ]    |                           | `PUT /api/deals/[id] - success`      | Atualiza deal próprio |
| [ ]    |                           | `PUT /api/deals/[id] - forbidden`    | 403 deal de outro     |
| [ ]    |                           | `DELETE /api/deals/[id] - success`   | Deleta deal próprio   |
| [ ]    |                           | `DELETE /api/deals/[id] - forbidden` | 403 deal de outro     |

### 8.3 Contacts API (`/api/contacts`)

| Status | Arquivo                      | Teste                                 | Descrição                |
| ------ | ---------------------------- | ------------------------------------- | ------------------------ |
| [ ]    | `tests/api/contacts.test.ts` | `GET /api/contacts - success`         | Lista contacts do owner  |
| [ ]    |                              | `GET /api/contacts - unauthorized`    | 401 sem auth             |
| [ ]    |                              | `POST /api/contacts - success`        | Cria contact             |
| [ ]    |                              | `GET /api/contacts/[id] - success`    | Retorna contact próprio  |
| [ ]    |                              | `GET /api/contacts/[id] - forbidden`  | 403 contact de outro     |
| [ ]    |                              | `PUT /api/contacts/[id] - success`    | Atualiza contact próprio |
| [ ]    |                              | `DELETE /api/contacts/[id] - success` | Deleta contact próprio   |

### 8.4 Activities API (`/api/activities`)

| Status | Arquivo                        | Teste                                   | Descrição                 |
| ------ | ------------------------------ | --------------------------------------- | ------------------------- |
| [ ]    | `tests/api/activities.test.ts` | `GET /api/activities - success`         | Lista activities do owner |
| [ ]    |                                | `GET /api/activities - unauthorized`    | 401 sem auth              |
| [ ]    |                                | `POST /api/activities - success`        | Cria activity             |
| [ ]    |                                | `GET /api/activities/[id] - success`    | Retorna activity própria  |
| [ ]    |                                | `PUT /api/activities/[id] - success`    | Atualiza activity própria |
| [ ]    |                                | `DELETE /api/activities/[id] - success` | Deleta activity própria   |

### 8.5 Organizations API (`/api/organizations`)

| Status | Arquivo                           | Teste                                      | Descrição            |
| ------ | --------------------------------- | ------------------------------------------ | -------------------- |
| [ ]    | `tests/api/organizations.test.ts` | `GET /api/organizations - success`         | Lista orgs do owner  |
| [ ]    |                                   | `GET /api/organizations - unauthorized`    | 401 sem auth         |
| [ ]    |                                   | `POST /api/organizations - success`        | Cria org             |
| [ ]    |                                   | `GET /api/organizations/[id] - success`    | Retorna org própria  |
| [ ]    |                                   | `PUT /api/organizations/[id] - success`    | Atualiza org própria |
| [ ]    |                                   | `DELETE /api/organizations/[id] - success` | Deleta org própria   |

### 8.6 Products API (`/api/products`)

| Status | Arquivo                      | Teste                                | Descrição             |
| ------ | ---------------------------- | ------------------------------------ | --------------------- |
| [ ]    | `tests/api/products.test.ts` | `GET /api/products/active - success` | Lista produtos ativos |

---

## Fase 9: Melhorias de Arquitetura

### 9.1 Service Layer (Opcional - Baixa Prioridade)

| Status | Tarefa                  | Descrição                          |
| ------ | ----------------------- | ---------------------------------- |
| [ ]    | Criar `src/services/`   | Diretório para services            |
| [ ]    | `deals.service.ts`      | Extrair lógica de negócio complexa |
| [ ]    | `leads.service.ts`      | Extrair lógica de conversão        |
| [ ]    | `activities.service.ts` | Extrair lógica de calendário       |

### 9.2 Transaction Wrappers

| Status | Tarefa                            | Descrição                     |
| ------ | --------------------------------- | ----------------------------- |
| [ ]    | `convertLeadToOrganization`       | Usar `prisma.$transaction`    |
| [ ]    | `deleteDeal` com produtos         | Usar transaction para cascade |
| [ ]    | `deleteOrganization` com contacts | Usar transaction              |

### 9.3 Error Handling Padronizado

| Status | Tarefa                      | Descrição                     |
| ------ | --------------------------- | ----------------------------- |
| [ ]    | Criar `src/lib/errors.ts`   | Classes de erro customizadas  |
| [ ]    | `NotFoundError`             | Para recursos não encontrados |
| [ ]    | `ForbiddenError`            | Para acesso negado            |
| [ ]    | `ValidationError`           | Para erros de validação       |
| [ ]    | Aplicar em todas as actions | Usar classes customizadas     |

### 9.4 Logging

| Status | Tarefa                             | Descrição                 |
| ------ | ---------------------------------- | ------------------------- |
| [ ]    | Escolher lib de logging            | Pino, Winston, etc.       |
| [ ]    | Configurar logging                 | Em produção               |
| [ ]    | Adicionar logs em actions críticas | Criar, atualizar, deletar |

---

## Resumo de Progresso

| Fase                      | Total   | Concluídos | Porcentagem |
| ------------------------- | ------- | ---------- | ----------- |
| 1. Segurança (Isolamento) | 17      | 17         | 100%        |
| 2. Autenticação           | 13      | 13         | 100%        |
| 3. Core CRM               | 76      | 76         | 100%        |
| 4. Pipeline               | 12      | 0          | 0%          |
| 5. Produtos               | 19      | 0          | 0%          |
| 6. Tech Profile/Stack     | 46      | 0          | 0%          |
| 7. Auxiliares             | 21      | 0          | 0%          |
| 8. API Routes             | 33      | 0          | 0%          |
| 9. Arquitetura            | 13      | 0          | 0%          |
| **TOTAL**                 | **250** | **106**    | **42%**     |

---

## Ordem de Execução Recomendada

1. **PRIMEIRO:** Fase 1 (Segurança) - Crítico antes de produção
2. **SEGUNDO:** Fase 2 (Autenticação) - Fundação de segurança
3. **TERCEIRO:** Fase 3 (Core CRM) - Fluxos principais
4. **QUARTO:** Fase 8 (API Routes) - Se usar APIs externamente
5. **DEPOIS:** Fases 4-7 conforme tempo disponível
6. **OPCIONAL:** Fase 9 (Arquitetura) - Melhorias incrementais

---

## Notas

- Marcar `[x]` quando o item estiver concluído
- Atualizar a tabela de resumo após cada sessão
- Priorizar testes de isolamento de dados (Fase 1)
- Testes podem ser executados com `npm run test`
- Coverage report com `npm run test:coverage`

lembre se que
**REGRA FUNDAMENTAL:** Em TODOS os tipos de testes
(unitários, integração, E2E), quando um teste falha,
**SEMPRE** corrija o sistema/implementação para fazer o
teste passar, **NUNCA** ajuste o teste para corresponder ao
comportamento incorreto. use sempre triangulacao para evitar
falso positivos crie unit test para cobrir cenarios de
erro, edge case e entradas invalidas. foque em
comportamento, nao em implementacao.
