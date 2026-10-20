const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumenta o limite para aceitar as imagens

// CONEXÃO COM O BANCO DE DADOS
const stringConexao = "mongodb+srv://aguiaprodutorprodutor_db_user:o4oRoyZ7NlKKiZ7S@cluster0.abcde.mongodb.net/meu-sistema?retryWrites=true&w=majority";

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

// ROTAS
app.get('/', (req, res) => res.send("Servidor do My App está funcionando!"));

// Rota para LISTAR os produtos
app.get('/produtos', async (req, res) => {
    try {
        const produtos = await Produto.find();
        res.json(produtos);
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

// Rota para CRIAR um produto
app.post('/produtos', async (req, res) => {
    try {
        const novoProduto = new Produto(req.body);
        await novoProduto.save();
        res.json(novoProduto);
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

// Rota para EDITAR um produto
app.put('/produtos/:id', async (req, res) => {
    try {
        await Produto.findByIdAndUpdate(req.params.id, req.body);
        res.json({ mensagem: "Atualizado!" });
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

// Rota para APAGAR um produto
app.delete('/produtos/:id', async (req, res) => {
    try {
        await Produto.findByIdAndDelete(req.params.id);
        res.json({ mensagem: "Apagado!" });
    } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

// Rotas de Saídas
app.get('/saidas', async (req, res) => {
    const saidas = await Saida.find();
    res.json(saidas);
});

app.post('/saidas', async (req, res) => {
    const novaSaida = new Saida(req.body);
    await novaSaida.save();
    res.json(novaSaida);
});

app.delete('/saidas/:id', async (req, res) => {
    await Saida.findByIdAndDelete(req.params.id);
    res.json({ mensagem: "Apagado!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
