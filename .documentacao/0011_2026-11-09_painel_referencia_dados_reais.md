# 0011 — Painel alinhado à referência com consultas reais

Data: 09/11/2026, America/Sao_Paulo. Este registro preserva o histórico 0001–0010.

## Solicitação e interpretação

O usuário pediu respeito à composição da nova imagem, incluindo posição das fotos e informações dinâmicas reais. A referência foi preservada em [referencias/0011_referencia_layout_exato.png](referencias/0011_referencia_layout_exato.png).

Os números, datas, títulos e arquivos ilustrados na imagem não são comprovação de registros existentes. Nenhum dado acadêmico foi inventado para reproduzir a aparência preenchida. Os papéis e arquivos de Dorival/Francisco continuam seguindo o mapeamento explícito do usuário no registro 0009; a imagem não promove uma pessoa a administrador autenticado.

## Composição da interface

- Cabeçalho com marca Kairós, Início, Cursos, Aulas ao Vivo, Biblioteca e Comunidade; pesquisa, notificações e acesso à conta.
- Banner abaixo do cabeçalho e acima da navegação lateral: retrato de Dorival à esquerda, identidade institucional no centro e Bíblia/ampulheta à direita.
- Removida da home a seção de equipe que anteriormente ocupava uma faixa abaixo do banner, para seguir a nova referência.
- Sidebar com identificação da sessão e os rótulos da referência: Painel Inicial, Meus Cursos, Aulas ao Vivo, Biblioteca Digital, Lousa Virtual, Avaliações e Provas, Frequência (Chamada), Certificados, Alunos e Turmas, Relatórios e Configurações.
- Cinco indicadores no topo: Alunos, Cursos, Aulas Gravadas, Aulas ao Vivo e Taxa de Conclusão.
- Dois painéis centrais: Próxima Aula ao Vivo e Meu Curso em Andamento.
- Três painéis inferiores: Materiais da Aula, Atividades e Avaliações e Agenda da Semana.
- Layout adaptado ao celular; menus recolhíveis e sem excesso horizontal na verificação de 390 px.
- Marca pequena do cabeçalho usa texto e ícones em código, pois não foi fornecido arquivo separado do brasão com louros mostrado na referência. Não foi extraído um recorte do screenshot nem declarado acabamento idêntico em todos os pixels.

## Dados reais no backend

Novo endpoint autenticado `GET /api/v1/dashboard`, com contrato Pydantic. O frontend busca imediatamente após autenticação, atualiza a cada 30 segundos com aba visível e oferece atualização manual.

Escopos:

- Administrador: turmas da escola e contagem de cursos não arquivados.
- Professor: turmas atribuídas e eventuais matrículas próprias.
- Aluno: turmas com matrícula ativa/concluída; notas e progresso não são compartilhados por esse endpoint.
- Visitante: endpoint nega acesso com 401; interface mostra traços e convite ao login, sem apresentar números como se fossem consultados.

Fontes e fórmulas:

| Bloco | Origem/cálculo |
|---|---|
| Alunos | Identidades ativas distintas com matrículas ativas/concluídas no escopo; para aluno, somente sua própria identidade |
| Cursos | Admin: cursos não arquivados; demais: cursos distintos de suas turmas autorizadas |
| Aulas Gravadas | Gravações publicadas de sessões publicadas/concluídas nas turmas autorizadas |
| Aulas ao Vivo | Sessões publicadas futuras nas turmas autorizadas |
| Taxa de Conclusão | Matrículas concluídas ÷ matrículas ativas/concluídas no escopo; sem denominador, valor nulo |
| Próxima aula | Sessão publicada futura ou ainda em curso, ordenada por início, com título, descrição, data, duração, link e inscritos reais |
| Curso em andamento | Primeira matrícula ativa em curso publicado, com total de aulas curriculares e conclusões persistidas dessa matrícula |
| Progresso | Conclusões válidas ÷ total de aulas do curso; sem aulas, percentual nulo |
| Materiais | Materiais publicados nas turmas autorizadas, com título, tipo, tamanho real quando cadastrado e link externo quando existente |
| Atividades | Atividades publicadas nas turmas autorizadas; entrega calculada pelas submissões do próprio aluno |
| Agenda | Sessões publicadas da próxima semana no escopo autorizado |

Os limites de listagem são cinco materiais/atividades/eventos no painel. A consulta de sessões candidatas tem limite de cem e janela de início a partir das últimas 24 horas para identificar encontros em curso; aulas excepcionalmente longas exigirão refinamento dessa regra.

