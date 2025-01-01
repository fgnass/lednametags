// Generate a random ID (8 chars, base58)
function generateId() {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let id = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

export async function onRequest(context) {
  const { request, env } = context;

  try {
    // Handle GET requests (retrieve state)
    if (request.method === "GET") {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response("Missing id parameter", { status: 400 });
      }

      const state = await env.NAMETAGS_KV.get(id);
      if (!state) {
        return new Response("State not found", { status: 404 });
      }

      return new Response(state, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    // Handle POST requests (store state)
    if (request.method === "POST") {
      const state = await request.json();

      // Basic validation
      if (!state || !state.banks || !Array.isArray(state.banks)) {
        return new Response("Invalid state format", { status: 400 });
      }

      // Generate a unique ID
      const id = generateId();

      // Store in KV
      await env.NAMETAGS_KV.put(id, JSON.stringify(state), {
        // Store for 30 days
        expirationTtl: 60 * 60 * 24 * 30,
      });

      return new Response(JSON.stringify({ id }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Share endpoint error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
