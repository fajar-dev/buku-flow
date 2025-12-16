import { Hono } from 'hono'
import type { Context } from 'hono'
import crypto from 'crypto'

import {
    decryptRequest,
    encryptResponse,
    FlowEndpointException,
} from './encryption'
import { getNextScreen as assignedNextScreen } from './flow/assigned.flow'
import { getNextScreen as returnedNextScreen } from './flow/returned.flow'
import { PORT, NUSANET_APP_SECRET, NUSAFIBER_APP_SECRET, PRIVATE_KEY, PASSPHRASE } from './config/config'
import { checkConnection as simasCheckConnection } from './config/simas.db'
import { checkConnection as flowCheckConnection } from './config/flow.db'

await simasCheckConnection()
await flowCheckConnection()

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
        signature.replace('sha256=', ''),
        'utf-8'
    )

    const hmac = crypto.createHmac('sha256', appSecret)
    const digestString = hmac.update(rawBody).digest('hex')
    const digestBuffer = Buffer.from(digestString, 'utf-8')

    return crypto.timingSafeEqual(digestBuffer, signatureBuffer)
}

if (!PRIVATE_KEY) {
    throw new Error(
        'Private key is empty. Please check your env variable "PRIVATE_KEY".'
    )
}

const createEncryptedFlowHandler =
    (
        getNextScreen: (body: any) => Promise<any> | any,
        appSecret: string
    ) =>
    async (c: Context): Promise<Response> => {
        // Ambil raw body untuk verifikasi signature
        const rawBody = await c.req.text()
        const signature = c.req.header('x-hub-signature-256')

        if (!isRequestSignatureValid(signature, rawBody, appSecret)) {
            return new Response(null, { status: 432 })
        }

        // Parse body terenkripsi
        let body: EncryptedRequestBody
        try {
            body = JSON.parse(rawBody)
        } catch {
            return new Response(null, { status: 400 })
        }

        let decryptedRequest = null
        try {
            decryptedRequest = decryptRequest(body, PRIVATE_KEY!, PASSPHRASE)
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

app.post('/nusanet/assigned', createEncryptedFlowHandler(assignedNextScreen, NUSANET_APP_SECRET))
app.post('/nusanet/returned', createEncryptedFlowHandler(returnedNextScreen, NUSANET_APP_SECRET))

app.post('/nusafiber/assigned', createEncryptedFlowHandler(assignedNextScreen, NUSAFIBER_APP_SECRET))
app.post('/nusafiber/returned', createEncryptedFlowHandler(returnedNextScreen, NUSAFIBER_APP_SECRET))

app.get('/', () => {
    return new Response('Hello World')
})

export default {
    port: PORT,
    fetch: app.fetch,
}
