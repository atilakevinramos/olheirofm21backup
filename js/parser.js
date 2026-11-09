// ============================================================
// CONVERSÃO DE VALORES
// ============================================================

// Converte strings numéricas (ex.: "7,04", "0,21", "30%").
function parseNum(valStr) {
    if (valStr === null || valStr === undefined) return 0;

    const original = String(valStr).trim();

    if (!original || original === '-' || original === '- - -') return 0;

    const clean = original
        .replace('%', '')
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '')
        .trim();

    const num = parseFloat(clean);

    return Number.isNaN(num) ? 0 : num;
}

// Converte valores do FM:
// "16M R$"   = 16.000.000
// "82,5m R$" = 82.500
// "850 R$"   = 850
function parseValor(valorStr) {
    if (valorStr === null || valorStr === undefined) return 0;

    const original = String(valorStr).trim();

    if (!original || original === '-') return 0;

    const numTexto = original
        .replace(/R\$/gi, '')
        .replace(/\s/g, '')
        .replace(',', '.')
        .replace(/[^0-9.]/g, '');

    const numVal = parseFloat(numTexto);

    if (Number.isNaN(numVal)) return 0;

    let multiplicador = 1;

    if (original.includes('M')) {
        multiplicador = 1000000;
    } else if (original.includes('m')) {
        multiplicador = 1000;
    }

    return numVal * multiplicador;
}

// Extrai o número total de jogos (ex.: "22 (2)" = 24).
function parseTotalJogos(jogosStr) {
    if (!jogosStr) return 0;

    const parts = String(jogosStr).split('(');
    const titular = parseNum(parts[0]);
    const reserva = parts[1] ? parseNum(parts[1]) : 0;

    return titular + reserva;
}

// Normaliza cabeçalhos para facilitar a identificação.
function normalizeHeader(header) {
    return String(header ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// LEITURA DO HTML EXPORTADO PELO FOOTBALL MANAGER
// ============================================================

function parseFMExport(fileContent) {
    const parser = new DOMParser();
    const documentHtml = parser.parseFromString(fileContent, 'text/html');

    documentHtml.querySelectorAll('script, style').forEach(element => {
        element.remove();
    });

    const rows = Array.from(documentHtml.querySelectorAll('tr'));
    const players = [];

    let headers = null;

    for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('th, td'));

        if (cells.length === 0) continue;

        const cellTexts = cells.map(cell => {
            return (cell.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();
        });

        // A primeira linha com células é considerada o cabeçalho.
        if (headers === null) {
            headers = cellTexts.map(normalizeHeader);
            continue;
        }

        const playerObj = {};

        headers.forEach((header, index) => {
            playerObj[header] = cellTexts[index] || '';
        });

        const name = playerObj['nome'] || '';

        if (!name || name === '- -' || name === '-') continue;

        const jogosStr = playerObj['jogos'] || '0';
        const totalJogos = parseTotalJogos(jogosStr);

        const valorStr = playerObj['valor'] || '0 R$';
        const valorNumerico = parseValor(valorStr);

        // Idade: aceita exportações novas e antigas.
        // Se o cabeçalho não existir ou estiver vazio, retorna null.
        const idadeTexto = playerObj['idade'] || '';
        const idade = idadeTexto ? parseNum(idadeTexto) : null;

        players.push({
            rec: playerObj['rec'] || '',
            inf: playerObj['inf'] || '',

            nome: name,
            nac: playerObj['nac'] || '-',
            clube: playerObj['clube'] || '-',

            idade: idade,

            jogosStr: jogosStr,
            totalJogos: totalJogos,

            semGolos: playerObj['sem golos sofridos'] || '-',
            crT: playerObj['% cr t'] || '0%',

            gls: parseNum(playerObj['gls']),
            ast: parseNum(playerObj['ast']),
            gls90: parseNum(playerObj['gls/90']),
            xg: parseNum(playerObj['xg']),

            passe: playerObj['% passe'] || '0%',
            des: parseNum(playerObj['des']),
            drbpj: parseNum(playerObj['drbpj']),
            remates: playerObj['% remates'] || '0%',

            hdj: parseNum(playerObj['hdj']),

            clMed: parseNum(
                playerObj['cl med'] || playerObj['class. med.']
            ),

            valorStr: valorStr,
            valorNumerico: valorNumerico
        });
    }

    return players;
}