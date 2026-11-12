# 0010 — Site iniciado para acesso pelo IP do computador

Data: 09/11/2026. O usuário solicitou um link ativo com o IP real do computador e confirmou interesse em saber se o backend usa FastAPI.

## Configuração executada

- IPv4 da interface Ethernet ativa consultado: `192.168.0.233`.
- Site Next.js: `http://192.168.0.233:3000`.
- API FastAPI: `http://192.168.0.233:8000`.
- Documentação interativa da API: `http://192.168.0.233:8000/docs`.
- Frontend iniciado com `NEXT_PUBLIC_API_URL=http://192.168.0.233:8000` e bind `0.0.0.0:3000`.
- Backend iniciado com bind `0.0.0.0:8000`; CORS permite explicitamente o endereço do frontend e as origens localhost anteriores.
- PostgreSQL exclusivo do projeto reiniciado em `127.0.0.1:55432`, banco `school_development`. Não foi exposto à rede.
- Variáveis definidas somente nos processos locais, sem sobrescrever arquivos `.env`.

Os servidores permanecem ativos nesta entrega por solicitação do usuário. A entrega anterior havia encerrado os processos de QA, por isso o link ainda não estava ativo.

## Escopo do endereço

O IP é privado da rede local, não um endereço público de internet. Outros dispositivos precisam estar na mesma rede e ter conectividade permitida pelo firewall. Não foram alteradas regras de firewall ou roteador. DHCP pode mudar esse IP posteriormente. Não houve deploy público.

## Stack

Interface em Next.js/React; API e regras de negócio em FastAPI/Python; dados em PostgreSQL. A porta 3000 abre a interface; a porta 8000 serve a API e sua documentação.
