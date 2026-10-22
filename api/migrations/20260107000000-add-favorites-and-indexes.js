'use strict';

// Idempotent: the API also runs sequelize.sync() on start-up, which may already have created these objects.
const hasIndex = async (queryInterface, table, name) => {
  const indexes = await queryInterface.showIndex(table);
  return indexes.some(index => index.name === name);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('Favorites')) {
      await queryInterface.createTable('Favorites', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        courseId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Courses', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

    const indexes = [
      ['Favorites', ['userId', 'courseId'], 'favorites_user_course_unique', true],
      ['Favorites', ['courseId'], 'favorites_course_id', false],
      ['Courses', ['title'], 'courses_title', false],
      ['Courses', ['userId'], 'courses_user_id', false]
    ];
    for (const [table, fields, name, unique] of indexes) {
      if (!(await hasIndex(queryInterface, table, name))) {
        await queryInterface.addIndex(table, fields, { name, unique });
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Favorites');
    for (const name of ['courses_title', 'courses_user_id']) {
      if (await hasIndex(queryInterface, 'Courses', name)) {
        await queryInterface.removeIndex('Courses', name);
      }
    }
  }
};
