export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(`${request.method}`, { status: 200 });
  },
} satisfies ExportedHandler;
