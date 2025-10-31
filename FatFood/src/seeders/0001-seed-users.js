'use strict';
const bcrypt = require('bcryptjs');
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const salt = bcrypt.genSaltSync(10);
    await queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        password: bcrypt.hashSync('admin123', salt),
        email: 'admin@fastfood.local',
        role: 'admin',
        created_at: now, updated_at: now
      },
      {
        username: 'alice',
        password: bcrypt.hashSync('alice123', salt),
        email: 'alice@example.com',
        role: 'customer',
        created_at: now, updated_at: now
      }
    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { username: ['admin', 'alice'] });
  }
};
