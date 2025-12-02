import { Reminder } from "./service/reminder.service";
import { Simas } from "./service/simas.service";

async function bootstrap() {
    try {
        const reminders = await Reminder.getReminder();
        const payloads = [];
        for (const reminder of reminders) {

            const asset = await Simas.getAssetById(reminder.asset_id);
            const employee = await Simas.getEmployeeById(reminder.employee_id);

            const payload = {
                d: reminder.id,
                asset,
                employee,
                due_date: reminder.date,
            };

            payloads.push(payload);
        }

        console.log(payloads);
    } catch (error) {
        console.error("Error running cron:", error);
    }
}

bootstrap().then(() => process.exit(0));
