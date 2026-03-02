const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

const port = process.env.PORT || 4000
const mongoUri = process.env.MONGO_URI || ''

async function start() {
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri)
      console.log('Connected to MongoDB')
    } catch (err) {
      console.error('MongoDB connection error', err)
    }
  } else {
    console.warn('MONGO_URI not set, skipping MongoDB connection')
  }

  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`)
  })
}

start()

