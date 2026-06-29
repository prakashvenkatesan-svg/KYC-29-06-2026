const express = require("express");

const {
  getMetrics,
  getApplications,
  getUsers,
  getRmDashboard,
  getApplicationById,
  downloadApplicationPdf,
  updateApplicationStatus,
  createReviewNote,
  getApplicationLogs,
  assignRelationshipManager,
} = require("../controllers/adminController");
const { verifyAdminToken } = require("../utils/adminAuth");

const router = express.Router();

router.use(verifyAdminToken);

router.get("/metrics", getMetrics);
router.get("/applications", getApplications);
router.get("/users", getUsers);
router.get("/rm/dashboard", getRmDashboard);
router.get("/applications/:id", getApplicationById);
router.get("/applications/:id/pdf", downloadApplicationPdf);
router.get("/applications/:id/logs", getApplicationLogs);
router.patch("/applications/:id/assign-rm", assignRelationshipManager);
router.patch("/applications/:id/status", updateApplicationStatus);
router.post("/applications/:id/remarks", createReviewNote);

module.exports = router;
