const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const productController = require('../controllers/productController')

router.get('/', auth, productController.list)
router.post('/', auth, productController.create)
router.put('/:id', auth, productController.update)
router.delete('/:id', auth, productController.remove)

module.exports = router
