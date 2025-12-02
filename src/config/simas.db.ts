import { createPool, type Pool } from 'mysql2/promise'
import {
    SIMAS_DB_HOST,
    SIMAS_DB_NAME,
    SIMAS_DB_PASSWORD,
    SIMAS_DB_POOL,
    SIMAS_DB_PORT,
    SIMAS_DB_USER,
} from './config'

export const simas: Pool = createPool({
    host: SIMAS_DB_HOST,
    port: Number(SIMAS_DB_PORT),
    user: SIMAS_DB_USER,
    password: SIMAS_DB_PASSWORD,
    database: SIMAS_DB_NAME,
    connectionLimit: Number(SIMAS_DB_POOL),
    waitForConnections: true,
    queueLimit: 0,
})

export async function checkConnection() {
    try {
        const connection = await simas.getConnection()
        await connection.query('SELECT 1')
        connection.release()
        console.log('Simas DB connection OK')
        return true
    } catch (error) {
        console.error('Simas DB connection FAILED:', error)
        return false
    }
}