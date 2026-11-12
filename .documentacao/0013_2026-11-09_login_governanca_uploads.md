# 0013 — Login local, governança, coordenador e uploads privados

Data: 09/11/2026, America/Sao_Paulo. Histórico 0001–0012 preservado. Senhas fornecidas pelo usuário não são reproduzidas neste registro, nos guias, no código ou em arquivos de configuração.

## Solicitação atendida

O usuário autorizou criar o acesso inicial de Francisco como administrador e Dorival como coordenador, usando as credenciais informadas na conversa. Solicitou uploads por esses dois perfis, bloqueio de upload para usuários comuns, atualização obrigatória das credenciais do coordenador e controle administrativo de aprovação, redefinição, cancelamento e atualização de usuários.

Também solicitou uma tela de login baseada na arte fornecida, preservada em [referência](referencias/0013_login_referencia.png).

## Decisão arquitetural desta etapa

Foi acrescentada autenticação local no PostgreSQL/FastAPI, eliminando a dependência de uma conta Supabase configurada para este primeiro uso real. A verificação JWT/JWKS anterior permanece como integração opcional. A sessão local usa cookie e tem governança própria; não é um login fictício.

Essa evolução complementa e altera a intenção inicial de depender primeiro de Google/Supabase Auth dos registros anteriores. Não houve criação de contas externas, contratação ou publicação na internet.

## Credenciais e sessões

- Contas iniciais provisionadas pelo comando local `python -m app.bootstrap`, com e-mails lidos pelo terminal e senhas por getpass, sem eco de senha.
- O provisionador não contém e-mails ou senhas fixos e preserva contas já existentes ao ser repetido.
- Senhas armazenadas como scrypt com salt aleatório e comparação constante. Parâmetro final de novos hashes: N=131072, r=8, p=1, conforme referência OWASP consultada. Hashes da primeira versão desta mesma etapa, N=16384, são reconhecidos e atualizados após um login válido, sem alterar a senha.
- Senhas novas de cadastro, atualização e regularização exigem pelo menos doze caracteres. A senha provisória do coordenador foi aceita apenas para o acesso restrito solicitado pelo usuário.
- Sessão opaca aleatória: o banco armazena somente SHA-256 do token, data de expiração, usuário e revogação.
- Cookie HttpOnly, SameSite=Strict e Secure em produção. Nada de token local persistido em localStorage.
- Sem Lembrar-me: cookie de sessão e expiração de servidor em doze horas. Com a opção: até sete dias.
- Proteção CSRF por cabeçalho obrigatório e conferência de Origin para operações com sessão local e endpoints de autenticação. CORS usa origens explícitas e credenciais habilitadas.
- Limites de tentativas persistidos no PostgreSQL, por hash de e-mail e IP; locks transacionais evitam ultrapassagem concorrente. Janela inicial de quinze minutos, até cinco por e-mail e trinta por IP para operações limitadas.
- Logout e mudanças de acesso revogam sessões locais no banco.

## Primeiro acesso do coordenador

O coordenador inicial possui `must_change_credentials=true`. A tela obrigatória exibe **Coloque seu e-mail real e uma senha real**, com destaque de acesso restrito. Antes da regularização e aprovação, chamadas acadêmicas e uploads são negados no backend.

Ao enviar e-mail real e nova senha:

1. O e-mail proposto e o hash da nova senha ficam pendentes; nenhuma senha em texto simples é guardada.
2. O estado passa para pendente.
3. O administrador vê a proposta na governança.
4. Ao aprovar, o sistema aplica as credenciais e revoga sessões anteriores.
5. O coordenador entra novamente com o e-mail e a senha atualizados.

Não foi fornecido um e-mail real novo em nome de Dorival nem modificada sua senha definitiva durante os testes no navegador. A tela foi verificada sem preencher ou enviar credenciais definitivas do usuário. O fluxo de aprovação completo foi testado com contas exclusivas do banco de teste.

Não há envio de e-mail ou prova automática de posse do endereço. O administrador deve conferir a solicitação antes de aprovar.

## Governança administrativa

Nova tela **Alunos e Turmas → Usuários e permissões**, exclusiva de administrador:

