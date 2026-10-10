import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { ZodError } from 'zod';

export function okResponse<T>(data: T, status = 200, headers?: HeadersInit): NextResponse {
  return NextResponse.json(data, { status, headers });
}

export function noContentResponse(headers?: HeadersInit): NextResponse {
  return new NextResponse(null, { status: 204, headers });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of error.issues) {
      details[issue.path.join('.')] = issue.message;
    }
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details,
        },
      },
      { status: 422 }
    );
  }

  const err = error as any;
  if (err?.code === 'ILLEGAL_TRANSITION' || err?.name === 'IllegalTransitionError') {
    return NextResponse.json(
      {
        error: {
          code: 'ILLEGAL_TRANSITION',
          message: err.message || 'Illegal state transition',
        },
      },
      { status: 409 }
    );
  }

  console.error('Unhandled server error:', error);
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL',
        message: 'An unexpected internal error occurred',
      },
    },
    { status: 500 }
  );
}
