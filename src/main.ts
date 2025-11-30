/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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

    /*
    // Flow token validation block (optional)
    if (!isValidFlowToken(decryptedBody.flow_token)) {
        const error_response = {
            error_msg: `The message is no longer available`,
        }
        return c.text(
            encryptResponse(error_response, aesKeyBuffer, initialVectorBuffer),
            427
        )
    }
    */

    const screenResponse = await getNextScreen(decryptedBody)

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
