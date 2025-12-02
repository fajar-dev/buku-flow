import { createPool, type Pool } from 'mysql2/promise'
import {
    FLOW_DB_HOST,
    FLOW_DB_NAME,
    FLOW_DB_PASSWORD,
    FLOW_DB_POOL,
    FLOW_DB_PORT,
    FLOW_DB_USER,
} from './config'

export const flow: Pool = createPool({
    host: FLOW_DB_HOST,
    port: Number(FLOW_DB_PORT),
    user: FLOW_DB_USER,
    password: FLOW_DB_PASSWORD,
    database: FLOW_DB_NAME,
    connectionLimit: Number(FLOW_DB_POOL),
    waitForConnections: true,
    queueLimit: 0,
})

export async function checkConnection() {
    try {
        const connection = await flow.getConnection()
        await connection.query('SELECT 1')
        connection.release()
        console.log('Flow DB connection OK')
        return true
    } catch (error) {
        console.error('Flow DB connection FAILED:', error)
        return false
    }
}