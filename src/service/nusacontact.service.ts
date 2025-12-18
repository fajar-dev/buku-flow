import axios, { AxiosInstance } from 'axios';
import { NUSACONTACT_API_URL, NUSACONTACT_API_KEY, NUSACONTACT_PHONE_ID } from '../config/config';

const MAX_ATTEMPTS = 16;
const BASE_DELAY = 1000;
const RETRYABLE_CODES = [429];

export class NusaContact {
    private static readonly apiUrl = NUSACONTACT_API_URL
    private static readonly apiKey = NUSACONTACT_API_KEY
    private static readonly phoneId = NUSACONTACT_PHONE_ID
    
    private static readonly maxAttempts = MAX_ATTEMPTS
    private static readonly baseDelay = BASE_DELAY
    private static readonly retryableCodes = RETRYABLE_CODES
    
    private static http: AxiosInstance = axios.create({
        baseURL: this.apiUrl,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Api-Key': this.apiKey,
        },
    });

    private static async delay(attempt: number): Promise<void> {
        const delayTime = this.baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
        await new Promise(resolve => setTimeout(resolve, delayTime));
    }

    static async sendMessage(type: string, payload: any, phone: string): Promise<void> {
        console.log(`${this.apiUrl}/messages?phone_number_id=${this.phoneId}`);
        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                const res = await this.http.post(`/messages?phone_number_id=${this.phoneId}`,{
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

                console.error(`[${phone}]: Attempt ${attempt}/${this.maxAttempts} - ${status || 'No Status'}: ${message}`);

                if (status === 429) {
                    console.log(`[${phone}]: Rate limit reached. Retrying... Attempt ${attempt}/${this.maxAttempts}`);
                    await this.delay(attempt);
                    continue;
                }

                if (status && status >= 400 && status < 500 && !this.retryableCodes.includes(status)) {
                    console.error(`[${phone}]:  Non-retryable 4xx error.`);
                    break;
                }

                if (attempt < this.maxAttempts) {
                    await this.delay(attempt);
                }

                if (attempt >= this.maxAttempts) {
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