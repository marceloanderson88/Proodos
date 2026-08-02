import { apiSuccess } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return apiSuccess(request, {
    status: "ok",
    service: "proodos-web",
  });
}
