import express from "express";

const router = express.Router();

router.post("/create", (req, res) => {
  res.json({ msg: "User created" });
});

export default router;
