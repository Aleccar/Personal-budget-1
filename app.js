const express = require('express')
const db = require('./db');
require('dotenv').config()

// Instantiate Express
const app = express()

app.use(express.json())

app.use((req, res, next) => {
    console.log(req.method, req.hostname, req.path)
    next()
})

let id = 1

let totalBudget = 500

let envelopes = []

const getIndexById = (id, elementList) => {
    return elementList.findIndex((element) => {
        return element.id === Number(id)
    });
};

const getEnvelopeByCategory = (category, elementList) => {
    return elementList.findIndex((element) => {
        return element.category === category
    })
}

const envelopeFormat = {
    category: 'Groceries',
    budget: 100,
    id: 'insert number here'
}


app.get('/envelopes', async (req, res, next) => {
    try {
        const results = await db.query('SELECT * FROM envelopes');
        return res.status(200).json(results.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
})

app.get('/envelopes/:key/:value', async (req, res, next) => {
    const { key, value } = req.params

    if (!['id', 'category'].includes(key)) {
        return res.status(400).json({ error: 'Invalid lookup key.' });
    }

    try {
        const results = await db.query(
            `SELECT * FROM envelopes WHERE ${key} = $1`,
            [value]);

        if (results.rows.length === 0) {
            return res.status(404).json({ error: `The envelope ${key} does not exist.` });
        }

        return res.status(200).json(results.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
})

app.post('/envelopes', async (req, res, next) => {
    const { category, budget } = req.body

    if (!category || !budget) {
        res.status(400).json({ error: 'You need to add a category and budget to the envelope.' })
    }

    try {
        const results = await db.query(`INSERT INTO envelopes(category, budget) VALUES($1, $2) RETURNING *`, [category, budget])

        return res.status(201).json(results.rows[0])
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error.' })
    }
})

app.put('/envelopes/:id', async (req, res, next) => {
    const envelopeId = req.params.id
    const updatedCategory = req.body.category
    const updatedBudget = req.body.budget

    if (!updatedBudget && !updatedCategory) {
        res.status(400).json({ error: 'You need to add text to update the envelope budget or category.' })
    }

    try {
        if (updatedCategory && updatedBudget) {
            const results = await db.query(`UPDATE envelopes SET category = $1, budget = $2 WHERE id = ${envelopeId} RETURNING *`, [updatedCategory, updatedBudget])

            res.status(201).json(results.rows[0])
        } else if (updatedBudget) {
            const results = await db.query(`UPDATE envelopes SET budget = $1 WHERE id = ${envelopeId} RETURNING *`, [updatedBudget])

            res.status(201).json(results.rows[0])
        } else {
            const results = await db.query(`UPDATE envelopes SET category = $1 WHERE id = ${envelopeId} RETURNING *`, [updatedCategory])

            res.status(201).json(results.rows[0])
        }
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Internal server error.' })
    }
}
)

app.post('/envelopes/:category1/:category2', (req, res, next) => {
    const category1 = getEnvelopeByCategory(req.params.category1, envelopes)
    const category2 = getEnvelopeByCategory(req.params.category2, envelopes)

    const transfer = req.body.transfer

    if (category1 === -1 || category2 === -1) {
        res.status(404).json({ error: 'One or both of the envelope categories do not exist.' })
    } else {
        envelopes[category1].budget -= transfer
        envelopes[category2].budget += transfer

        res.status(200).json({ success: `Transfered ${transfer} from ${envelopes[category1].category} to ${envelopes[category2].category}` })
    }
})

app.delete('/envelopes/:id', async (req, res, next) => {
    const envelopeId = req.params.id

    try {
        const results = await db.query('DELETE FROM envelopes WHERE id = $1 RETURNING *', [envelopeId])

        if (results.rows.length === 0) {
            res.status(404).json({ error: 'The envelope ID does not exist.' })
        }

        res.sendStatus(204)
    }
    catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Internal server error.' })
    }
})



PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
})