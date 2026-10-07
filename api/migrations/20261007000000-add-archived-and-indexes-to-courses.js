'use strict';

const TABLE = 'Courses';

const INDEXES = [
  { name: 'courses_title', fields: ['title'] },
  { name: 'courses_created_at', fields: ['createdAt'] },
  { name: 'courses_archived_user_id', fields: ['archived', 'userId'] },
];

// Both directions are idempotent: the app runs `up` on startup so existing
// databases (where sequelize.sync() will not alter tables) pick up the change.
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable(TABLE);
    if (!columns.archived) {
      await queryInterface.addColumn(TABLE, 'archived', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    const existing = (await queryInterface.showIndex(TABLE)).map((i) => i.name);
    for (const index of INDEXES) {
      if (!existing.includes(index.name)) {
        await queryInterface.addIndex(TABLE, index.fields, { name: index.name });
      }
    }
  },

  async down(queryInterface) {
    const existing = (await queryInterface.showIndex(TABLE)).map((i) => i.name);
    for (const index of INDEXES) {
      if (existing.includes(index.name)) {
        await queryInterface.removeIndex(TABLE, index.name);
      }
    }

    const columns = await queryInterface.describeTable(TABLE);
    if (columns.archived) {
      await queryInterface.removeColumn(TABLE, 'archived');
    }
  },
};
