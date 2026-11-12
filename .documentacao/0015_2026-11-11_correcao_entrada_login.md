# 0015 — Correção da entrada principal e orientação de acesso

Data: 11/11/2026, America/Sao_Paulo. Complementa o histórico anterior sem sobrescrevê-lo.

## Solicitação

O usuário informou que não estava vendo a atualização. Durante a verificação, também solicitou seu usuário e sua senha. O acesso de administrador foi informado diretamente no chat, sem reproduzir a senha neste histórico ou em arquivos de fonte.

## Diagnóstico

- IP local confirmado: 192.168.0.233.
- Frontend respondeu HTTP 200 tanto em `/login` quanto pelo loopback.
- FastAPI respondeu ready.
- A página principal inicializava `login=false`, deixando o painel de visitante visível; a nova tela de login estava na rota `/login` ou era aberta pelo botão do perfil.
- Não foi comprovado problema de cache no navegador do usuário. A correção trata a diferença de entrada observada no código e no funcionamento do site.

## Correção

- Entrada principal passa a iniciar pelo login quando não há sessão válida.
- A restauração de sessão ocorre antes de decidir a tela, com estado de carregamento explícito.
- Quando existe sessão válida, a aplicação restaura a identidade e abre o painel, preservando o bloqueio obrigatório de contas pendentes ou com credenciais provisórias.
- O login de tela inteira deixou de ser tratado como modal no controle de foco e de overflow, preservando a rolagem do formulário em telas menores.
- A opção de voltar à apresentação institucional continua disponível por ação explícita.
- Nenhuma senha, conta, papel ou permissão no backend foi alterado.

## Verificação

- TypeScript aprovado.
- Navegador abriu o endereço principal e confirmou a tela Acesse sua Conta, com os campos reais de e-mail e senha.
- [Evidência da entrada corrigida](evidencias/0015_entrada_login_2026-11-11.jpg).
- A aba de resultado foi mantida disponível no aplicativo.
- Não houve reinício dos serviços, alteração de firewall ou interrupção intencional do acesso enquanto o usuário recebia suas credenciais.
- Alteração pequena de interface: utilizados tipos e verificação no navegador. Não foram adicionados testes que apenas espelham o estado inicial, nem repetidos testes de backend sem mudanças.

Acesso direto: `http://192.168.0.233:3000/login`. Acesso principal: `http://192.168.0.233:3000`.
