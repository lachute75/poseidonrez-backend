const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

/* =========================
   ⚙️ MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   🔌 DATABASE
========================= */
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("🔱 MongoDB connecté"))
  .catch(err => console.error("❌ MongoDB error:", err));

/* =========================
   📦 MODELS
========================= */
const Product = mongoose.model("Product", {
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  image: String,
  city: String,
  age: String,
  origin: String,
  rezName: String,
  rezDate: String,
});

const User = mongoose.model("User", {
  userId: { type: String, required: true },
  balance: { type: Number, default: 100 },
});

const Order = mongoose.model("Order", {
  userId: String,
  cart: Array,
  total: Number,
  paymentId: String,
  status: { type: String, default: "pending" },
  date: { type: Date, default: Date.now },
});

/* =========================
   🟢 ROOT
========================= */
app.get("/", (_, res) => {
  res.json({ status: "ONLINE" }); // 🔥 toujours JSON
});

/* =========================
   🔐 ADMIN LOGIN
========================= */
app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { role: "admin", email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

/* =========================
   🛡️ VERIFY ADMIN (FIX BEARER)
========================= */
function verifyAdmin(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ error: "No token" });
  }

  const token = auth.replace("Bearer ", ""); // 🔥 FIX IMPORTANT

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.admin = decoded;
    next();

  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* =========================
   👤 USER
========================= */
app.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      { $setOnInsert: { userId: req.params.id } },
      { upsert: true, new: true }
    );

    res.json(user);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   📦 PRODUCTS
========================= */
app.get("/products", async (_, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   ➕ ADD PRODUCT
========================= */
app.post("/add-product", verifyAdmin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.json(product);
  } catch {
    res.status(500).json({ error: "Create error" });
  }
});

/* =========================
   ❌ DELETE PRODUCT
========================= */
app.delete("/delete-product/:id", verifyAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Delete error" });
  }
});

/* =========================
   📊 ADMIN STATS
========================= */
app.get("/admin/stats", verifyAdmin, async (req, res) => {
  try {
    const users = await User.countDocuments();
    const orders = await Order.countDocuments();

    const revenueData = await Order.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);

    const revenue = revenueData[0]?.total || 0;

    res.json({ users, orders, revenue });

  } catch {
    res.status(500).json({ error: "Stats error" });
  }
});

/* =========================
   💳 CREATE PAYMENT
========================= */
app.post("/create-payment", async (req, res) => {
  try {
    const { userId, cart } = req.body;

    if (!userId || !Array.isArray(cart)) {
      return res.status(400).json({ error: "Invalid data" });
    }

    let total = 0;

    for (const item of cart) {
      const product = await Product.findOne({ name: item });
      if (product) total += product.price;
    }

    if (total <= 0) {
      return res.status(400).json({ error: "Empty cart" });
    }

    const response = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      {
        price_amount: total,
        price_currency: "eur",
        pay_currency: "btc",
      },
      {
        headers: {
          "x-api-key": process.env.NOWPAYMENTS_API_KEY,
        },
      }
    );

    const order = await Order.create({
      userId,
      cart,
      total,
      paymentId: response.data.id,
      status: "pending",
    });

    res.json({
      invoice_url: response.data.invoice_url,
      orderId: order._id,
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "payment error" });
  }
});

/* =========================
   🔔 WEBHOOK
========================= */
app.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-nowpayments-sig"];
    const secret = process.env.IPN_SECRET;

    if (secret && signature) {
      const hash = crypto
        .createHmac("sha512", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hash !== signature) {
        return res.status(401).send("Invalid signature");
      }
    }

    const data = req.body;

    if (data.payment_status === "finished") {
      const order = await Order.findOne({ paymentId: data.payment_id });

      if (order && order.status !== "paid") {
        order.status = "paid";
        await order.save();

        await Promise.all(
          order.cart.map(item =>
            Product.updateOne(
              { name: item },
              { $inc: { stock: -1 } }
            )
          )
        );
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/* =========================
   🚀 START
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔱 Server ON port ${PORT}`);
});