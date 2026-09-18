# Produtos, Estoque e Pedidos

Sistema web que integra três recursos (produtos, estoque e pedidos) simulados por uma API REST fake, com uma página de **Dashboard** consolidando indicadores e gráficos e páginas de **CRUD** para cada entidade. O destaque do projeto é o **status do produto como propriedade derivada**: ele nunca é digitado pelo usuário, é sempre recalculado a partir da quantidade em estoque, seja num cadastro de estoque, numa edição, numa exclusão ou na finalização de um pedido.

## Stack

- **HTML5 + CSS3** — páginas estáticas (`produtos.html`, `estoque.html`, `pedidos.html`, `dashboard.html`)
- **JavaScript (vanilla, ES6+)** — um arquivo por página (`js/produtos.js`, `js/estoque.js`, `js/pedidos.js`, `js/dashboard.js`), consumindo a API via `fetch`
- **Bootstrap 5.3.3** (CDN) — layout e componentes visuais
- **Chart.js 4.5.0** (CDN) — gráficos do dashboard
- **json-server** — API REST fake que serve o arquivo `db.json`, expondo as rotas `/produtos`, `/estoque` e `/pedidos`

Não há backend próprio nem `package.json`: os "endpoints" são fornecidos pelo `json-server` a partir do `db.json`.

## Entidades

| Entidade | Descrição |
|---|---|
| **Produtos** | Nome, categoria, preço e `status` (somente leitura no formulário — é sempre calculado, nunca editado à mão) |
| **Estoque** | Quantidade disponível de cada produto e data da última atualização. Cada produto tem no máximo um registro de estoque |
| **Pedidos** | Cliente, data, itens (produto + quantidade + preço unitário), total e status (`Concluído`, `Pendente` ou `Cancelado - sem estoque`) |

### A propriedade derivada: `produto.status`

A regra é a mesma em todo o sistema:

- quantidade `> 10` → **Disponível**
- quantidade entre `1` e `10` → **Estoque baixo**
- quantidade `= 0` → **Indisponível**

O valor **exibido** em `produtos.html` e no dashboard nunca vem direto de `/produtos`: ele é sempre recalculado no momento da busca, cruzando `/produtos` com `/estoque` (função `buscarProdutosComStatus`). Por isso o campo status do formulário de produto fica desabilitado.

O valor **persistido** em `/produtos/:id.status` é gravado via `PATCH` (função `atualizarStatusProduto`) sempre que a quantidade em estoque muda:

- em `js/estoque.js`, ao criar, editar ou excluir um registro de estoque (excluir conta como quantidade `0`);
- em `js/pedidos.js`, dentro de `finalizarPedido`, depois de abater a quantidade em `/estoque/:id` ao concluir um pedido.

Se um pedido não tem estoque suficiente, ele é registrado com `status: "Cancelado - sem estoque"` e nada é alterado em `/estoque` ou `/produtos` — é o tratamento de erro de comunicação entre os recursos.

## Dashboard

A página `dashboard.html` cruza dados de produtos, estoque e pedidos para mostrar:

- total de produtos, produtos com estoque baixo, pedidos no mês atual e faturamento estimado (soma dos pedidos `Concluído`);
- gráfico de rosca com a distribuição de produtos por status;
- gráfico de barras com o faturamento agrupado por status de pedido;
- gráfico de barras horizontais com a quantidade em estoque por produto.

## Como rodar

Este projeto não tem backend próprio; o `json-server` simula a API a partir do `db.json`.

1. Instale o json-server (globalmente ou via `npx`):
   ```bash
   npm install -g json-server
   ```
2. Na raiz do projeto, suba a API fake na porta 3000:
   ```bash
   json-server --watch db.json --port 3000
   ```
   (ou, sem instalar globalmente: `npx json-server --watch db.json --port 3000`)
3. Abra `produtos.html`, `estoque.html`, `pedidos.html` ou `dashboard.html` diretamente no navegador (ou sirva a pasta com uma extensão como Live Server). O frontend espera a API em `http://localhost:3000`.

## Rotas consumidas (json-server)

| Método | Rota | Uso |
|---|---|---|
| GET | `/produtos` | Listar produtos |
| POST | `/produtos` | Criar produto |
| PUT | `/produtos/:id` | Editar produto |
| PATCH | `/produtos/:id` | Atualizar apenas o `status` (propriedade derivada) |
| DELETE | `/produtos/:id` | Excluir produto |
| GET | `/estoque` | Listar registros de estoque |
| POST | `/estoque` | Criar registro de estoque |
| PUT | `/estoque/:id` | Editar registro de estoque |
| PATCH | `/estoque/:id` | Atualizar quantidade (ex: ao finalizar um pedido) |
| DELETE | `/estoque/:id` | Excluir registro de estoque |
| GET | `/pedidos` | Listar pedidos |
| POST | `/pedidos` | Registrar pedido |
| DELETE | `/pedidos/:id` | Excluir pedido |

## Estrutura do projeto

```
├── produtos.html / js/produtos.js     # CRUD de produtos
├── estoque.html   / js/estoque.js     # CRUD de estoque
├── pedidos.html   / js/pedidos.js     # Registro e listagem de pedidos
├── dashboard.html / js/dashboard.js   # Indicadores e gráficos
├── css/style.css                      # Estilos customizados
├── db.json                            # Dados servidos pelo json-server
└── enunciado.md                       # Especificação original do exercício
```
