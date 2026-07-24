// dashboard.js
// 1) Buscar /produtos, /estoque e /pedidos no json-server.
// 2) Calcular os indicadores (total de produtos, estoque baixo, pedidos no mês, faturamento).
// 3) Preencher os elementos #indicadorTotalProdutos, #indicadorEstoqueBaixo, #indicadorPedidosMes, #indicadorFaturamento.
// 4) Montar 3 gráficos com Chart.js: status dos produtos, faturamento por
//    status de pedido e quantidade em estoque por produto.


const API_URL = "http://localhost:3000";

const indicadorTotalProdutos = document.getElementById("indicadorTotalProdutos");
const indicadorEstoqueBaixo = document.getElementById("indicadorEstoqueBaixo");
const indicadorPedidosMes = document.getElementById("indicadorPedidosMes");
const indicadorFaturamento = document.getElementById("indicadorFaturamento");
const alertErroDashboard = document.getElementById("alertErroDashboard");


// Mesma regra de produtos.js / estoque.js / pedidos.js — repetida aqui porque
// o dashboard também precisa saber o status de cada produto pra montar o
// indicador de "estoque baixo" e o gráfico por status.
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
            quantidade: quantidade,
            status: calcularStatus(quantidade)
        };
    });
}


async function buscarPedidos() {
    const resposta = await fetch(API_URL + "/pedidos");
    return resposta.json();
}


function contarPorStatus(produtos, status) {
    return produtos.filter(function (produto) {
        return produto.status === status;
    }).length;
}


function pedidosDoMesAtual(pedidos) {
    const agora = new Date();

    return pedidos.filter(function (pedido) {
        const dataPedido = new Date(pedido.data);
        return (
            dataPedido.getMonth() === agora.getMonth() &&
            dataPedido.getFullYear() === agora.getFullYear()
        );
    });
}


// Faturamento estimado = soma do total de todos os pedidos concluídos
// (pedidos "Cancelado - sem estoque" não entram, pois nunca chegaram a sair do estoque).
function calcularFaturamentoEstimado(pedidos) {
    return pedidos
        .filter(function (pedido) {
            return pedido.status === "Concluído";
        })
        .reduce(function (soma, pedido) {
            return soma + pedido.total;
        }, 0);
}


function formatarMoeda(valor) {
    return "R$ " + valor.toFixed(2).replace(".", ",");
}


function atualizarIndicadores(produtos, pedidos) {
    indicadorTotalProdutos.textContent = produtos.length;
    indicadorEstoqueBaixo.textContent = contarPorStatus(produtos, "Estoque baixo");
    indicadorPedidosMes.textContent = pedidosDoMesAtual(pedidos).length;
    indicadorFaturamento.textContent = formatarMoeda(calcularFaturamentoEstimado(pedidos));
}


function montarGraficoStatus(produtos) {
    const contexto = document.getElementById("graficoStatusProdutos");

    new Chart(contexto, {
        type: "doughnut",
        data: {
            labels: ["Disponível", "Estoque baixo", "Indisponível"],
            datasets: [
                {
                    data: [
                        contarPorStatus(produtos, "Disponível"),
                        contarPorStatus(produtos, "Estoque baixo"),
                        contarPorStatus(produtos, "Indisponível")
                    ],
                    backgroundColor: ["#2f6b3a", "#b8791a", "#a63328"]
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });
}


// Agrupa o total dos pedidos pelo status exato deles (ex: "Concluído",
// "Pendente", "Cancelado - sem estoque"), na ordem em que aparecem.
function agruparFaturamentoPorStatus(pedidos) {
    const totaisPorStatus = new Map();

    pedidos.forEach(function (pedido) {
        const totalAtual = totaisPorStatus.get(pedido.status) || 0;
        totaisPorStatus.set(pedido.status, totalAtual + pedido.total);
    });

    return {
        labels: Array.from(totaisPorStatus.keys()),
        valores: Array.from(totaisPorStatus.values())
    };
}


function corDoStatusPedido(status) {
    if (status === "Concluído") {
        return "#2f6b3a";
    }
    if (status === "Pendente") {
        return "#b8791a";
    }
    return "#a63328";
}


function corDoStatusProduto(status) {
    if (status === "Disponível") {
        return "#2f6b3a";
    }
    if (status === "Estoque baixo") {
        return "#b8791a";
    }
    return "#a63328";
}


function montarGraficoFaturamento(pedidos) {
    const contexto = document.getElementById("graficoFaturamento");
    const agrupado = agruparFaturamentoPorStatus(pedidos);

    new Chart(contexto, {
        type: "bar",
        data: {
            labels: agrupado.labels,
            datasets: [
                {
                    label: "Faturamento (R$)",
                    data: agrupado.valores,
                    backgroundColor: agrupado.labels.map(corDoStatusPedido)
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}


function montarGraficoEstoque(produtos) {
    const contexto = document.getElementById("graficoEstoque");

    new Chart(contexto, {
        type: "bar",
        data: {
            labels: produtos.map(function (produto) {
                return produto.nome;
            }),
            datasets: [
                {
                    label: "Quantidade em estoque",
                    data: produtos.map(function (produto) {
                        return produto.quantidade;
                    }),
                    backgroundColor: produtos.map(function (produto) {
                        return corDoStatusProduto(produto.status);
                    })
                }
            ]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}


async function carregarDashboard() {
    try {
        const [produtos, pedidos] = await Promise.all([
            buscarProdutosComStatus(),
            buscarPedidos()
        ]);

        atualizarIndicadores(produtos, pedidos);
        montarGraficoStatus(produtos);
        montarGraficoFaturamento(pedidos);
        montarGraficoEstoque(produtos);
    } catch (erro) {
        alertErroDashboard.textContent = "Não foi possível carregar os dados do dashboard. Verifique se o json-server está rodando.";
        alertErroDashboard.classList.remove("d-none");
    }
}


document.addEventListener("DOMContentLoaded", carregarDashboard);
