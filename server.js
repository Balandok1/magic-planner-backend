const express = require('express');
const { Prisma, PrismaClient } = require('@prisma/client');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servidor do Magic Planner está no ar!');
});

app.post('/decks', async (req, res) => {
    const { name, cards } = req.body;

    try {
        const newDeck = await prisma.deck.create({
            data: {
                name: name,
                cards: {
                    create: cards.map(entry => ({
                        scryfallId: entry.card.id,
                        name: entry.card.name,
                        quantity: entry.quantity,
                    })),
                },
            },
            include: {
                cards: true,
            },
        });
        res.status(201).json(newDeck);
    } catch (error) { 
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return res.status(409).json({ error: `Um deck com o nome '${name}' já existe.` });
            }
        }
        console.error('Erro ao criar o deck:', error);
        res.status(500).json({ error: 'Não foi possível criar o deck' });
    }
 });

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