- Listagem de contas, perfis, estado, credenciais pendentes e pedidos de recuperação de senha.
- Criação de usuário com senha provisória gerada, exibida uma única vez.
- Atualização de nome, e-mail, papel e situação.
- Aprovação de cadastro ou credenciais pendentes.
- Cancelamento reversível de acesso, sem apagar histórico.
- Redefinição de senha com novo segredo provisório e atualização obrigatória.
- Registro das ações em audit_logs sem senhas ou tokens.
- Proteções contra remover o próprio acesso administrativo e contra desativar o último administrador ativo.

Papéis: admin, coordinator, teacher e student. Somente admin controla usuários. Admin e coordinator gerenciam cursos e conteúdos. Teacher e student não recebem permissão de upload.

Cadastro público cria somente aluno pendente. Aprovação de usuário não equivale a matrícula. Recuperação por Esqueceu sua senha? registra pedido para a administração e retorna mensagem genérica; não simula e-mail enviado.

A redefinição administrativa de terceiros não permite redefinir a própria conta pela mesma ação. Recuperação do único administrador depende de manutenção local autorizada; não foi criado bypass de login.

## Conteúdos e uploads

Nova central **Conteúdos e Uploads**, visível para administrador e coordenador liberado. Permite título, curso, arquivo e estado editorial.

- Upload real multipart com python-multipart.
- Permissão conferida antes de o framework analisar/spoolar o corpo do upload e novamente no endpoint.
- Arquivos em diretório privado `.local/uploads`, fora de frontend/public.
- Nomes internos aleatórios, hash SHA-256, tamanho, tipo e metadados no banco.
- Limite inicial: 256 MB por arquivo e 5 GB no acervo local. Variáveis SCHOOL_MAX_UPLOAD_BYTES, SCHOOL_UPLOAD_QUOTA_BYTES e SCHOOL_UPLOAD_DIRECTORY permitem configuração futura.
- Cota verificada sob lock PostgreSQL para evitar exceder por uploads simultâneos. Falhas removem somente o arquivo temporário recém-criado pela própria operação.
- Formatos: PDF, MP4, WebM, MOV, MP3, WAV, OGG, PNG, JPG/JPEG, WebP, PPT/PPTX, DOC/DOCX, XLS/XLSX, TXT/CSV UTF-8 e ZIP. Executáveis e HTML não são aceitos.
- Assinaturas básicas verificadas para formatos comuns; ZIP/Office modernos devem ser contêineres ZIP válidos. TXT/CSV são decodificados incrementalmente. ZIP não é extraído no servidor.
- Publicar exige curso associado. Alunos somente veem conteúdo publicado de curso publicado com matrícula ativa/concluída.
- Equipe pode retirar publicação ou arquivar. Arquivar não apaga o arquivo e continua ocupando armazenamento.
- Downloads exigem sessão e autorização; caminho resolvido é limitado ao diretório privado. Documentos servidos como attachment, com nosniff.
- Vídeo e áudio têm reprodução autenticada no acervo, com FileResponse e suporte do provedor HTTP a intervalos de bytes. Não há transcodificação, geração de thumbnails ou edição de vídeo.
- Conteúdos publicados entram no painel; vídeos publicados contribuem para o contador de gravações no escopo autorizado.

Armazenamento é local e precisa de backup de banco e arquivos. Em servidores com disco efêmero, migrar para volume persistente ou object storage antes da publicação. Não foi integrado antivírus ou prometido armazenamento ilimitado. As checagens de formato são básicas, não certificação de ausência de malware.

Upload de vídeo não cria automaticamente uma sessão ao vivo, currículo ou avaliação. Gestão acadêmica completa continua no roadmap.

## Interface de login

- Rota direta: `http://192.168.0.233:3000/login`.
- Fundo fotográfico derivado da referência, com biblioteca, arcos, oliveira, globo, ampulheta e Bíblia.
- Identidade Kairós e formulário reais em HTML/CSS: e-mail, senha, mostrar/ocultar, Lembrar-me, recuperação, cadastro e envio.
- Formulário de cadastro sujeito a aprovação.
- Google aparece indisponível enquanto não configurado. YouTube permanece indisponível; não foi inventado um provedor independente de autenticação YouTube.
- Foco visível, nomes acessíveis de campos e layout responsivo.
- Durante QA foi encontrado excesso horizontal no mobile e corrigido com coluna minmax(0,1fr) e largura limitada do card. Captura intermediária preservada; captura final sem excesso horizontal.

## Arte gerada: origem, prompt e arquivo

