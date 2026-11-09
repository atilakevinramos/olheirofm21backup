
// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================

let allPlayers = [];
let currentSortColumn = 'moneyballScore';
let sortAscending = false;

// ============================================================
// ELEMENTOS DA PÁGINA
// ============================================================

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const resultsSection = document.getElementById('resultsSection');
const playersTableBody = document.getElementById('playersTableBody');
const totalPlayers = document.getElementById('totalPlayers');
const searchInput = document.getElementById('searchInput');

// ============================================================
// COLUNAS DA TABELA
// ============================================================

// Dados que aparecem em todas as categorias.
const colunasIdentificacao = [
    { key: 'nome', label: 'Nome', type: 'text' },
    { key: 'posicao', label: 'Posição', type: 'text' },
    { key: 'idade', label: 'Idade', type: 'number' },
    { key: 'nac', label: 'Nacionalidade', type: 'text' },
    { key: 'clube', label: 'Clube', type: 'text' },
    { key: 'valorNumerico', label: 'Valor', type: 'money' }
];

// Estatísticas específicas de cada posição.
const colunasPorCategoria = {
    goleiro: [
        { key: 'sof90', label: 'Sof/90', type: 'number' },
        { key: 'percPenDef', label: '% Pen. Def.', type: 'percent' },
        { key: 'penDefendidos', label: 'Pen. Defendidos', type: 'number' }
    ],

    defensor: [
        { key: 'des', label: 'Desarmes', type: 'number' },
        { key: 'mDes', label: '% Desarmes', type: 'percent' },
        { key: 'psC', label: '% Passes Certos', type: 'percent' },
        { key: 'vermelhos', label: 'Vermelhos', type: 'number' }
    ],

    'meio-campista': [
        { key: 'psC', label: '% Passes Certos', type: 'percent' },
        { key: 'gls90', label: 'Gols/90', type: 'number' },
        { key: 'xg', label: 'xG', type: 'number' },
        { key: 'des', label: 'Desarmes', type: 'number' }
    ],

    atacante: [
        { key: 'gls90', label: 'Gols/90', type: 'number' },
        { key: 'xg', label: 'xG', type: 'number' },
        { key: 'ast', label: 'Assistências', type: 'number' },
        { key: 'assis90', label: 'Assis/90', type: 'number' },
        { key: 'atTa', label: 'Ataque Tático', type: 'number' },
        { key: 'penR', label: 'Pen/R', type: 'text' }
    ]
};

// Informações comuns e scores.
const colunasComuns = [
    { key: 'consistencia', label: 'Consistência', type: 'number' },
    { key: 'clMed', label: 'Cl. Média', type: 'number' },
    { key: 'scoreDesempenho', label: 'Score Desempenho', type: 'score' },
    { key: 'scoreFinanceiro', label: 'Score Financeiro', type: 'score' },
    { key: 'moneyballScore', label: 'Score Final', type: 'score' },
    { key: 'recommendation', label: 'Avaliação Moneyball', type: 'recommendation' }
];

// A tabela começa com as colunas gerais.
// Depois da importação, será adaptada à categoria.
let tableColumns = [...colunasIdentificacao, ...colunasComuns];

// ============================================================
// CRIAÇÃO DINÂMICA DO CABEÇALHO
// ============================================================

function criarCabecalhoTabela(categoria = 'desconhecido') {
    const table = playersTableBody.closest('table');

    if (!table) return;

    const thead = table.querySelector('thead');

    if (!thead) return;

    const colunasEspecificas = colunasPorCategoria[categoria] || [];

    tableColumns = [
        ...colunasIdentificacao,
        ...colunasEspecificas,
        ...colunasComuns
    ];

    thead.innerHTML = `
        <tr>
            ${tableColumns.map(column => `
                <th
                    onclick="sortData('${column.key}')"
                    title="Clique para ordenar por ${escapeHtml(column.label)}."
                >
                    ${escapeHtml(column.label)} ↕
                </th>
            `).join('')}
        </tr>
    `;
}

// ============================================================
// EVENTOS DO UPLOAD
// ============================================================

dropZone.addEventListener('click', event => {
    if (event.target === fileInput) return;

    fileInput.click();
});

