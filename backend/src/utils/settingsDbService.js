import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Path to new configuration database
const serviceDbPath = path.join(__dirname, '../../config/servise_db.sqlite');

export class SettingsDBService {
    /**
     * Initializes a connection to the servise_db.sqlite database.
     */
    static connect() {
        const dir = path.dirname(serviceDbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(serviceDbPath, (err) => {
                if (err) reject(err);
                else resolve(db);
            });
        });
    }

    /**
     * Creates a table to store delay profiles if one does not already exist
     */
    static async initDB() {
        const db = await this.connect();
        return new Promise((resolve, reject) => {
            db.run(
                `
                CREATE TABLE IF NOT EXISTS delay_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    profileName TEXT UNIQUE,
                    delays TEXT
                )
            `,
                (err) => {
                    db.close();
                    if (err) reject(err);
                    else resolve();
                },
            );
        });
    }

    /**
     * Saves or updates an existing profile by name
     */
    static async saveProfile(profileName, delays) {
        const db = await this.connect();
        const delaysJson = JSON.stringify(delays);

        return new Promise((resolve, reject) => {
            // We use UPSERT logic: if the profile exists - update it, if not - create it
            const query = `
                INSERT INTO delay_profiles (profileName, delays) 
                VALUES (?, ?) 
                ON CONFLICT(profileName) DO UPDATE SET delays = excluded.delays
            `;

            db.run(query, [profileName, delaysJson], function (err) {
                db.close();
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /**
     * Gets all saved profiles
     */
    static async getProfiles() {
        const db = await this.connect();
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM delay_profiles ORDER BY profileName ASC`,
                [],
                (err, rows) => {
                    db.close();
                    if (err) reject(err);
                    else {
                        const profiles = rows.map((row) => ({
                            id: row.id,
                            profileName: row.profileName,
                            delays: JSON.parse(row.delays),
                        }));
                        resolve(profiles);
                    }
                },
            );
        });
    }
}
