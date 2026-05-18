import express from "express";
import { submitBusinessRequirement } from "./businessRequirement.controller.js";

const router = express.Router();

// Public endpoint to submit business/campaign requirements
router.post("/", submitBusinessRequirement);

export default router;
