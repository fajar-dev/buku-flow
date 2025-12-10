import { Reminder } from "./service/reminder.service";
import { Simas } from "./service/simas.service";
import { Whatsapp } from "./service/whatsapp.service";

async function bootstrap() {
    try {
        const reminders = await Reminder.getReminder();
        for (const reminder of reminders) {

            const asset = await Simas.getAssetById(reminder.asset_id);
            const employee = await Simas.getEmployeeById(reminder.employee_id);
            await Whatsapp.sendReminder(employee.mobile_phone, employee.full_name, asset.name);
        }

    } catch (error) {
        console.error("Error running cron:", error);
    }
}

bootstrap().then(() => process.exit(0));
