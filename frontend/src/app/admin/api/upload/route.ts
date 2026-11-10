import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/session";

// Image uploads go through a Route Handler rather than a Server Action: photos are often over
// the 1 MB Server Action body limit. The API resizes them and returns the stored base URL.
export async function POST(request: Request) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received." }, { status: 400 });
  const form = new FormData();
  form.append("file", file, file.name);
  try {
    const { url } = await api<{ url: string }>("/admin/uploads", { method: "POST", token, body: form });
    return Response.json({ url });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return Response.json({ error: e instanceof ApiError ? e.message : "Upload failed." }, { status });
  }
}
