// produtos.js
// 1) Buscar /produtos e /estoque para calcular o status derivado de cada produto.
// 2) Renderizar a tabela em #corpoTabelaProdutos (respeitando os filtros de nome e status).
// 3) Criar/editar produto via #formProduto (POST/PUT em /produtos) — sem permitir editar o status.
// 4) Excluir produto (DELETE em /produtos/:id).
// 5) Mostrar feedback em #alertSucessoProduto / #alertErroProduto.


const API_URL = "http://localhost:3000";

const formProduto = document.getElementById("formProduto");
const produtoIdInput = document.getElementById("produtoId");
const produtoNomeInput = document.getElementById("produtoNome");
const produtoCategoriaInput = document.getElementById("produtoCategoria");
const produtoPrecoInput = document.getElementById("produtoPreco");
const produtoStatusInput = document.getElementById("produtoStatus");

const corpoTabelaProdutos = document.getElementById("corpoTabelaProdutos");
const alertSucesso = document.getElementById("alertSucessoProduto");
const alertErro = document.getElementById("alertErroProduto");
const alertSemProdutos = document.getElementById("alertSemProdutos");

const filtroNomeProduto = document.getElementById("filtroNomeProduto");
const filtroStatusProduto = document.getElementById("filtroStatusProduto");

const tituloFormProduto = document.getElementById("tituloFormProduto");
const btnSalvarProduto = document.getElementById("btnSalvarProduto");
const btnCancelarEdicaoProduto = document.getElementById("btnCancelarEdicaoProduto");

let todosProdutos = [];


function calcularStatus(quantidade) {
    if (quantidade === 0) {
        return "Indisponível";
    }
    if (quantidade <= 10) {
        return "Estoque baixo";
    }
    return "Disponível";
}


async function buscarProdutosComStatus() {
    const [respostaProdutos, respostaEstoque] = await Promise.all([
        fetch(API_URL + "/produtos"),
        fetch(API_URL + "/estoque")
    ]);

    const produtos = await respostaProdutos.json();
    const estoque = await respostaEstoque.json();

    return produtos.map(function (produto) {
        const registroEstoque = estoque.find(function (item) {
            return item.produtoId === produto.id;
        });

        const quantidade = registroEstoque ? registroEstoque.quantidade : 0;

        return {
            ...produto,
            status: calcularStatus(quantidade)
        };
    });
}


function classeBadge(status) {
    if (status === "Disponível") {
        return "badge-disponivel";
    }
    if (status === "Estoque baixo") {
        return "badge-baixo";
    }
    return "badge-indisponivel";
}


function renderizarTabela(produtos) {
    corpoTabelaProdutos.innerHTML = "";

    if (produtos.length === 0) {
        alertSemProdutos.classList.remove("d-none");
        return;
    }
    alertSemProdutos.classList.add("d-none");

    produtos.forEach(function (produto) {
        const linha = document.createElement("tr");
        linha.innerHTML =
            "<td>" + produto.nome + "</td>" +
            "<td>" + produto.categoria + "</td>" +
            "<td>R$ " + produto.preco.toFixed(2).replace(".", ",") + "</td>" +
            "<td><span class='badge badge-status " + classeBadge(produto.status) + "'>" + produto.status + "</span></td>" +
            "<td class='tabela-acoes'>" +
            "<button type='button' class='btn btn-sm btn-outline-primary' data-editar='" + produto.id + "'>Editar</button>" +
            "<button type='button' class='btn btn-sm btn-outline-danger' data-excluir='" + produto.id + "'>Excluir</button>" +
            "</td>";
        corpoTabelaProdutos.appendChild(linha);
    });
}


function aplicarFiltros() {
    const termoNome = filtroNomeProduto.value.trim().toLowerCase();
    const statusSelecionado = filtroStatusProduto.value;

    const produtosFiltrados = todosProdutos.filter(function (produto) {
        const bateNome = produto.nome.toLowerCase().includes(termoNome);
        const bateStatus = statusSelecionado === "" || produto.status === statusSelecionado;
        return bateNome && bateStatus;
    });

    renderizarTabela(produtosFiltrados);
}


async function carregarProdutos() {
    todosProdutos = await buscarProdutosComStatus();
    aplicarFiltros();
}


function mostrarAlerta(elemento, mensagem) {
    elemento.textContent = mensagem;
    elemento.classList.remove("d-none");
    setTimeout(function () {
        elemento.classList.add("d-none");
    }, 3000);
}


function limparFormulario() {
    formProduto.reset();
    formProduto.classList.remove("was-validated");
    produtoIdInput.value = "";
    produtoStatusInput.value = "";
    tituloFormProduto.textContent = "Novo Produto";
    btnSalvarProduto.textContent = "Cadastrar Produto";
    btnCancelarEdicaoProduto.classList.add("d-none");
}


formProduto.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!formProduto.checkValidity()) {
        formProduto.classList.add("was-validated");
        return;
    }

    const id = produtoIdInput.value;

    const dadosProduto = {
        nome: produtoNomeInput.value.trim(),
        categoria: produtoCategoriaInput.value.trim(),
        preco: parseFloat(produtoPrecoInput.value)
    };

    try {
        if (id) {
            await fetch(API_URL + "/produtos/" + id, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: id, ...dadosProduto })
            });
        } else {
            await fetch(API_URL + "/produtos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosProduto)
            });
        }

        mostrarAlerta(alertSucesso, "Produto salvo com sucesso!");
        limparFormulario();
        carregarProdutos();
    } catch (erro) {
        mostrarAlerta(alertErro, "Erro ao salvar produto. Tente novamente.");
    }
});


corpoTabelaProdutos.addEventListener("click", async function (evento) {
    const idParaEditar = evento.target.dataset.editar;
    const idParaExcluir = evento.target.dataset.excluir;

    if (idParaEditar) {
        const produto = todosProdutos.find(function (item) {
            return item.id === idParaEditar;
        });
        if (!produto) {
            return;
        }

        produtoIdInput.value = produto.id;
        produtoNomeInput.value = produto.nome;
        produtoCategoriaInput.value = produto.categoria;
        produtoPrecoInput.value = produto.preco;
        produtoStatusInput.value = produto.status;

        tituloFormProduto.textContent = "Editar Produto";
        btnSalvarProduto.textContent = "Salvar Alterações";
        btnCancelarEdicaoProduto.classList.remove("d-none");
    }

    if (idParaExcluir) {
        const confirmou = confirm("Tem certeza que deseja excluir este produto?");
        if (!confirmou) {
            return;
        }

        try {
            await fetch(API_URL + "/produtos/" + idParaExcluir, { method: "DELETE" });
            mostrarAlerta(alertSucesso, "Produto excluído com sucesso!");
            carregarProdutos();
        } catch (erro) {
            mostrarAlerta(alertErro, "Erro ao excluir produto.");
        }
    }
});


btnCancelarEdicaoProduto.addEventListener("click", limparFormulario);
filtroNomeProduto.addEventListener("input", aplicarFiltros);
filtroStatusProduto.addEventListener("change", aplicarFiltros);

document.addEventListener("DOMContentLoaded", carregarProdutos);
