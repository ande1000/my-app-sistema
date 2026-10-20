const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. CONEXÃO COM O BANCO DE DADOS (MONGODB)
// ==========================================
// COLOQUEI O "mongodb+srv://" NO COMEÇO, POIS SEM ELE NÃO CONECTA:
const stringConexao = "mongodb+srv://aguiaprodutorprodutor_db_user:o4oRoyZ7NlKKiZ7S@cluster0.abcde.mongodb.net/meu-sistema?retryWrites=true&w=majority";

mongoose.connect(stringConexao)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas com sucesso!"))
  .catch((erro) => console.log("❌ Erro ao conectar ao banco:", erro));

// ==========================================
// 2. MODELOS DO BANCO DE DADOS (TABELAS)
// ==========================================
// Modelo de Produto (Estoque)
const Produto = mongoose.model('Produto', new mongoose.Schema({
    nome: String,
    qtd: String,
    dataReg: String,
    dataVal: String,
    obs: String,
    status: String,
    foto: String
}));

// Modelo de Saída (Histórico)
const Saida = mongoose.model('Saida', new mongoose.Schema({
    nome: String,
    qtd: String,
    data: String
}));

// Modelo de Usuário
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    nome: String,
    foto: String,
    email: String
}));

// ==========================================
// 3. ROTAS DO APP E DO PAINEL
// ==========================================

// Rota de teste
app.get('/', (req, res) => {
    res.send("Servidor do My App está funcionando!");
});

// --- PRODUTOS ---
app.get('/produtos', async (req, res) => {
    const produtos = await Produto.find();
    res.json(produtos);
});

app.post('/produtos', async (req, res) => {
    const novoProduto = new Produto(req.body);
    await novoProduto.save();
    res.json({ mensagem: "Produto criado com sucesso!", produto: novoProduto });
});

app.put('/produtos/:id', async (req, res) => {
    await Produto.findByIdAndUpdate(req.params.id, req.body);
    res.json({ mensagem: "Produto atualizado!" });
});

app.delete('/produtos/:id', async (req, res) => {
    await Produto.findByIdAndDelete(req.params.id);
    res.json({ mensagem: "Produto apagado!" });
});

// --- SAÍDAS ---
app.get('/saidas', async (req, res) => {
    const saidas = await Saida.find();
    res.json(saidas);
});

app.post('/saidas', async (req, res) => {
    const novaSaida = new Saida(req.body);
    await novaSaida.save();
    res.json({ mensagem: "Saída registrada!", saida: novaSaida });
});

app.delete('/saidas/:id', async (req, res) => {
    await Saida.findByIdAndDelete(req.params.id);
    res.json({ mensagem: "Registro de saída apagado!" });
});

// --- USUÁRIOS ---
app.post('/usuarios', async (req, res) => {
    const novoUsuario = new Usuario(req.body);
    await novoUsuario.save();
    res.json({ mensagem: "Usuário cadastrado!", usuario: novoUsuario });
});

// ==========================================
// 4. LIGANDO O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
