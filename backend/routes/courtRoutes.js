const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const courtController = require('../controllers/courtController')

router.get('/', auth, courtController.list)
router.post('/', auth, courtController.create)
router.put('/:id', auth, courtController.update)
router.delete('/:id', auth, courtController.remove)

module.exports = router
