const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. CONEXÃO COM O BANCO DE DADOS (MONGODB)
// ==========================================
// COLE A SUA STRING DE CONEXÃO AQUI EMBAIXO (entre as aspas):
const stringConexao = "aguiaprodutorprodutor_db_user:o4oRoyZ7NlKKiZ7S@cluster0.abcde.mongodb.net/";

mongoose.connect(stringConexao)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas com sucesso!"))
  .catch((erro) => console.log("❌ Erro ao conectar ao banco:", erro));

// ==========================================
// 2. CRIANDO AS ROTAS (O QUE O APP VAI PEDIR)
// ==========================================
// Rota de teste apenas para ver se o servidor está de pé
app.get('/', (req, res) => {
    res.send("Servidor do My App está funcionando!");
});

// ==========================================
// 3. LIGANDO O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});