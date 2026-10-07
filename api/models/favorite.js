const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Favorite extends Model { }
  Favorite.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    sequelize,
    indexes: [
      { unique: true, fields: ['userId', 'courseId'], name: 'favorites_user_course_unique' },
      { fields: ['courseId'], name: 'favorites_course_id' }
    ]
  });

  Favorite.associate = (models) => {
    Favorite.belongsTo(models.User, {
      foreignKey: { fieldName: 'userId', allowNull: false },
      onDelete: 'CASCADE'
    });
    Favorite.belongsTo(models.Course, {
      foreignKey: { fieldName: 'courseId', allowNull: false },
      onDelete: 'CASCADE'
    });
  };

  return Favorite;
};
