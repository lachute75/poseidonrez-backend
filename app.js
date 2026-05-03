const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// 🛒 panier
let cart = [];

// 🛍️ produits
const products = [
  { id: 1, name: "Produit 1", price: 10 },
  { id: 2, name: "Produit 2", price: 20 },
  { id: 3, name: "Produit 3", price: 15 }
];

// ➕ ajouter produit
function addToCart(product) {
  const existing = cart.find(p => p.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  updateCartUI();
}

// ❌ supprimer produit
function removeFromCart(id) {
  cart = cart.filter(p => p.id !== id);
  updateCartUI();
}

// 🧾 update panier UI
function updateCartUI() {
  const box = document.getElementById("cartBox");

  if (!box) return;

  if (cart.length === 0) {
    box.innerHTML = "🛒 Panier vide";
    return;
  }

  let total = 0;
  let html = "🛒 <b>Panier</b><br><br>";

  cart.forEach(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;

    html += `
      • ${item.name} x${item.qty} = ${itemTotal}€ 
      <button onclick="removeFromCart(${item.id})">❌</button>
      <br>
    `;
  });

  html += `<br><b>Total : ${total}€</b>`;

  box.innerHTML = html;
}

// 🛍️ afficher produits
function renderProducts() {
  const container = document.getElementById("products");

  if (!container) return;

  products.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";

    const safeData = JSON.stringify(p).replace(/"/g, "&quot;");

    div.innerHTML = `
      <h3>${p.name}</h3>
      <p>Prix : ${p.price}€</p>
      <button onclick='addToCart(${JSON.stringify(p)})'>
        Ajouter
      </button>
    `;

    container.appendChild(div);
  });
}

// 💳 🪙 CHECKOUT MULTI-CRYPTO
async function checkout() {

  if (cart.length === 0) {
    alert("Panier vide ❌");
    return;
  }

  const total = cart.reduce((s, p) => s + (p.price * p.qty), 0);

  const message = `
🪙 PAIEMENT POSÉIDONREZ

💰 Total : ${total}€

Choisis ta crypto 👇

────────────────────

💱 USDT (TRC20)
TXXXXXXXUSDT_WALLET

💱 USDC (ERC20)
0xXXXXXXXUSDC_WALLET

🟣 ETH (ERC20)
0xXXXXXXXETH_WALLET

🟡 BTC
bc1XXXXXXXBTC_WALLET

🟢 SOL
SolanaWalletXXXXXXXX

────────────────────

⚠️ Envoie EXACTEMENT le montant

📦 Commande en attente de paiement
  `;

  alert(message);

  try {
    // 📡 envoi backend / Telegram
    tg.sendData(JSON.stringify({
      type: "crypto_multi_order",
      cart,
      total
    }));
  } catch (e) {
    console.error("Erreur envoi Telegram:", e);
  }

  // reset panier
  cart = [];
  updateCartUI();
}

// init
document.addEventListener("DOMContentLoaded", renderProducts);

// expose global
window.checkout = checkout;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;