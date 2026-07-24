// estoque.js
// 1) Buscar /produtos (para o <select id="estoqueProdutoId">) e /estoque (para a tabela).
// 2) Renderizar a tabela em #corpoTabelaEstoque, mostrando o status resultante (regra: >10 Disponível, 1-10 Estoque baixo, 0 Indisponível).
// 3) Criar/editar registro via #formEstoque (POST/PUT em /estoque).
// 4) Sempre que a quantidade mudar, recalcular e salvar (PATCH) o status do produto correspondente em /produtos/:id.
// 5) Excluir registro (DELETE em /estoque/:id).


const API_URL = "http://localhost:3000";

const formEstoque = document.getElementById("formEstoque");
const estoqueIdInput = document.getElementById("estoqueId");
const estoqueProdutoIdSelect = document.getElementById("estoqueProdutoId");
const estoqueQuantidadeInput = document.getElementById("estoqueQuantidade");

const corpoTabelaEstoque = document.getElementById("corpoTabelaEstoque");
const alertSucesso = document.getElementById("alertSucessoEstoque");
const alertErro = document.getElementById("alertErroEstoque");
const alertSemEstoque = document.getElementById("alertSemEstoque");
const filtroProdutoEstoque = document.getElementById("filtroProdutoEstoque");

const tituloFormEstoque = document.getElementById("tituloFormEstoque");
const btnSalvarEstoque = document.getElementById("btnSalvarEstoque");
const btnCancelarEdicaoEstoque = document.getElementById("btnCancelarEdicaoEstoque");

let todosProdutos = [];
let todoEstoqueComProduto = [];


// Mesma regra usada em produtos.js. Está duplicada aqui de propósito: é a partir
// desta função, chamada sempre que a quantidade em estoque muda, que o status do
// produto correspondente é recalculado e gravado em /produtos/:id (ver
// atualizarStatusProduto mais abaixo).
function calcularStatus(quantidade) {
    if (quantidade === 0) {
        return "Indisponível";
    }
    if (quantidade <= 10) {
        return "Estoque baixo";
    }
    return "Disponível";
}


async function buscarProdutos() {
    const resposta = await fetch(API_URL + "/produtos");
    return resposta.json();
}


// Ao cadastrar um NOVO registro, produtos que já têm estoque não aparecem
// no select — isso evita duas linhas de /estoque para o mesmo produto (o que
// deixaria o status derivado ambíguo). "produtoIdParaManter" é usado ao editar
// um registro existente, pra garantir que o próprio produto dele continue
// aparecendo como opção.
function preencherSelectProdutos(produtoIdParaManter) {
    const produtosComEstoque = new Set(
        todoEstoqueComProduto.map(function (registro) {
            return registro.produtoId;
        })
    );

    estoqueProdutoIdSelect.innerHTML = "<option value='' selected disabled>Selecione um produto</option>";

    todosProdutos.forEach(function (produto) {
        const jaTemEstoque = produtosComEstoque.has(produto.id) && produto.id !== produtoIdParaManter;
        if (jaTemEstoque) {
            return;
        }

        const opcao = document.createElement("option");
        opcao.value = produto.id;
        opcao.textContent = produto.nome;
        estoqueProdutoIdSelect.appendChild(opcao);
    });
}


