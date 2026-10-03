import type { Instrumentation } from 'next';
import { reportServerError } from '@backend/utils/logger';

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const route = context.routePath || request.path.split('?')[0];
  const requestError = error instanceof Error ? error : new Error('Error no identificado');
  const digest = 'digest' in requestError && typeof requestError.digest === 'string'
    ? requestError.digest
    : 'no-digest';
  await reportServerError(
    `request_error:${request.method}:${route}`,
    new Error(`${requestError.message} [${context.routeType}:${digest}]`)
  );
};
