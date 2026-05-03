const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let users = {};
let orders = [];

// 👤 USER
app.get("/user/:id", (req, res) => {
  const id = req.params.id;

  if (!users[id]) {
    users[id] = { balance: 100 };
  }

  res.json(users[id]);
});

// 🛒 ORDER
app.post("/order", (req, res) => {
  const { userId, cart } = req.body;

  orders.push({
    userId,
    cart,
    date: new Date()
  });

  res.json({ success: true });
});

// TEST
app.get("/", (req, res) => {
  res.send("🔱 PoseidonRez Backend ONLINE");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server ON 🔥");
});