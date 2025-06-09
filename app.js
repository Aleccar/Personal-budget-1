const express = require('express')

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


app.get('/envelopes', (req, res, next) => {
    res.json(envelopes)
})

app.get('/envelopes/:category', (req, res, next) => {
    const envelopeCategory = getEnvelopeByCategory(req.params.category, envelopes)

    if (envelopeCategory !== -1) {
        res.status(200).json(envelopes[envelopeCategory])
    } else {
        res.status(404).json({ error: 'The envelope category does not exist.' })
    }
})

app.get('/envelopes/:id', (req, res, next) => {
    const envelopeId = getIndexById(req.params.id, envelopes)

    if (envelopeId !== -1) {
        res.status(200).json(envelopes[envelopeId])
    } else {
        res.status(404).json({ error: 'The envelope ID does not exist.' })
    }
})

app.post('/envelopes', (req, res, next) => {
    const newEnvelopeCategory = req.body.category
    const newEnvelopeBudget = req.body.budget

    if (!newEnvelopeCategory || !newEnvelopeBudget) {
        res.status(400).json({ error: 'You need to add a category and budget to the envelope.' })
    } else {
        const newEnvelope = {
            category: newEnvelopeCategory,
            budget: Number(newEnvelopeBudget),
            id: id++
        }

        envelopes.push(newEnvelope)
        res.status(201).json(newEnvelope)
    }
})

app.put('/envelopes/:category', (req, res, next) => {
    const envelopeCategory = getEnvelopeByCategory(req.params.category, envelopes)
    const updatedCategory = req.body.category
    const updatedBudget = req.body.budget

    if (envelopeCategory !== -1) {
        if (!updatedBudget && !updatedCategory) {
            res.status(400).json({ error: 'You need to add text to update the envelope budget or category.'})
        } else {
            if (updatedCategory && updatedBudget) {
                envelopes[envelopeCategory].category = updatedCategory
                envelopes[envelopeCategory].budget = updatedBudget
                res.status(200).json(envelopes[envelopeCategory])
            } 
            else if (updatedBudget) {
                envelopes[envelopeCategory].budget = updatedBudget
                res.status(200).json(envelopes[envelopeCategory])
            } else {
                envelopes[envelopeCategory].category = updatedCategory
                res.status(200).json(envelopes[envelopeCategory])
            }
        }
    }
})

app.delete('/envelopes/:category', (req, res, next) => {
    
})

const port = 3000
app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})