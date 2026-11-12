# 0004 — Plano de execução verificável

Data: 09/11/2026. Plano baseado no escopo, stack aprovada e registros 0002/0003. Documentação concluída nesta rodada; tarefas de aplicação abaixo ainda não executadas.

## Estratégia de entrega

Cada tarefa deve terminar com comportamento verificável, evidência de teste e novo registro Markdown no histórico. Não declarar uma fase concluída se depender de serviço não configurado. A aprovação anterior já cobre as orientações arquiteturais; decisões de rotina não precisam de nova aprovação. Publicação e configuração de contas dependem de acesso e das condições verificadas no momento.

O MVP funcional do escopo inclui as fases acadêmica, interação e gestão; entregas parciais devem ser identificadas como incrementos. Não há estimativa de prazo confiável sem disponibilidade de equipe, revisão editorial e configuração de provedores.

## Fase 0 — Viabilidade e planejamento

| ID | Tarefa | Dependência | Critério de conclusão | Estado |
|---|---|---|---|---|
| V01 | Inspecionar projeto e ler escopo | — | Arquivo lido e histórico inicial | Concluído |
| V02 | Comparar serviços e riscos com fontes | V01 | Registro 0002 com cotas verificadas e lacunas explícitas | Concluído como análise documental |
| V03 | Responder A–J e delimitar MVP | V02 | Respostas e mapa de fases | Concluído |
| V04 | Validar condições nas contas dos provedores | V02 | Cartão, termos, região, cotas e cobrança confirmados | Pendente; antes de publicar |

## Fase 1 — Arquitetura

| ID | Tarefa | Dependência | Critério de conclusão | Estado |
|---|---|---|---|---|
| A01 | Componentes e limites de camadas | V03 | Diagrama e decisões no registro 0003 | Concluído como proposta |
| A02 | Modelo lógico e invariantes | A01 | Relações, constraints e separação curso/turma/sessão | Concluído como proposta |
| A03 | Matriz de autorização e fluxos | A02 | Papéis, vínculos, Auth e fluxos críticos descritos | Concluído como proposta |
| A04 | Incorporar inspiração visual | A01 | Direção visual e restrições registradas | Concluído |
| A05 | Validar desenho na primeira implementação | A01–A03 | Migração e fluxo de referência demonstram o desenho | Pendente |

## Fase 2 — Fundação: próximo bloco de implementação

| ID | Tarefa pequena | Depende de | Verificação |
|---|---|---|---|
| F01 | Inventariar Python, Node, gerenciadores, Docker e Git | A03 | Versões reais e limitações registradas, sem instalar silenciosamente fora do projeto |
| F02 | Criar estrutura backend e dependências fixadas | F01 | API inicia localmente; import e lint passam |
| F03 | Configuração Pydantic, erros e healthcheck | F02 | Segredo ausente falha com mensagem segura; health sem revelar configuração |
| F04 | PostgreSQL local e Alembic | F01–F03 | Banco vazio recebe upgrade; processo reproduzido em banco de teste |
| F05 | Migração de usuários, papéis e currículo/turma | F04 | FKs/unique rejeitam inconsistências; privilégios separados |
| F06 | Adaptador Auth e mapeamento de identidade | F05 | Token inválido/expirado é rejeitado; conta bloqueada sem acesso |
| F07 | Políticas de acesso e bootstrap de admin | F06 | Aluno não se promove; professor não acessa turma alheia |
| F08 | Frontend Next/TypeScript e tokens visuais | F01, A04 | Build estático; layout sem overflow no mobile e navegação por teclado |
| F09 | Login e cliente da API com estados de falha | F06–F08 | Fluxo real quando Auth disponível; bloqueio explícito quando não configurado |
| F10 | CI lint, tipos, pytest e build | F02–F09 | Checks locais reproduzíveis; workflow sem credenciais reais |
| F11 | Registrar comandos e configuração de desenvolvimento | F10 | README e `.env.example` correspondem aos comandos executados |

Em F06/F09, testes podem usar emissor controlado de teste para verificar contratos e assinatura, mas isso nunca será apresentado como login público configurado. Fluxo com provedor real é requisito de homologação. Se Docker estiver indisponível, registrar e usar PostgreSQL de teste acessível autorizado; não trocar silenciosamente por SQLite.

## Fase 3 — Incremento acadêmico

| ID | Tarefa | Depende de | Verificação |
|---|---|---|---|
| M01 | CRUD de cursos/módulos/unidades/aulas | F07, F09 | Administrador cria e reorganiza conteúdo sem código |
| M02 | Currículo inicial de Bibliologia idempotente | M01 | Dez unidades do escopo, editáveis; sem alunos/métricas fictícios |
| M03 | Turmas, professores e solicitações de matrícula | M01 | Vínculos corretos; aprovação ativa acesso; duplicata rejeitada |
| M04 | Sessões agendadas e links YouTube/Meet | M03 | Professor da turma cria/publica aula; aluno autorizado acessa |
| M05 | Player e falhas de incorporação | M04 | Vídeo autorizado toca; erro não simula reprodução |
| M06 | Cadastro de gravações e capítulos | M05 | Capítulos ordenados navegam em gravação compatível |
| M07 | Upload privado e publicação de PDF | F07, M03 | Professor publica; aluno sem matrícula não recebe URL |
| M08 | Biblioteca com busca/filtros/favoritos | M07 | Pesquisa por título/autor e escopo de acesso correto |
| M09 | Área do aluno e painel por papel | M03–M08 | Próxima aula, progresso e materiais reais; vazios claros |

