// ============================================================
// CONVERSÃO E NORMALIZAÇÃO DOS DADOS
// ============================================================

// Converte números do FM. Valores ausentes permanecem null.
function parseNum(valStr) {
    if (valStr === null || valStr === undefined) return null;

    const original = String(valStr).trim();

    if (!original || original === '-' || original === '- - -') {
        return null;
    }

    const clean = original
        .replace('%', '')
        .replace(/\s/g, '')
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '');

    const num = parseFloat(clean);

    return Number.isNaN(num) ? null : num;
}

// Converte valores financeiros do Football Manager.
//
// "16M R$"   = 16.000.000
// "82,5m R$" = 82.500
// "850 R$"   = 850
// "0 R$"     = 0
// "-"        = null
function parseValor(valorStr) {
    if (valorStr === null || valorStr === undefined) return null;

    const original = String(valorStr).trim();

    if (!original || original === '-' || original === '- - -') {
        return null;
    }

    const numTexto = original
        .replace(/R\$/gi, '')
        .replace(/\s/g, '')
        .replace(',', '.')
        .replace(/[^0-9.]/g, '');

    const numero = parseFloat(numTexto);

    if (Number.isNaN(numero)) return null;

    let multiplicador = 1;

    if (original.includes('M')) {
        multiplicador = 1000000;
    } else if (original.includes('m')) {
        multiplicador = 1000;
    }

    return numero * multiplicador;
}

// ============================================================
// LEITURA DOS JOGOS
// ============================================================

// Exemplos do Football Manager:
//
// "23 (1)" = 23 titularidades + 1 entrada como reserva
// "13"     = 13 titularidades + 0 entradas como reserva
// "0 (9)"  = 0 titularidades + 9 entradas como reserva
// "-"      = nenhuma partida registrada
//
// Mantemos jogosInformados para distinguir:
// - Coluna Jogos presente com "-": zero partidas.
// - Coluna Jogos ausente em exportações antigas: informação desconhecida.

function parseDetalhesJogos(jogosStr) {
    if (jogosStr === null || jogosStr === undefined) {
        return {
            titular: 0,
            reserva: 0,
            total: null,
            informado: false
        };
    }

    const original = String(jogosStr).trim();

    if (original === '') {
        return {
            titular: 0,
            reserva: 0,
            total: null,
            informado: false
        };
    }

    if (original === '-' || original === '- - -') {
        return {
            titular: 0,
            reserva: 0,
            total: 0,
            informado: true
        };
    }

    const correspondencia = original.match(
        /^\s*(\d+)\s*(?:\(\s*(\d+)\s*\))?\s*$/
    );

    if (!correspondencia) {
        return {
            titular: 0,
            reserva: 0,
            total: null,
            informado: false
        };
    }

    const titular = Number(correspondencia[1]);
    const reserva = correspondencia[2]
        ? Number(correspondencia[2])
        : 0;

    return {
        titular,
        reserva,
        total: titular + reserva,
        informado: true
    };
}

// Mantida para compatibilidade com outras partes do projeto.
function parseTotalJogos(jogosStr) {
    const detalhes = parseDetalhesJogos(jogosStr);

    return detalhes.informado
        ? detalhes.total
        : null;
}

