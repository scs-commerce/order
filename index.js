const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const accepts = require('accepts')

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())

const store = { baskets: [] }

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))

app.set('view engine', 'pug')

app.get('/basket', (req, res) => {
  const accept = accepts(req)
  const userId = req.cookies['scs-commerce-uid']

  console.log('userId:', userId)
  const basket = store.baskets[userId] ? store.baskets[userId] : { userId, items: {} }

  switch (accept.type(['html', 'json'])) {
    case 'html':
      res.setHeader('Content-Type', 'text/html')
      res.status(200).render('basket', { basket })
      break
    case 'json':
      res.setHeader('Content-Type', 'application/json')
      res.status(200).send(JSON.stringify(basket))
      break
  }
})

app.post('/basket', (req, res) => {
  const userId = req.cookies['scs-commerce-uid']
  let basket = store.baskets[userId]

  if (!basket) {
    basket = {
      userId,
      items: {}
    }
    store.baskets[userId] = basket
  }

  basket.items = basket.items || {}
  basket.items[req.body.id] = {
    amount: parseInt(req.body.amount),
    name: req.body.name
  }

  console.log(store.baskets[userId])

  res.status(201)
    .redirect(`basket`)
})

app.use((req, res, next) =>
  res.status(404).render('404'))

app.use((error, req, res, next) => {
  console.log(error)
  res.status(500).render('500', { error })
})

console.log(`start listening on port ${process.env.PORT}`)
app.listen(process.env.PORT)
