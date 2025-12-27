const { DataTypes } = require('sequelize');
const { STRING } = DataTypes;

const up = async (query) => {
  // Check if column exists before adding to avoid errors on re-run
  const appsTableInfo = await query.describeTable('apps');
  if (!appsTableInfo.faviconUrl) {
    await query.addColumn('apps', 'faviconUrl', {
      type: STRING,
      allowNull: true,
      defaultValue: null,
    });
  }

  const bookmarksTableInfo = await query.describeTable('bookmarks');
  if (!bookmarksTableInfo.faviconUrl) {
    await query.addColumn('bookmarks', 'faviconUrl', {
      type: STRING,
      allowNull: true,
      defaultValue: null,
    });
  }
};

const down = async (query) => {
  await query.removeColumn('apps', 'faviconUrl');
  await query.removeColumn('bookmarks', 'faviconUrl');
};

module.exports = {
  up,
  down,
};
