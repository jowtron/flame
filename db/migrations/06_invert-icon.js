const { DataTypes } = require('sequelize');
const { BOOLEAN } = DataTypes;

const up = async (query) => {
  // Check if column exists before adding to avoid errors on re-run
  const appsTableInfo = await query.describeTable('apps');
  if (!appsTableInfo.invertIcon) {
    await query.addColumn('apps', 'invertIcon', {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }

  const bookmarksTableInfo = await query.describeTable('bookmarks');
  if (!bookmarksTableInfo.invertIcon) {
    await query.addColumn('bookmarks', 'invertIcon', {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }
};

const down = async (query) => {
  await query.removeColumn('apps', 'invertIcon');
  await query.removeColumn('bookmarks', 'invertIcon');
};

module.exports = {
  up,
  down,
};
