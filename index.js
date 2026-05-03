const express = require("express");
const cors = require("cors");

const app = express();

/* ⚙️ CONFIG */
app.use(cors());
app.use(express.json());

/* 🧠 DATA (TEMPORAIRE - RESET SI RESTART) */
let users = {};
let orders = [];

let products = [
  {
    id: 1,
    name: "Produit 1",
    price: 10,
    stock: 5
  },
  {
    id: 2,
    name: "Produit 2",
    price: 20,
    stock: 3
  }
];

/* 🔱 ROOT */
app.get("/", (req, res) => {
  res.send("🔱 PoseidonRez Backend ONLINE");
});

/* 👤 GET USER */
app.get("/user/:id", (req, res) => {
  const id = req.params.id;

  if (!users[id]) {
    users[id] = { balance: 100 };
  }

  res.json(users[id]);
});

/* 📦 GET PRODUCTS */
app.get("/products", (req, res) => {
  res.json(products);
});

/* 🛒 CREATE ORDER */
app.post("/order", (req, res) => {
  const { userId, cart } = req.body;

  if (!userId || !Array.isArray(cart)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  cart.forEach(item => {
    const product = products.find(p => p.name === item);

    if (!product) return;

    if (product.stock > 0) {
      product.stock -= 1;
    }
  });

  orders.push({
    id: Date.now(),
    userId,
    cart,
    date: new Date()
  });

  res.json({ success: true });
});

/* 🧑‍💼 ADMIN ADD PRODUCT */
app.post("/add-product", (req, res) => {
  const { name, price, stock } = req.body;

  if (!name || price == null || stock == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const newProduct = {
    id: Date.now(),
    name,
    price: Number(price),
    stock: Number(stock)
  };

  products.push(newProduct);

  res.json({ success: true, product: newProduct });
});

/* ❌ DELETE PRODUCT (bonus utile) */
app.delete("/product/:id", (req, res) => {
  const id = Number(req.params.id);

  products = products.filter(p => p.id !== id);

  res.json({ success: true });
});

/* 🚀 START SERVER */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔱 Server running on port ${PORT}`);
});