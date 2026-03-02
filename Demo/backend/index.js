const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const authRoutes = require('./routes/auth')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)

const port = process.env.PORT || 4000
const mongoUri = process.env.MONGO_URI || ''

async function start() {
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri)
      // eslint-disable-next-line no-console
      console.log('Connected to MongoDB')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('MongoDB connection error', err)
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('MONGO_URI not set, skipping MongoDB connection')
  }

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${port}`)
  })
}

start()

