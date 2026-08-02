import { NextResponse } from "next/server";

import { createRequestId } from "@/lib/security/request";

type ApiErrorOptions = {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  headers?: HeadersInit;
};

export function apiError(request: Request, options: ApiErrorOptions) {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const headers = new Headers(options.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("x-request-id", requestId);

  return NextResponse.json(
    {
      code: options.code,
      message: options.message,
      requestId,
      ...options.details,
    },
    { status: options.status, headers },
  );
}

export function apiSuccess(
  request: Request,
  body: Record<string, unknown>,
  options: { status?: number; headers?: HeadersInit } = {},
) {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const headers = new Headers(options.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("x-request-id", requestId);
  return NextResponse.json(
    { ...body, requestId },
    { status: options.status ?? 200, headers },
  );
}
