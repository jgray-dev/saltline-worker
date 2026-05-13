export interface Env {
    db: D1Database;
    saltline_models: R2Bucket;
    EMAIL_SERVICE: SendEmail;
    POLAR_WEBHOOK_SECRET: string;
}

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

async function verifyWebhookSignature(
    request: Request,
    body: string,
    secret: string,
): Promise<boolean> {
    const msgId = request.headers.get("webhook-id");
    const msgTimestamp = request.headers.get("webhook-timestamp");
    const msgSignature = request.headers.get("webhook-signature");

    if (!msgId || !msgTimestamp || !msgSignature) return false;

    const timestamp = parseInt(msgTimestamp, 10);
    if (isNaN(timestamp)) return false;

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

    const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const secretBytes = Uint8Array.from(atob(secretB64), (c) =>
        c.charCodeAt(0),
    );

    const signingKey = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );

    const toSign = `${msgId}.${msgTimestamp}.${body}`;
    const sigBytes = await crypto.subtle.sign(
        "HMAC",
        signingKey,
        new TextEncoder().encode(toSign),
    );
    const computed = `v1,${btoa(String.fromCharCode(...new Uint8Array(sigBytes)))}`;

    return msgSignature.split(" ").some((sig) => sig === computed);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === "POST" && url.pathname === "/webhooks/polar") {
            const body = await request.text();

            const valid = await verifyWebhookSignature(
                request,
                body,
                env.POLAR_WEBHOOK_SECRET,
            );
            if (!valid) {
                return new Response("Unauthorized", { status: 401 });
            }

            const event = JSON.parse(body);
            console.log(
                "Polar webhook received:",
                JSON.stringify(event, null, 2),
            );

            return new Response(null, { status: 200 });
        }

        return new Response("Not Found", { status: 404 });
    },
} satisfies ExportedHandler<Env>;
