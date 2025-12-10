import { flow } from "../config/flow.db";

export class Reminder {
    static async getReminder(): Promise<any> {
        const [rows]: any = await flow.query(
            "SELECT * FROM reminders WHERE date <= CURDATE() AND is_returned = false",
        );
        return rows;
    }

    static async addReminder(
        asset_id: number,
        phone_number: string,
        employee_id: string,
        date: string
    ): Promise<boolean> {
        const [result]: any = await flow.query(
            `
            INSERT INTO reminders (
                asset_id,
                phone_number,
                employee_id,
                date
            )
            SELECT ?, ?, ?, ?
            FROM DUAL
            WHERE NOT EXISTS (
                SELECT 1
                FROM reminders
                WHERE asset_id = ?
                    AND phone_number = ?
                    AND employee_id = ?
                    AND date = ?
            )
            `,
            [
                asset_id, phone_number, employee_id, date,
                asset_id, phone_number, employee_id, date
            ]
        );

        return result.affectedRows > 0;
    }

    static async changeStatus(asset_id: number, employee_id: string): Promise<boolean> {
        const [result]: any = await flow.query(
            `
            UPDATE reminders
            SET is_returned = true
            WHERE asset_id = ?
            AND employee_id = ?
            `,
            [asset_id, employee_id]
        );
        
        return result.affectedRows > 0;
    }
}