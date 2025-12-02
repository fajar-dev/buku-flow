// service/simas.ts
import { pool } from "../config/db";

export class Simas {
    static async employee(phone: number): Promise<any> {
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
                    AND ah.returned_at IS NULL
                WHERE a.status = 'active'
                AND c.name LIKE 'buku'
                AND ah.asset_id IS NULL
                ORDER BY a.name ASC`
        );
        return rows;
    }

    static async getBorrowedBooksByEmployee(employee_id: string): Promise<any> {
        const [rows]: any = await pool.query(
            `SELECT a.id, a.code, a.name
                FROM assets a
                JOIN sub_categories sc ON sc.id = a.sub_category_id
                JOIN categories c ON c.id = sc.category_id
                JOIN asset_holders ah ON ah.asset_id = a.id 
                    AND ah.employee_id = ?
                    AND ah.returned_at IS NULL
                WHERE a.status = 'active'
                AND c.name LIKE 'buku'
                ORDER BY a.name ASC`,
            [employee_id]
        );
        return rows;
    }

    static async addHolder(
        asset_id: number,
        employee_id: string,
        purpose: string,
    ): Promise<boolean> {
        const [result]: any = await pool.query(
            `
            INSERT INTO asset_holders (
                asset_holder_uuid,
                asset_id,
                employee_id,
                assigned_at,
                purpose
            )
            SELECT ?, ?, ?, NOW(), ?
            FROM DUAL
            WHERE NOT EXISTS (
                SELECT 1
                FROM asset_holders
                WHERE asset_id = ?
                AND returned_at IS NULL
            )
            `,
            [
                Bun.randomUUIDv7(),
                asset_id,
                employee_id,
                purpose,
                asset_id,
            ]
        );

        return result.affectedRows > 0;
    }

    static async returnBook(asset_id: number, employee_id: string): Promise<boolean> {
        const [result]: any = await pool.query(
            `
            UPDATE asset_holders
            SET returned_at = NOW()
            WHERE asset_id = ?
            AND employee_id = ?
            AND returned_at IS NULL
            `,
            [asset_id, employee_id]
        );

        return result.affectedRows > 0;
    }
}
