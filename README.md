# Catálogo de Produtos — Web

Aplicação web de estudo desenvolvida com Next.js, React e TypeScript.

## Funcionalidades

- Cadastro e login de usuários.
- Renovação de sessão com refresh token em cookie HttpOnly.
- Listagem de produtos com miniaturas.
- Criação e edição de produtos.
- Ativação e inativação.
- Exclusão com confirmação.
- Envio, substituição e remoção de fotos.
- Logout.

## Requisitos

- Node.js 24 LTS.
- npm.
- Backend em execução.

## Executar localmente

Instale as dependências:

```bash
npm ci
```

Copie `.env.example` para `.env.local` e configure:

```env
API_URL=https://produtos-backend-klns.onrender.com
```

Inicie a aplicação:

```bash
npm run dev -- --port 3001
```

Acesse http://localhost:3001.

## Verificações

```bash
npm run lint
npm test
npm run build
```

## Imagens

Formatos aceitos: JPG, PNG e WebP.
Tamanho máximo no web: 4 MB.

## Publicação

Hospedagem na Vercel, com a variável `API_URL` configurada
para o endereço do backend.

## Repositórios

- Web: https://github.com/augustomarim/produtos-web
- Backend: https://github.com/augustomarim/produtos-backend

Os testes automatizados de sessão usam Node.js 24 e respostas simuladas.
Verificam renovação, expiração e coordenação entre abas via Web Locks;
não acessam o backend publicado nem substituem testes no navegador.


## Interface, histórico e desempenho

- Botões permanecem visíveis durante as operações. Somente o produto afetado
  exibe o indicador de alteração; atualizar a lista mantém os dados atuais na tela.
- Busca por nome desde a primeira letra (sem distinguir acentos), filtro de status e escolha de ordenação.
- Ativos sempre antes de inativos, em todas as ordenações. Dentro de cada grupo, a ordem padrão é a última alteração mais recente.
- Datas de criação e alteração no fuso do dispositivo. Datas antigas não
  registradas aparecem como “Não registrada”; elas não são estimadas.
- Layout em tabela no desktop e cartões no celular.
- Componentes compartilhados entre criação/edição e login/cadastro.
- Access token somente em memória, reaproveitado até próximo da expiração.
  A sessão é renovada quando necessário; uma rejeição 401 permite uma única
  renovação e repetição da requisição. Nenhum retry automático ocorre após
  falha de rede numa operação de escrita.
- O logout limpa o access token local. O refresh token continua em cookie HttpOnly.
- Fontes do sistema, sem download de fontes Google durante a compilação.

Aplique primeiro a migração de datas do backend, descrita no README daquele
repositório. A interface aceita temporariamente respostas sem datas durante
a atualização, mas a API nova exige a migração no banco.

### Testes de navegador

Além dos testes unitários, há cenários desktop e mobile com APIs simuladas:

```bash
npx playwright install chromium
npm run test:e2e
```

Esse comando faz o build e abre um servidor de produção local na porta 3411.
Os testes não usam credenciais, não chamam o Render e não alteram o Neon.
Para usar um Chromium já instalado, defina opcionalmente
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` com seu caminho.


## Seleção de produtos e ações em lote

- Checkbox por produto e seleção de todos os produtos visíveis.
- Cabeçalho indeterminado quando apenas parte da lista está selecionada.
- Buscar ou mudar o filtro remove da seleção os produtos que ficaram ocultos;
  limpar a busca não restaura seleções escondidas.
- Até 100 produtos por ação; selecionar todos afeta somente a página atual.
- A barra permite Ativar, Inativar, Excluir e Limpar seleção. Ativar/inativar
  define o estado desejado; nunca usa o toggle individual para um lote.
- Excluir exige confirmação com quantidade, cinco primeiros nomes/códigos e
  a quantidade restante. Durante a requisição, seleção
  e ações conflitantes ficam desabilitadas, sem esconder botões da página.
- Sucesso atualiza os registros retornados e limpa a seleção. Uma falha mantém
  a seleção para revisão; uma resposta com menos afetados informa a contagem
  e sincroniza produtos que já não existiam.
- Uma falha na limpeza de fotos é avisada separadamente do resultado da
  exclusão no banco. Não existe atomicidade entre banco e Cloudinary.

O BFF encaminha `PATCH /api/produtos/status` e `DELETE /api/produtos` ao
backend, com JSON e Bearer Token. Publique o backend com essas rotas antes
de publicar esta interface. Não é necessária uma migração nova.

Os testes de navegador também iniciam um backend falso local na porta 3511
para verificar o BFF. Não alteram o Render nem o Neon.

## Paginação e ações inteligentes

- A barra informa quantos selecionados estão ativos e inativos. Ativar fica
  desabilitado quando todos já estão ativos; Inativar segue a mesma regra.
  Seleções mistas enviam somente IDs que precisam mudar, preservando as datas
  dos demais. O backend também aplica essa proteção.
- Paginação real no servidor, com 10, 25, 50 ou 100 produtos por página. Busca
  e ordenação abrangem todo o catálogo. A API recebe os critérios pelo BFF;
  nenhum termo é usado como SQL livre.
- Busca, filtro, ordem, tamanho e página são preservados no sessionStorage da
  aba ao editar ou recarregar. O logout limpa essas preferências. Seleções
  não são persistidas e são limpas ao mudar de página ou ordenação.
- A busca tem espera de 200 ms e cancela consultas antigas. As contagens
  superiores representam o catálogo completo, não apenas a página visível.

Integre primeiro o backend com consulta paginada e status inteligente e depois
o web. Durante a atualização, o web aceita o array legado e pagina localmente;
a paginação no servidor passa a valer quando o backend é atualizado.
Não há migração nova nesta alteração.
