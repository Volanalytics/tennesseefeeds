const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET || 'REPLACE_THIS_SECRET';

const transporter = nodemailer.createTransport({
  service: 'SendGrid', // or your SMTP provider
  auth: {
    user: process.env.SENDGRID_USER,
    pass: process.env.SENDGRID_PASS
  }
});

async function registerUser(req, res, supabase) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required." });

  const { data: existing } = await supabase.from('users').select('*').eq('email', email).single();
  if (existing) return res.status(409).json({ success: false, error: "Email already registered." });

  const hashed_password = await bcrypt.hash(password, 10);
  const verification_token = crypto.randomBytes(32).toString('hex');
  const { data: user, error } = await supabase.from('users').insert({
    email,
    hashed_password,
    username: "Anonymous",
    is_anonymous: false,
    is_email_verified: false,
    email_verification_token: verification_token
  }).select().single();
  if (error) return res.status(500).json({ success: false, error: error.message });

  const verification_link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email.html?token=${verification_token}&email=${encodeURIComponent(email)}`;
  await transporter.sendMail({
    to: email,
    from: process.env.FROM_EMAIL || "noreply@tennesseefeeds.com",
    subject: "Verify your email",
    html: `<p>Click <a href="${verification_link}">here</a> to verify your email for TennesseeFeeds.</p>`
  });

  res.json({ success: true, message: "Registration successful. Please check your email to verify." });
}

async function verifyEmail(req, res, supabase) {
  const { email, token } = req.query;
  if (!email || !token) return res.status(400).send('Invalid link.');

  const { data: user } = await supabase.from('users').select('*').eq('email', email).eq('email_verification_token', token).single();
  if (!user) return res.status(400).send('Invalid or expired token.');

  await supabase.from('users').update({
    is_email_verified: true,
    email_verification_token: null
  }).eq('id', user.id);

  res.send('Email verified! You can now log in and change your username.');
}

async function loginUser(req, res, supabase) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required." });

  const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
  if (!user || !user.is_email_verified) return res.status(401).json({ success: false, error: "Invalid credentials or email not verified." });

  const match = await bcrypt.compare(password, user.hashed_password);
  if (!match) return res.status(401).json({ success: false, error: "Invalid credentials." });

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "14d" });
  res.json({ success: true, token, user: { id: user.id, email: user.email, username: user.username } });
}

function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ success: false, error: "No token." });
  const token = auth.slice(7);
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid token." });
  }
}

async function updateUsername(req, res, supabase) {
  const { username } = req.body;
  if (!username || !username.trim()) return res.status(400).json({ success: false, error: "Username required." });

  const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).single();
  if (!user || user.is_anonymous || !user.is_email_verified) {
    return res.status(403).json({ success: false, error: "Email verification required to change username." });
  }

  const { error: updateError } = await supabase.from('users').update({ username: username.trim() }).eq('id', req.user.id);
  if (updateError) return res.status(500).json({ success: false, error: updateError.message });
  res.json({ success: true });
}

module.exports = {
  registerUser,
  verifyEmail,
  loginUser,
  authenticateJWT,
  updateUsername
};