## Fase 4 — Interação

| ID | Tarefa | Depende de | Verificação |
|---|---|---|---|
| I01 | Pergunta persistida na sessão | M04 | Aluno matriculado envia; terceiro não acessa |
| I02 | Fila e moderação com atualização incremental | I01 | Professor destaca/responde/oculta; ordem estável |
| I03 | Check-in inicial e evidências | I02 | Ação explícita idempotente; abrir vídeo não gera presença |
| I04 | Comentários e discussão com moderação | I02 | Respostas vinculadas e escopo de turma |
| I05 | Enquetes e voto único concorrente | I02 | Segundo voto rejeitado/atualizado conforme política, nunca duplicado |
| I06 | Lousa individual associada à aula | M07 | Salva JSON, reabre e exporta imagem; conflito de revisão tratado |
| I07 | Importação CSV com prévia | M03 | Erros por linha e reexecução sem duplicação |

O primeiro marco demonstrável combina M04, M05, I01–I03. Ele valida o diferencial da escola antes de ampliar dashboards.

## Fase 5 — Gestão acadêmica

| ID | Tarefa | Depende de | Verificação |
|---|---|---|---|
| G01 | Critérios versionados e chamada do professor | I03 | Presente/ausente/justificado auditados, denominador explícito |
| G02 | Banco de questões e avaliação versionada | M03, F07 | Publicação congela conteúdo de tentativas existentes |
| G03 | Início, salvamento e envio de tentativa | G02 | Limite/prazo aplicados no servidor e sob concorrência |
| G04 | Correção objetiva/manual e liberação | G03 | Nota correta; gabarito invisível antes da política permitir |
| G05 | Histórico, frequência e progresso | G01, G04 | Aluno vê apenas próprios dados; progresso separado de presença |
| G06 | Elegibilidade e emissão idempotente | G05 | Falta de nota/frequência impede certificado |
| G07 | PDF, QR e verificação pública | G06 | Código confirma estado; revogação aparece como inválida |
| G08 | Indicadores administrativos | G05 | Agregações reais, sem contagem de demonstração |

## Fase 6 — Qualidade e publicação

| ID | Tarefa | Depende de | Verificação |
|---|---|---|---|
| Q01 | E2E administrador/professor/aluno | G07 | Fluxos críticos passam em ambiente com provedor real |
| Q02 | Autorização em detalhe/listagem/download/exportação | G07 | IDs de outro usuário/turma são negados |
| Q03 | Acessibilidade e responsividade | M09, G07 | Teclado, foco, contraste, zoom, mobile e estados vazios |
| Q04 | Medição de consultas e participação | I05, G08 | Latência/erros e plano de consultas registrados com carga representativa |
| Q05 | Restore de banco e arquivos | M07, G07 | Cópia restaurada e arquivos recuperados em ambiente separado |
| Q06 | Fechar condições operacionais e privacidade | V04, Q05 | Titular define retenção, suporte, conta, backup e comunicação de limites |
| Q07 | Preparar release e segredos | Q01–Q06 | Artefatos reproduzíveis, migração única e rollback documentado |
| Q08 | Publicar piloto e testar URL real | Q07 | Smoke tests dos quatro papéis e confirmação de limites |

## Rastreabilidade dos 15 critérios de aceite

| Critério do escopo | Tarefas principais |
|---|---|
| 1. Criar curso sem código | M01 |
| 2. Professor cria live | M04 |
| 3. Matrícula e acesso | M03, F09 |
| 4. Vídeo incorporado | M05 |
| 5. Pergunta e moderação | I01, I02 |
| 6. Associar gravação | M06 |
| 7. Capítulos temporais | M06 |
| 8. Publicar PDF | M07 |
| 9. Biblioteca e pesquisa | M08 |
| 10. Presença explícita | I03, G01 |
| 11. Criar/corrigir avaliação | G02–G04 |
| 12. Notas e progresso | G05 |
| 13. Emitir/verificar certificado | G06, G07 |
| 14. Impedir acesso indevido | F07, Q02 |
| 15. Implantação documentada | Q07, Q08 |

## Verificação desta etapa

Entrega exclusivamente documental. Não há código de aplicação, migração executada, suíte pytest, conta de provedor, deploy ou autenticação funcional. A próxima ação técnica é F01. Informações não confirmadas sobre contas, limites contratuais e critérios institucionais permanecem explicitamente pendentes.
