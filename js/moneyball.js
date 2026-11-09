// ============================================================
// ALGORITMO MONEYBALL - FM21
// ============================================================

function limitarPontuacao(valor) {
    return Math.max(0, Math.min(100, valor));
}

function arredondar(valor) {
    return Math.round(valor * 10) / 10;
}

// ============================================================
// NORMALIZAÇÃO DAS MÉTRICAS
// ============================================================

// Transforma uma métrica em nota de 0 a 100.
// maior = true: quanto maior o valor, melhor.
// maior = false: quanto menor o valor, melhor.
function normalizarMetrica(valor, referencia, maior = true) {
    if (
        valor === null ||
        valor === undefined ||
        Number.isNaN(Number(valor))
    ) {
        return null;
    }

    let nota = (Number(valor) / referencia) * 100;

    if (!maior) {
        nota = 100 - nota;
    }

    return limitarPontuacao(nota);
}

// Calcula uma média ponderada ignorando métricas ausentes.
function calcularMediaPonderada(metricas) {
    let somaNotas = 0;
    let somaPesos = 0;

    metricas.forEach(metrica => {
        if (metrica.nota === null || metrica.nota === undefined) {
            return;
        }

        somaNotas += metrica.nota * metrica.peso;
        somaPesos += metrica.peso;
    });

    if (somaPesos === 0) return null;

    return somaNotas / somaPesos;
}

// ============================================================
// SCORE DE DESEMPENHO POR CATEGORIA
// ============================================================

function calcularScoreGoleiro(p) {
    return calcularMediaPonderada([
        {
            nota: normalizarMetrica(p.clMed, 8.0),
            peso: 35
        },
        {
            // Menos gols sofridos por 90 minutos é melhor.
            nota: normalizarMetrica(p.sof90, 1.0, false),
            peso: 30
        },
        {
            nota: normalizarMetrica(p.percPenDef, 50),
            peso: 20
        },
        {
            nota: normalizarMetrica(p.consistencia, 20),
            peso: 10
        },
        {
            nota: normalizarMetrica(p.penDefendidos, 5),
            peso: 5
        }
    ]);
}

function calcularScoreDefensor(p) {
    return calcularMediaPonderada([
        {
            nota: normalizarMetrica(p.clMed, 8.0),
            peso: 30
        },
        {
            nota: normalizarMetrica(p.des, 5),
            peso: 25
        },
        {
            nota: normalizarMetrica(p.mDes, 80),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.psC, 90),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.consistencia, 20),
            peso: 10
        },
        {
            // Cartões vermelhos são penalizados.
            nota: normalizarMetrica(p.vermelhos, 3, false),
            peso: 5
        }
    ]);
}

function calcularScoreMeioCampista(p) {
    return calcularMediaPonderada([
        {
            nota: normalizarMetrica(p.clMed, 8.0),
            peso: 25
        },
        {
            nota: normalizarMetrica(p.psC, 90),
            peso: 20
        },
        {
            nota: normalizarMetrica(p.gls90, 0.5),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.xg, 10),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.des, 5),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.consistencia, 20),
            peso: 10
        }
    ]);
}

function calcularScoreAtacante(p) {
    return calcularMediaPonderada([
        {
            nota: normalizarMetrica(p.clMed, 8.0),
            peso: 25
        },
        {
            nota: normalizarMetrica(p.gls90, 0.8),
            peso: 25
        },
        {
            nota: normalizarMetrica(p.xg, 15),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.assis90, 0.5),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.ast, 15),
            peso: 10
        },
        {
            nota: normalizarMetrica(p.consistencia, 20),
            peso: 10
        }
    ]);
}

// ============================================================
// SELEÇÃO DO CÁLCULO POR CATEGORIA
// ============================================================

function calcularScoreDesempenho(p) {
    let resultado = null;

    switch (p.categoria) {
        case 'goleiro':
            resultado = calcularScoreGoleiro(p);
            break;

        case 'defensor':
            resultado = calcularScoreDefensor(p);
            break;

        case 'meio-campista':
            resultado = calcularScoreMeioCampista(p);
            break;

        case 'atacante':
            resultado = calcularScoreAtacante(p);
            break;

        default:
            // Compatibilidade com análises antigas.
            resultado = calcularMediaPonderada([
                {
                    nota: normalizarMetrica(p.clMed, 8.0),
                    peso: 50
                },
                {
                    nota: normalizarMetrica(p.gls90, 0.8),
                    peso: 25
                },
                {
                    nota: normalizarMetrica(p.xg, 10),
                    peso: 15
                },
                {
                    nota: normalizarMetrica(p.hdj, 10),
                    peso: 10
                }
            ]);
    }

    // Sem estatísticas suficientes, não inventa uma nota.
    return resultado === null ? 50 : limitarPontuacao(resultado);
}

