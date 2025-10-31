'use strict';
module.exports = {
  async up (qi, Sequelize) {
    const now = new Date();
    const [cats] = await qi.sequelize.query('SELECT category_id, category_name FROM products_category;');
    const idOf = (name) => cats.find(c=>c.category_name===name)?.category_id || null;

    await qi.bulkInsert('products', [
      { name: 'Cheese Burger', description: 'Bánh burger phô mai', price: 55000, image_url: '/img/burger1.jpg', is_active: 1, category_id: idOf('Burgers'), created_at: now, updated_at: now },
      { name: 'Double Beef Burger', description: 'Burger bò 2 lớp', price: 69000, image_url: '/img/burger2.jpg', is_active: 1, category_id: idOf('Burgers'), created_at: now, updated_at: now },
      { name: 'French Fries', description: 'Khoai tây chiên', price: 25000, image_url: '/img/fries.jpg', is_active: 1, category_id: idOf('Sides'), created_at: now, updated_at: now },
      { name: 'Coke', description: 'Nước ngọt có ga', price: 15000, image_url: '/img/coke.jpg', is_active: 1, category_id: idOf('Drinks'), created_at: now, updated_at: now },
      { name: 'Vanilla Ice Cream', description: 'Kem vani', price: 20000, image_url: '/img/icecream.jpg', is_active: 1, category_id: idOf('Desserts'), created_at: now, updated_at: now }
    ]);
  },
  async down (qi, Sequelize) {
    await qi.bulkDelete('products', null, {});
  }
};
