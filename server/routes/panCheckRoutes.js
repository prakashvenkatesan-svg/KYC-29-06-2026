// routes/panCheckRoutes.js
const express = require("express");
const router = express.Router();
const { checkPanInTechexcel } = require("../controllers/panCheckController");

router.post("/check-pan-account", checkPanInTechexcel);

module.exports = router;