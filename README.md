# Escola Digital de Teologia

Fundação de uma plataforma de formação teológica associada à identidade provisória **Teologando Fácil**. Backend FastAPI em camadas por módulos, PostgreSQL, SQLAlchemy, Alembic e frontend Next.js/TypeScript/Tailwind.

## Estado atual

Implementados: interface institucional responsiva, proposta curricular, catálogo público conectado à API, criação/edição/publicação de cursos por administrador, validação JWT via JWKS, papéis locais, provisionamento administrativo explícito, migração inicial, currículo em rascunho, testes e workflow de CI.

Ainda não implementados: matrícula pública, gestão completa de aulas/turmas, player, perguntas, biblioteca privada, lousa, avaliações, frequência e certificados. Auth externo não está configurado. Sem identidade habilitada, a área administrativa permanece inacessível. Não há login fictício nem métricas de demonstração.

## Requisitos

- Python 3.14, Node.js 24 e npm; versões locais usadas nesta entrega.
- PostgreSQL 17 (Compose/CI) ou 18 (verificação local desta entrega).
- Docker com daemon ativo para o caminho Compose; PostgreSQL instalado pode ser usado alternativamente.

## Backend — PowerShell

Na raiz:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
docker compose up -d postgres
Set-Location backend
Copy-Item .env.example .env
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m app.cli seed-curriculum
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

`Copy-Item` acima é para instalação nova: preserve um `.env` existente. Ajuste `SCHOOL_DATABASE_URL` para sua conexão. A senha do Compose é exclusiva de desenvolvimento local; não reutilizar em hospedagem pública.

Documentação da API: [Swagger local](http://127.0.0.1:8000/docs). Liveness: `/health/live`. Readiness: `/health/ready`; retorna indisponibilidade se não houver banco. `/api/v1/courses` lista somente cursos publicados, paginados. Sem banco configurado, a API inicia para diagnóstico e os recursos dependentes retornam 503.

O seed cria um curso em rascunho, um módulo e dez unidades. Execuções repetidas não sobrescrevem alterações editoriais. Não insere alunos ou indicadores.

## Frontend — outro terminal

```powershell
Set-Location frontend
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Abrir [interface local](http://127.0.0.1:3000). O frontend usa `NEXT_PUBLIC_API_URL`, cujo padrão local é a API na porta 8000. A interface informa falha de conexão e catálogo vazio sem inventar dados.

```powershell
npm.cmd run typecheck
npm.cmd run build
```

O build estático fica em `frontend/out`. Alterações em variáveis públicas exigem novo build. `next start` não serve esse modo: use servidor estático ou CDN. Conteúdo dinâmico é carregado pela API; nenhuma proteção depende de esconder os arquivos estáticos.

## Autenticação e primeiro administrador

1. Configurar Supabase Auth/Google OAuth com URLs de retorno exatas e provedor habilitado.
2. No backend, definir `SCHOOL_AUTH_ISSUER`, `SCHOOL_AUTH_JWKS_URL` e audiência.
3. No frontend, configurar URL Supabase e chave **publicável**. Nunca usar service-role no navegador.
4. Depois que a pessoa tiver identidade real no provedor, provisionar explicitamente o vínculo acadêmico:

```powershell
Set-Location backend
.venv\Scripts\python.exe -m app.cli provision-user --issuer https://PROJECT.supabase.co/auth/v1 --subject UUID_DO_USUARIO --name "Administrador" --role admin
```

Esse comando exige acesso administrativo ao banco e deve ser executado somente pelo responsável. Não cria senha, conta Google nem usuário no provedor. Não existe promoção pelo primeiro login. Usuário não provisionado ou bloqueado recebe 403. A autorização usa papéis do banco, sem confiar no papel declarado no token.

A sessão é mantida em memória. Somente o verificador temporário de PKCE usa sessionStorage para atravessar o redirecionamento OAuth; tokens não são persistidos entre recargas. Login externo completo ainda precisa ser validado com credenciais reais. Cadastro por e-mail exige SMTP próprio antes de atender alunos externos.

## Testes e qualidade

Dentro de `backend`:

```powershell
.venv\Scripts\python.exe -m ruff check app tests
.venv\Scripts\python.exe -m mypy app
.venv\Scripts\python.exe -m pytest -q
```

Para integração, informe **banco exclusivo de teste, inicialmente vazio**. O teste aplica migrações e grava dados; não deve apontar para banco da escola.

```powershell
$env:SCHOOL_TEST_DATABASE_URL='postgresql+psycopg://USUARIO:SENHA@localhost:5432/school_test'
.venv\Scripts\python.exe -m pytest -q
$env:SCHOOL_DATABASE_URL=$env:SCHOOL_TEST_DATABASE_URL
.venv\Scripts\python.exe -m alembic check
```

Sem variável de teste, testes de integração são pulados explicitamente. O CI declara PostgreSQL 17 e executa toda a suíte; workflow criado, execução remota ainda não realizada. Testes locais usam PostgreSQL real, sem SQLite. O Dockerfile foi preparado, mas a imagem ainda não foi construída nesta máquina.

## Implantação e segurança

Nenhum deploy realizado. Não publicar usando credenciais de teste. Antes de produção: schema privado e usuário SQL limitado, estratégia de backups restauráveis, provedor Auth real, TLS, CORS por origem, política de privacidade/retenção, limites de requisições e homologação dos fluxos. A migração inicial não provisiona papéis SQL nem políticas RLS; essa etapa permanece obrigatória para hospedagem no Supabase.

Dockerfile/Compose são preparação, não prova de deploy. A migração é uma etapa explícita de release, não executada automaticamente por cada worker.

## Histórico progressivo

O escopo original está em `.prompts/escopo.txt`. Registros datados em [.documentacao](.documentacao) são preservados; novas etapas geram novos arquivos. Índices em [docs](docs) apontam para a viabilidade, arquitetura, modelo e plano. Alterações de código são evolução da aplicação; o histórico de decisões/resultados permanece por adição.


## Atualização de 09/11/2026 — Login local, governança e uploads

O login por e-mail/senha agora está implementado e as contas iniciais foram provisionadas no banco local. Esta atualização complementa o estado da fundação descrito acima, sem apagar o histórico.

- [Login Kairós na rede local](http://192.168.0.233:3000/login).
- [Histórico da implementação](.documentacao/0013_2026-11-09_login_governanca_uploads.md).
- [Guia do administrador](docs/GUIA_ADMINISTRADOR.md).
- [Guia do coordenador](docs/GUIA_COORDENADOR.md).
- [Guia do aluno](docs/GUIA_ALUNO.md).

Admin e coordenador liberado podem enviar conteúdos privados; alunos não podem enviar arquivos. A regularização do coordenador exige aprovação administrativa. Senhas não são documentadas ou armazenadas em texto simples no código.

Os arquivos ficam em `.local/uploads`, com limite inicial de 256 MB por arquivo e cota de 5 GB, configuráveis no backend. Incluir banco e arquivos no backup. Sessões locais usam cookie HttpOnly, CSRF e revogação no PostgreSQL. HTTPS é obrigatório para publicação em produção. Google/YouTube permanecem opcionais e não configurados.