// ============================================================
// SCORE FINANCEIRO
// ============================================================

function calcularScoreFinanceiro(p) {
    let scoreValor = 50;

    if (p.valorNumerico !== null && p.valorNumerico !== undefined) {
        const valor = p.valorNumerico;

        if (valor === 0) {
            scoreValor = 100;
        } else if (valor <= 1000000) {
            scoreValor = 95;
        } else if (valor <= 3000000) {
            scoreValor = 90;
        } else if (valor <= 5000000) {
            scoreValor = 82;
        } else if (valor <= 8000000) {
            scoreValor = 75;
        } else if (valor <= 15000000) {
            scoreValor = 65;
        } else if (valor <= 25000000) {
            scoreValor = 50;
        } else if (valor <= 50000000) {
            scoreValor = 35;
        } else {
            scoreValor = 20;
        }
    }

    // Idade só influencia a avaliação financeira.
    // Ela não reduz a nota de desempenho esportivo.
    let scoreIdade = null;

    if (p.idade !== null && p.idade !== undefined) {
        if (p.idade <= 21) {
            scoreIdade = 100;
        } else if (p.idade <= 24) {
            scoreIdade = 90;
        } else if (p.idade <= 27) {
            scoreIdade = 80;
        } else if (p.idade <= 30) {
            scoreIdade = 65;
        } else if (p.idade <= 33) {
            scoreIdade = 45;
        } else {
            scoreIdade = 30;
        }
    }

    const metricas = [
        {
            nota: scoreValor,
            peso: 75
        },
        {
            nota: scoreIdade,
            peso: 25
        }
    ];

    return arredondar(calcularMediaPonderada(metricas));
}

// ============================================================
// SCORE FINAL MONEYBALL
// ============================================================

function calculateMoneyballScore(p) {
    const desempenho = calcularScoreDesempenho(p);
    const financeiro = calcularScoreFinanceiro(p);

    // O desempenho tem maior influência no resultado final.
    const scoreFinal =
        (desempenho * 0.75) +
        (financeiro * 0.25);

    return arredondar(limitarPontuacao(scoreFinal));
}

// ============================================================
// CLASSIFICAÇÃO VISUAL
// ============================================================

function getScoreClass(score) {
    if (score <= 40) return 'score-red';
    if (score <= 55) return 'score-orange';
    if (score <= 70) return 'score-yellow';

    return 'score-green';
}

// ============================================================
// RECOMENDAÇÃO
// ============================================================

function obterRecomendacao(p) {
    const score = p.moneyballScore;
    const valor = p.valorNumerico;

    if (score >= 80 && valor !== null && valor <= 8000000) {
        return {
            recommendation: 'Oportunidade de Mercado',
            badgeClass: 'opportunity'
        };
    }

    if (score >= 85) {
        return {
            recommendation: 'Jogador de Alto Nível',
            badgeClass: 'premium'
        };
    }

    if (score >= 72) {
        return {
            recommendation: 'Bom Jogador',
            badgeClass: 'success'
        };
    }

    if (score <= 40) {
        return {
            recommendation: 'Baixa Prioridade',
            badgeClass: 'danger'
        };
    }

    if (score <= 55) {
        return {
            recommendation: 'Custo-Benefício Duvidoso',
            badgeClass: 'warning'
        };
    }

    return {
        recommendation: 'Observar',
        badgeClass: 'warning'
    };
}

// ============================================================
// ANÁLISE COMPLETA DOS JOGADORES
// ============================================================

function analyzePlayers(rawPlayers) {
    const analyzedPlayers = rawPlayers.map((p, index) => {
        const scoreDesempenho = arredondar(
            calcularScoreDesempenho(p)
        );

        const scoreFinanceiro = calcularScoreFinanceiro(p);

        const moneyballScore = arredondar(
            (scoreDesempenho * 0.75) +
            (scoreFinanceiro * 0.25)
        );

        const jogador = {
            ...p,

            id: index + 1,

            scoreDesempenho,
            scoreFinanceiro,
            moneyballScore,

            scoreClass: getScoreClass(moneyballScore),

            poucosJogos: false
        };

        const recomendacao = obterRecomendacao(jogador);

        jogador.recommendation = recomendacao.recommendation;
        jogador.badgeClass = recomendacao.badgeClass;

        return jogador;
    });

    analyzedPlayers.sort(
        (a, b) => b.moneyballScore - a.moneyballScore
    );

    return analyzedPlayers;
}