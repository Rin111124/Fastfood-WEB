'use strict';
module.exports = {
  async up(qi, Sequelize) {
    await qi.addColumn('news', 'image_data', { type: Sequelize.BLOB('long'), allowNull: true });
    await qi.addColumn('news', 'image_mime', { type: Sequelize.STRING(100), allowNull: true });
  },
  async down(qi, Sequelize) {
    await qi.removeColumn('news', 'image_data');
    await qi.removeColumn('news', 'image_mime');
  }
};