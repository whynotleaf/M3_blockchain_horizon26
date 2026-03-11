const express = require("express");
const router  = express.Router();
const { store } = require("../models/store");

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = store.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Frontend expects { user: { ... } }
  res.json({
    user: {
      id:      user.id,
      name:    user.name,
      email:   user.email,
      role:    user.role,
      address: user.address
    }
  });
});

// GET /api/auth/users — demo users
router.get("/users", (req, res) => {
  res.json(store.users);
});

// GET /api/auth/me/:userId
router.get("/me/:userId", (req, res) => {
  const user = store.users.find(u => u.id === req.params.userId || u.address === req.params.userId);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

module.exports = router;
