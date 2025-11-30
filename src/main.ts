import { Hono } from 'hono'
import { decryptRequest, encryptResponse, FlowEndpointException } from './encryption'
import { getNextScreen } from './flow'
import crypto from 'crypto'
import { PORT, APP_SECRET, PRIVATE_KEY, PASSPHRASE} from './config/config';
import { checkConnection } from './config/db';
import { Simas } from './service/simas';

await checkConnection()

const app = new Hono()
interface EncryptedRequestBody {
    encrypted_aes_key: string
    encrypted_flow_data: string
    initial_vector: string
}

function isRequestSignatureValid(
    signature: string | undefined,
    rawBody: string,
    appSecret: string | undefined
): boolean {
    if (!appSecret) return true
    if (!signature) return false

    const signatureBuffer = Buffer.from(
        signature.replace("sha256=", ""),
        "utf-8"
    )

    const hmac = crypto.createHmac("sha256", appSecret)
    const digestString = hmac.update(rawBody).digest("hex")
    const digestBuffer = Buffer.from(digestString, "utf-8")

    return crypto.timingSafeEqual(digestBuffer, signatureBuffer)
}

app.post("/", async (c) => {
    if (!PRIVATE_KEY) {
        throw new Error(
            'Private key is empty. Please check your env variable "PRIVATE_KEY".'
        )
    }

    // Get raw body for signature verification
    const rawBody = await c.req.text()
    const signature = c.req.header("x-hub-signature-256")

    if (!isRequestSignatureValid(signature, rawBody, APP_SECRET)) {
        return new Response(null, { status: 432 })
    }

    // Parse the body
    const body: EncryptedRequestBody = JSON.parse(rawBody)

    let decryptedRequest = null
    try {
        decryptedRequest = decryptRequest(body, PRIVATE_KEY, PASSPHRASE)
    } catch (err) {
        if (err instanceof FlowEndpointException) {
            return new Response(null, { status: err.statusCode })
        }
        return new Response(null, { status: 500 })
    }

    const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest

    // ✨ AMBIL NOMOR PENERIMA FLOW DI SINI
    // -----
    // NOTE: sesuaikan path berikut dengan struktur decryptedBody kamu.
    // Misal di WhatsApp Flows sering ada sesuatu seperti:
    // decryptedBody.user.phone atau decryptedBody.context.user.phone.
    // Tinggal ganti sesuai log kamu.
    // -----
    let phoneNumber: number | null = null;

    try {
        const rawPhone =
            (decryptedBody.user && decryptedBody.user.phone) ||
            (decryptedBody.customer && decryptedBody.customer.phone) ||
            (decryptedBody.sender && decryptedBody.sender.phone);

        if (rawPhone) {
            // buang tanda + kalau ada
            const clean = String(rawPhone).replace(/^\+/, '');
            phoneNumber = Number(clean);
        }
    } catch (e) {
        console.warn('Failed to parse phone from decryptedBody:', e);
    }

    console.log(phoneNumber)

    let employee = null;
    if (phoneNumber) {
        try {
            employee = await Simas.employee(phoneNumber);
        } catch (e) {
            console.error('Error fetching employee by phone:', e);
        }
    }

    // PANGGIL FLOW DENGAN DATA EMPLOYEE
    const screenResponse = await getNextScreen(decryptedBody, employee)

    const encryptedResponse = encryptResponse(
        screenResponse,
        aesKeyBuffer,
        initialVectorBuffer
    )

    return new Response(encryptedResponse, { status: 200 })
})

app.get("/", () => {
    return new Response(`Nothing to see here.
Checkout README.md to start.`)
})

export default {
    port: PORT,
    fetch: app.fetch,
}
