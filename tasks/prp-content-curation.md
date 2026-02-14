# PRP: MCP de Curadoria de Conteudo + Bookmarks

## Introduction

MCP server para curadoria de conteudo e bookmarks no thedevhype.com. O MCP e a camada de dados pura — CRUD de fontes RSS, fetch/parse de feeds, bookmarks com tags, e busca unificada. Nao tem AI embutida; a inteligencia (resumos, newsletter, alertas) fica no Poke (n8n) que consome o MCP como API.

O conceito e API arbitrage: combina RSS feeds + scrape API + banco de dados pra entregar uma curadoria de conteudo que seria trabalhosa de montar manualmente.

## Goals

- Permitir cadastrar ate 20 fontes RSS por usuario
- Fazer fetch e parse de feeds RSS retornando artigos normalizados
- Oferecer sistema de bookmarks com tags e anotacoes
- Busca full-text em todo conteudo salvo (artigos + bookmarks)
- Scraping de conteudo via scrape API externa (ex: Firecrawl, ScraperAPI)
- Expor tudo via MCP tools para consumo por AI clients e Poke/n8n
- Seguir o padrao existente de MCP servers do projeto (registry, auth, schema)

## User Stories

### US-001: Schema do banco de dados
**Description:** Como desenvolvedor, preciso das tabelas no PostgreSQL para persistir fontes, artigos e bookmarks por usuario.

**Acceptance Criteria:**
- [ ] Criar schema `mcp_curadoria` no Neon PostgreSQL
- [ ] Tabela `sources`: id, userId, url, title, siteUrl, category, lastFetchedAt, createdAt
- [ ] Tabela `articles`: id, userId, sourceId (FK), title, url (unique por user), author, content, summary, publishedAt, createdAt
- [ ] Tabela `bookmarks`: id, userId, url, title, content, summary, tags (text[]), notes, createdAt
- [ ] Todas as tabelas com userId referenciando neon_auth.user
- [ ] Limite de 20 fontes por usuario (validado na tool, nao no banco)
- [ ] Atualizar drizzle.config.ts com o novo schema filter
- [ ] Typecheck passes

### US-002: Registrar MCP server no registry
**Description:** Como desenvolvedor, preciso registrar o server de curadoria no registry existente para que apareca no dashboard.

**Acceptance Criteria:**
- [ ] Criar arquivo `app/lib/mcp/servers/curadoria.ts` com McpServerDefinition
- [ ] Server name: `curadoria`
- [ ] Category: `Content Tools`
- [ ] Description: `Curadoria de conteudo: fontes RSS, bookmarks e busca unificada`
- [ ] Registrar todas as tools com name e description
- [ ] Importar e registrar em `app/lib/mcp/servers/index.ts`
- [ ] Typecheck passes

### US-003: Tools de gestao de fontes RSS
**Description:** Como usuario, quero cadastrar, listar e remover fontes RSS para montar minha curadoria.

**Acceptance Criteria:**
- [ ] Tool `adicionar_fonte`: recebe URL do feed, faz fetch pra validar e extrair titulo/siteUrl, salva no banco. Retorna erro se ja tem 20 fontes.
- [ ] Tool `listar_fontes`: retorna todas as fontes do usuario com id, title, url, category, lastFetchedAt
- [ ] Tool `remover_fonte`: recebe id da fonte, remove a fonte e artigos associados
- [ ] Validacao: URL deve ser um feed RSS/Atom valido (tenta fazer parse)
- [ ] Todas as tools scoped por userId via auth-helpers
- [ ] Typecheck passes

### US-004: Tool de buscar novidades dos feeds
**Description:** Como usuario, quero puxar os ultimos artigos de todas as minhas fontes (ou de uma fonte especifica).

**Acceptance Criteria:**
- [ ] Tool `buscar_novidades`: parametros opcionais sourceId e limit (default 20)
- [ ] Faz fetch de cada feed RSS, faz parse do XML, extrai artigos
- [ ] Salva artigos novos no banco (upsert por url+userId)
- [ ] Atualiza `lastFetchedAt` da fonte
- [ ] Retorna lista de artigos com title, url, author, publishedAt, content (truncado a 500 chars)
- [ ] Se sourceId informado, busca so daquela fonte
- [ ] Typecheck passes

### US-005: Tools de bookmarks
**Description:** Como usuario, quero salvar URLs como bookmarks com tags e anotacoes.

