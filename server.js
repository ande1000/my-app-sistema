const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 5e6
});

// =====================================================
// CONEXÃO COM O BANCO
// Recomendado: configure a variável MONGO_URI no painel da hospedagem
// (Render > Environment). Se não existir, usa o valor abaixo.
// =====================================================
const stringConexao = process.env.MONGO_URI ||
    "mongodb+srv://aguiaprodutorprodutor_db_user:o4oRoyZ7NlKKiZ7S@cluster0.alwawwa.mongodb.net/meu-sistema?retryWrites=true&w=majority";

// Evita o servidor "travar" 10s esperando banco quando ele está fora do ar
mongoose.set('bufferCommands', false);

async function conectarBanco() {
    try {
        await mongoose.connect(stringConexao, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000
        });
        console.log("✅ Conectado ao MongoDB Atlas com sucesso!");
    } catch (erro) {
        console.log("❌ Erro ao conectar ao banco:", erro.message);
        console.log("🔁 Tentando novamente em 10 segundos...");
        setTimeout(conectarBanco, 10000);
    }
}
conectarBanco();

mongoose.connection.on('disconnected', () => console.log("⚠️ MongoDB desconectado"));
mongoose.connection.on('reconnected', () => console.log("✅ MongoDB reconectado"));

// Nunca deixar o servidor cair por erro solto
process.on('unhandledRejection', (e) => console.log("unhandledRejection:", e));
process.on('uncaughtException', (e) => console.log("uncaughtException:", e));

// =====================================================
// MODELOS
// =====================================================
const Produto = mongoose.model('Produto', new mongoose.Schema({
    nome: String, qtd: String, dataReg: String, dataVal: String, obs: String, status: String, foto: String, fotoVersao: Number
}));
const Saida = mongoose.model('Saida', new mongoose.Schema({
    nome: String, qtd: String, data: String, unidade: String, obs: String
}));
const Mensagem = mongoose.model('Mensagem', new mongoose.Schema({
    remetente: String, usuario: String, texto: String, dataHora: { type: Date, default: Date.now }
}));
const ListaCompras = mongoose.model('ListaCompras', new mongoose.Schema({
    item: String, obs: String
}));
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    nome: String, foto: String, fotoVersao: Number, ultimoAcesso: { type: Date, default: Date.now }
}));

// Mostra nos logs cada requisição que chega (ajuda a diagnosticar)
app.use((req, res, next) => { console.log("➡️", req.method, req.url); next(); });

// Helper para não repetir try/catch em toda rota
const rota = (fn) => async (req, res) => {
    try {
        await Promise.race([
            fn(req, res),
            new Promise((_, rej) => setTimeout(() => rej(new Error("O banco de dados não respondeu a tempo (20s)")), 20000))
        ]);
    } catch (erro) {
        console.log("❌ Erro na rota", req.method, req.path, "->", erro.message);
        if (!res.headersSent) res.status(500).json({ erro: erro.message });
    }
};

// =====================================================
// ROTAS
// =====================================================
app.get('/', (req, res) => res.send("Servidor funcionando!"));

