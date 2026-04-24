import { NextResponse } from 'next/server';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function err(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

export function unauthorized(message = 'Not authenticated') {
  return err(message, 401);
}

export function forbidden(message = 'Insufficient permissions') {
  return err(message, 403);
}

export function notFound(message = 'Not found') {
  return err(message, 404);
}

export function validationError(message: string, details?: unknown) {
  return err(message, 422, details);
}

export function serverError(message = 'Internal server error') {
  return err(message, 500);
}

export function rateLimited() {
  return NextResponse.json(
    { success: false, error: 'Too many requests. Please wait before trying again.' },
    { status: 429, headers: { 'Retry-After': '60' } },
  );
}
