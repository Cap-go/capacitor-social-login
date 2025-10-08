import { Hono } from 'hono';

const app = new Hono();

app.post('/apple/callback', async (c) => {
  try {
    // Get request information
    const url = c.req.url;
    const method = c.req.method;

    // Get headers safely
    const headers: Record<string, string> = {};
    const headerNames = [
      'authorization',
      'content-type',
      'content-length',
      'user-agent',
      'referer',
      'origin',
      'accept',
      'accept-language',
      'accept-encoding',
      'x-forwarded-for',
      'x-real-ip',
      'x-forwarded-proto',
      'host',
      'connection',
      'cache-control',
      'pragma',
      'sec-fetch-dest',
      'sec-fetch-mode',
      'sec-fetch-site',
      'upgrade-insecure-requests',
    ];

    // Collect all headers
    for (const name of headerNames) {
      const value = c.req.header(name);
      if (value) {
        headers[name] = value;
      }
    }

    // Also try to get all headers using raw method if available
    try {
      const rawHeaders = c.req.raw?.headers;
      if (rawHeaders) {
        for (const [key, value] of rawHeaders.entries()) {
          headers[key.toLowerCase()] = value;
        }
      }
    } catch (e) {
      console.log('Could not get raw headers:', e.message);
    }

    const query = c.req.query();

    // Get body content (for POST requests)
    let body = null;
    try {
      const contentType = c.req.header('content-type');
      if (contentType?.includes('application/json')) {
        body = await c.req.json();
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        body = await c.req.parseBody();
      } else {
        body = await c.req.text();
      }
    } catch (bodyError) {
      body = `Error parsing body: ${bodyError}`;
    }

    // Get additional request info
    const userAgent = c.req.header('user-agent');
    const referer = c.req.header('referer');
    const origin = c.req.header('origin');
    const contentLength = c.req.header('content-length');
    const acceptLanguage = c.req.header('accept-language');
    const acceptEncoding = c.req.header('accept-encoding');
    const xForwardedFor = c.req.header('x-forwarded-for');
    const xRealIp = c.req.header('x-real-ip');

    // Create comprehensive info object
    const requestInfo = {
      timestamp: new Date().toISOString(),
      method,
      url,
      fullUrl: url,
      pathname: new URL(url).pathname,
      search: new URL(url).search,
      searchParams: Object.fromEntries(new URL(url).searchParams),
      query,
      headers,
      body,
      userAgent,
      referer,
      origin,
      contentLength,
      acceptLanguage,
      acceptEncoding,
      xForwardedFor,
      xRealIp,
      protocol: new URL(url).protocol,
      host: new URL(url).host,
      hostname: new URL(url).hostname,
      port: new URL(url).port,
    };

    // LOG EVERYTHING to console
    console.log('='.repeat(80));
    console.log('APPLE CALLBACK REQUEST RECEIVED');
    console.log('='.repeat(80));
    console.log('Timestamp:', requestInfo.timestamp);
    console.log('Method:', requestInfo.method);
    console.log('Full URL:', requestInfo.fullUrl);
    console.log('Pathname:', requestInfo.pathname);
    console.log('Search:', requestInfo.search);
    console.log('Search Params:', JSON.stringify(requestInfo.searchParams, null, 2));
    console.log('Query:', JSON.stringify(requestInfo.query, null, 2));
    console.log('Headers:', JSON.stringify(requestInfo.headers, null, 2));
    console.log('Body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
    console.log('User Agent:', requestInfo.userAgent);
    console.log('Referer:', requestInfo.referer);
    console.log('Origin:', requestInfo.origin);
    console.log('Content Length:', requestInfo.contentLength);
    console.log('Accept Language:', requestInfo.acceptLanguage);
    console.log('Accept Encoding:', requestInfo.acceptEncoding);
    console.log('X-Forwarded-For:', requestInfo.xForwardedFor);
    console.log('X-Real-IP:', requestInfo.xRealIp);
    console.log('Protocol:', requestInfo.protocol);
    console.log('Host:', requestInfo.host);
    console.log('Hostname:', requestInfo.hostname);
    console.log('Port:', requestInfo.port);
    console.log('='.repeat(80));

    // Create detailed response text
    const responseText = `
APPLE CALLBACK REQUEST DETAILS
==============================

🕐 Timestamp: ${requestInfo.timestamp}
🔗 Method: ${requestInfo.method}
🌐 Full URL: ${requestInfo.fullUrl}
📍 Pathname: ${requestInfo.pathname}
🔍 Search: ${requestInfo.search}

📋 Search Parameters:
${JSON.stringify(requestInfo.searchParams, null, 2)}

📋 Query Parameters:
${JSON.stringify(requestInfo.query, null, 2)}

📦 Headers:
${JSON.stringify(requestInfo.headers, null, 2)}

📄 Body Content:
${typeof body === 'string' ? body : JSON.stringify(body, null, 2)}

🌍 Network Info:
- User Agent: ${requestInfo.userAgent || 'Not provided'}
- Referer: ${requestInfo.referer || 'Not provided'}
- Origin: ${requestInfo.origin || 'Not provided'}
- Content Length: ${requestInfo.contentLength || 'Not provided'}
- Accept Language: ${requestInfo.acceptLanguage || 'Not provided'}
- Accept Encoding: ${requestInfo.acceptEncoding || 'Not provided'}
- X-Forwarded-For: ${requestInfo.xForwardedFor || 'Not provided'}
- X-Real-IP: ${requestInfo.xRealIp || 'Not provided'}

🔧 URL Components:
- Protocol: ${requestInfo.protocol}
- Host: ${requestInfo.host}
- Hostname: ${requestInfo.hostname}
- Port: ${requestInfo.port || 'Default'}

==============================
Request processed successfully!
    `.trim();

    return c.text(responseText);
  } catch (error) {
    console.error('ERROR in Apple callback:', error);
    return c.text(`Error processing Apple callback: ${error}`, 500);
  }
});

export default app;
