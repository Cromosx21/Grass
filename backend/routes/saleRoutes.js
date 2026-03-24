const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const saleController = require("../controllers/saleController");

router.get("/", auth, saleController.list);
router.get("/history", auth, saleController.history);
router.post("/", auth, saleController.create);

module.exports = router;
