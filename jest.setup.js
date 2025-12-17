/**
 * Jest Setup Configuration
 *
 * PURPOSE:
 * Configure testing environment with necessary polyfills and global mocks
 */

// Import Jest DOM matchers
import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Polyfill Web APIs for API route testing
// These are required because Next.js API routes use Web APIs that aren't available in Node/Jest
if (typeof Request === "undefined") {
  global.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === "string" ? input : input.url;
      this.method = init?.method || "GET";
      this.headers = new Headers(init?.headers || {});
      this.body = init?.body;
      this._bodyUsed = false;
    }

    async json() {
      if (this._bodyUsed) {
        throw new Error("Body already used");
      }
      this._bodyUsed = true;
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }

    async text() {
      if (this._bodyUsed) {
        throw new Error("Body already used");
      }
      this._bodyUsed = true;
      return typeof this.body === "string"
        ? this.body
        : JSON.stringify(this.body);
    }
  };
}

if (typeof Response === "undefined") {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || "OK";
      this.headers = new Headers(init?.headers || {});
      this.ok = this.status >= 200 && this.status < 300;
    }

    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }

    async text() {
      return typeof this.body === "string"
        ? this.body
        : JSON.stringify(this.body);
    }

    // Static method for creating JSON responses (used by NextResponse.json)
    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
    }
  };
}

if (typeof Headers === "undefined") {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = {};
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => {
            this.set(key, value);
          });
        } else if (typeof init === "object") {
          Object.entries(init).forEach(([key, value]) => {
            this.set(key, value);
          });
        }
      }
    }

    get(name) {
      return this._headers[name.toLowerCase()] || null;
    }

    set(name, value) {
      this._headers[name.toLowerCase()] = String(value);
    }

    has(name) {
      return name.toLowerCase() in this._headers;
    }

    delete(name) {
      delete this._headers[name.toLowerCase()];
    }

    forEach(callback) {
      Object.entries(this._headers).forEach(([key, value]) => {
        callback(value, key, this);
      });
    }

    entries() {
      return Object.entries(this._headers);
    }

    keys() {
      return Object.keys(this._headers);
    }

    values() {
      return Object.values(this._headers);
    }
  };
}

// Mock URL if not available
if (typeof URL === "undefined") {
  global.URL = class URL {
    constructor(url, base) {
      const fullUrl = base ? `${base}${url}` : url;
      const match = fullUrl.match(
        /^(https?:)\/\/([^/:]+)(:\d+)?([^?#]*)?(\?[^#]*)?(#.*)?$/
      );

      if (!match) {
        throw new TypeError(`Invalid URL: ${fullUrl}`);
      }

      this.protocol = match[1];
      this.hostname = match[2];
      this.port = match[3] ? match[3].substring(1) : "";
      this.pathname = match[4] || "/";
      this.search = match[5] || "";
      this.hash = match[6] || "";
      this.host = this.hostname + (this.port ? `:${this.port}` : "");
      this.origin = `${this.protocol}//${this.host}`;
      this.href = fullUrl;
    }

    toString() {
      return this.href;
    }
  };
}

// Mock URLSearchParams if not available
if (typeof URLSearchParams === "undefined") {
  global.URLSearchParams = class URLSearchParams {
    constructor(init) {
      this._params = new Map();
      if (typeof init === "string") {
        init
          .replace(/^\?/, "")
          .split("&")
          .forEach((pair) => {
            const [key, value] = pair.split("=");
            if (key) {
              this._params.set(
                decodeURIComponent(key),
                decodeURIComponent(value || "")
              );
            }
          });
      } else if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this._params.set(key, String(value));
        });
      }
    }

    get(name) {
      return this._params.get(name) || null;
    }

    set(name, value) {
      this._params.set(name, String(value));
    }

    has(name) {
      return this._params.has(name);
    }

    delete(name) {
      this._params.delete(name);
    }

    toString() {
      const pairs = [];
      this._params.forEach((value, key) => {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      });
      return pairs.join("&");
    }
  };
}
