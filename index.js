const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const accepts = require('accepts')
const fetch = require('node-fetch')

const config = require('./package.json').config

let products = []

// NOTE: order as its standalone domain pillar, keeps necessary
// product information redundantly in its own storage. (memory for this prototype)
//
// TODO: handle not yet loaded products for shopping basket forms
fetchProducts().then((productList) => {
  products = productList
})

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))

app.set('view engine', 'pug')

const store = { baskets: [] }

const totalPrice = (basket) => Object.keys(basket.items)
  .reduce((memo, curr) => {
    const item = basket.items[curr]
    return memo + (parseInt(item.amount) * parseFloat(item.price))
  }, 0)

app.get('/basket/new', (req, res, next) => {
  const userId = req.cookies['scs-commerce-uid']
  const basket = store.baskets[userId]
  const queryId = req.query.id && parseInt(req.query.id)

  const product = products.find(p => p.id === queryId)

  const alreadyMarked = basket && basket.items[queryId]

  product.amount = alreadyMarked ? alreadyMarked.amount : 1

  res.status(200).render('add-to-basket', { product, alreadyMarked })
})

app.get('/basket', (req, res) => {
  const accept = accepts(req)
  const userId = req.cookies['scs-commerce-uid']

  const basket = store.baskets[userId] ? store.baskets[userId] : { userId, items: {} }

  switch (accept.type(['html', 'json'])) {
    case 'html':
      res.setHeader('Content-Type', 'text/html')
      res.status(200).render('basket', { basket, totalPrice: totalPrice(basket) })
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
    price: req.body.price,
    name: req.body.name
  }

  res.status(201)
    .redirect(`basket`)
})

app.use((req, res, next) =>
  res.status(404).render('404'))

app.use((error, req, res, next) => {
  console.log(error)
  res.status(500).render('500', { error })
})

const port = process.env.PORT || config.port
console.log(`start listening on port ${port}`)
app.listen(port)

function fetchProducts () {
  const headers = {
    'Accept': 'application/json'
  }

  const productsUrl = process.env.PRODUCTS_URL || config.services.products

  return fetch(productsUrl, { headers })
    .then(res => res.json())
    .then(content => (content.products || []))
    .then(products => products.map(p => ({ id: p.id, name: p.name, price: p.price })))
    .catch(e => console.log(e))
}
