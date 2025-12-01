import { Hono } from 'hono'
import { decryptRequest, encryptResponse, FlowEndpointException } from './encryption'
import { getNextScreenAssigned } from './flow/assigned'
import { getNextScreenReturned } from './flow/returned'
import crypto from 'crypto'
import { PORT, APP_SECRET, PRIVATE_KEY, PASSPHRASE} from './config/config';
import { checkConnection } from './config/db';

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

// Shared handler function
async function handleFlowRequest(c: any, getNextScreen: Function) {
    if (!PRIVATE_KEY) {
        throw new Error(
            'Private key is empty. Please check your env variable "PRIVATE_KEY".'
        )
    }

    const rawBody = await c.req.text()
    const signature = c.req.header("x-hub-signature-256")

    if (!isRequestSignatureValid(signature, rawBody, APP_SECRET)) {
        return new Response(null, { status: 432 })
    }

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

    console.log(decryptedBody)

    const screenResponse = await getNextScreen(decryptedBody)

    const encryptedResponse = encryptResponse(
        screenResponse,
        aesKeyBuffer,
        initialVectorBuffer
    )

    return new Response(encryptedResponse, { status: 200 })
}
// Endpoint untuk flow peminjaman
app.post("/assigned", async (c) => {
    return handleFlowRequest(c, getNextScreenAssigned)
})

// Health check untuk Meta - endpoint yang sama
app.get("/assigned", (c) => {
    return c.json({ 
        status: "ok",
        flow: "assigned",
        timestamp: new Date().toISOString()
    })
})

// Endpoint untuk flow pengembalian
app.post("/returned", async (c) => {
    return handleFlowRequest(c, getNextScreenReturned)
})

// Health check untuk Meta - endpoint yang sama
app.get("/returned", (c) => {
    return c.json({ 
        status: "ok",
        flow: "returned",
        timestamp: new Date().toISOString()
    })
})

// Root endpoints
app.get("/", (c) => {
    return c.text('Buku Flow API')
})

app.get("/health", (c) => {
    return c.json({ 
        status: "ok", 
        timestamp: new Date().toISOString() 
    })
})

export default {
    port: PORT,
    fetch: app.fetch,
}