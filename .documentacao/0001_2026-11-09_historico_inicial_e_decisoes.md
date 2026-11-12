# Histórico 0001 — Escopo, orientações e aprovação

Data: 09/11/2026 (America/Sao_Paulo).

## Política de documentação solicitada

O usuário determinou que todo o trabalho realizado seja registrado progressivamente em arquivos Markdown nesta pasta `.documentacao`, sem sobrescrever registros anteriores.

Cada etapa deverá gerar um novo arquivo numerado, com data, ações realizadas, decisões, verificações, limitações e próximos passos pertinentes. Correções e mudanças de decisão serão registradas em novos arquivos, preservando o histórico. Não registrar segredos ou credenciais.

## 1. Leitura do escopo

Foi inspecionada a pasta do projeto e lido integralmente o arquivo `.prompts/escopo.txt`.

Na inspeção inicial, o projeto continha apenas a pasta `.prompts`; na inspeção deste registro, também existe `.documentacao`, ainda sem arquivos. Não foi encontrado arquivo AGENTS.md na busca dentro do projeto.

O escopo define uma Escola Digital de Teologia associada à identidade Teologando Fácil, com o primeiro curso/módulo de Bibliologia e Crítica Textual.

Prioridades identificadas:

- Interação entre professor e alunos como regra central.
- Plataforma funcional com cursos, turmas, matrículas, lives, gravações, capítulos temporais, materiais, biblioteca e lousa.
- Perguntas, moderação, fóruns e enquetes.
- Frequência explícita, avaliações, notas, progresso e certificados verificáveis e revogáveis.
- Perfis de administrador, professor, aluno e visitante, com autorização no backend.
- Segurança, privacidade, LGPD e administração sem alteração de código.
- Operação inicialmente gratuita, com verificação dos limites reais dos provedores.
- Execução por fases, documentação e testes, sem simular integrações ou resultados.

O escopo solicita análise inicial das questões A a J (viabilidade, arquitetura, integrações, interação, organização de conteúdos, banco, MVP, publicação, riscos e sequência de implementação), seguida de plano com tarefas pequenas e verificáveis. Essa análise completa ainda não foi entregue.

## 2. Proposta apresentada pelo usuário

O usuário sugeriu arquitetura em camadas, FastAPI, índices, procedures, pytest e Pydantic, e solicitou orientação para o projeto.

## 3. Orientações apresentadas

Foi recomendado um monólito modular, organizado por domínio de negócio, com camadas internas e infraestrutura simples.

Stack recomendada:

| Área | Tecnologia proposta |
|---|---|
| Frontend | Next.js e TypeScript |
| Estilo | Tailwind CSS |
| Backend | FastAPI |
| Validação e configurações | Pydantic |
| Persistência | SQLAlchemy 2 |
| Migrações | Alembic |
| Banco | PostgreSQL |
| Testes de regras e API | pytest e HTTPX |
| Testes ponta a ponta | Playwright |
| Qualidade | Ruff e verificação de tipos |
| Desenvolvimento local | Docker Compose |

Organização proposta: módulos acadêmicos, interações, avaliações, frequência, certificados, biblioteca e integrações. Camadas: API, aplicação, domínio e infraestrutura. Evitar abstrações genéricas sem utilidade concreta.

Decisões técnicas recomendadas:

- Regras acadêmicas em Python; procedures e funções SQL apenas quando houver vantagem concreta e demonstrável.
- Índices orientados às consultas reais.
- Constraints para integridade: matrícula, presença e voto únicos no contexto correto, código único de certificado e chaves estrangeiras.
- Transações para operações que envolvam múltiplas alterações.
- Testes de integração com PostgreSQL, além de testes de regras, API, autorização e fluxos críticos.
- Avaliar Supabase Auth; a escolha do provedor de autenticação ainda depende da análise de viabilidade.
- Frontend acessando os dados acadêmicos pela FastAPI; autorização considerando papel, matrícula e vínculo com a turma.
- YouTube para vídeo incorporado quando permitido; Google Meet por link; perguntas e enquetes próprias da escola.
- Sheets como importação auxiliar validada, sem substituir o banco principal.
- Cadastro manual inicial de gravações e capítulos antes de automações.
- Atualização periódica de perguntas inicialmente; avaliar SSE/WebSocket conforme necessidade.
- Evitar Redis, Celery e microsserviços sem necessidade demonstrada.
- Backend portável por contêiner e materiais fora do disco efêmero do servidor.

Fluxo de referência proposto para validar a fundação: professor cria aula → aluno matriculado acessa → envia pergunta → professor modera → presença é registrada por mecanismo explícito.

## 4. Pesquisa realizada

Foram consultadas fontes oficiais durante a orientação. Esta consulta foi pontual e não substitui a comparação completa de viabilidade exigida no escopo.

- Render: serviços web gratuitos podem suspender após 15 minutos sem tráfego; armazenamento local é efêmero. Fonte: https://render.com/docs/free
- Supabase: projetos gratuitos com baixa atividade podem ser pausados em um período de sete dias. Fonte: https://supabase.com/docs/guides/platform/free-project-pausing
- Referências técnicas consultadas: https://fastapi.tiangolo.com/deployment/concepts/ e https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html

Limites, preços, exigência de cartão, políticas e condições devem ser novamente verificados ao selecionar os serviços de publicação. Nenhum provedor de hospedagem foi escolhido definitivamente.

## 5. Aprovação do usuário

Em 09/11/2026, o usuário declarou: “aprovado suas orientacoes”.

Ficam aprovadas as orientações arquiteturais descritas acima. Também foi autorizada a manutenção progressiva deste histórico na pasta `.documentacao`.

Essa aprovação não representa escolha definitiva de provedor, publicação realizada ou conclusão das fases do escopo.

## 6. Estado real do trabalho

- Escopo lido integralmente.
- Orientação arquitetural apresentada e aprovada.
- Política de histórico progressivo registrada neste arquivo.
- Nenhuma aplicação, banco, migração, integração ou infraestrutura foi implementada.
- Nenhum deploy foi realizado.
- Não foram executados testes de software, pois ainda não há implementação.
- O arquivo original de escopo foi preservado.

## 7. Próxima etapa prevista

Concluir a Fase 0: análise das questões A a J, comparação atualizada de serviços gratuitos, riscos e plano de execução por dependências. Depois detalhar arquitetura, modelo de dados e permissões antes de iniciar a fundação. Registrar cada entrega em novos arquivos Markdown nesta pasta, preservando este registro.