Skill ImageGen aplicada em modo built-in, sem API key e sem CLI. Alvo: a arte local fornecida pelo usuário, inspecionada antes da edição. O original não foi alterado.

Arquivo final consumido pelo projeto: `frontend/public/images/login-background-v1.png`. Origem gerada preservada na pasta generated_images do Codex. Somente o fundo foi gerado; nenhum campo, controle ou logo tipográfico ficou embutido nele. Símbolos e textos da tela são elementos de interface.

Prompt usado:

> Use case: precise-object-edit. Edit target: attached login reference. Produce ONLY a wide photographic website background asset, landscape 16:9. Preserve the warm ivory and gold academic theology library architecture, classical stone columns, arches, olive branches at upper left, globe, hourglass and leather-bound theological books at far left and open Bible on a wooden table along the bottom foreground. Remove ALL user interface, login card, buttons, fields, icons, crest, cross ribbon, institutional logo, brand typography and all floating text. Replace the full right side and central typography with softly blurred continuous ivory stone arches and library background, low detail and bright enough for real HTML form overlay. No forms or graphics baked in. No people. No watermark. Natural photorealistic golden lighting, premium editorial aesthetic. Keep the main physical books/globe/hourglass concentrated in the leftmost third; leave central and right regions calm. Do not add legible text.

## Migração e dependências

- Migração `ff7c642801b0_local_auth_governance_private_uploads`: campos de conta/credenciais pendentes, unique de e-mail, ampliação do check de papéis, local_sessions, login_attempts, password_reset_requests e content_assets.
- Constraint de papel revisada manualmente, pois autogenerate não altera esse check automaticamente. Constraint unique de e-mail nomeada para downgrade reproduzível.
- Migração aplicada nos bancos locais de desenvolvimento e teste; Alembic check sem divergências.
- python-multipart acrescentado e congelado no requirements.txt. O hashing usa a biblioteca padrão do Python.
- `.env.example` recebeu somente nomes e limites não secretos; nenhuma credencial real.

## Verificações e evidências

- Suíte ampliada para **28 testes**, incluindo sete novos cenários integrados de autenticação, primeiro acesso/aprovação, upload/autorização, reset/cancelamento, formato/CSRF, cadastro pendente e limitação de tentativas.
- Cenário do coordenador confirma upload permitido após aprovação e governança ainda negada.
- Backend: Ruff, mypy estrito e pip check aprovados. PostgreSQL real; sem substituição por SQLite.
- Frontend: TypeScript e build estático verificados nesta etapa.
- Navegador confirmou login do administrador com os dados reais provisionados, restauração de sessão, painel real, governança com duas contas e central de uploads.
- Navegador confirmou o alerta obrigatório ao entrar como coordenador. Nenhuma credencial definitiva foi enviada em seu nome. Sessões de QA foram encerradas.
- Mobile final: clientWidth e scrollWidth iguais a 375 px em viewport 390 px.

Evidências:

- [Login desktop final](evidencias/0013_login_kairos_desktop_final.jpg).
- [Login mobile final](evidencias/0013_login_kairos_mobile_final.jpg).
- [Alerta obrigatório do coordenador](evidencias/0013_alerta_coordenador.jpg).
- [Governança administrativa](evidencias/0013_governanca_admin.jpg).
- [Central de uploads](evidencias/0013_central_uploads.jpg).

Testes de arquivos usaram somente fixtures do banco/diretório de teste; o acervo de desenvolvimento não recebeu conteúdo fictício. Um aviso de depreciação do TestClient/httpx permanece registrado; os testes passam.

## Fontes técnicas consultadas

- [FastAPI UploadFile](https://fastapi.tiangolo.com/tutorial/request-files/).
- [Starlette cookies e respostas](https://starlette.dev/responses/).
- [Python hashlib/scrypt](https://docs.python.org/3/library/hashlib.html).
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## Estado e continuidade

As credenciais fornecidas agora funcionam no login local. Coordenador segue aguardando sua atualização real e aprovação posterior, conforme solicitado. Serviços mantidos para acesso pela rede local; não houve publicação na internet, push, contratação ou alteração do serviço PostgreSQL preexistente.

Os documentos anteriores são snapshots históricos. Esta etapa substitui a limitação anterior de login apenas por provedor externo e acrescenta governança e acervo funcional. Guias atuais em docs/GUIA_ADMINISTRADOR.md, docs/GUIA_COORDENADOR.md e docs/GUIA_ALUNO.md.