dropZone.addEventListener('dragover', event => {
    event.preventDefault();
    dropZone.style.borderColor = '#34d399';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#10b981';
});

dropZone.addEventListener('drop', event => {
    event.preventDefault();
    dropZone.style.borderColor = '#10b981';

    if (event.dataTransfer.files.length > 0) {
        handleUpload(event.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', event => {
    if (event.target.files.length > 0) {
        handleUpload(event.target.files[0]);
    }
});

// ============================================================
// PROTEÇÃO DE TEXTO HTML
// ============================================================

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => {
        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return entities[char];
    });
}

// ============================================================
// FORMATAÇÃO DOS VALORES
// ============================================================

function formatarNumero(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return '-';
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) return '-';

    return numero.toLocaleString('pt-BR', {
        maximumFractionDigits: 2
    });
}

function formatarDinheiro(valor) {
    if (valor === null || valor === undefined) {
        return '-';
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) return '-';

    if (numero >= 1000000) {
        return 'R$ ' + (numero / 1000000).toLocaleString('pt-BR', {
            maximumFractionDigits: 2
        }) + ' mi';
    }

    if (numero >= 1000) {
        return 'R$ ' + (numero / 1000).toLocaleString('pt-BR', {
            maximumFractionDigits: 1
        }) + ' mil';
    }

    return 'R$ ' + numero.toLocaleString('pt-BR', {
        maximumFractionDigits: 0
    });
}

function formatarCelula(jogador, coluna) {
    const valor = jogador[coluna.key];

    if (valor === null || valor === undefined || valor === '') {
        return '-';
    }

    switch (coluna.type) {
        case 'money':
            return formatarDinheiro(valor);

        case 'number':
        case 'percent':
            return formatarNumero(valor);

        case 'score':
            return formatarNumero(valor);

        default:
            return String(valor);
    }
}

// ============================================================
// LEITURA E ANÁLISE DO ARQUIVO
// ============================================================

async function handleUpload(file) {
    if (!/\.(html|htm)$/i.test(file.name)) {
        alert('Selecione um arquivo HTML exportado pelo Football Manager.');
        return;
    }

    try {
        const fileContent = await file.text();

        const rawPlayers = parseFMExport(fileContent);

        if (rawPlayers.length === 0) {
            alert(
                'Não foi possível extrair os jogadores. ' +
                'Verifique se o arquivo HTML contém uma tabela com os cabeçalhos esperados.'
            );
            return;
        }

        const categorias = [
            ...new Set(rawPlayers.map(p => p.categoria))
        ];

        if (categorias.includes('desconhecido')) {
            console.warn(
                'Um ou mais jogadores foram importados sem categoria reconhecida.'
            );
        }

        allPlayers = analyzePlayers(rawPlayers);

        currentSortColumn = 'moneyballScore';
        sortAscending = false;
        searchInput.value = '';

        // Identifica a categoria da lista e atualiza as colunas.
        const categoriaAtual = allPlayers[0]?.categoria || 'desconhecido';

        criarCabecalhoTabela(categoriaAtual);

        renderTable(allPlayers);

        resultsSection.classList.remove('d-none');

        try {
            await salvarAnaliseLocal(allPlayers);
        } catch (storageError) {
            console.error(
                'Não foi possível salvar no armazenamento local:',
                storageError
            );

            alert(
                'A análise foi realizada, mas o navegador não conseguiu salvá-la localmente. ' +
                'Você ainda pode consultar os resultados nesta página.'
            );
        }

    } catch (error) {
        console.error('Erro na análise:', error);

        alert('Erro ao processar o arquivo HTML: ' + error.message);

    } finally {
        fileInput.value = '';
    }
}

// ============================================================
// ÍCONES E CLASSES DAS RECOMENDAÇÕES
// ============================================================

function obterIconeRecomendacao(badgeClass) {
    const icones = {
        opportunity: '<i class="fa-solid fa-gem"></i>',
        premium: '<i class="fa-solid fa-star"></i>',
        success: '<i class="fa-solid fa-thumbs-up"></i>',
        danger: '<i class="fa-solid fa-ban"></i>',
        warning: '<i class="fa-solid fa-eye"></i>'
    };

    return icones[badgeClass] || icones.warning;
}

