const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const stringConexao = "mongodb+srv://aguiaprodutorprodutor_db_user:lNCNmESfNUokmmx8@cluster0.alwawwa.mongodb.net/meu-sistema?retryWrites=true&w=majority";

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
const Mensagem = mongoose.model('Mensagem', new mongoose.Schema({
    remetente: String, texto: String, dataHora: { type: Date, default: Date.now }
}));
const ListaCompras = mongoose.model('ListaCompras', new mongoose.Schema({
    item: String, obs: String
}));
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    nome: String, foto: String, ultimoAcesso: { type: Date, default: Date.now }
}));

// ROTAS DE PRODUTOS
app.get('/produtos', async (req, res) => { 
    try { res.json(await Produto.find()); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.post('/produtos', async (req, res) => { 
    try { const novo = new Produto(req.body); await novo.save(); res.json(novo); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.put('/produtos/:id', async (req, res) => { 
    try { await Produto.findByIdAndUpdate(req.params.id, req.body); res.json({ mensagem: "Atualizado!" }); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.delete('/produtos/:id', async (req, res) => { 
    try { await Produto.findByIdAndDelete(req.params.id); res.json({ mensagem: "Apagado!" }); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});

// ROTAS DE SAÍDAS
app.get('/saidas', async (req, res) => { 
    try { res.json(await Saida.find()); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.post('/saidas', async (req, res) => { 
    try { const nova = new Saida(req.body); await nova.save(); res.json(nova); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.delete('/saidas/:id', async (req, res) => { 
    try { await Saida.findByIdAndDelete(req.params.id); res.json({ mensagem: "Apagado!" }); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});

// ROTAS DE MENSAGENS E LISTA DE COMPRAS
app.get('/mensagens', async (req, res) => { 
    try { res.json(await Mensagem.find().sort({ dataHora: 1 })); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.get('/lista', async (req, res) => { 
    try { res.json(await ListaCompras.find()); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.post('/lista', async (req, res) => { 
    try { const novo = new ListaCompras(req.body); await novo.save(); res.json(novo); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.delete('/lista/:id', async (req, res) => { 
    try { await ListaCompras.findByIdAndDelete(req.params.id); res.json({ mensagem: "Apagado!" }); } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});

// ROTAS DE USUÁRIOS
app.get('/usuarios', async (req, res) => { 
    try { 
        const cincoMinAtras = new Date(Date.now() - 5 * 60000);
        res.json(await Usuario.find({ ultimoAcesso: { $gte: cincoMinAtras } })); 
    } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.post('/usuarios', async (req, res) => { 
    try { 
        const usuario = await Usuario.findOneAndUpdate(
            { nome: req.body.nome }, 
            { foto: req.body.foto, ultimoAcesso: Date.now() },
            { upsert: true, new: true }
        );
        res.json(usuario); 
    } catch (erro) { res.status(500).json({ erro: erro.message }); } 
});
app.delete('/usuarios/:id', async (req, res) => {
    try {
        await Usuario.findByIdAndDelete(req.params.id);
        res.json({ mensagem: "Usuário apagado com sucesso!" });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// CHAT SOCKET
io.on('connection', (socket) => {
    socket.on('enviarMensagem', async (dados) => {
        try {
            const novaMsg = new Mensagem({ remetente: dados.remetente, texto: dados.texto });
            await novaMsg.save();
            io.emit('receberMensagem', novaMsg);
        } catch(erro) {}
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`🚀 Servidor rodando na porta ${PORT}`); });
