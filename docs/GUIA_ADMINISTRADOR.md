# Guia do administrador — login e conteúdos

Atualização de 09/11/2026. Complementa os registros anteriores sem substituí-los. Histórico completo em [0013](../.documentacao/0013_2026-11-09_login_governanca_uploads.md).

## Entrar

Abra [Login Kairós na rede local](http://192.168.0.233:3000/login). Use o acesso informado na conversa. Senhas não são repetidas neste guia ou armazenadas em texto simples no código.

O campo Lembrar-me mantém a sessão por até sete dias. Sem essa opção, o cookie é de sessão do navegador e a sessão do servidor expira em doze horas. Sair revoga o acesso daquela sessão no banco.

## Controlar usuários

No menu **Alunos e Turmas**, a tela de governança permite:

1. Criar uma conta com perfil de administrador, coordenador, professor ou aluno.
2. Atualizar nome, e-mail, perfil e situação.
3. Aprovar cadastros e credenciais pendentes.
4. Cancelar o acesso, revogando sessões.
5. Redefinir a senha. A senha provisória aparece apenas na resposta e no diálogo daquela operação; compartilhe por um canal privado.

Contas novas criadas pela administração e senhas redefinidas exigem atualização de credenciais. Para restaurar uma conta cancelada que ainda precisa dessa atualização, altere sua situação para Ativo e peça que o usuário envie as credenciais definitivas; depois aprove a solicitação. Não é possível remover seu próprio acesso administrativo ou desativar o último administrador ativo pelas ações comuns.

O cadastro público cria somente alunos pendentes. Aprovar uma conta não cria matrícula em curso automaticamente. A gestão completa de turmas e matrículas permanece uma etapa posterior.

## Aprovar o coordenador

O coordenador inicial entra com o acesso provisório e recebe uma tela obrigatória. Ele informa um e-mail real e uma nova senha de pelo menos doze caracteres. Até sua aprovação, não acessa o painel acadêmico nem faz uploads.

Na governança, confira o novo e-mail e clique em Aprovar. O sistema aplica as credenciais, encerra as sessões antigas e exige novo login. A posse do e-mail não é verificada por mensagem automática nesta versão: a aprovação depende da sua conferência administrativa.

## Publicar arquivos e vídeos

No menu **Conteúdos e Uploads**:

1. Informe título, curso e arquivo.
2. Escolha Rascunho para manter apenas na equipe ou Publicado para alunos matriculados.
3. Envie o conteúdo e confira o resultado no acervo.
4. Use Publicar/Retirar publicação ou Arquivar conforme necessário.

Um arquivo publicado precisa estar associado a um curso. Para alunos, o curso também precisa estar publicado e a matrícula deve estar ativa ou concluída. Administrador e coordenador acessam todo o acervo; os demais perfis não podem enviar arquivos.

Vídeos e áudios podem ser reproduzidos pelo acervo; documentos são baixados após autorização. Conteúdos publicados aparecem no painel. Não é gerado um curso, uma avaliação ou uma sessão ao vivo apenas pelo upload de um arquivo.

Formatos disponíveis: PDF, MP4, WebM, MOV, MP3, WAV, OGG, PNG, JPEG, WebP, documentos Office, TXT UTF-8, CSV UTF-8 e ZIP. Arquivos executáveis e páginas HTML não são aceitos. Limite inicial: 256 MB por arquivo e 5 GB no acervo local, configuráveis no backend. ZIPs não são extraídos pelo sistema.

Os arquivos ficam fora da pasta pública, em `.local/uploads`, com nomes internos aleatórios. Download exige autorização; arquivar não apaga o arquivo físico e continua consumindo armazenamento. Inclua essa pasta na estratégia de backup. Nenhum antivírus foi integrado nesta entrega.

## Recuperação de senha

Esqueceu sua senha? registra uma solicitação para a administração quando a conta existe. O usuário recebe mensagem genérica. Nenhum e-mail automático é enviado. As contas com solicitação aberta ficam sinalizadas na governança.

Um administrador não redefine a própria senha pela ação de redefinição de terceiros. Recuperação administrativa sem outro administrador requer manutenção local autorizada; não há acesso alternativo secreto ou bypass.

## Publicação futura

Esta entrega funciona no ambiente local. O cookie passa a Secure em produção; a publicação exige HTTPS e origens CORS corretas. Armazenamento local precisa de volume persistente ou adaptador para object storage antes de migrar para servidores com disco efêmero. Google/YouTube continuam indisponíveis sem a integração correspondente.
