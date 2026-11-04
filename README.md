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
