import express from "express";

const router = express.Router();

router.post("/create", (req, res) => {
  res.send("User created");
});

export default router;