import { TErrorSources, TGenericErrorResponse } from '../types/error';

const handleDuplicateError = (err: any): TGenericErrorResponse => {
  const match = err.message.match(/"([^"]*)"/);

  const extractedMessage = match && match[1];

  const errorSources: TErrorSources = [
    {
      path: '',
      message: `${extractedMessage} already exists`,
    },
  ];

  const statusCode = 409;

  return {
    statusCode,
    message: `${extractedMessage || 'That'} already exists.`,
    errorSources,
  };
};

export default handleDuplicateError;
