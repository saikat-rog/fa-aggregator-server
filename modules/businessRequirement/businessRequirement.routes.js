import express from "express";
import {
  listApprovedBusinessRequirements,
  submitBusinessRequirement,
} from "./businessRequirement.controller.js";

const router = express.Router();

// Public endpoint to submit business/campaign requirements
router.post("/", submitBusinessRequirement);
router.get("/approved", listApprovedBusinessRequirements);

export default router;
