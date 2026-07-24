# Enunciado — Sistema Integrado de 3 Endpoints com Dashboard e CRUD

## Contexto

Você deve desenvolver um sistema web que integra **três endpoints (APIs/serviços)** distintos, consumidos por um frontend único. O sistema deve conter uma **página de Dashboard** com visão consolidada dos dados e **páginas de CRUD** para os itens de pelo menos um dos endpoints.

Um dos itens gerenciados deve possuir uma **propriedade derivada**: um campo que **muda automaticamente de valor** conforme uma outra informação vinculada a esse item é alterada (ex: em outro endpoint, ou em um relacionamento interno).

---

## Cenário adotado

Sistema de gestão de **Produtos, Estoque e Pedidos**:

| Endpoint | Responsabilidade |
|---|---|
| **1. Produtos** | CRUD de produtos (nome, categoria, preço, status) |
| **2. Estoque** | Controla a quantidade disponível de cada produto |
| **3. Pedidos** | Registra pedidos feitos, vinculando produtos e quantidades |

### Regra da propriedade derivada
O campo **`status`** do produto (endpoint 1) deve mudar automaticamente com base na **quantidade em estoque** (endpoint 2):

- `quantidade > 10` → status = **"Disponível"**
- `1 ≤ quantidade ≤ 10` → status = **"Estoque baixo"**
- `quantidade = 0` → status = **"Indisponível"**

Sempre que a quantidade em estoque de um produto for alterada (via CRUD do endpoint 2, ou por consequência de um novo pedido no endpoint 3), o status do produto deve refletir essa mudança — seja em tempo real, seja no próximo carregamento/consulta.

---

## Requisitos Funcionais

### 1. Dashboard
- Exibir indicadores consolidados cruzando dados dos 3 endpoints (ex: total de produtos, produtos com estoque baixo, pedidos do dia/mês, faturamento estimado).
- Ao menos 1 gráfico (barras, pizza ou linha).
- Atualização dos dados ao recarregar a página.

### 2. CRUD de Itens
- Criar, listar, editar e excluir itens de pelo menos um dos endpoints.
- Validação de campos obrigatórios.
- Feedback visual de sucesso/erro nas operações.
- Listagem com busca e/ou filtro.

### 3. Propriedade Derivada (requisito central)
- O valor derivado **não pode ser editável diretamente pelo usuário** — deve ser sempre calculado a partir da informação vinculada.
- Documentar claramente onde e como esse recálculo acontece.

---

## Requisitos Técnicos

- Os 3 endpoints são simulados com **json-server** a partir do `db.json` desta pasta, com as rotas `/produtos`, `/estoque` e `/pedidos`.
- Frontend consumindo os 3 endpoints via `fetch`.
- Persistência via json-server (arquivo `db.json`).
- Tratamento de erros de comunicação entre endpoints.

## Onde o status derivado é recalculado

A regra (`quantidade > 10` → Disponível, `1–10` → Estoque baixo, `0` → Indisponível) está implementada em `calcularStatus(quantidade)`, duplicada em `js/produtos.js`, `js/estoque.js`, `js/pedidos.js` e `js/dashboard.js` — cada arquivo precisa dela para exibir o status correto sem depender dos outros.

O **valor exibido** nunca vem direto de `/produtos.status`: `produtos.js` e `dashboard.js` sempre recalculam a partir de `/estoque` no momento da busca (`buscarProdutosComStatus`), então o campo `status` do formulário de produto é somente leitura (`disabled`).

O **valor persistido** em `/produtos/:id.status` é gravado via `PATCH` pela função `atualizarStatusProduto`, chamada em dois pontos, sempre depois de a quantidade em estoque mudar:
- `js/estoque.js` → ao criar, editar ou excluir um registro de estoque (excluir conta como quantidade `0`).
- `js/pedidos.js` (dentro de `finalizarPedido`) → ao registrar um pedido com estoque suficiente, depois de abater a quantidade em `/estoque/:id`.

Se o pedido não tem estoque suficiente, `finalizarPedido` grava o pedido com `status: "Cancelado - sem estoque"` e **não** mexe em `/estoque` nem em `/produtos` — é o tratamento de erro do requisito técnico "comunicação entre endpoints".