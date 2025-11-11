import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkNewsTable() {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/config/config.json'), 'utf8'));
    const env = process.env.NODE_ENV || 'development';
    const dbConfig = config[env];

    const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
      host: dbConfig.host,
      dialect: dbConfig.dialect
    });

    await sequelize.authenticate();
    console.log('Database connected successfully.');

    const [results] = await sequelize.query('DESCRIBE news');
    console.log('News table structure:', JSON.stringify(results, null, 2));

    await sequelize.close();
  } catch (error) {
    console.error('Check failed:', error);
    process.exit(1);
  }
}

checkNewsTable();