async function buscarEstoqueComProduto() {
    const resposta = await fetch(API_URL + "/estoque");
    const estoque = await resposta.json();

    return estoque.map(function (registro) {
        const produto = todosProdutos.find(function (item) {
            return item.id === registro.produtoId;
        });

        return {
            ...registro,
            nomeProduto: produto ? produto.nome : "Produto não encontrado",
            status: calcularStatus(registro.quantidade)
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


function formatarData(isoString) {
    const data = new Date(isoString);
    return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}


function renderizarTabela(lista) {
    corpoTabelaEstoque.innerHTML = "";

    if (lista.length === 0) {
        alertSemEstoque.classList.remove("d-none");
        return;
    }
    alertSemEstoque.classList.add("d-none");

    lista.forEach(function (registro) {
        const linha = document.createElement("tr");
        linha.innerHTML =
            "<td>" + registro.nomeProduto + "</td>" +
            "<td>" + registro.quantidade + "</td>" +
            "<td><span class='badge badge-status " + classeBadge(registro.status) + "'>" + registro.status + "</span></td>" +
            "<td>" + formatarData(registro.atualizadoEm) + "</td>" +
            "<td class='tabela-acoes'>" +
            "<button type='button' class='btn btn-sm btn-outline-primary' data-editar='" + registro.id + "'>Editar</button>" +
            "<button type='button' class='btn btn-sm btn-outline-danger' data-excluir='" + registro.id + "'>Excluir</button>" +
            "</td>";
        corpoTabelaEstoque.appendChild(linha);
    });
}


function aplicarFiltro() {
    const termo = filtroProdutoEstoque.value.trim().toLowerCase();

    const filtrado = todoEstoqueComProduto.filter(function (registro) {
        return registro.nomeProduto.toLowerCase().includes(termo);
    });

    renderizarTabela(filtrado);
}


async function carregarEstoque() {
    todosProdutos = await buscarProdutos();
    todoEstoqueComProduto = await buscarEstoqueComProduto();

    preencherSelectProdutos();
    aplicarFiltro();
}


// Recalcula o status a partir da quantidade e grava no produto correspondente.
// É esta chamada (PATCH em /produtos/:id) que faz a propriedade derivada do
// enunciado existir de fato no endpoint 1, e não só na tela.
async function atualizarStatusProduto(produtoId, quantidade) {
    const status = calcularStatus(quantidade);
    await fetch(API_URL + "/produtos/" + produtoId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status })
    });
}


function mostrarAlerta(elemento, mensagem) {
    elemento.textContent = mensagem;
    elemento.classList.remove("d-none");
    setTimeout(function () {
        elemento.classList.add("d-none");
    }, 3000);
}


function limparFormulario() {
    formEstoque.reset();
    formEstoque.classList.remove("was-validated");
    estoqueIdInput.value = "";
    tituloFormEstoque.textContent = "Novo Registro de Estoque";
    btnSalvarEstoque.textContent = "Salvar Estoque";
    btnCancelarEdicaoEstoque.classList.add("d-none");
    preencherSelectProdutos();
}


formEstoque.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!formEstoque.checkValidity()) {
        formEstoque.classList.add("was-validated");
        return;
    }

    const id = estoqueIdInput.value;
    const produtoId = estoqueProdutoIdSelect.value;
    const quantidade = parseInt(estoqueQuantidadeInput.value, 10);

    const dadosEstoque = {
        produtoId: produtoId,
        quantidade: quantidade,
        atualizadoEm: new Date().toISOString()
    };

    try {
        if (id) {
            await fetch(API_URL + "/estoque/" + id, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: id, ...dadosEstoque })
            });
        } else {
            await fetch(API_URL + "/estoque", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosEstoque)
            });
        }

        await atualizarStatusProduto(produtoId, quantidade);

        mostrarAlerta(alertSucesso, "Estoque salvo com sucesso!");
        limparFormulario();
        carregarEstoque();
    } catch (erro) {
        mostrarAlerta(alertErro, "Erro ao salvar estoque. Tente novamente.");
    }
});


corpoTabelaEstoque.addEventListener("click", async function (evento) {
    const idParaEditar = evento.target.dataset.editar;
    const idParaExcluir = evento.target.dataset.excluir;

    if (idParaEditar) {
        const registro = todoEstoqueComProduto.find(function (item) {
            return item.id === idParaEditar;
        });
        if (!registro) {
            return;
        }

        preencherSelectProdutos(registro.produtoId);

        estoqueIdInput.value = registro.id;
        estoqueProdutoIdSelect.value = registro.produtoId;
        estoqueQuantidadeInput.value = registro.quantidade;

        tituloFormEstoque.textContent = "Editar Registro de Estoque";
        btnSalvarEstoque.textContent = "Salvar Alterações";
        btnCancelarEdicaoEstoque.classList.remove("d-none");
    }

    if (idParaExcluir) {
        const confirmou = confirm("Tem certeza que deseja excluir este registro de estoque?");
        if (!confirmou) {
            return;
        }

        const registro = todoEstoqueComProduto.find(function (item) {
            return item.id === idParaExcluir;
        });

        try {
            await fetch(API_URL + "/estoque/" + idParaExcluir, { method: "DELETE" });

            if (registro) {
                await atualizarStatusProduto(registro.produtoId, 0);
            }

            mostrarAlerta(alertSucesso, "Registro excluído com sucesso!");
            carregarEstoque();
        } catch (erro) {
            mostrarAlerta(alertErro, "Erro ao excluir registro.");
        }
    }
});


btnCancelarEdicaoEstoque.addEventListener("click", limparFormulario);
filtroProdutoEstoque.addEventListener("input", aplicarFiltro);

document.addEventListener("DOMContentLoaded", carregarEstoque);
