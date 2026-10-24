require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'local-demo-secret-change-me';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'pudina-pay.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'user',
 balance INTEGER NOT NULL DEFAULT 50000,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS transactions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 type TEXT NOT NULL,
 amount INTEGER NOT NULL,
 note TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'SIMULATED',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS notifications (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 message TEXT NOT NULL,
 read INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
`);
function ensureUser(name, email, password, role) {
 const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
 if (!existing) {
   const hash = bcrypt.hashSync(password, 10);
   const info = db.prepare('INSERT INTO users(name,email,password_hash,role,balance) VALUES(?,?,?,?,?)')
     .run(name, email.toLowerCase(), hash, role, 50000);
   db.prepare('INSERT INTO notifications(user_id,message) VALUES(?,?)').run(info.lastInsertRowid, 'Welcome to Pudina Pay demo. No real money is moved.');
 }
}
ensureUser('Pudina Pay Admin', process.env.ADMIN_EMAIL || 'admin@pudinapay.demo', process.env.ADMIN_PASSWORD || 'DemoAdmin123!', 'admin');
ensureUser('Demo User', 'user@pudinapay.demo', 'DemoUser123!', 'user');

app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

function auth(req, res, next) {
 const header = req.headers.authorization || '';
 const token = header.startsWith('Bearer ') ? header.slice(7) : '';
 try {
   if (!token) throw new Error('missing');
   req.user = jwt.verify(token, JWT_SECRET);
   next();
 } catch { res.status(401).json({ error: 'Please log in again.' }); }
}
function adminOnly(req, res, next) {
 if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
 next();
}
function notify(userId, message) {
 db.prepare('INSERT INTO notifications(user_id,message) VALUES(?,?)').run(userId, message);
}
function userPublic(user) {
 return { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance };
}
app.get('/api/health', (req,res)=>res.json({ok:true, app:'Pudina Pay', mode:'DEMO_ONLY', realMoney:false}));

app.post('/api/auth/register', (req,res) => {
 const {name,email,password} = req.body || {};
 if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8)
   return res.status(400).json({error:'Enter a name, valid email, and password of at least 8 characters.'});
 try {
   const hash = bcrypt.hashSync(password, 10);
   const info = db.prepare('INSERT INTO users(name,email,password_hash,role,balance) VALUES(?,?,?,?,?)')
     .run(String(name).slice(0,60), email.toLowerCase(), hash, 'user', 50000);
   notify(info.lastInsertRowid, 'Welcome! Your demo wallet starts with ₹500.00 simulated balance.');
   const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
   const token = jwt.sign({id:user.id,email:user.email,role:user.role}, JWT_SECRET, {expiresIn:'12h'});
   res.json({token,user:userPublic(user)});
 } catch(e) { res.status(409).json({error:'That email may already be registered.'}); }
});
app.post('/api/auth/login', (req,res) => {
 const {email,password} = req.body || {};
 const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(email||'').toLowerCase());
 if (!user || !bcrypt.compareSync(String(password||''), user.password_hash))
   return res.status(401).json({error:'Email or password is incorrect.'});
 const token = jwt.sign({id:user.id,email:user.email,role:user.role}, JWT_SECRET, {expiresIn:'12h'});
 res.json({token,user:userPublic(user)});
});
app.get('/api/me', auth, (req,res) => {
 const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
 if (!user) return res.status(404).json({error:'User not found.'});
 res.json({user:userPublic(user)});
});
app.get('/api/transactions', auth, (req,res) => {
 const rows = db.prepare('SELECT id,type,amount,note,status,created_at FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 100').all(req.user.id);
 res.json({transactions:rows});
});
app.post('/api/wallet/add-demo', auth, (req,res) => {
 const amount = Number(req.body?.amount);
 if (!Number.isInteger(amount) || amount < 100 || amount > 1000) return res.status(400).json({error:'Enter a demo amount between ₹1 and ₹1,000 (whole rupees).'});
 const cents = amount * 100;
 const tx = db.transaction(() => {
   db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(cents, req.user.id);
   db.prepare("INSERT INTO transactions(user_id,type,amount,note,status) VALUES(?,?,?,?, 'SIMULATED')").run(req.user.id,'CREDIT',cents, 'Demo top-up — not real money');
   notify(req.user.id, `₹${amount.toFixed(2)} demo balance added. No real payment occurred.`);
 });
 tx();
 res.json({message:'Demo balance updated; no real money moved.'});
});
app.post('/api/wallet/send-demo', auth, (req,res) => {
 const amount = Number(req.body?.amount);
 const recipientEmail = String(req.body?.recipientEmail || '').toLowerCase();
 if (!Number.isInteger(amount) || amount < 1 || amount > 100000) return res.status(400).json({error:'Enter a valid whole-rupee demo amount.'});
 const recipient = db.prepare('SELECT * FROM users WHERE email=?').get(recipientEmail);
 const sender = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
 if (!recipient) return res.status(404).json({error:'Recipient is not registered in this demo app.'});
 if (recipient.id === sender.id) return res.status(400).json({error:'Choose another demo account.'});
 const cents = amount * 100;
 if (sender.balance < cents) return res.status(400).json({error:'Insufficient simulated balance.'});
 const tx = db.transaction(() => {
   db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(cents, sender.id);
   db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(cents, recipient.id);
   db.prepare("INSERT INTO transactions(user_id,type,amount,note,status) VALUES(?,?,?,?, 'SIMULATED')").run(sender.id,'DEBIT',cents,`Demo transfer to ${recipient.email} — not real money`);
   db.prepare("INSERT INTO transactions(user_id,type,amount,note,status) VALUES(?,?,?,?, 'SIMULATED')").run(recipient.id,'CREDIT',cents,`Demo transfer from ${sender.email} — not real money`);
   notify(sender.id, `Demo transfer of ₹${amount.toFixed(2)} to ${recipient.email}; no real money moved.`);
   notify(recipient.id, `Received ₹${amount.toFixed(2)} demo balance from ${sender.email}; no real money moved.`);
 });
 tx();
 res.json({message:'Demo transfer completed in the simulator only.'});
});
app.get('/api/notifications', auth, (req,res) => {
 res.json({notifications:db.prepare('SELECT id,message,read,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50').all(req.user.id)});
});
app.post('/api/notifications/:id/read', auth, (req,res) => {
 db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(Number(req.params.id),req.user.id);
 res.json({ok:true});
});
app.get('/api/admin/overview', auth, adminOnly, (req,res) => {
 const users = db.prepare('SELECT id,name,email,role,balance,created_at FROM users ORDER BY id DESC LIMIT 100').all();
 const transactions = db.prepare(`SELECT t.id,t.type,t.amount,t.note,t.status,t.created_at,u.email
 FROM transactions t JOIN users u ON u.id=t.user_id ORDER BY t.id DESC LIMIT 100`).all();
 const stats = {
   users: db.prepare('SELECT COUNT(*) n FROM users').get().n,
   transactions: db.prepare('SELECT COUNT(*) n FROM transactions').get().n,
   simulatedVolume: db.prepare("SELECT COALESCE(SUM(amount),0) n FROM transactions WHERE type='CREDIT'").get().n
 };
 res.json({stats,users,transactions,mode:'DEMO_ONLY'});
});
app.get('*', (req,res) => res.sendFile(path.join(__dirname,'..','web','index.html')));
app.listen(PORT, () => console.log(`Pudina Pay demo running on http://localhost:${PORT}`));
