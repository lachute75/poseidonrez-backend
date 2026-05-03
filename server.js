const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("🔱 PoseidonRez Backend ONLINE");
});

app.get("/test", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server ON 🔥");
});
