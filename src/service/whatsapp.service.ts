import { WHATSAPP_API_KEY, WHATSAPP_API_PHONE_ID, WHATSAPP_API_URL, WHATSAPP_API_VERSION } from "../config/config";
import axios, { AxiosInstance } from "axios";

export class Whatsapp {
    private static readonly apiUrl = WHATSAPP_API_URL
    private static readonly version = WHATSAPP_API_VERSION
    private static readonly phoneId = WHATSAPP_API_PHONE_ID

    private static readonly http: AxiosInstance = axios.create({
        baseURL: `${this.apiUrl}/${this.version}/${this.phoneId}`,
        headers: {
            Authorization: `Bearer ${WHATSAPP_API_KEY}`,
            Accept: "application/json",
        },
    })

    static async sendMessage(phone: number, type: string, body: any): Promise<void> {
        const res = await this.http.post<any>("/messages",{
            messaging_product: "whatsapp",
            to: phone,
            type: type,
            [type]: body
        },{
            headers: {
                "Content-Type": "application/json",
            },
        })
    }

    static async sendReminder(phone: number, name:string, bookTitle:string): Promise<void> {
        const payload = {
            type: "flow",
            header: {
                type: "text",
                text: `Halo, ${name}!`
            },
            body: {
                text: `Kami ingin menginformasikan bahwa masa peminjaman buku Anda untuk *${bookTitle}* sudah mencapai batas tanggal target peminjaman.\n\nMohon untuk segera mengembalikan buku yang dipinjam. Terima kasih atas kerja samanya!`
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
        await this.sendMessage(phone, "interactive" , payload)
    }
}