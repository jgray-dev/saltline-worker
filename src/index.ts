import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

export interface Env {
    db: D1Database;
    saltline_models: R2Bucket;
    EMAIL_SERVICE: SendEmail;
    POLAR_WEBHOOK_SECRET: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === "POST" && url.pathname === "/webhook") {
            const body = await request.text();

            let event;
            try {
                event = validateEvent(
                    body,
                    Object.fromEntries(request.headers),
                    env.POLAR_WEBHOOK_SECRET,
                );
            } catch (error) {
                if (error instanceof WebhookVerificationError) {
                    return new Response("Unauthorized", { status: 401 });
                }
                return new Response("Bad Request", { status: 400 });
            }

            console.log(`Polar webhook triggered: ${event.type}`);
            console.log("Polar webhook received:", JSON.stringify(event, null, 2));

            return new Response(null, { status: 202 });
        }

        return new Response("Not Found", { status: 404 });
    },
} satisfies ExportedHandler<Env>;