// Diagnóstico: abra /status no navegador
app.get('/status', async (req, res) => {
    const estados = ['desconectado', 'conectado', 'conectando', 'desconectando'];
    let ping = 'sem resposta';
    try {
        await Promise.race([
            mongoose.connection.db.admin().ping(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
        ]);
        ping = 'ok';
    } catch (e) { ping = 'sem resposta (' + e.message + ')'; }
    res.json({ servidor: 'ok', banco: estados[mongoose.connection.readyState] || 'desconhecido', pingBanco: ping });
});

// PRODUTOS
// A lista NÃO envia as fotos (eram pesadas e travavam o banco gratuito).
// Cada produto recebe só o link da foto; o navegador baixa uma vez e guarda no cache.
function baseUrl(req) {
    const proto = String(req.get('x-forwarded-proto') || req.protocol).split(',')[0];
    return proto + '://' + req.get('host');
}
const ehFotoValida = (f) => typeof f === 'string' && f.startsWith('data:image/');

app.get('/produtos', rota(async (req, res) => {
    const lista = await Produto.aggregate([{
        $project: {
            nome: 1, qtd: 1, dataReg: 1, dataVal: 1, obs: 1, status: 1, fotoVersao: 1,
            temFoto: { $gt: [{ $strLenCP: { $ifNull: ['$foto', ''] } }, 0] }
        }
    }]);
    const base = baseUrl(req);
    res.json(lista.map(p => {
        const { temFoto, fotoVersao, ...resto } = p;
        return { ...resto, foto: temFoto ? `${base}/produtos/${p._id}/foto?v=${fotoVersao || 0}` : null };
    }));
}));

app.get('/produtos/:id/foto', async (req, res) => {
    try {
        const p = await Produto.findById(req.params.id).select('foto').lean();
        if (!p || !ehFotoValida(p.foto)) return res.status(404).end();
        const i = p.foto.indexOf(',');
        const mime = (p.foto.slice(5, i).split(';')[0]) || 'image/jpeg';
        res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
        res.send(Buffer.from(p.foto.slice(i + 1), 'base64'));
    } catch (erro) {
        res.status(500).end();
    }
});

app.post('/produtos', rota(async (req, res) => {
    const dados = { ...req.body };
    delete dados._id;
    if (ehFotoValida(dados.foto)) dados.fotoVersao = Date.now();
    else dados.foto = null;
    const novo = new Produto(dados);
    await novo.save();
    res.json({ _id: novo._id, mensagem: "Criado!" });
}));

app.put('/produtos/:id', rota(async (req, res) => {
    const dados = { ...req.body };
    delete dados._id;
    delete dados.fotoVersao;
    if (ehFotoValida(dados.foto)) dados.fotoVersao = Date.now(); // foto nova
    else delete dados.foto;                                       // sem foto nova: mantém a atual
    await Produto.findByIdAndUpdate(req.params.id, dados);
    res.json({ mensagem: "Atualizado!" });
}));

app.delete('/produtos/:id', rota(async (req, res) => { await Produto.findByIdAndDelete(req.params.id); res.json({ mensagem: "Apagado!" }); }));

// SAÍDAS
app.get('/saidas', rota(async (req, res) => res.json(await Saida.find())));
app.post('/saidas', rota(async (req, res) => { const nova = new Saida(req.body); await nova.save(); res.json(nova); }));
app.delete('/saidas/:id', rota(async (req, res) => { await Saida.findByIdAndDelete(req.params.id); res.json({ mensagem: "Apagado!" }); }));

// MENSAGENS / CONVERSAS
// Cada mensagem pertence à conversa de um usuário do app (campo "usuario").
app.get('/mensagens', rota(async (req, res) => {
    const filtro = req.query.usuario ? { usuario: String(req.query.usuario) } : {};
    res.json(await Mensagem.find(filtro).sort({ dataHora: 1 }).lean());
}));

// Lista de conversas do painel: quem já mandou mensagem, com a última mensagem e a foto
app.get('/conversas', rota(async (req, res) => {
    const grupos = await Mensagem.aggregate([
        { $match: { usuario: { $nin: [null, ''] } } },
        { $sort: { dataHora: 1 } },
        { $group: { _id: '$usuario', ultimaMensagem: { $last: '$texto' }, ultimoRemetente: { $last: '$remetente' }, ultimaData: { $last: '$dataHora' }, total: { $sum: 1 } } },
        { $sort: { ultimaData: -1 } }
    ]);
    const nomes = grupos.map(g => g._id);
    const donos = nomes.length ? await Usuario.aggregate([
        { $match: { nome: { $in: nomes } } },
        { $project: { nome: 1, fotoVersao: 1, temFoto: { $gt: [{ $strLenCP: { $ifNull: ['$foto', ''] } }, 0] } } }
    ]) : [];
    const base = baseUrl(req);
    res.json(grupos.map(g => {
        const dono = donos.find(u => u.nome === g._id);
        return {
            usuario: g._id,
            ultimaMensagem: g.ultimaMensagem,
            ultimoRemetente: g.ultimoRemetente,
            ultimaData: g.ultimaData,
            total: g.total,
            foto: dono && dono.temFoto ? `${base}/usuarios/${dono._id}/foto?v=${dono.fotoVersao || 0}` : null
        };
    }));
}));

// Apaga a conversa de um usuário (as mensagens dele)
app.delete('/conversas/:nome', rota(async (req, res) => {
    const nome = String(req.params.nome);
    await Mensagem.deleteMany({ usuario: nome });
    io.to('u:' + nome).to('painel').emit('conversaApagada', { usuario: nome });
    res.json({ mensagem: "Conversa apagada!" });
}));

// Apaga todo o histórico do chat (todas as conversas)
app.delete('/mensagens', rota(async (req, res) => {
    await Mensagem.deleteMany({});
    io.emit('historicoLimpo');
    res.json({ mensagem: "Histórico apagado!" });
}));

// LISTA DE COMPRAS
app.get('/lista', rota(async (req, res) => res.json(await ListaCompras.find())));
app.post('/lista', rota(async (req, res) => { const novo = new ListaCompras(req.body); await novo.save(); res.json(novo); }));
app.delete('/lista/:id', rota(async (req, res) => { await ListaCompras.findByIdAndDelete(req.params.id); res.json({ mensagem: "Apagado!" }); }));

// USUÁRIOS
app.get('/usuarios', rota(async (req, res) => {
    // Usuários que acessaram nos últimos 5 minutos (foto enviada como link, não como arquivo pesado)
    const cincoMinAtras = new Date(Date.now() - 5 * 60000);
    const lista = await Usuario.aggregate([
        { $match: { ultimoAcesso: { $gte: cincoMinAtras } } },
        { $project: { nome: 1, ultimoAcesso: 1, fotoVersao: 1, temFoto: { $gt: [{ $strLenCP: { $ifNull: ['$foto', ''] } }, 0] } } }
    ]);
    const base = baseUrl(req);
    res.json(lista.map(u => {
        const { temFoto, fotoVersao, ...resto } = u;
        return { ...resto, foto: temFoto ? `${base}/usuarios/${u._id}/foto?v=${fotoVersao || 0}` : null };
    }));
}));

app.get('/usuarios/:id/foto', async (req, res) => {
    try {
        const u = await Usuario.findById(req.params.id).select('foto').lean();
        if (!u || !ehFotoValida(u.foto)) return res.status(404).end();
        const i = u.foto.indexOf(',');
        const mime = (u.foto.slice(5, i).split(';')[0]) || 'image/jpeg';
        res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
        res.send(Buffer.from(u.foto.slice(i + 1), 'base64'));
    } catch (erro) {
        res.status(500).end();
    }
});

app.post('/usuarios', rota(async (req, res) => {
    const nome = String(req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
    const atualiza = { ultimoAcesso: Date.now() };
    if (req.body.foto) { atualiza.foto = req.body.foto; atualiza.fotoVersao = Date.now(); } // sem foto nova, mantém a que já está salva
    const usuario = await Usuario.findOneAndUpdate({ nome }, atualiza, { upsert: true, new: true });
    res.json(usuario);
}));

// ESTAVA FALTANDO: o painel chama essa rota ao apagar um usuário
app.delete('/usuarios/:id', rota(async (req, res) => {
    await Usuario.findByIdAndDelete(req.params.id);
    res.json({ mensagem: "Apagado!" });
}));

// =====================================================
// CHAT (SOCKET)
// =====================================================
io.on('connection', (socket) => {
    // O app entra na sala do próprio usuário; o painel entra na sala "painel".
    socket.on('entrarUsuario', (nome) => { if (typeof nome === 'string' && nome.trim()) socket.join('u:' + nome.trim()); });
    socket.on('sairUsuario', (nome) => { if (typeof nome === 'string') socket.leave('u:' + nome.trim()); });
    socket.on('entrarPainel', () => socket.join('painel'));

    socket.on('enviarMensagem', async (dados) => {
        try {
            dados = dados || {};
            const usuario = String(dados.usuario || '').trim();
            const texto = String(dados.texto || '').slice(0, 2000);
            if (!texto.trim()) return;
            const remetente = dados.remetente === 'painel' ? 'painel' : 'app';
            const novaMsg = new Mensagem({ remetente, usuario, texto });
            await novaMsg.save();
            // só o dono da conversa e o painel recebem
            if (usuario) io.to('u:' + usuario).to('painel').emit('receberMensagem', novaMsg);
            else io.to('painel').emit('receberMensagem', novaMsg);
        } catch (erro) {
            console.log("Erro ao salvar mensagem:", erro.message);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { console.log(`🚀 Servidor rodando na porta ${PORT}`); });
