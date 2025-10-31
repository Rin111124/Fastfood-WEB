'use strict';
module.exports = (sequelize, DataTypes) => {
  const News = sequelize.define('News', {
    news_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    title: { type: DataTypes.STRING(200), allowNull:false },
    content: DataTypes.TEXT('long'),
    image_url: DataTypes.STRING(500)
  }, { tableName:'news', underscored:true, timestamps:true, paranoid:true });
  return News;
};
