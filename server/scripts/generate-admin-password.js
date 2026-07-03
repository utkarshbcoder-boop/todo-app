#!/usr/bin/env node

/**
 * Helper script to generate hashed passwords for admin panel
 * Usage: node scripts/generate-admin-password.js YOUR_PASSWORD
 */

import bcrypt from 'bcryptjs'

const password = process.argv[2]

if (!password) {
  console.error('Usage: node scripts/generate-admin-password.js YOUR_PASSWORD')
  console.error('Example: node scripts/generate-admin-password.js MySecurePassword123')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 12)
console.log('\nGenerated password hash:')
console.log(hash)
console.log('\nAdd this to your .env file:')
console.log(`ADMIN_PANEL_PASSWORD_HASH=${hash}`)