function obterClasseBadge(badgeClass) {
    const classes = {
        opportunity: 'badge-opportunity',
        premium: 'badge-premium',
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger'
    };

    return classes[badgeClass] || 'badge-warning';
}

// ============================================================
// RENDERIZAÇÃO DA TABELA
// ============================================================

function renderTable(players) {
    totalPlayers.innerText = players.length;

    playersTableBody.innerHTML = players.map(jogador => {
        const celulas = tableColumns.map(coluna => {
            const valor = formatarCelula(jogador, coluna);

            if (coluna.type === 'score') {
                const score = Number(jogador[coluna.key] ?? 0);
                const scoreClass = getScoreClass(score);

                return `
                    <td>
                        <span class="score-badge ${scoreClass}">
                            ${escapeHtml(valor)}
                        </span>
                    </td>
                `;
            }

            if (coluna.type === 'recommendation') {
                return `
                    <td>
                        <span class="market-badge ${obterClasseBadge(jogador.badgeClass)}">
                            ${obterIconeRecomendacao(jogador.badgeClass)}
                            ${escapeHtml(valor)}
                        </span>
                    </td>
                `;
            }

            if (coluna.key === 'nome') {
                return `
                    <td class="fw-bold text-start ps-3 text-white">
                        ${escapeHtml(valor)}
                    </td>
                `;
            }

            if (coluna.key === 'valorNumerico') {
                return `
                    <td>
                        <span class="valor-badge">
                            ${escapeHtml(valor)}
                        </span>
                    </td>
                `;
            }

            if (coluna.key === 'clMed') {
                return `
                    <td class="fw-semibold text-white">
                        ${escapeHtml(valor)}
                    </td>
                `;
            }

            return `<td>${escapeHtml(valor)}</td>`;
        }).join('');

        return `<tr>${celulas}</tr>`;
    }).join('');
}

// ============================================================
// ORDENAÇÃO
// ============================================================

function sortData(column) {
    if (currentSortColumn === column) {
        sortAscending = !sortAscending;
    } else {
        currentSortColumn = column;
        sortAscending = false;
    }

    allPlayers.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];

        const ausenteA = valA === null || valA === undefined || valA === '';
        const ausenteB = valB === null || valB === undefined || valB === '';

        // Dados ausentes sempre ficam no final.
        if (ausenteA && !ausenteB) return 1;
        if (!ausenteA && ausenteB) return -1;
        if (ausenteA && ausenteB) return 0;

        let comparacao;

        if (
            typeof valA === 'number' ||
            typeof valB === 'number'
        ) {
            comparacao = Number(valA) - Number(valB);
        } else {
            comparacao = String(valA).localeCompare(
                String(valB),
                'pt-BR',
                { sensitivity: 'base' }
            );
        }

        return sortAscending ? comparacao : -comparacao;
    });

    aplicarPesquisa();
}

window.sortData = sortData;

// ============================================================
// PESQUISA
// ============================================================

function aplicarPesquisa() {
    const query = searchInput.value
        .toLowerCase()
        .trim();

    const filtered = allPlayers.filter(jogador => {
        const camposPesquisa = [
            jogador.nome,
            jogador.nac,
            jogador.clube,
            jogador.posicao,
            jogador.categoriaLabel
        ];

        return camposPesquisa.some(campo =>
            String(campo ?? '')
                .toLowerCase()
                .includes(query)
        );
    });

    renderTable(filtered);
}

searchInput.addEventListener('input', aplicarPesquisa);

// ============================================================
// RECUPERA A ÚLTIMA ANÁLISE
// ============================================================

async function restaurarUltimaAnalise() {
    try {
        const savedPlayers = await carregarAnaliseLocal();

        if (Array.isArray(savedPlayers) && savedPlayers.length > 0) {
            allPlayers = savedPlayers;

            // Também recupera as colunas corretas ao abrir o site.
            const categoriaAtual = allPlayers[0]?.categoria || 'desconhecido';

            criarCabecalhoTabela(categoriaAtual);

            renderTable(allPlayers);

            resultsSection.classList.remove('d-none');
        }
    } catch (error) {
        console.error(
            'Não foi possível recuperar a análise local:',
            error
        );
    }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

criarCabecalhoTabela();
restaurarUltimaAnalise();
