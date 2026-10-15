# Segurança

Este documento descreve o que o projeto faz, o que **não** faz e o que foi (e não foi) verificado.

## Modelo de ameaça (resumo)

Pessoas autenticadas de funções diferentes (coordenador, engenheiro, cliente) usam o mesmo servidor. O que se quer
evitar: ver ou alterar obras que não foram liberadas, escalar de função, adivinhar senhas, forjar escritas a partir de
outro site e roubar sessão por script injetado. O aparelho do usuário é tratado como não confiável: a autorização
vale sempre no servidor.

## Controles implementados

| Tema | Como |
|---|---|
| Senhas | PBKDF2-SHA256, 100 mil iterações (teto do runtime do Workers), sal único por senha, comparação em tempo constante; mínimo de 10 caracteres |
| Sessão | Token aleatório de 256 bits; só o hash fica no banco; cookie `HttpOnly; SameSite=Strict; Secure` (Secure em HTTPS); expira em 30 dias; encerrada ao desativar a conta, trocar função ou senha |
| Login | Limite de tentativas por conta+rede, por conta e por rede (IPv6 por /64), contadas **antes** da verificação; resposta idêntica para e-mail inexistente e senha errada, com verificação de custo igual |
| Primeiro acesso | Só com `SETUP_CODE` (secret) e só enquanto não há usuários; inserção atômica |
| CSRF | `SameSite=Strict` + recusa de escritas com `Origin` de outro site ou `Sec-Fetch-Site: cross-site` |
| Autorização | Função e obra checadas em cada rota; listagens filtradas **na consulta SQL**; cliente nunca recebe rascunhos nem as fotos deles; não é possível ficar sem coordenador ativo |
| Entrada | Corpo limitado em bytes durante a leitura; campos com tamanho e formato validados; só campos conhecidos são gravados; foto só `jpeg/png/webp` em base64; autor do RDO é sempre o usuário da sessão; datas futuras são reduzidas |
| Cabeçalhos | CSP restritiva (`default-src 'self'`), `X-Frame-Options: DENY`, HSTS, `nosniff`, `Referrer-Policy`, API com `Cache-Control: no-store` e fora do cache do service worker |
| Segredos | Nenhum no repositório. `SETUP_CODE` é secret do Worker (`.dev.vars` local, no `.gitignore`) |

## Limitações e trade-offs conhecidos

- **Bloqueio de conta pode ser usado contra a própria pessoa (baixo):** 20 tentativas erradas em 15 minutos, de qualquer
  rede, bloqueiam o login daquele e-mail pelo restante da janela. É o preço de limitar adivinhação distribuída.
- **Tentativas de instalação compartilham um limite global (baixo):** enquanto o sistema não tem usuários, alguém pode
  gastar o orçamento de tentativas e atrasar o primeiro acesso por alguns minutos. Não permite criar o acesso sem o código.
- **CSP com `style-src 'unsafe-inline'` (baixo):** necessário para estilos em linha do React/Tailwind. Scripts continuam
  restritos a `'self'`.
- **Dados no aparelho (médio, por design):** para funcionar offline, RDOs e fotos ficam no navegador (localStorage e
  IndexedDB) sem criptografia até a pessoa sair ou o acesso ser cortado. Aparelho perdido e desbloqueado expõe esses dados.
- **PBKDF2 de 100 mil iterações (baixo):** abaixo do que se recomenda hoje fora do Workers; é o máximo do runtime.
  Senhas longas e o limite de tentativas compensam, mas não eliminam o risco se o banco vazar.
- **Sem MFA, sem recuperação de senha por e-mail, sem registro de auditoria.** A troca de senha de outra pessoa é feita
  pelo coordenador.
- **Última edição vence:** não é falha de segurança, mas pode perder dados em edição concorrente.

## O que foi verificado

- Revisão manual de todo o código do `worker/` (autenticação, rotas, validação, criptografia).
- Testes automatizados da matriz de permissões, do isolamento entre obras, das regras de sessão e da validação de
  entrada (veja `tests/`). Um deles falhava antes da correção do item abaixo.
- Execução real no runtime do Cloudflare (`wrangler dev --local`): migrações, primeiro acesso, carga da obra fictícia,
  cabeçalhos e recusa de acesso sem login.

## O que **não** foi verificado

- Teste de invasão, análise de dependências e varredura de vulnerabilidades do front-end.
- Revisão linha a linha de `src/services/cloudSync.ts` e do restante do front-end (só buscas por padrões de risco:
  não há `dangerouslySetInnerHTML`, `innerHTML` nem `eval`).
- Comportamento em navegadores reais do modo offline e do service worker.

## Histórico de correções

- **Fotos de rascunhos visíveis ao cliente:** o cliente não recebia rascunhos no sync, mas `GET /api/photos/:id`
  entregava a foto de um rascunho a quem soubesse (ou adivinhasse) o id. Agora responde 404 para cliente quando o RDO
  é rascunho ou foi apagado. Coberto por teste.

## Reportar um problema

Abra uma _issue_ privada ou entre em contato com o autor antes de divulgar detalhes.
