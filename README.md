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
