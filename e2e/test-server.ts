/**
 * Bun HTTP server for e2e header verification testing.
 *
 * Endpoints:
 *   GET /echo          – Returns all received request headers as JSON
 *   GET /with-headers  – Returns a response with known headers for testing response modifications
 *   GET /              – Simple HTML page for navigation tests
 *   GET /alt           – Alternative page (different path for URL filter testing)
 */

const PORT = Number(process.env.TEST_SERVER_PORT) || 3456

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url)

    // CORS headers for all responses (so page JS can read response headers)
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': '*',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      })
    }

    if (url.pathname === '/echo') {
      // Echo all request headers as JSON
      const headers: Record<string, string> = {}
      req.headers.forEach((value, key) => {
        headers[key] = value
      })
      return new Response(JSON.stringify({ headers, url: req.url }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (url.pathname === '/with-headers') {
      // Return response with known headers for testing response header modifications
      return new Response(
        '<html><head><title>Response Header Test</title></head><body><h1>Response Header Test</h1></body></html>',
        {
          headers: {
            'Content-Type': 'text/html',
            'X-Original-Header': 'original-value',
            'X-Remove-Me': 'should-be-removed',
            'X-Append-To': 'base',
            ...corsHeaders,
          },
        },
      )
    }

    if (url.pathname === '/alt') {
      return new Response(
        '<html><head><title>Alt Page</title></head><body><h1>Alternative Page</h1></body></html>',
        {
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
        },
      )
    }

    if (url.pathname === '/') {
      return new Response(
        '<html><head><title>Test Page</title></head><body><h1>OpenHeaders Test Server</h1></body></html>',
        {
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
        },
      )
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  },
})

console.log(`OpenHeaders test server listening on http://localhost:${server.port}`)
