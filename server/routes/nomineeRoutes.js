const express = require("express");
const router = express.Router();

const {
  saveNominee,
  getNominees,
  saveAllocation,
  deleteNominee,
} = require("../controllers/nomineeController");

router.post("/save", saveNominee);
router.get("/:application_id", getNominees);
router.post("/allocation", saveAllocation);
router.delete("/:nominee_id", deleteNominee);

module.exports = router;
