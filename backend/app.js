const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const authRoutes = require('./routes/authRoutes')
const courtRoutes = require('./routes/courtRoutes')
const reservationRoutes = require('./routes/reservationRoutes')
const productRoutes = require('./routes/productRoutes')
const saleRoutes = require('./routes/saleRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const userRoutes = require('./routes/userRoutes')
const errorHandler = require('./middlewares/errorHandler')

const app = express()
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/auth', authRoutes)
app.use('/api/courts', courtRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/products', productRoutes)
app.use('/api/sales', saleRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/users', userRoutes)

app.use(errorHandler)

module.exports = app
