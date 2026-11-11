
require('dotenv').config();

const bcrypt = require('bcryptjs');
const readline = require('readline');
const pool = require('../src/db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  let connection;

  try {
    const fullName = (await ask('Admin full name: ')).trim();
    const email = (await ask('Admin email: ')).trim().toLowerCase();
    const password = await ask('Admin password (input will be visible): ');

    if (!fullName || !email || password.length < 12) {
      throw new Error(
        'Name and email are required; password must be at least 12 characters.'
      );
    }

    connection = await pool.getConnection();

    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await connection.execute(
      `INSERT INTO users
        (full_name, email, password_hash, role_id, workshop_id, active)
       VALUES (?, ?, ?, 1, NULL, 1)`,
      [fullName, email, passwordHash]
    );

    console.log('\nAdmin account created successfully.');
    console.log(`User ID: ${result.insertId}`);
    console.log(`Email: ${email}`);
    console.log('Role: Administrator (role_id = 1)');
  } finally {
    if (connection) connection.release();
    rl.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\nCould not create Admin:', error.message);
  process.exitCode = 1;
});
