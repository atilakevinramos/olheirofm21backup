
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

function normalizarMetrica(valor, referencia, maior = true) {
    if (
        valor === null ||
        valor === undefined ||
        valor === '' ||
        !Number.isFinite(Number(valor))
    ) {
        return null;
    }

    let nota = (Number(valor) / referencia) * 100;

    if (!maior) {
        nota = 100 - nota;
    }

    return limitarPontuacao(nota);
}

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
// VALIDAÇÃO DOS DADOS POR CATEGORIA
// ============================================================

function possuiMetricaValida(jogador, campo) {
    const valor = jogador[campo];

    return (
        valor !== null &&
        valor !== undefined &&
        valor !== '' &&
        Number.isFinite(Number(valor))
    );
}

function verificarDadosSuficientes(p) {
    const criterios = {
        goleiro: {
            metricas: [
                'clMed',
                'sof90',
                'percPenDef',
                'penDefendidos',
                'consistencia'
            ],
            minimo: 2,
            metricasEspecificas: [
                'sof90',
                'percPenDef',
                'penDefendidos'
            ]
        },

        defensor: {
            metricas: [
                'clMed',
                'des',
                'mDes',
                'psC',
                'cabG90',
                'consistencia',
                'vermelhos'
            ],
            minimo: 3,
            metricasEspecificas: [
                'des',
                'mDes',
                'psC',
                'cabG90'
            ]
        },

        'meio-campista': {
            metricas: [
                'clMed',
                'psC',
                'assis90',
                'drbpj',
                'xg',
                'consistencia'
            ],
            minimo: 3,
            metricasEspecificas: [
                'psC',
                'assis90',
                'drbpj',
                'xg'
            ]
        },

        volante: {
            metricas: [
                'clMed',
                'psC',
                'cabPct',
                'mDes',
                'vermelhos',
                'consistencia'
            ],
            minimo: 3,
            metricasEspecificas: [
                'psC',
                'cabPct',
                'mDes'
            ]
        },

        atacante: {
            metricas: [
                'clMed',
                'gls90',
                'xg',
                'assis90',
                'ast',
                'consistencia'
            ],
            minimo: 3
        }
    };

    const criterio = criterios[p.categoria];

    if (!criterio) {
        return {
            suficiente: false,
            metricasDisponiveis: 0,
            minimoNecessario: 0,
            motivo: 'Categoria não identificada'
        };
    }

    if (
        p.jogosInformados === true &&
        Number(p.totalJogos) === 0
    ) {
        return {
            suficiente: false,
            metricasDisponiveis: 0,
            minimoNecessario: criterio.minimo,
            motivo: 'Sem partidas disputadas'
        };
    }

    const metricasDisponiveis = criterio.metricas.filter(campo =>
        possuiMetricaValida(p, campo)
    ).length;

    if (criterio.metricasEspecificas) {
        const possuiMetricaEspecifica =
            criterio.metricasEspecificas.some(campo =>
                possuiMetricaValida(p, campo)
            );

        if (!possuiMetricaEspecifica) {
            return {
                suficiente: false,
                metricasDisponiveis,
                minimoNecessario: criterio.minimo,
                motivo: 'Faltam estatísticas específicas da posição'
            };
        }
    }

    return {
        suficiente: metricasDisponiveis >= criterio.minimo,
        metricasDisponiveis,
        minimoNecessario: criterio.minimo,
        motivo: metricasDisponiveis >= criterio.minimo
            ? ''
            : 'Poucas métricas disponíveis'
    };
}

// ============================================================
// CONFIABILIDADE DA AMOSTRA DE JOGOS
// ============================================================

function obterConfiabilidadeJogos(p) {
    if (p.jogosInformados !== true) {
        return {
            nivel: 'desconhecida',
            descricao: 'Jogos não informados',
            recomendacaoPermitida: true
        };
    }

    const jogos = Number(p.totalJogos) || 0;

    if (jogos === 0) {
        return {
            nivel: 'sem-jogos',
            descricao: 'Sem partidas',
            recomendacaoPermitida: false
        };
    }

    if (jogos <= 4) {
        return {
            nivel: 'muito-pequena',
            descricao: 'Amostra muito pequena',
            recomendacaoPermitida: false
        };
    }

    if (jogos <= 9) {
        return {
            nivel: 'limitada',
            descricao: 'Amostra limitada',
            recomendacaoPermitida: false
        };
    }

    if (jogos <= 19) {
        return {
            nivel: 'razoavel',
            descricao: 'Amostra razoável',
            recomendacaoPermitida: true
        };
    }

    return {
        nivel: 'consistente',
        descricao: 'Amostra consistente',
        recomendacaoPermitida: true
    };
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
            peso: 25
        },
        {
            nota: normalizarMetrica(p.des, 3.0),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.mDes, 90),
            peso: 20
        },
        {
            nota: normalizarMetrica(p.psC, 90),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.cabG90, 0.25),
            peso: 10
        },
        {
            nota: normalizarMetrica(p.consistencia, 20),
            peso: 10
        },
        {
            nota: normalizarMetrica(p.vermelhos, 3, false),
            peso: 5
        }
    ]);
}

