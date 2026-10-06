const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Course extends Model { }
  Course.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'A title for the course is required.'
        },
        notEmpty: {
          msg: 'Please provide a title for the course.'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'A course description is required.'
        },
        notEmpty: {
          msg: 'Please provide a course description.'
        }
      }
    },
    estimatedTime: {
      type: DataTypes.STRING
    },
    materialsNeeded: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    // Standard b-tree indexes; SQLite LIKE '%q%' cannot use them for contains-matching, but they help
    // prefix matches, the userId filter and ownership lookups.
    indexes: [
      { name: 'courses_title', fields: ['title'] },
      { name: 'courses_user_id', fields: ['userId'] }
    ]
  });

  Course.associate = (models) => {
    Course.belongsTo(models.User, {
      foreignKey: {
        fieldName: 'userid',
      }
    });
  }

  return Course;
}