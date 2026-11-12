# 0007 — Fundação implementada e verificada

Data: 09/11/2026, America/Sao_Paulo. Continuidade solicitada pelo usuário. Este registro acrescenta resultados aos documentos 0001–0006; nenhum registro anterior foi substituído.

## Entrega concreta

### Backend

- FastAPI com endpoints de liveness, readiness, identidade e cursos.
- Organização por módulos, políticas de domínio, aplicação, contratos Pydantic e persistência SQLAlchemy.
- PostgreSQL via psycopg; sessões por requisição, transação para curso e auditoria juntos.
- Configuração tipada; produção exige banco, Auth e origens HTTPS explícitas.
- Erros de banco sem expor conexão ou dados; erros de validação não repetem o conteúdo recebido; request ID e cabeçalhos básicos.
- Validação de JWT assinado RS256/ES256 via JWKS, issuer/audience/expiração obrigatórios. Não confiar no campo de papel do token.
- Papéis locais admin/teacher/student, bloqueio de conta e provisionamento explícito por CLI. Visitante é acesso anônimo ao catálogo público.
- Administrador pode criar, editar, publicar e arquivar cursos; catálogo retorna somente publicados, com paginação limitada.
- Migração Alembic 0001 com DDL PostgreSQL congelado e independente dos modelos futuros: users, user_roles, courses, modules, units, lessons, cohorts, cohort_teachers, enrollments e audit_logs.
- Seed idempotente do currículo de Bibliologia: curso em rascunho, módulo e dez unidades. Não sobrescreve curso existente. Sem alunos, matrículas, professores ou estatísticas fictícias.

### Frontend

- Next.js 16.4.6, React, TypeScript, Tailwind e Lucide; lockfile npm preserva a resolução instalada.
- Interface institucional responsiva usando a referência como direção: marfim, azul-marinho, dourado, títulos editoriais, navegação lateral, cards e destaque para formação.
- Ilustração de livro em SVG criada em código; nenhuma foto, retrato ou logo da imagem foi extraído para uso institucional.
- Home, catálogo conectado à API, proposta curricular em modal, guia da escola e estado explícito de biblioteca ainda indisponível.
- Área de administração de cursos visível somente quando `/me` retorna papel admin; backend continua sendo a autoridade de acesso.
- Login Google via adaptador Supabase quando variáveis reais estiverem configuradas. Sem configuração, informa indisponibilidade e não simula login.
- Tokens em memória; somente o verificador descartável de PKCE usa sessionStorage para sobreviver ao redirecionamento OAuth. O SDK utiliza storage customizado: tecnicamente `persistSession` está habilitado para esse adaptador, mas tokens não são gravados em armazenamento persistente. Isso detalha a intenção de sessão em memória do registro 0003.
- Skip link, nomes acessíveis de botões, fechamento de modal por Escape, contenção de foco e navegação mobile. Menu fechado fica invisível também para navegação acessível.
- Estados de erro, carregamento e ausência de cursos; sem métricas fictícias. Curso do seed permanece rascunho e não é mostrado como publicado.

### Ambiente, qualidade e preparação

- Ambiente virtual Python 3.14 dentro do projeto; dependências instaladas e congeladas em requirements.txt.
- `requirements.in` registra intervalos de seleção; instalação reproduzível usa requirements.txt. Frontend usa npm ci/package-lock.
- Docker Compose com PostgreSQL 17 local e Dockerfile da API preparados, ainda sem build Docker executado.
- Workflow GitHub Actions para backend, PostgreSQL de teste, lint, tipos, pytest, alembic check e build do frontend. Não houve push nem execução remota do workflow.
- README com comandos reais de desenvolvimento, migração, seed, testes, build e provisionamento de identidade.

## Execução do ambiente e incidentes resolvidos

