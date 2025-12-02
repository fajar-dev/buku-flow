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
    app.post("/", async (c) => {
    if (!PRIVATE_KEY) {
        throw new Error(
            'Private key is empty. Please check your env variable "PRIVATE_KEY".'
        )
    }

    // --- READ RAW BODY ------------------------------------------------------
    const rawBody = await c.req.text()
    const signature = c.req.header("x-hub-signature-256")

    console.log("===== INCOMING REQUEST =====")
    console.log("Raw Body:", rawBody)
    console.log("Signature:", signature)
    console.log("================================")

    // --- SIGNATURE VALIDATION ----------------------------------------------
    if (!isRequestSignatureValid(signature, rawBody, APP_SECRET)) {
        console.error("❌ Invalid Signature")
        return new Response(null, { status: 432 })
    }

    // --- PARSE JSON BODY ----------------------------------------------------
    const body: EncryptedRequestBody = JSON.parse(rawBody)

    let decryptedRequest = null
    try {
        decryptedRequest = decryptRequest(body, PRIVATE_KEY, PASSPHRASE)
    } catch (err) {
        console.error("❌ Decrypt Error:", err)

        if (err instanceof FlowEndpointException) {
            return new Response(null, { status: err.statusCode })
        }
        return new Response(null, { status: 500 })
    }

    const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest

    // --- LOG DECRYPTED PAYLOAD ----------------------------------------------
    console.log("===== DECRYPTED REQUEST =====")
    console.log(JSON.stringify(decryptedBody, null, 2))
    console.log("================================")

    // --- FLOW PROCESSING ----------------------------------------------------
    const screenResponse = await getNextScreen(decryptedBody)

    // --- LOG BEFORE ENCRYPT -------------------------------------------------
    console.log("===== SCREEN RESPONSE (before encrypt) =====")
    console.log(JSON.stringify(screenResponse, null, 2))
    console.log("============================================")

    // --- ENCRYPT RESPONSE ---------------------------------------------------
    const encryptedResponse = encryptResponse(
        screenResponse,
        aesKeyBuffer,
        initialVectorBuffer
    )

    // --- LOG ENCRYPTED RESPONSE --------------------------------------------
    console.log("===== ENCRYPTED RESPONSE =====")
    console.log(encryptedResponse)
    console.log("================================")

    return new Response(encryptedResponse, { status: 200 })
})

})

app.get("/", () => {
    return new Response(`Hello World`)
})

export default {
    port: PORT,
    fetch: app.fetch,
}