**Acceptance Criteria:**
- [ ] Tool `salvar_bookmark`: recebe url (obrigatorio), title (opcional), tags (opcional, array de strings), notes (opcional). Se title nao informado, faz fetch da URL e extrai do HTML `<title>`
- [ ] Tool `listar_bookmarks`: parametros opcionais tag (filtra por tag) e limit (default 20). Retorna bookmarks ordenados por createdAt desc
- [ ] Tool `remover_bookmark`: recebe id, remove o bookmark
- [ ] Todas as tools scoped por userId
- [ ] Typecheck passes

### US-006: Tool de busca unificada
**Description:** Como usuario, quero buscar em todo meu conteudo salvo (artigos + bookmarks) por palavra-chave.

**Acceptance Criteria:**
- [ ] Tool `buscar_conteudo`: recebe query (string) e tipo opcional (`artigos`, `bookmarks`, `todos` default)
- [ ] Busca por ILIKE em title, content, notes, tags
- [ ] Retorna resultados unificados com tipo (artigo/bookmark), title, url, snippet do match, createdAt
- [ ] Limite de 20 resultados por busca
- [ ] Ordenado por relevancia (match no title pesa mais)
- [ ] Typecheck passes

### US-007: Tool de scraping de conteudo
**Description:** Como usuario, quero extrair o conteudo completo de uma URL usando scrape API para enriquecer bookmarks e artigos.

**Acceptance Criteria:**
- [ ] Tool `extrair_conteudo`: recebe url, faz fetch via scrape API configuravel (env `SCRAPE_API_URL` e `SCRAPE_API_KEY`)
- [ ] Fallback: se nao tem scrape API configurada, faz fetch direto e extrai texto do HTML
- [ ] Retorna: title, content (texto limpo), description
- [ ] Atualiza o campo content do bookmark/artigo se existir no banco
- [ ] Typecheck passes

### US-008: Gerar migration e testar schema
**Description:** Como desenvolvedor, preciso gerar a migration do Drizzle e validar que o schema funciona.

**Acceptance Criteria:**
- [ ] Rodar `npx drizzle-kit generate` com sucesso
- [ ] Migration criada em `drizzle/` com as tabelas corretas
- [ ] Rodar `npx drizzle-kit push` com sucesso no banco local/dev
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Criar schema PostgreSQL `mcp_curadoria` com tabelas sources, articles, bookmarks
- FR-2: Limitar 20 fontes RSS por usuario (validacao na tool)
- FR-3: Parse de RSS/Atom feeds usando biblioteca `rss-parser`
- FR-4: Upsert de artigos por URL+userId para evitar duplicatas
- FR-5: Bookmarks com tags como array de texto PostgreSQL
- FR-6: Busca full-text via ILIKE em titulo, conteudo, notas e tags
- FR-7: Scraping de conteudo via API externa configuravel por env vars
- FR-8: Fallback de scraping: fetch direto + parse HTML basico quando sem API
- FR-9: Todas as operacoes scoped por userId autenticado via MCP auth

## Non-Goals (Out of Scope)

- Resumo automatico via AI (Poke faz isso)
- Newsletter (Poke monta e envia)
- UI de gestao de fontes/bookmarks (dashboard toggle ja existe)
- Notificacoes/alertas (Poke)
- Import/export de bookmarks (OPML, JSON)
- Busca semantica/vetorial (futuro, MVP usa ILIKE)
- Categorias de artigos automaticas
- Scraping de paginas protegidas por login

## Technical Considerations

- Seguir padrao exato do `nota-fiscal` server: schema separado, tools registradas, auth via `getUserId()`
- Usar `rss-parser` (npm) para parse de feeds RSS/Atom
- Scrape API e opcional — funciona sem ela, so perde conteudo completo
- Para HTML parsing basico (fallback), usar regex simples ou `node-html-parser` (leve)
- Schema filter no drizzle.config.ts precisa incluir `mcp_curadoria`
- Limite de 20 fontes e soft limit (validado no codigo, nao constraint do banco)

## Success Metrics

- MCP server aparece no dashboard e gera API key
- Todas as 8 tools funcionam via MCP client (Claude Desktop, etc)
- Feed RSS e parseado e artigos salvos no banco em < 5s
- Bookmarks salvos com tags e buscaveis por keyword
- Poke consegue chamar as tools via HTTP POST

## Open Questions

- Qual scrape API usar? (Firecrawl, ScraperAPI, ou custom?)
- Implementar rate limiting no fetch de feeds? (evitar spam)
- Cache de artigos ja fetchados? (por quanto tempo?)
