import { ZodError, ZodIssue } from 'zod';
import { TErrorSources, TGenericErrorResponse } from '../interface/error';

const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSources = err.issues.map((issue: ZodIssue) => {
    return {
      path: issue?.path[issue.path.length - 1],
      message: issue.message,
    };
  });

  const statusCode = 400;

  // the first problem is what the form shows, so make it the message
  return {
    statusCode,
    message: errorSources[0]?.message || 'Some of that is not valid.',
    errorSources,
  };
};

export default handleZodError;
