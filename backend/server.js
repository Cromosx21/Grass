require('dotenv').config()
const app = require('./app')
const { testConnection } = require('./config/db')

const PORT = process.env.PORT || 4001

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`)
  })
}).catch((err) => {
  console.error('Database connection failed', err)
  process.exit(1)
})
