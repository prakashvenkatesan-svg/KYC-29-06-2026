const express = require("express");
const { saveSchemeSelection } = require("../controllers/schemeController");

const router = express.Router();

router.post("/save", saveSchemeSelection);

module.exports = router;
