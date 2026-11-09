// ============================================================
// ALGORITMO MONEYBALL
// ============================================================

// Mantém uma métrica dentro de um intervalo entre 0 e 100.
function limitarPontuacao(valor) {
    return Math.max(0, Math.min(100, valor));
}

// Calcula o score de oportunidade de mercado.
function calculateMoneyballScore(p) {

    const jogos = p.totalJogos;

    // 1. CLASSIFICAÇÃO MÉDIA: peso de 45%.
    const scoreClassificacao = limitarPontuacao(
        ((p.clMed - 6.0) / 2.2) * 100
    );

    // 2. GOLS POR 90 MINUTOS: peso de 20%.
    const scoreGols90 = limitarPontuacao(
        (p.gls90 / 0.8) * 100
    );

    // 3. EXPECTATIVA DE GOLS POR JOGO: peso de 10%.
    const xgPorJogo = jogos > 0 ? p.xg / jogos : 0;

    const scoreXg = limitarPontuacao(
        (xgPorJogo / 0.5) * 100
    );

    // 4. DESEMPENHO EM DESARMES: peso de 10%.
    const desPorJogo = jogos > 0 ? p.des / jogos : 0;

    const scoreDesarmes = limitarPontuacao(
        (desPorJogo / 5) * 100
    );

    // 5. PARTICIPAÇÃO COMO HOMEM DO JOGO: peso de 15%.
    const hdjPorJogo = jogos > 0 ? p.hdj / jogos : 0;

    const scoreHdj = limitarPontuacao(
        (hdjPorJogo / 0.3) * 100
    );

    // Nota de desempenho antes da avaliação financeira.
    let scoreDesempenho =
        (scoreClassificacao * 0.45) +
        (scoreGols90 * 0.20) +
        (scoreXg * 0.10) +
        (scoreDesarmes * 0.10) +
        (scoreHdj * 0.15);

    // ========================================================
    // AJUSTE DE CUSTO-BENEFÍCIO
    // ========================================================

    let ajusteFinanceiro = 0;

    if (p.valorNumerico > 0) {

        if (p.valorNumerico <= 1000000) {
            ajusteFinanceiro = 4;

        } else if (p.valorNumerico <= 3000000) {
            ajusteFinanceiro = 2;

        } else if (p.valorNumerico <= 8000000) {
            ajusteFinanceiro = 0;

        } else if (p.valorNumerico <= 15000000) {
            ajusteFinanceiro = -2;

        } else {
            ajusteFinanceiro = -5;
        }

        // Jogador muito caro precisa justificar o investimento.
        if (p.valorNumerico > 10000000 && scoreDesempenho < 60) {
            ajusteFinanceiro -= 5;
        }
    }

    let score = scoreDesempenho + ajusteFinanceiro;

    // ========================================================
    // CONFIABILIDADE DA AMOSTRA
    // ========================================================

    // O jogador precisa de aproximadamente 25 jogos
    // para que sua pontuação não sofra redução por amostra pequena.
    const confiabilidade = Math.min(jogos / 25, 1);

    // Aproxima a pontuação de 50 quando há poucos jogos.
    score = 50 + ((score - 50) * confiabilidade);

    // Limita o resultado entre 0 e 100.
    score = Math.max(0, Math.min(100, score));

    return Math.round(score * 10) / 10;
}

// ============================================================
// CLASSIFICAÇÃO VISUAL DO SCORE
// ============================================================

function getScoreClass(score) {
    if (score <= 40) return 'score-red';
    if (score <= 55) return 'score-orange';
    if (score <= 70) return 'score-yellow';
    return 'score-green';
}

// ============================================================
// ANÁLISE DOS JOGADORES
// ============================================================

function analyzePlayers(rawPlayers) {
    const analyzedPlayers = rawPlayers.map((p, index) => {

        const mbScore = calculateMoneyballScore(p);

        let recommendation = 'Observar';
        let badgeClass = 'warning';

        // Oportunidade de mercado: desempenho muito bom
        // e valor relativamente acessível.
        if (
            mbScore >= 78 &&
            p.valorNumerico > 0 &&
            p.valorNumerico <= 8000000
        ) {
            recommendation = 'Oportunidade de Mercado';
            badgeClass = 'opportunity';

        } else if (mbScore >= 85) {
            recommendation = 'Jogador de Alto Nível';
            badgeClass = 'premium';

        } else if (
            mbScore >= 71 &&
            p.valorNumerico > 0 &&
            p.valorNumerico <= 15000000
        ) {
            recommendation = 'Bom Custo-Benefício';
            badgeClass = 'success';

        } else if (mbScore <= 40) {
            recommendation = 'Baixa Prioridade';
            badgeClass = 'danger';

        } else if (mbScore <= 55) {
            recommendation = 'Custo-Benefício Duvidoso';
            badgeClass = 'warning';
        }

        return {
            id: index + 1,
            ...p,

            moneyballScore: mbScore,
            scoreClass: getScoreClass(mbScore),

            recommendation,
            badgeClass,

            poucosJogos: p.totalJogos < 10
        };
    });

    analyzedPlayers.sort(
        (a, b) => b.moneyballScore - a.moneyballScore
    );

    return analyzedPlayers;
}