function normalizeHeader(header) {
    return String(header ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/%/g, ' % ')
        .replace(/[.]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function obterValorPorAlias(row, aliases) {
    for (const alias of aliases) {
        const chave = normalizeHeader(alias);

        if (row[chave] !== undefined && row[chave] !== '') {
            return row[chave];
        }
    }

    return null;
}

function numeroPorAlias(row, aliases) {
    return parseNum(obterValorPorAlias(row, aliases));
}

function textoPorAlias(row, aliases, padrao = '-') {
    const valor = obterValorPorAlias(row, aliases);

    if (valor === null || valor === undefined || valor === '') {
        return padrao;
    }

    return String(valor).trim();
}

// ============================================================
// IDENTIFICAÇÃO AUTOMÁTICA DO MODELO
// ============================================================

// Os modelos novos possuem os mesmos cabeçalhos.
// Por isso, usamos o nome do arquivo como identificação principal.

function identificarCategoriaPorArquivo(nomeArquivo) {
    const nome = normalizeHeader(nomeArquivo);

    if (nome.includes('goleiro')) {
        return 'goleiro';
    }

    if (nome.includes('defensor')) {
        return 'defensor';
    }

    if (
        nome.includes('meia') ||
        nome.includes('meio-campista') ||
        nome.includes('meio campista')
    ) {
        return 'meio-campista';
    }

    if (nome.includes('atacante')) {
        return 'atacante';
    }

    return 'desconhecido';
}

// Identificação por cabeçalhos para manter compatibilidade
// com exportações antigas.
function identificarCategoria(headers) {
    const h = headers.map(normalizeHeader);

    const possui = nome => h.includes(normalizeHeader(nome));

    // Goleiros
    if (
        possui('sof/90') ||
        possui('pen. defendidos') ||
        possui('% de pen. def.')
    ) {
        return 'goleiro';
    }

    // Atacantes
    if (
        possui('atta') ||
        possui('assis/90') ||
        possui('pen/r')
    ) {
        return 'atacante';
    }

    // Defensores
    if (
        possui('m des') ||
        possui('vermelhos')
    ) {
        return 'defensor';
    }

    // Meio-campistas
    if (
        possui('xg') &&
        possui('gls/90') &&
        possui('des') &&
        possui('ps c')
    ) {
        return 'meio-campista';
    }

    return 'desconhecido';
}

// ============================================================
// LEITURA DO HTML EXPORTADO PELO FOOTBALL MANAGER
// ============================================================

function parseFMExport(fileContent, nomeArquivo = '') {
    const parser = new DOMParser();

    const documentHtml = parser.parseFromString(
        fileContent,
        'text/html'
    );

    documentHtml.querySelectorAll('script, style').forEach(element => {
        element.remove();
    });

    const rows = Array.from(documentHtml.querySelectorAll('tr'));

    let headers = null;

    // Primeiro tenta identificar pelo nome do arquivo.
    let categoria = identificarCategoriaPorArquivo(nomeArquivo);

    const players = [];

    for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('th, td'));

        if (cells.length === 0) continue;

        const cellTexts = cells.map(cell =>
            (cell.textContent || '')
                .replace(/\s+/g, ' ')
                .trim()
        );

        // Procura uma linha que realmente seja o cabeçalho.
        if (headers === null) {
            const cabecalhosNormalizados = cellTexts.map(normalizeHeader);

            const temNome = cabecalhosNormalizados.includes('nome');
            const temValor = cabecalhosNormalizados.includes('valor');

            if (!temNome || !temValor) continue;

            headers = cellTexts;

            // Se o nome do arquivo não identificou a categoria,
            // tenta usar os cabeçalhos dos modelos antigos.
            if (categoria === 'desconhecido') {
                categoria = identificarCategoria(headers);
            }

            continue;
        }

        const rowData = {};

        headers.forEach((header, index) => {
            rowData[normalizeHeader(header)] = cellTexts[index] ?? '';
        });

        const nome = textoPorAlias(rowData, ['nome'], '');

        if (
            !nome ||
            nome === '-' ||
            nome === '- -' ||
            nome.toLowerCase() === 'nome'
        ) {
            continue;
        }

        const valorStr = textoPorAlias(rowData, ['valor'], '-');
        const idadeTexto = textoPorAlias(rowData, ['idade'], '');

        const jogosStr = textoPorAlias(rowData, ['jogos'], '');

        const detalhesJogos = parseDetalhesJogos(jogosStr);

        const jogador = {
            // Identificação
            rec: textoPorAlias(rowData, ['rec'], ''),
            inf: textoPorAlias(rowData, ['inf'], ''),
            nome,
            posicao: textoPorAlias(rowData, ['posicao', 'posição']),
            nac: textoPorAlias(rowData, ['nac', 'nacionalidade']),
            clube: textoPorAlias(rowData, ['clube']),

            categoria,
            categoriaLabel: {
                goleiro: 'Goleiro',
                defensor: 'Defensor',
                'meio-campista': 'Meio-campista',
                atacante: 'Atacante'
            }[categoria] || 'Não identificada',

            idade: idadeTexto ? parseNum(idadeTexto) : null,

            // Dados de jogos
            jogosStr,
            jogosTitular: detalhesJogos.titular,
            jogosReserva: detalhesJogos.reserva,
            totalJogos: detalhesJogos.total,
            jogosInformados: detalhesJogos.informado,

            // Desempenho comum
            clMed: numeroPorAlias(rowData, [
                'cl med',
                'class med',
                'class. med.',
                'classificacao media'
            ]),

            consistencia: numeroPorAlias(rowData, [
                'cons',
                'consistência',
                'consistencia'
            ]),

            valorStr,
            valorNumerico: parseValor(valorStr),

            // Goleiros
            sof90: numeroPorAlias(rowData, ['sof/90']),
            percPenDef: numeroPorAlias(rowData, [
                '% de pen def',
                '% de pen. def.',
                '% pen def'
            ]),
            penDefendidos: numeroPorAlias(rowData, [
                'pen defendidos',
                'pen. defendidos'
            ]),

            // Defensores
            psC: numeroPorAlias(rowData, ['ps c']),
            mDes: numeroPorAlias(rowData, ['m des']),
            des: numeroPorAlias(rowData, ['des']),
            vermelhos: numeroPorAlias(rowData, ['vermelhos']),

            // Meio-campistas e atacantes
            xg: numeroPorAlias(rowData, ['xg']),
            gls90: numeroPorAlias(rowData, ['gls/90']),
            ast: numeroPorAlias(rowData, ['ast']),
            assis90: numeroPorAlias(rowData, ['assis/90']),

            // Atacantes
            atTa: numeroPorAlias(rowData, ['atta']),
            penR: textoPorAlias(rowData, ['pen/r'], '-'),

            // Campos de modelos antigos
            gls: numeroPorAlias(rowData, ['gls']),
            hdj: numeroPorAlias(rowData, ['hdj']),
            passe: textoPorAlias(rowData, ['% passe']),
            drbpj: numeroPorAlias(rowData, ['drbpj']),
            remates: textoPorAlias(rowData, ['% remates']),
            semGolos: textoPorAlias(rowData, ['sem golos sofridos']),
            crT: textoPorAlias(rowData, ['% cr t']),

            // Guarda os dados originais para futuras evoluções.
            dadosOriginais: { ...rowData }
        };

        players.push(jogador);
    }

    return players;
}