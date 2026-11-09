// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================

let allPlayers = [];
let currentSortColumn = 'moneyballScore';
let sortAscending = false;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const resultsSection = document.getElementById('resultsSection');
const playersTableBody = document.getElementById('playersTableBody');
const totalPlayers = document.getElementById('totalPlayers');
const searchInput = document.getElementById('searchInput');

// ============================================================
// EVENTOS DO UPLOAD
// ============================================================

dropZone.addEventListener('click', event => {
    // O clique do próprio input não deve abrir o seletor novamente.
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
// LEITURA E ANÁLISE DO ARQUIVO NO PRÓPRIO NAVEGADOR
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

        allPlayers = analyzePlayers(rawPlayers);

        currentSortColumn = 'moneyballScore';
        sortAscending = false;
        searchInput.value = '';

        renderTable(allPlayers);
        resultsSection.classList.remove('d-none');

        try {
            await salvarAnaliseLocal(allPlayers);
        } catch (storageError) {
            console.error('Não foi possível salvar no armazenamento local:', storageError);
            alert(
                'A análise foi realizada, mas o navegador não conseguiu salvá-la localmente. ' +
                'Você ainda pode consultar os resultados nesta página.'
            );
        }

    } catch (error) {
        console.error('Erro na análise:', error);
        alert('Erro ao processar o arquivo HTML: ' + error.message);

    } finally {
        // Permite selecionar novamente o mesmo arquivo.
        fileInput.value = '';
    }
}

// ============================================================
// RENDERIZAÇÃO DA TABELA
// ============================================================

function renderTable(players) {
    totalPlayers.innerText = players.length;

    playersTableBody.innerHTML = players.map(p => {

        let recommendationIcon = '';

        if (p.badgeClass === 'opportunity') {
            recommendationIcon = '<i class="fa-solid fa-gem"></i>';

        } else if (p.badgeClass === 'premium') {
            recommendationIcon = '<i class="fa-solid fa-star"></i>';

        } else if (p.badgeClass === 'success') {
            recommendationIcon = '<i class="fa-solid fa-thumbs-up"></i>';

        } else if (p.badgeClass === 'danger') {
            recommendationIcon = '<i class="fa-solid fa-ban"></i>';

        } else {
            recommendationIcon = '<i class="fa-solid fa-eye"></i>';
        }

        const scoreClass = [
            'score-red',
            'score-orange',
            'score-yellow',
            'score-green'
        ].includes(p.scoreClass) ? p.scoreClass : 'score-red';

        const badgeClass = [
            'opportunity',
            'premium',
            'success',
            'warning',
            'danger'
        ].includes(p.badgeClass) ? p.badgeClass : 'warning';

        const badgeStyle = {
            opportunity: 'badge-opportunity',
            premium: 'badge-premium',
            success: 'badge-success',
            warning: 'badge-warning',
            danger: 'badge-danger'
        }[badgeClass];

        return `
            <tr>
                <td class="fw-bold text-start ps-3 text-white">
                    ${escapeHtml(p.nome)}
                    ${p.poucosJogos
                        ? '<span class="badge bg-secondary ms-1" style="font-size: 9px;" title="Amostra baixa">Poucos Jogos</span>'
                        : ''
                    }
                </td>

                <td>${escapeHtml(p.nac)}</td>

                <td class="text-secondary">
                    ${escapeHtml(p.clube)}
                </td>

                <td>${escapeHtml(p.idade ?? '-')}</td>

                <td>${escapeHtml(p.jogosStr)}</td>
                <td>${escapeHtml(p.gls)}</td>
                <td>${escapeHtml(p.ast)}</td>
                <td>${escapeHtml(p.gls90)}</td>
                <td>${escapeHtml(p.xg)}</td>
                <td>${escapeHtml(p.hdj)}</td>

                <td class="fw-semibold text-white">
                    ${escapeHtml(p.clMed)}
                </td>

                <td>
                    <span class="valor-badge">
                        ${escapeHtml(p.valorStr)}
                    </span>
                </td>

                <td>
                    <span class="score-badge ${scoreClass}">
                        ${escapeHtml(p.moneyballScore)}
                    </span>
                </td>

                <td>
                    <span class="market-badge ${badgeStyle}">
                        ${recommendationIcon}
                        ${escapeHtml(p.recommendation)}
                    </span>
                </td>
            </tr>
        `;
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
        let valA = a[column];
        let valB = b[column];

        // Idades ausentes ficam no final da lista.
        if (column === 'idade') {
            if (valA === null || valA === undefined) {
                return 1;
            }

            if (valB === null || valB === undefined) {
                return -1;
            }
        }

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = String(valB ?? '').toLowerCase();
        }

        if (valA < valB) return sortAscending ? -1 : 1;
        if (valA > valB) return sortAscending ? 1 : -1;

        return 0;
    });

    aplicarPesquisa();
}

// Mantém a função disponível para os onclick do HTML.
window.sortData = sortData;

// ============================================================
// PESQUISA
// ============================================================

function aplicarPesquisa() {
    const query = searchInput.value.toLowerCase().trim();

    const filtered = allPlayers.filter(p =>
        String(p.nome).toLowerCase().includes(query) ||
        String(p.clube).toLowerCase().includes(query)
    );

    renderTable(filtered);
}

searchInput.addEventListener('input', aplicarPesquisa);

// ============================================================
// RECUPERA A ÚLTIMA ANÁLISE AO ABRIR O SITE
// ============================================================

async function restaurarUltimaAnalise() {
    try {
        const savedPlayers = await carregarAnaliseLocal();

        if (Array.isArray(savedPlayers) && savedPlayers.length > 0) {
            allPlayers = savedPlayers;
            renderTable(allPlayers);
            resultsSection.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Não foi possível recuperar a análise local:', error);
    }
}

restaurarUltimaAnalise();