require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 clés crypto (sécurisées .env)
const API_KEY = process.env.NOWPAYMENTS_API_KEY;
const PUBLIC_KEY = process.env.NOWPAYMENTS_PUBLIC_KEY;

// 🧠 stockage commandes (temporaire)
let orders = [];

/*
🪙 CREATE ORDER + PAYMENT CRYPTO AUTO
*/
app.post("/create-order", async (req, res) => {
  const { cart, total, crypto } = req.body;

  try {
    const response = await axios.post(
      "https://api.nowpayments.io/v1/payment",
      {
        price_amount: total,
        price_currency: "eur",
        pay_currency: crypto,
        order_id: Date.now().toString(),
      },
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );

    const payment = response.data;

    const order = {
      id: payment.order_id,
      pay_address: payment.pay_address,
      pay_amount: payment.pay_amount,
      crypto,
      cart,
      total,
      status: "waiting_payment",
    };

    orders.push(order);

    res.json(order);

  } catch (err) {
    console.error("Erreur payment:", err.response?.data || err.message);
    res.status(500).json({ error: "payment_failed" });
  }
});

/*
📦 GET ORDER STATUS
*/
app.get("/order/:id", (req, res) => {
  const order = orders.find(o => o.id == req.params.id);

  if (!order) {
    return res.json({ error: "not_found" });
  }

  res.json(order);
});

/*
📡 WEBHOOK AUTO (paiement confirmé blockchain)
*/
app.post("/ipn", (req, res) => {
  const payment = req.body;

  console.log("💰 IPN reçu:", payment);

  const order = orders.find(o => o.id == payment.order_id);

  if (order) {
    order.status = payment.payment_status; // finished / confirming / failed
  }

  res.sendStatus(200);
});

/*
🚀 SERVER START
*/
app.listen(3000, () => {
  console.log("🔥 PoseidonRez backend running on https://poseidonrez-backend.onrender.com");
});