// Meias: foco em criação, condução e participação ofensiva.
function calcularScoreMeioCampista(p) {
    return calcularMediaPonderada([
        {
            nota: normalizarMetrica(p.clMed, 8.0),
            peso: 30
        },
        {
            nota: normalizarMetrica(p.psC, 90),
            peso: 20
        },
        {
            nota: normalizarMetrica(p.assis90, 0.5),
            peso: 20
        },
        {
            nota: normalizarMetrica(p.drbpj, 1.0),
            peso: 15
        },
        {
            nota: normalizarMetrica(p.xg, 3.0),
            peso: 10
        },
        {
            nota: normalizarMetrica(p.consistencia, 20),
            peso: 5
        }
    ]);
}

// Volantes: maior foco em contribuição defensiva e jogo aéreo.
function calcularScoreVolante(p) {
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
            nota: normalizarMetrica(p.mDes, 85),
            peso: 25
        },
        {
            nota: normalizarMetrica(p.cabPct, 50),
            peso: 20
        },
        {
            nota: normalizarMetrica(p.consistencia, 20),
            peso: 5
        },
        {
            nota: normalizarMetrica(p.vermelhos, 3, false),
            peso: 5
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
    const validacao = verificarDadosSuficientes(p);

    if (!validacao.suficiente) {
        return null;
    }

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

        case 'volante':
            resultado = calcularScoreVolante(p);
            break;

        case 'atacante':
            resultado = calcularScoreAtacante(p);
            break;

        default:
            resultado = null;
    }

    return resultado === null
        ? null
        : limitarPontuacao(resultado);
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

    if (desempenho === null) {
        return null;
    }

    const financeiro = calcularScoreFinanceiro(p);

    const scoreFinal =
        (desempenho * 0.75) +
        (financeiro * 0.25);

    return arredondar(limitarPontuacao(scoreFinal));
}

// ============================================================
// CLASSIFICAÇÃO VISUAL
// ============================================================

function getScoreClass(score) {
    if (score === null || score === undefined) {
        return 'score-orange';
    }

    if (score <= 40) return 'score-red';
    if (score <= 55) return 'score-orange';
    if (score <= 70) return 'score-yellow';

    return 'score-green';
}

// ============================================================
// RECOMENDAÇÃO
// ============================================================

function obterRecomendacao(p) {
    const confiabilidade = obterConfiabilidadeJogos(p);

    if (p.moneyballScore === null || p.moneyballScore === undefined) {
        return {
            recommendation: 'Dados insuficientes',
            badgeClass: 'warning'
        };
    }

    if (confiabilidade.nivel === 'muito-pequena') {
        return {
            recommendation: 'Amostra muito pequena',
            badgeClass: 'warning'
        };
    }

    if (confiabilidade.nivel === 'limitada') {
        return {
            recommendation: 'Observar - amostra limitada',
            badgeClass: 'warning'
        };
    }

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
        const validacao = verificarDadosSuficientes(p);
        const confiabilidade = obterConfiabilidadeJogos(p);
        const scoreDesempenho = calcularScoreDesempenho(p);
        const scoreFinanceiro = calcularScoreFinanceiro(p);

        const moneyballScore = scoreDesempenho === null
            ? null
            : arredondar(
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

            dadosSuficientes: validacao.suficiente,
            metricasDisponiveis: validacao.metricasDisponiveis,
            minimoMetricasNecessarias: validacao.minimoNecessario,
            motivoDadosInsuficientes: validacao.motivo,

            confiabilidadeJogos: confiabilidade.nivel,
            confiabilidadeDescricao: confiabilidade.descricao,

            poucosJogos:
                p.jogosInformados === true &&
                Number(p.totalJogos) < 10
        };

        const recomendacao = obterRecomendacao(jogador);

        jogador.recommendation = recomendacao.recommendation;
        jogador.badgeClass = recomendacao.badgeClass;

        return jogador;
    });

    analyzedPlayers.sort((a, b) => {
        if (a.moneyballScore === null && b.moneyballScore !== null) {
            return 1;
        }

        if (a.moneyballScore !== null && b.moneyballScore === null) {
            return -1;
        }

        if (a.moneyballScore === null && b.moneyballScore === null) {
            return 0;
        }

        return b.moneyballScore - a.moneyballScore;
    });

    return analyzedPlayers;
}