1. Docker CLI 29.4.3 estava presente, mas daemon indisponível; o arquivo global de configuração também apresentou restrição de acesso. Nenhuma alteração foi feita no Docker ou no serviço PostgreSQL já existente.
2. O npm inicialmente falhou por acesso ao cache fora do workspace. A instalação foi repetida com a aprovação de execução necessária e concluiu. Nenhum plugin ou dependência global foi instalado.
3. Foi encontrado PostgreSQL 18 instalado e um serviço já ativo. Para evitar alterações nesse serviço, foi criado um cluster exclusivo em `.local/postgres-test`, usuário local `school_test`, porta 55432, escutando apenas 127.0.0.1.
4. `initdb` concluiu no workspace; `pg_ctl` foi bloqueado pelo sandbox e repetido com aprovação. O cluster é de desenvolvimento/teste, com autenticação trust apenas no loopback; não deve ser exposto à rede ou usado em produção. Diretório `.local` está ignorado no Git.
5. Foram criados bancos separados `school_foundation_test` e `school_development`; apenas o primeiro recebeu dados de teste. O segundo recebeu o seed curricular em rascunho.
6. A primeira execução de integração a partir da raiz revelou dependência do diretório corrente no subprocesso Alembic. Corrigido para usar a pasta backend de forma explícita; execução seguinte passou.
7. Next dev gerou `frontend/AGENTS.md`. As instruções foram lidas e os guias locais de exportação estática e configuração consultados.
8. A primeira revisão do formulário administrativo revelou que o objeto de edição podia carregar campos extras; o envio agora seleciona apenas título, slug, descrição e status, compatível com Pydantic extra=forbid.

## Verificações realizadas e resultados

| Verificação | Resultado real |
|---|---|
| pytest com PostgreSQL 18 dedicado | **18 aprovados, nenhum pulado** na execução final |
| Casos de segurança | Token expirado, assinatura adulterada, issuer/audience inválidos e expiração ausente rejeitados; papel do token não concede admin |
| Autorização | Anônimo não cria curso; professor/aluno sem papel admin não administram; identidade bloqueada/não provisionada negada |
| Integração HTTP + banco | Admin cria rascunho, publica via PUT e curso aparece no catálogo; professor recebe 403 |
| Integridade | Seed repetido preserva edição; status inválido rejeitado pelo banco; slug duplicado rejeitado sem duplicar curso |
| Ruff | Aprovado em app e tests |
| mypy estrito | Aprovado em 15 arquivos de aplicação |
| pip check | Nenhuma dependência quebrada |
| alembic upgrade head | Executado nos dois bancos exclusivos |
| alembic check | Nenhuma nova operação detectada: migração compatível com modelos |
| Frontend typecheck | Aprovado |
| Frontend build estático | Aprovado; artefato em frontend/out |
| HTTP local | Frontend 200, readiness da API ready, catálogo [] coerente com seed em rascunho |
| Navegador desktop | Home, proposta curricular e catálogo verificados |
| Navegador mobile | Viewport 390 × 844, menu e modal de login verificados; largura de conteúdo não excedeu a área útil |

Os testes de JWT usam chaves controladas e os testes HTTP injetam identidades exclusivamente por fixtures. Isso valida regras e contratos, mas não substitui teste com Google/Supabase real. Nenhum bypass de teste foi colocado em endpoint de produção.

Aviso observado: Starlette recomenda migração futura do TestClient de httpx para httpx2. A suíte atual passou; mudança de biblioteca será avaliada separadamente e não foi ocultada.

## Evidências visuais

- [Desktop](evidencias/0007_desktop.jpg).
- [Mobile](evidencias/0007_mobile.jpg).

Capturadas no navegador durante QA. O formato retornado foi JPEG; a extensão foi ajustada após verificar a assinatura binária. Não houve edição das imagens. O viewport temporário foi restaurado.

## Limitações e estado das fases

Fundação inicial concluída como incremento verificável, sem declarar o MVP completo. F04/F05 foram demonstradas em PostgreSQL real; execução com PostgreSQL 17 no CI e build do contêiner continuam por verificar. F06/F09 têm adaptadores e testes, mas homologação de OAuth externo depende de credenciais e configuração reais.

Não há matrículas operacionais pela interface, CRUD completo de currículo, atribuição de professores/turmas por UI, aulas/lives, gravações, perguntas, materiais privados, avaliações, frequência ou certificados. As telas correspondentes não simulam essas funcionalidades.

O schema privado, os papéis SQL de menor privilégio e eventual RLS ainda não foram provisionados. A migração atual foi executada somente em ambientes locais isolados. Nenhuma credencial Supabase foi usada, não houve deploy, contratação ou criação de contas.

Papéis locais estão limitados a três valores por constraint; tabela de papéis configuráveis, perfis expandidos e demais entidades do modelo lógico serão acrescentados por migrações futuras conforme os módulos forem implementados.

## Próximo bloco

Evoluir gestão de currículo, turmas, professores e matrículas; em seguida, sessões com links validados e o fluxo central de pergunta/moderação/presença explícita. Antes de publicação, concluir privilégios SQL, Auth real e políticas operacionais. Continuar o histórico por novos arquivos numerados.
