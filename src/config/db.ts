import { createPool, type Pool } from 'mysql2/promise'
import {
    DB_HOST,
    DB_NAME,
    DB_PASSWORD,
    DB_POOL,
    DB_PORT,
    DB_USER,
} from './config'

export const pool: Pool = createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectionLimit: Number(DB_POOL),
    waitForConnections: true,
    queueLimit: 0,
})

export async function checkConnection() {
    try {
        const connection = await pool.getConnection()
        await connection.query('SELECT 1')
        connection.release()
        console.log('Database connection OK')
        return true
    } catch (error) {
        console.error('Database connection FAILED:', error)
        return false
    }
}