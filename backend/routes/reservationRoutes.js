const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const reservationController = require("../controllers/reservationController");

router.get("/", auth, reservationController.list);
router.get("/history", auth, reservationController.history);
router.post("/", auth, reservationController.create);
router.put("/:id", auth, reservationController.update);
router.delete("/:id", auth, reservationController.remove);

module.exports = router;
