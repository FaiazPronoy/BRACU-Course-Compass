import { ZodError } from 'zod';
import { TErrorSources, TGenericErrorResponse } from '../types/error';

const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSources = err.issues.map((issue) => {
    return {
      path: String(issue.path[issue.path.length - 1] ?? ''),
      message: issue.message,
    };
  });

  const statusCode = 400;

  return {
    statusCode,
    message: errorSources[0]?.message || 'Some of that is not valid.',
    errorSources,
  };
};

export default handleZodError;
