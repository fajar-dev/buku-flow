import { Reminder } from "./service/reminder.service";

async function bootstrap() {
    try {
        const reminders = await Reminder.getReminder();
        console.log(reminders);
    } catch (error) {
        console.error("Error running cron:", error);
    }
}

bootstrap().then(() => process.exit(0));
