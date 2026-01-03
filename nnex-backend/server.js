const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

/* ======================
   CONFIG
====================== */
const BOT_TOKEN = process.env.BOT_TOKEN || "PUT_YOUR_BOT_TOKEN_HERE";
const JWT_SECRET = process.env.JWT_SECRET || "nnex_super_secret";

/* ======================
   TELEGRAM VERIFY
====================== */
function verifyTelegramInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  return computedHash === hash;
}

/* ======================
   AUTH
====================== */
app.post("/auth/telegram", (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: "No initData" });

  if (!verifyTelegramInitData(initData))
    return res.status(401).json({ error: "Invalid Telegram data" });

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user,
  });
});

/* ======================
   PROTECTED EXAMPLE
====================== */
app.get("/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.sendStatus(401);

  try {
    const token = auth.replace("Bearer ", "");
    const payload = jwt.verify(token, JWT_SECRET);
    res.json(payload);
  } catch {
    res.sendStatus(401);
  }
});

/* ======================
   START
====================== */
app.listen(4000, () =>
  console.log("NNEX API running on http://localhost:4000")
);

