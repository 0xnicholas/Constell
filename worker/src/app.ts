import express from "express";

const app = express();
const PORT = process.env.PORT || 3030;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "worker" });
});

app.listen(PORT, () => {
  console.log(`Worker listening on port ${PORT}`);
});
