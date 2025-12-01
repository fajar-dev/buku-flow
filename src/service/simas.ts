// service/simas.ts
import { pool } from "../config/db";

export class Simas {
    static async employee(phone:number): Promise<any> {
        const [rows]: any = await pool.query(
            "SELECT id_employee, full_name FROM employees WHERE mobile_phone = ? LIMIT 1",
            [phone]
        );
        return rows[0];
    }

    static async getReadyBooks(): Promise<any> {
        const [rows]: any = await pool.query(
            `SELECT a.id, a.code, a.name
            FROM assets a
            JOIN sub_categories sc ON sc.id = a.sub_category_id
            JOIN categories c ON c.id = sc.category_id
            LEFT JOIN asset_holders ah ON ah.asset_id = a.id
            WHERE a.status = 'active'
            AND c.name = 'buku'
            AND ah.asset_id IS NULL`
        );
        return rows;
    }

    static async addHolder(
        asset_id: number,
        employee_id: string,
        purpose: string,
    ): Promise<boolean> {
        const [result]: any = await pool.query(
            `INSERT INTO asset_holders (asset_holder_uuid, asset_id, employee_id, assigned_at, purpose) 
            VALUES (?, ?, ?, NOW(), ?)`,
            [Bun.randomUUIDv7(), asset_id, employee_id, purpose]
        );
        return true;
    }
}