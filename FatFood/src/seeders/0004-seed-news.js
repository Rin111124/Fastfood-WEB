'use strict';
module.exports = {
  async up (qi, Sequelize) {
    const now = new Date();
    await qi.bulkInsert('news', [
      { title: 'Khai trương chi nhánh mới', content: 'Giảm 20% tuần đầu tiên!', image_url: '/img/news1.jpg', created_at: now, updated_at: now },
      { title: 'Menu mùa hè', content: 'Đồ uống mát lạnh lên kệ', image_url: '/img/news2.jpg', created_at: now, updated_at: now }
    ]);
  },
  async down (qi, Sequelize) {
    await qi.bulkDelete('news', null, {});
  }
};
