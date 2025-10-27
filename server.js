const express = require('express');
const { Prisma, PrismaClient } = require('@prisma/client');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true}));

// Rotas da API
app.get('/', (_req, res) => {
  res.send('Servidor do Magic Planner está no ar!');
});

app.get('/decks', async (_req, res) => {
  try {
    const decks = await prisma.deck.findMany({
      include: {
        cards: {
          select: {
            id: true,
            scryfallId: true,
            name: true,
            quantity: true,
            type_line: true,
            cmc: true,
            image_uris: true,
            deckId: true,
            tags: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    res.json(decks);
  } catch (error) {
    console.error("Erro ao buscar os decks com detalhes completos:", error);
    res.status(500).json({ error: "Não foi possível buscar os decks." });
  }
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
            type_line: entry.card.type_line,
            cmc: entry.card.cmc,
            image_uris: JSON.stringify(entry.card.image_uris),
          })),
        },
      },
      include: { cards: true },
    });
    res.status(201).json(newDeck);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: `Um deck com o nome "${name}" já existe.` });
    }
    res.status(500).json({ error: "Não foi possível criar o deck." });
  }
});

app.put('/decks/:name', async (req, res) => {
    console.log('RECEBIDO NO BACKEND (req.body):', req.body);
  const { name: deckName } = req.params;
  const { cards: updatedCards } = req.body;
  
  if (updatedCards === undefined) {
    return res.status(400).json({ error: "O corpo da requisição precisa conter a propriedade 'cards'." });
  }

  try {
    const updatedDeck = await prisma.$transaction(async (tx) => {
      await tx.card.deleteMany({
        where: { deck: { name: deckName } },
      });

      const result = await tx.deck.update({
        where: { name: deckName },
        data: {
          cards: {
            create: updatedCards.map(entry => ({
              scryfallId: entry.card.id,
              name: entry.card.name,
              quantity: entry.quantity,
              type_line: entry.card.type_line || '',
              cmc: entry.card.cmc || 0,
              image_uris: JSON.stringify(entry.card.image_uris || {}),
              tags: {
                connectOrCreate: (entry.tags || []).map(tagName => ({
                  where: { name: tagName },
                  create: { name: tagName },
                })),
              }
            })),
          },
        },
        include: { cards: true },
      });
      return result;
    });
    res.json(updatedDeck);
  } catch (error) {
    console.error("Erro ao atualizar o deck:", error);
    res.status(500).json({ error: "Não foi possível atualizar o deck." });
  }
});

app.delete('/decks/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await prisma.deck.delete({
      where: { name: name },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Não foi possível deletar o deck." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});