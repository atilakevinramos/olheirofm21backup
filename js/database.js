// ============================================================
// BANCO DE DADOS LOCAL (INDEXEDDB)
// ============================================================

// Os dados ficam no navegador deste usuário.
// Não são enviados para um servidor.
const DB_NAME = 'FM21MoneyballDB';
const DB_VERSION = 1;
const STORE_NAME = 'analises';
const LAST_ANALYSIS_KEY = 'ultimaAnalise';

function abrirBancoDados() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('Este navegador não oferece suporte ao armazenamento IndexedDB.'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = event => resolve(event.target.result);
        request.onerror = () => reject(request.error);
    });
}

async function salvarAnaliseLocal(players) {
    const db = await abrirBancoDados();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        store.put({
            id: LAST_ANALYSIS_KEY,
            data: players,
            atualizadoEm: new Date().toISOString()
        });

        transaction.oncomplete = () => {
            db.close();
            resolve(true);
        };

        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };

        transaction.onabort = () => {
            db.close();
            reject(transaction.error || new Error('Não foi possível salvar a análise.'));
        };
    });
}

async function carregarAnaliseLocal() {
    const db = await abrirBancoDados();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(LAST_ANALYSIS_KEY);

        request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.data : []);
        };

        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
    });
}

async function limparAnaliseLocal() {
    const db = await abrirBancoDados();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(LAST_ANALYSIS_KEY);

        transaction.oncomplete = () => {
            db.close();
            resolve(true);
        };

        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
    });
}
