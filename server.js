const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

// FORÇA A CONEXÃO DIRETA COM O DNS DO GOOGLE (RESOLVE O ERRO ENOTFOUND)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// CONEXÃO COM O SEU BANCO (O CÓDIGO VAI PROCURAR O SEU CLUSTER REAL AUTOMATICAMENTE)
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

// ROTAS (O QUE O APP VAI USAR)
app.get('/', (req, res) => res.send("Servidor funcionando!"));

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
