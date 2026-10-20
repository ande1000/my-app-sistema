const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Cria o servidor HTTP e o Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// LINK DO SEU BANCO DE DADOS
const stringConexao = "mongodb+srv://aguiaprodutorprodutor_db_user:o4oRoyZ7NlKKiZ7S@cluster0.alwawwa.mongodb.net/meu-sistema?retryWrites=true&w=majority";

mongoose.connect(stringConexao)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas com sucesso!"))
  .catch((erro) => console.log("❌ Erro ao conectar ao banco:", erro));

// MODELOS
const Produto = mongoose.model('Produto', new mongoose.Schema({
    nome: String, qtd: String, dataReg: String, dataVal: String, obs: String, status: String, foto: String
}));

const Saida = mongoose.model('Saida', new mongoose.Schema({
    nome: String, qtd: String, data: String
}));

// MODELO DE MENSAGEM DO CHAT
const Mensagem = mongoose.model('Mensagem', new mongoose.Schema({
    remetente: String, // "app" ou "painel"
    texto: String,
    dataHora: { type: Date, default: Date.now }
}));

// ROTAS DE ESTOQUE E SAÍDAS
app.get('/', (req, res) => res.send("Servidor do My App está funcionando!"));

app.get('/produtos', async (req, res) => {
    try { res.json(await Produto.find()); } 
    catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.post('/produtos', async (req, res) => {
    try {
        const novoProduto = new Produto(req.body);
        await novoProduto.save();
        res.json(novoProduto);
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.put('/produtos/:id', async (req, res) => {
    try {
        await Produto.findByIdAndUpdate(req.params.id, req.body);
        res.json({ mensagem: "Atualizado!" });
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.delete('/produtos/:id', async (req, res) => {
    try {
        await Produto.findByIdAndDelete(req.params.id);
        res.json({ mensagem: "Apagado!" });
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.get('/saidas', async (req, res) => {
    try { res.json(await Saida.find()); } 
    catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.post('/saidas', async (req, res) => {
    try {
        const novaSaida = new Saida(req.body);
        await novaSaida.save();
        res.json(novaSaida);
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.delete('/saidas/:id', async (req, res) => {
    try {
        await Saida.findByIdAndDelete(req.params.id);
        res.json({ mensagem: "Apagado!" });
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

// ROTA PARA BUSCAR O HISTÓRICO DO CHAT
app.get('/mensagens', async (req, res) => {
    try { 
        const msgs = await Mensagem.find().sort({ dataHora: 1 }); 
        res.json(msgs);
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

// ==========================================
// CONFIGURAÇÃO DO CHAT EM TEMPO REAL (SOCKET.IO)
// ==========================================
io.on('connection', (socket) => {
    console.log('🟢 Novo usuário conectado no Chat');

    // Quando alguém envia uma mensagem
    socket.on('enviarMensagem', async (dados) => {
        try {
            // Salva no banco de dados
            const novaMsg = new Mensagem({
                remetente: dados.remetente,
                texto: dados.texto
            });
            await novaMsg.save();

            // Envia para todos que estão conectados (App e Painel)
            io.emit('receberMensagem', novaMsg);
        } catch(erro) {
            console.error("Erro ao salvar mensagem:", erro);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔴 Usuário desconectado do Chat');
    });
});

const PORT = process.env.PORT || 3000;
// Agora usamos o server.listen e não mais o app.listen
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
