import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';

/**
 * Global Next.js Middleware for Security Headers, CORS, and Request Processing
 *
 * This middleware runs for EVERY request to the application and provides:
 * - Security headers (XSS, CSRF, HSTS, etc.)
 * - CORS configuration for cross-origin requests
 * - Basic rate limiting headers
 * - Request logging and monitoring
 * - Authentication context setup
 */

// Security headers configuration
const SECURITY_HEADERS = {
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',

  // HSTS (HTTP Strict Transport Security)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.stackframe.io https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.stackframe.io https://*.sentry.io https://*.ingest.sentry.io https://bedrock*.amazonaws.com wss:",
    "frame-src 'self' https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy (Feature Policy)
  'Permissions-Policy': [
    'camera=(),',
    'microphone=(),',
    'geolocation=(),',
    'interest-cohort=()'
  ].join(' '),

  // Server identification
  'X-Powered-By': 'Next.js Chatbot Platform',
  'X-Security-Version': '1.0.0'
};

// CORS configuration
const CORS_CONFIG = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://chatbot.vercel.app',
    'https://*.amplifyapp.com',
    // Add your production domains here
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'X-Requested-With',
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Client-Version',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID'
  ],
  maxAge: 86400 // 24 hours
};

// Rate limiting storage (simple in-memory for basic protection)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getClientIP(request: NextRequest): string {
  // Check various headers for real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cloudflareIP = request.headers.get('cf-connecting-ip');

  if (cloudflareIP) return cloudflareIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();

  return request.ip || 'unknown';
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Same-origin requests

  // Allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return true;
    }
  }

  return CORS_CONFIG.allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return allowed === origin;
  });
}

function applyCORSHeaders(response: NextResponse, request: NextRequest): void {
  const origin = request.headers.get('origin');

  if (isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }

  response.headers.set('Access-Control-Allow-Methods', CORS_CONFIG.allowedMethods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '));
  response.headers.set('Access-Control-Expose-Headers', CORS_CONFIG.exposedHeaders.join(', '));
  response.headers.set('Access-Control-Max-Age', CORS_CONFIG.maxAge.toString());
  response.headers.set('Access-Control-Allow-Credentials', 'true');
}

function applySecurityHeaders(response: NextResponse): void {
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    response.headers.set(name, value);
  });
}

function checkBasicRateLimit(request: NextRequest): { allowed: boolean; headers: Record<string, string> } {
  const ip = getClientIP(request);
  const key = `basic_rate_limit:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // 100 requests per minute for basic protection

  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetTime) {
      rateLimitStore.delete(k);
    }
  }

  const current = rateLimitStore.get(key);
  const resetTime = now + windowMs;

  if (!current || now > current.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': (maxRequests - 1).toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
      }
    };
  } else {
    // Existing window
    current.count++;
    rateLimitStore.set(key, current);

    if (current.count > maxRequests) {
      return {
        allowed: false,
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
          'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString()
        }
      };
    }

    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': (maxRequests - current.count).toString(),
        'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString()
      }
    };
  }
}

function detectSuspiciousActivity(request: NextRequest): { suspicious: boolean; reason?: string } {
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.nextUrl.pathname + request.nextUrl.search;

  // Check for common attack patterns
  const suspiciousPatterns = [
    // SQL injection patterns
    /('|(\\')|(;|%3B)|(--)|(--)|(union)|(select)|(insert)|(update)|(delete)|(drop)|(create)|(alter))/i,
    // XSS patterns
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    // Path traversal
    /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,
    // Command injection
    /(\||&|;|`|\$\(|\$\{)/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      return {
        suspicious: true,
        reason: 'Suspicious pattern detected in request'
      };
    }
  }

  // Check for automated scanning tools
  const botUserAgents = [
    'sqlmap', 'nikto', 'dirb', 'dirbuster', 'wpscan', 'nmap',
    'masscan', 'zap', 'burp', 'acunetix', 'nessus'
  ];

  for (const bot of botUserAgents) {
    if (userAgent.toLowerCase().includes(bot)) {
      return {
        suspicious: true,
        reason: 'Automated scanning tool detected'
      };
    }
  }

  return { suspicious: false };
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Add request ID for tracing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Request-ID', requestId);

  // Create response with request ID
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('X-Request-ID', requestId);

  try {
    // 1. Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      const corsResponse = new NextResponse(null, { status: 200 });
      applyCORSHeaders(corsResponse, request);
      applySecurityHeaders(corsResponse);
      return corsResponse;
    }

    // 2. Apply CORS headers for all requests
    applyCORSHeaders(response, request);

    // 3. Apply security headers
    applySecurityHeaders(response);

    // 4. Basic rate limiting (more sophisticated rate limiting is in API middleware)
    const rateLimitResult = checkBasicRateLimit(request);
    Object.entries(rateLimitResult.headers).forEach(([name, value]) => {
      response.headers.set(name, value);
    });

    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          requestId
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitResult.headers,
            'X-Request-ID': requestId
          }
        }
      );
    }

    // 5. Detect suspicious activity
    const suspiciousCheck = detectSuspiciousActivity(request);
    if (suspiciousCheck.suspicious) {
      console.warn(`Suspicious activity detected: ${suspiciousCheck.reason}`, {
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        url: request.nextUrl.href,
        requestId
      });

      // For now, just log it. In production, you might want to block or further analyze
      response.headers.set('X-Security-Warning', 'Suspicious activity detected');
    }

    // 6. HTTPS enforcement (except for localhost in development)
    if (process.env.NODE_ENV === 'production' &&
        request.nextUrl.protocol === 'http:' &&
        !request.nextUrl.hostname.includes('localhost')) {
      const httpsUrl = request.nextUrl.clone();
      httpsUrl.protocol = 'https:';
      return NextResponse.redirect(httpsUrl);
    }

    // 7. Add performance timing
    const processingTime = Date.now() - startTime;
    response.headers.set('X-Response-Time', `${processingTime}ms`);

    // 8. Add security context for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // Set up authentication context (this will be used by API middleware)
      try {
        const user = await stackServerApp?.getUser();
        if (user) {
          response.headers.set('X-User-Authenticated', 'true');
          response.headers.set('X-User-ID', user.id);
        }
      } catch (error) {
        // User not authenticated - this is fine for public endpoints
        response.headers.set('X-User-Authenticated', 'false');
      }
    }

    return response;

  } catch (error) {
    console.error('Middleware error:', error, {
      url: request.nextUrl.href,
      method: request.method,
      ip: getClientIP(request),
      requestId
    });

    // Return a generic error response to avoid leaking information
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        requestId
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      }
    );
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};