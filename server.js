app.get('/usuarios', async (req, res) => { try { const cincoMinAtras = new Date(Date.now() - 5 * 60000); res.json(await Usuario.find({ ultimoAcesso: { $gte: cincoMinAtras } })); } catch (erro) { res.status(500).json({ erro: erro.message }); } });
app.post('/usuarios', async (req, res) => { try { const usuario = await Usuario.findOneAndUpdate({ nome: req.body.nome }, { foto: req.body.foto, ultimoAcesso: Date.now() }, { upsert: true, new: true }); res.json(usuario); } catch (erro) { res.status(500).json({ erro: erro.message }); } });
app.delete('/usuarios/:id', async (req, res) => { try { await Usuario.findByIdAndDelete(req.params.id); res.json({ mensagem: "Usuário apagado!" }); } catch (erro) { res.status(500).json({ erro: erro.message }); } });

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
