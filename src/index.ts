export interface Env {
  db: D1Database;
  saltline_models: R2Bucket;
  EMAIL_SERVICE: SendEmail;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(`${request.method}`, { status: 200 });
  },
} satisfies ExportedHandler<Env>;