Taxa de conclusão de matrículas e progresso de aulas são indicadores diferentes, mesmo que a imagem use o mesmo percentual em ambos.

## Migrações e perfil

- `3f86be74dc9b_dashboard_real_data`: class_sessions, video_recordings, educational_materials, lesson_completions, assignments e assignment_submissions, com FKs, índices e constraints de status.
- `3da7a3cec795_profile_avatar`: campo nullable avatar_url na identidade acadêmica.
- Migrações aplicadas ao banco local de desenvolvimento e ao banco exclusivo de teste; Alembic não encontrou divergência com os modelos.
- `/api/v1/me` passa a retornar avatar_url. Nome, foto e papel do perfil vêm da identidade autenticada. Sem identidade real, a interface mostra Visitante; não finge sessão do professor Francisco.

As novas tabelas e consultas não significam que todos os cadastros já estejam disponíveis por interface. CRUD completo de sessões, materiais, atividades, envio de trabalhos e gestão escolar continuam sendo etapas próprias. O painel lê registros persistidos, sem simular essas operações.

## Comportamentos funcionais e limites

- Entrar na Aula abre o link HTTPS cadastrado. Sem link, informa ausência.
- Adicionar à Agenda gera arquivo ICS com identificador, horário UTC e duração da sessão real, sem criar evento em conta externa automaticamente.
- Links de materiais somente são exibidos como navegáveis quando HTTPS; não é upload privado ou URL assinada já implementada.
- Biblioteca usa a mesma consulta autorizada de materiais; atividades usam a listagem real de atividades. A caixa de entrega é indicadora, sem checkbox que simule envio de trabalho.
- Pesquisa filtra títulos dos cursos efetivamente carregados do catálogo.
- Notificações e apresentação informam indisponibilidade quando não implementadas/cadastradas; não há ponto vermelho de notificações fictícias nem vídeo inventado.
- Entradas de módulos ainda incompletos explicam seu estado. Esses módulos não são declarados concluídos pela presença no menu.

## Estado real do banco de desenvolvimento

Consulta nesta etapa: um curso, zero usuários acadêmicos, zero sessões, zero matrículas e zero materiais. O curso inicial segue em rascunho. O provedor de autenticação real permanece sem configuração. Não foram inseridos os 128 alunos, quatro cursos, 32 gravações, seis lives ou 72% da imagem.

Para mostrar dados pessoais reais de Francisco e seu painel, é necessário configurar seu login e provisionar a identidade correta, e então cadastrar/importar os registros acadêmicos. Não foi criado login alternativo ou bypass de segurança.

## Testes e verificações

- **21 testes aprovados** com PostgreSQL real.
- Novos testes verificam isolamento entre turmas, exclusão de rascunhos, mudança de progresso de 0 para 100 por conclusão persistida, identificação de entrega, remoção de sessão cancelada e rejeição a visitante.
- As fixtures adicionais são exclusivas do banco de teste e executam rollback; não preenchem o ambiente de desenvolvimento com dados demonstrativos.
- Ruff e mypy estrito aprovados; TypeScript aprovado; build estático aprovado.
- Frontend reconfigurado para permitir somente o host local informado em allowedDevOrigins, corrigindo bloqueio de atualização de recursos do Next em desenvolvimento pelo IP. Documentação local da versão instalada consultada antes da alteração.
- Navegador confirmou carregamento das imagens; mobile: largura útil e scrollWidth de 375 px para viewport de 390 px, sem excesso horizontal.
- Menu mobile e abertura da biblioteca verificados.
- Durante o restart para build, uma aba antiga registrou erro de conexão; a verificação foi retomada em aba nova após confirmação HTTP 200. Não houve alteração de firewall ou desativação de proteção do navegador.

## Evidências

- [Desktop final](evidencias/0011_painel_referencia_desktop_final.jpg).
- [Mobile](evidencias/0011_painel_referencia_mobile.jpg).
- Captura intermediária desktop preservada em `evidencias/0011_painel_referencia_desktop.jpg`.

## Acesso e continuidade

Site mantido em `http://192.168.0.233:3000`; FastAPI em `http://192.168.0.233:8000`. PostgreSQL continua apenas no loopback. Serviços locais reiniciados para aplicar código novo e mantidos ativos conforme solicitação de acesso do usuário. Nenhuma publicação pública, contratação, push ou mudança de dados institucionais de terceiros foi realizada.
