// pedidos.js
// 1) Buscar /produtos (para o <select id="pedidoProdutoId">) e /pedidos (para a tabela).
// 2) Renderizar a tabela em #corpoTabelaPedidos.
// 3) Ao registrar um pedido (#formPedido): criar em /pedidos, reduzir a quantidade em /estoque do produto e recalcular o status em /produtos.
// 4) Tratar erro caso não haja estoque suficiente.
// 5) Mostrar feedback em #alertSucessoPedido / #alertErroPedido.


const API_URL = "http://localhost:3000";

const formPedido = document.getElementById("formPedido");
const pedidoClienteInput = document.getElementById("pedidoCliente");
const pedidoProdutoIdSelect = document.getElementById("pedidoProdutoId");
const pedidoQuantidadeInput = document.getElementById("pedidoQuantidade");

const corpoTabelaPedidos = document.getElementById("corpoTabelaPedidos");
const alertSucesso = document.getElementById("alertSucessoPedido");
const alertErro = document.getElementById("alertErroPedido");
const alertSemPedidos = document.getElementById("alertSemPedidos");

let todosProdutos = [];
let todoEstoque = [];


// Mesma regra de produtos.js / estoque.js. Precisa estar aqui de novo porque,
// ao registrar um pedido, também abatemos a quantidade em estoque e recalculamos
// o status do produto correspondente (ver finalizarPedido mais abaixo).
function calcularStatus(quantidade) {
    if (quantidade === 0) {
        return "Indisponível";
    }
    if (quantidade <= 10) {
        return "Estoque baixo";
    }
    return "Disponível";
}


async function carregarDadosBase() {
    const [respostaProdutos, respostaEstoque] = await Promise.all([
        fetch(API_URL + "/produtos"),
        fetch(API_URL + "/estoque")
    ]);

    todosProdutos = await respostaProdutos.json();
    todoEstoque = await respostaEstoque.json();
}


function preencherSelectProdutos() {
    pedidoProdutoIdSelect.innerHTML = "<option value='' selected disabled>Selecione um produto</option>";

    todosProdutos.forEach(function (produto) {
        const opcao = document.createElement("option");
        opcao.value = produto.id;
        opcao.textContent = produto.nome;
        pedidoProdutoIdSelect.appendChild(opcao);
    });
}


function nomeDoProduto(produtoId) {
    const produto = todosProdutos.find(function (item) {
        return item.id === produtoId;
    });
    return produto ? produto.nome : "Produto não encontrado";
}


function resumoItens(itens) {
    return itens
        .map(function (item) {
            return nomeDoProduto(item.produtoId) + " (x" + item.quantidade + ")";
        })
        .join(", ");
}


function formatarData(isoString) {
    const data = new Date(isoString);
    return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}


function classeBadgePedido(status) {
    if (status === "Concluído") {
        return "badge-disponivel";
    }
    if (status === "Pendente") {
        return "badge-baixo";
    }
    return "badge-indisponivel";
}


async function buscarPedidos() {
    const resposta = await fetch(API_URL + "/pedidos");
    return resposta.json();
}


function renderizarTabela(pedidos) {
    corpoTabelaPedidos.innerHTML = "";

    if (pedidos.length === 0) {
        alertSemPedidos.classList.remove("d-none");
        return;
    }
    alertSemPedidos.classList.add("d-none");

    pedidos.forEach(function (pedido) {
        const linha = document.createElement("tr");
        linha.innerHTML =
            "<td>" + pedido.cliente + "</td>" +
            "<td>" + formatarData(pedido.data) + "</td>" +
            "<td>" + resumoItens(pedido.itens) + "</td>" +
            "<td>R$ " + pedido.total.toFixed(2).replace(".", ",") + "</td>" +
            "<td><span class='badge badge-status " + classeBadgePedido(pedido.status) + "'>" + pedido.status + "</span></td>" +
            "<td class='tabela-acoes'>" +
            "<button type='button' class='btn btn-sm btn-outline-danger' data-excluir='" + pedido.id + "'>Excluir</button>" +
            "</td>";
        corpoTabelaPedidos.appendChild(linha);
    });
}


async function carregarPedidos() {
    await carregarDadosBase();
    preencherSelectProdutos();

    const pedidos = await buscarPedidos();
    renderizarTabela(pedidos);
}


function mostrarAlerta(elemento, mensagem) {
    elemento.textContent = mensagem;
    elemento.classList.remove("d-none");
    setTimeout(function () {
        elemento.classList.add("d-none");
    }, 3000);
}


// Cria o pedido e, se houver estoque suficiente, abate a quantidade e recalcula
// o status do produto. Se não houver, o pedido ainda é registrado, mas marcado
// como "Cancelado - sem estoque" — é o tratamento de erro exigido pelo enunciado.
async function finalizarPedido(cliente, produtoId, quantidade) {
    const produto = todosProdutos.find(function (item) {
        return item.id === produtoId;
    });

    const registroEstoque = todoEstoque.find(function (item) {
        return item.produtoId === produtoId;
    });

    const quantidadeDisponivel = registroEstoque ? registroEstoque.quantidade : 0;
    const estoqueSuficiente = quantidadeDisponivel >= quantidade;

    const pedido = {
        cliente: cliente,
        data: new Date().toISOString(),
        itens: [
            { produtoId: produtoId, quantidade: quantidade, precoUnitario: produto.preco }
        ],
        total: quantidade * produto.preco,
        status: estoqueSuficiente ? "Concluído" : "Cancelado - sem estoque"
    };

    await fetch(API_URL + "/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido)
    });

    if (!estoqueSuficiente) {
        return { sucesso: false };
    }

    const novaQuantidade = quantidadeDisponivel - quantidade;

    await fetch(API_URL + "/estoque/" + registroEstoque.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade: novaQuantidade, atualizadoEm: new Date().toISOString() })
    });

    await fetch(API_URL + "/produtos/" + produtoId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: calcularStatus(novaQuantidade) })
    });

    return { sucesso: true };
}


formPedido.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!formPedido.checkValidity()) {
        formPedido.classList.add("was-validated");
        return;
    }

    const cliente = pedidoClienteInput.value.trim();
    const produtoId = pedidoProdutoIdSelect.value;
    const quantidade = parseInt(pedidoQuantidadeInput.value, 10);

    try {
        const resultado = await finalizarPedido(cliente, produtoId, quantidade);

        if (resultado.sucesso) {
            mostrarAlerta(alertSucesso, "Pedido registrado com sucesso!");
        } else {
            mostrarAlerta(alertErro, "Estoque insuficiente — pedido registrado como cancelado.");
        }

        formPedido.reset();
        formPedido.classList.remove("was-validated");
        carregarPedidos();
    } catch (erro) {
        mostrarAlerta(alertErro, "Erro ao registrar pedido. Tente novamente.");
    }
});


corpoTabelaPedidos.addEventListener("click", async function (evento) {
    const idParaExcluir = evento.target.dataset.excluir;
    if (!idParaExcluir) {
        return;
    }

    const confirmou = confirm("Tem certeza que deseja excluir este pedido?");
    if (!confirmou) {
        return;
    }

    try {
        await fetch(API_URL + "/pedidos/" + idParaExcluir, { method: "DELETE" });
        mostrarAlerta(alertSucesso, "Pedido excluído com sucesso!");
        carregarPedidos();
    } catch (erro) {
        mostrarAlerta(alertErro, "Erro ao excluir pedido.");
    }
});


document.addEventListener("DOMContentLoaded", carregarPedidos);
