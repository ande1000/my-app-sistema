const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
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
    nome: String, qtd: String, dataReg: String, dataVal: String, obs: String, status: String, foto: String
}));
const Saida = mongoose.model('Saida', new mongoose.Schema({
    nome: String, qtd: String, data: String
}));
const Mensagem = mongoose.model('Mensagem', new mongoose.Schema({
    remetente: String, texto: String, dataHora: { type: Date, default: Date.now }
}));
const ListaCompras = mongoose.model('ListaCompras', new mongoose.Schema({
    item: String, obs: String
}));
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    nome: String, foto: String, ultimoAcesso: { type: Date, default: Date.now }
}));

// Helper para não repetir try/catch em toda rota
const rota = (fn) => async (req, res) => {
    try { await fn(req, res); }
    catch (erro) { console.log("Erro na rota", req.method, req.path, "->", erro.message); res.status(500).json({ erro: erro.message }); }
};

// =====================================================
// ROTAS
// =====================================================
app.get('/', (req, res) => res.send("Servidor funcionando!"));

// Diagnóstico: abra /status no navegador para ver se o banco está conectado
app.get('/status', (req, res) => {
    const estados = ['desconectado', 'conectado', 'conectando', 'desconectando'];
    res.json({ servidor: 'ok', banco: estados[mongoose.connection.readyState] || 'desconhecido' });
});

// PRODUTOS
app.get('/produtos', rota(async (req, res) => res.json(await Produto.find())));
app.post('/produtos', rota(async (req, res) => { const novo = new Produto(req.body); await novo.save(); res.json(novo); }));
app.put('/produtos/:id', rota(async (req, res) => { await Produto.findByIdAndUpdate(req.params.id, req.body); res.json({ mensagem: "Atualizado!" }); }));
app.delete('/produtos/:id', rota(async (req, res) => { await Produto.findByIdAndDelete(req.params.id); res.json({ mensagem: "Apagado!" }); }));

// SAÍDAS
app.get('/saidas', rota(async (req, res) => res.json(await Saida.find())));
app.post('/saidas', rota(async (req, res) => { const nova = new Saida(req.body); await nova.save(); res.json(nova); }));
app.delete('/saidas/:id', rota(async (req, res) => { await Saida.findByIdAndDelete(req.params.id); res.json({ mensagem: "Apagado!" }); }));

// MENSAGENS
app.get('/mensagens', rota(async (req, res) => res.json(await Mensagem.find().sort({ dataHora: 1 }))));

// LISTA DE COMPRAS
app.get('/lista', rota(async (req, res) => res.json(await ListaCompras.find())));
app.post('/lista', rota(async (req, res) => { const novo = new ListaCompras(req.body); await novo.save(); res.json(novo); }));
app.delete('/lista/:id', rota(async (req, res) => { await ListaCompras.findByIdAndDelete(req.params.id); res.json({ mensagem: "Apagado!" }); }));

// USUÁRIOS
app.get('/usuarios', rota(async (req, res) => {
    // Usuários que acessaram nos últimos 5 minutos
    const cincoMinAtras = new Date(Date.now() - 5 * 60000);
    res.json(await Usuario.find({ ultimoAcesso: { $gte: cincoMinAtras } }));
}));

app.post('/usuarios', rota(async (req, res) => {
    const usuario = await Usuario.findOneAndUpdate(
        { nome: req.body.nome },
        { foto: req.body.foto, ultimoAcesso: Date.now() },
        { upsert: true, new: true }
    );
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
    socket.on('enviarMensagem', async (dados) => {
        try {
            const novaMsg = new Mensagem({ remetente: dados.remetente, texto: dados.texto });
            await novaMsg.save();
            io.emit('receberMensagem', novaMsg);
        } catch (erro) {
            console.log("Erro ao salvar mensagem:", erro.message);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { console.log(`🚀 Servidor rodando na porta ${PORT}`); });
