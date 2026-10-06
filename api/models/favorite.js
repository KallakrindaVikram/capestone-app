const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Favorite extends Model { }
  Favorite.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    indexes: [
      { name: 'favorites_user_course_unique', unique: true, fields: ['userId', 'courseId'] }
    ]
  });

  Favorite.associate = (models) => {
    Favorite.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
    Favorite.belongsTo(models.Course, { foreignKey: 'courseId', onDelete: 'CASCADE' });

    models.User.belongsToMany(models.Course, {
      through: Favorite,
      as: 'FavoriteCourses',
      foreignKey: 'userId',
      otherKey: 'courseId'
    });
    models.Course.belongsToMany(models.User, {
      through: Favorite,
      as: 'FavoritedByUsers',
      foreignKey: 'courseId',
      otherKey: 'userId'
    });
  }

  return Favorite;
}
