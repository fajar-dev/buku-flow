import axios, { AxiosInstance } from 'axios';
import { NUSACONTACT_API_URL, NUSACONTACT_API_KEY, NUSACONTACT_PHONE_ID } from '../config/config';

const MAX_ATTEMPTS = 16;
const BASE_DELAY = 1000;
const RETRYABLE_CODES = [429];

export class NusaContact {
    private static getClient(): AxiosInstance {
        return axios.create({
            baseURL: NUSACONTACT_API_URL,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Api-Key': NUSACONTACT_API_KEY,
            },
        });
    }

    private static async delay(attempt: number): Promise<void> {
        const delayTime = BASE_DELAY * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
        await new Promise(resolve => setTimeout(resolve, delayTime));
    }

    static async sendMessage(type: string, payload: any, phone: string): Promise<void> {
        console.log(`${NUSACONTACT_API_URL}/messages?phone_number_id=${NUSACONTACT_PHONE_ID}`);
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const res = await this.getClient().post(`/messages?phone_number_id=${NUSACONTACT_PHONE_ID}`,{
                messaging_product: "whatsapp",
                recipient_type: 'individual',
                to: phone,
                type: type,
                [type]: payload
            },{
                headers: {
                    "Content-Type": "application/json",
                },
        })
                console.log(`[${phone}]: Message sent successfully`);
                return;
            } catch (err: any) {
                const status = err?.response?.status;
                const message = err?.response?.data || err.message;

                console.error(`[${phone}]: Attempt ${attempt}/${MAX_ATTEMPTS} - ${status || 'No Status'}: ${message}`);

                if (status === 429) {
                    console.log(`[${phone}]: Rate limit reached. Retrying... Attempt ${attempt}/${MAX_ATTEMPTS}`);
                    await this.delay(attempt);
                    continue;
                }

                if (status && status >= 400 && status < 500 && !RETRYABLE_CODES.includes(status)) {
                    console.error(`[${phone}]:  Non-retryable 4xx error.`);
                    break;
                }

                if (attempt < MAX_ATTEMPTS) {
                    await this.delay(attempt);
                }

                if (attempt >= MAX_ATTEMPTS) {
                    console.error(`[${phone}]: Max retry attempts reached.`);
                }
            }
        }
    }

    static async sendReminder(phone: string, name:string, bookTitle:string): Promise<void> {
        const payload = {
            type: "flow",
            header: {
                type: "text",
                text: `Halo, ${name}!`
            },
            body: {
                text: `Kami ingin menginformasikan bahwa masa peminjaman buku Anda untuk *${bookTitle}* sudah mencapai batas tanggal rencana pengembalian.\n\nMohon untuk segera mengembalikan buku yang dipinjam. Terima kasih atas kerja samanya!`
            },
            footer: {
                text: "Jika ada pertanyaan, silakan hubungi tim HR"
            },
            action: {
                name: "flow",
                parameters: {
                    flow_message_version: "3",
                    flow_token: phone,
                    flow_id: "26164432729811783",
                    flow_cta: "Kembalikan Buku",
                    flow_action: "data_exchange"
                }
            }
        }
        await this.sendMessage("interactive", payload, phone)
    }
}