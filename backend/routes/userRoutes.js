const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const userController = require("../controllers/userController");

router.get("/", auth, userController.list);
router.put("/:id", auth, userController.update);

module.exports = router;

