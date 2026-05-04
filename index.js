const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const app = express();

/* ⚙️ CONFIG */
app.use(cors());
app.use(express.json());

/* 🔌 MONGODB */
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("🔱 MongoDB connecté"))
  .catch(err => console.error("❌ MongoDB error:", err));

/* 📦 PRODUCT MODEL */
const Product = mongoose.model("Product", {
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },

  image: String,
  city: String,
  age: String,
  origin: String,
  rezName: String,
  rezDate: String
});

/* 🧑 USER */
const User = mongoose.model("User", {
  userId: String,
  balance: { type: Number, default: 100 }
});

/* 🛒 ORDER */
const Order = mongoose.model("Order", {
  userId: String,
  cart: Array,
  total: Number,
  paymentId: String,
  status: { type: String, default: "pending" },
  date: { type: Date, default: Date.now }
});

/* 🟢 ROOT */
app.get("/", (req, res) => {
  res.send("🔱 PoseidonRez Backend ONLINE");
});

/* 👤 USER */
app.get("/user/:id", async (req, res) => {
  try {
    let user = await User.findOne({ userId: req.params.id });

    if (!user) {
      user = await User.create({ userId: req.params.id });
    }

    res.json(user);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* 📦 PRODUCTS */
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* 🧑‍💼 ADD PRODUCT */
app.post("/add-product", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.json(product);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* 💳 CREATE PAYMENT */
app.post("/create-payment", async (req, res) => {
  try {
    const { userId, cart } = req.body;

    if (!userId || !Array.isArray(cart)) {
      return res.status(400).json({ error: "Invalid data" });
    }

    let total = 0;

    for (let item of cart) {
      const product = await Product.findOne({ name: item });
      if (product) total += product.price;
    }

    const response = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      {
        price_amount: total,
        price_currency: "eur",
        pay_currency: "btc"
      },
      {
        headers: {
          "x-api-key": process.env.NOWPAYMENTS_API_KEY
        }
      }
    );

    const order = await Order.create({
      userId,
      cart,
      total,
      paymentId: response.data.id,
      status: "pending"
    });

    res.json({
      invoice_url: response.data.invoice_url,
      orderId: order._id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "payment error" });
  }
});

/* 🔔 WEBHOOK (TRÈS IMPORTANT) */
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;

    console.log("Webhook reçu :", data);

    if (data.payment_status === "finished") {

      const order = await Order.findOne({
        paymentId: data.payment_id
      });

      if (order && order.status !== "paid") {
        order.status = "paid";
        await order.save();

        // 🔥 réduire stock après paiement
        for (let item of order.cart) {
          await Product.updateOne(
            { name: item },
            { $inc: { stock: -1 } }
          );
        }

        console.log("✅ Paiement confirmé + stock mis à jour");
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/* 🛒 ORDER MANUEL (option) */
app.post("/order", async (req, res) => {
  try {
    const { userId, cart } = req.body;

    await Order.create({
      userId,
      cart,
      status: "manual"
    });

    res.json({ success: true });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* 🚀 START */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔱 Server ON port ${PORT}`);
});