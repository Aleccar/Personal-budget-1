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

app.get('/envelopes', async (req, res, next) => {
    try {
        const results = await db.query('SELECT * FROM envelopes ORDER BY id');
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
        return res.status(400).json({ error: 'You need to add a category and budget to the envelope.' })
    }

    try {
        const results = await db.query(`INSERT INTO envelopes(category, budget) VALUES($1, $2) RETURNING *`, [category, budget])
        return res.status(201).json(results.rows[0])

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error.' })
    }
})

app.put('/envelopes/:key/:value', async (req, res, next) => {
    const { key, value } = req.params
    const updatedCategory = req.body.category
    const updatedBudget = req.body.budget

    // console.log(`KEY: ${key}  ... VALUE: ${value}`)

    if (!['id', 'category'].includes(key)) {
        return res.status(400).json({ error: 'Invalid lookup key.' });
    }

    if (!updatedBudget && !updatedCategory) {
        return res.status(400).json({ error: 'You need to add text to update the envelope budget or category.' })
    }

    try {
        if (updatedCategory && updatedBudget) {
            const results = await db.query(`UPDATE envelopes SET category = $1, budget = $2 WHERE ${key} = $3 RETURNING *`, [updatedCategory, updatedBudget, value])
            if (results.rows.length === 0) {
                return res.status(404).json({ error: `The envelope ${key} does not exist.` });
            }

            return res.status(201).json(results.rows[0])

        } else if (updatedBudget) {
            const results = await db.query(`UPDATE envelopes SET budget = $1 WHERE ${key} = $2 RETURNING *`, [updatedBudget, value])
            if (results.rows.length === 0) {
                return res.status(404).json({ error: `The envelope ${key} does not exist.` });
            }

            return res.status(201).json(results.rows[0])

        } else {
            const results = await db.query(`UPDATE envelopes SET category = $1 WHERE ${key} = $2 RETURNING *`, [updatedCategory, value])
            if (results.rows.length === 0) {
                return res.status(404).json({ error: `The envelope ${key} does not exist.` });
            }

            return res.status(201).json(results.rows[0])

        }
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Internal server error.' })
    }
}
)

app.post('/envelopes/transfer/:category1/:category2', async (req, res, next) => {
    const category1 = req.params.category1
    const category2 = req.params.category2
    const transfer = req.body.transfer

    try {
        await db.query('BEGIN')

        const result1 = await db.query('UPDATE envelopes SET budget = budget - $1 WHERE category = $2 RETURNING *', [transfer, category1])
        const result2 = await db.query('UPDATE envelopes SET budget = budget + $1 WHERE category = $2 RETURNING *', [transfer, category2])

        if (result1.rows.length === 0 || result2.rows.length === 0) {
            await db.query('ROLLBACK')
            return res.status(404).json({ error: 'One or both of the envelope categories do not exist.' })
        }

        await db.query('COMMIT')

        return res.status(201).json({
            from: result1.rows[0],
            to: result2.rows[0]
        })

    } catch (err) {
        await db.query('ROLLBACK')
        console.error(err)
        return res.status(500).json({ error: 'Internal server error.' })
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

// Transactions section ----------------

// READ
app.get('/transactions', async (req, res) => {
    try {
        const results = await db.query('SELECT * FROM transactions')
        return res.status(200).json(results.rows)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Internal server error.' })
    }
})

app.get('/transactions/:id', async (req, res) => {
    const id = req.params.id

    try {
        const results = await db.query('SELECT * FROM transactions WHERE id = $1', [id])

        if (results.rows.length === 0) {
            return res.status(404).json({error: 'No transaction with the specified id exists.'})
        }

    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Internal server error.' })
    }
})

// CREATE
app.post('/transactions/:envelope', async (req, res) => {
    const envelope = req.params.envelope
    const {amount, recipient} = req.body

        if (!amount || !recipient) {
        return res.status(400).json({ error: 'You need to add a category and budget to the envelope.' })
    }

    try {
        await db.query('BEGIN')

        const getEnvelopeId = await db.query('SELECT id FROM envelopes WHERE category = $1', [envelope])

        const envelopeId = getEnvelopeId.rows[0].id

        const result1 = await db.query('INSERT INTO transactions (amount, recipient, envelope_id) VALUES($1, $2, $3) RETURNING *', [amount, recipient, envelopeId])

        const result2 = await db.query('UPDATE envelopes SET budget = budget - $1 WHERE id = $2 RETURNING *', [amount, envelopeId])

        if (result2.rows.length === 0) {
            await db.query('ROLLBACK')
            return res.status(404).json({error: 'That envelope does not exist.'})
        }

        await db.query('COMMIT')

        return res.status(201).json(result1.rows[0])

    } catch (err) {
        await db.query('ROLLBACK')
        console.error(err)
        return res.status(500).json({ error: 'Internal server error.' })
    }
})

// UPDATE

// DELETE



PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
})