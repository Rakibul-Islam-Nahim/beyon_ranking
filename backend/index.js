const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");

const upload = multer({
  dest: path.join(__dirname, "../uploads/"), // creates /uploads if not exists
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

const app = express();
const db = new sqlite3.Database("users.db");

// Initialize database table if it doesn't exist
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
)`);

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://127.0.0.1:5500", // where your frontend runs
    credentials: true,
  })
);

app.use(
  session({
    secret: "your_super_secret_key_change_this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  })
);

// --- Serve static files from root and components/ ---
app.use(express.static(path.join(__dirname, "../")));
app.use("/components", express.static(path.join(__dirname, "../components")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Helper
function isValidMobile(mobile) {
  return typeof mobile === "string" && /^\+880\d{10}$/.test(mobile);
}

// Registration route
app.post("/register", async (req, res) => {
  const { name, email, mobile, password, confirmPassword } = req.body;
  if (!name || !email || !mobile || !password || !confirmPassword)
    return res.status(400).send("All fields are required");
  if (password.length < 6)
    return res.status(400).send("Password must be at least 6 characters");
  if (password !== confirmPassword)
    return res.status(400).send("Passwords do not match");
  if (!isValidMobile(mobile))
    return res
      .status(400)
      .send("Mobile should start with +880 and have 14 characters");
  db.get(
    "SELECT 1 FROM users WHERE email=? OR mobile=?",
    [email, mobile],
    async (err, user) => {
      if (err) return res.status(500).send("Database error");
      if (user)
        return res.status(400).send("Email or mobile already registered");
      const hash = await bcrypt.hash(password, 10);
      db.run(
        "INSERT INTO users(name, email, mobile, password_hash) VALUES (?, ?, ?, ?)",
        [name, email, mobile, hash],
        function (error) {
          if (error) return res.status(500).send("Could not create user");
          req.session.userId = this.lastID;
          res.status(200).send("Registered");
        }
      );
    }
  );
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).send("Email and password required");
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).send("Database error");
    if (!user) return res.status(401).send("Invalid credentials");
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).send("Invalid credentials");
    req.session.userId = user.id;
    res.status(200).send("Success");
  });
  console.log("Session ID:", req.sessionID);
  console.log("Session:", req.session);
});

// Logout route
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.send("Logged out");
  });
});

// Middleware to protect dashboard and other auth-required routes
app.use("/components/dashboard.html", (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/components/login.html");
  }
  next();
});

// ---- API to get current logged-in user info for dashboard ----
app.get("/api/user/me", (req, res) => {
  if (!req.session.userId) {
    console.log("Session ID:", req.sessionID);
    console.log("dashSession:", req.session);
    return res.status(401).json({ error: "Not logged in" });
  }
  db.get(
    "SELECT id, name, email, mobile, profile_img FROM users WHERE id = ?",
    [req.session.userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    }
  );
});

// -------- GET current user's settings --------
app.get("/api/user/settings", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  db.get(
    "SELECT id, name, email, mobile, profile_img FROM users WHERE id = ?",
    [req.session.userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    }
  );
});

// -------- UPDATE current user's settings --------
app.post("/api/user/settings", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const { name, email, mobile, newPassword, confirmPassword } = req.body;
  if (!name || !email || !mobile)
    return res
      .status(400)
      .json({ error: "Name, email, and mobile are required." });

  if (newPassword && newPassword.length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });

  if (newPassword && newPassword !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match." });

  // Make sure new email or mobile is not taken by another user
  db.get(
    "SELECT id FROM users WHERE (email=? OR mobile=?) AND id != ?",
    [email, mobile, req.session.userId],
    async (err, existingUser) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (existingUser)
        return res
          .status(400)
          .json({ error: "Email or mobile is already taken by another user." });

      // Prepare query & params
      let query = "UPDATE users SET name=?, email=?, mobile=?";
      let params = [name, email, mobile];
      if (newPassword) {
        const hash = await bcrypt.hash(newPassword, 10);
        query += ", password_hash=?";
        params.push(hash);
      }
      query += " WHERE id=?";
      params.push(req.session.userId);

      db.run(query, params, function (err2) {
        if (err2)
          return res.status(500).json({ error: "Failed to update profile." });
        res.json({ success: true, message: "Profile updated." });
      });
    }
  );
});

// Upload or update profile image
app.post("/api/user/profile_img", upload.single("profile_img"), (req, res) => {
  if (!req.session.userId) {
    // Remove uploaded file if request invalid
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(401).json({ error: "Not logged in" });
  }
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  // Save old profile_img for cleanup
  db.get(
    "SELECT profile_img FROM users WHERE id=?",
    [req.session.userId],
    (err, user) => {
      if (
        !err &&
        user &&
        user.profile_img &&
        fs.existsSync(path.join(__dirname, "../uploads", user.profile_img))
      ) {
        fs.unlinkSync(path.join(__dirname, "../uploads", user.profile_img));
      }
      db.run(
        "UPDATE users SET profile_img = ? WHERE id=?",
        [req.file.filename, req.session.userId],
        (err2) => {
          if (err2)
            return res.status(500).json({ error: "Failed to update image" });
          res.json({ success: true, filename: req.file.filename });
        }
      );
    }
  );
});

// API: Check if user is logged in
app.get("/api/auth/status", (req, res) => {
  res.json({ loggedIn: !!req.session.userId });
});

// Default: serve the main index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}/`);
});
