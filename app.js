const express = require ('express')

// Instantiate Express
const app = express()


let id = 1

let totalBudget = 500

let envelopes = []

const getIndexById = (id, elementList) => {
    return elementList.findIndex((element) => {
        return element.id === id
    });
};

const envelopeFormat = {
    category: 'Groceries',
    budget: 100,
    id: 'insert number here'
}


app.get('/envelopes', (req, res, next) => {
    res.json(envelopes)
})

app.get('/envelopes/:id', (req, res, next) => {
    const envelopeId = getIndexById(req.params.id, envelopes)

    if (envelopeId !== -1) {
        res.status(200).json(envelopes[envelopeId])
    } else {
        res.status(404).json({error: 'The envelope ID does not exist.'})
    }
})

app.post('/envelopes', (req, res, next) => {
    const newEnvelopeCategory = req.category
    const newEnvelopeBudget = req.budget


    if (!newEnvelopeCategory || !newEnvelopeBudget) {
        res.status(400).json({error: 'You need to add a category and budget to the envelope.'})
    } else {
        const newEnvelope = {
            category: newEnvelopeCategory,
            budget: newEnvelopeBudget,
            id: id++
        }
        
        envelopes.push(newEnvelope)
        res.status(201).json(newEnvelope)
    }

})



const port = 3000
app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})