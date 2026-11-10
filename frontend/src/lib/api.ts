import "server-only";

const API_URL = process.env.API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & {
  token?: string | null;
  body?: unknown;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
};

function buildUrl(path: string, query?: Options["query"]) {
  const url = new URL(API_URL + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    for (const v of Array.isArray(value) ? value : [value]) url.searchParams.append(key, String(v));
  }
  return url;
}

/** Turns FastAPI error bodies (string or validation list) into one readable sentence. */
function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { loc?: string[]; msg?: string };
    const field = first.loc?.[first.loc.length - 1];
    if (field === "phone") return "Please enter a valid Pakistani mobile number, e.g. 0300 1234567.";
    const msg = (first.msg ?? "Invalid input").replace(/^Value error, /, "");
    if (field === "code") return "Enter the 6-digit code.";
    if (msg.startsWith("Enter ") || !field || field === "body") return msg;
    return `${field.replaceAll("_", " ")}: ${msg}`;
  }
  return status >= 500 ? "Something went wrong on our side. Please try again." : "Request failed";
}

export async function api<T>(path: string, { token, body, query, headers, ...init }: Options = {}): Promise<T> {
  const res = await fetch(buildUrl(path, query), {
    ...init,
    headers: {
      ...(body !== undefined && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, res.status));
  return data as T;
}
