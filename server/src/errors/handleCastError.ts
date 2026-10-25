import mongoose from 'mongoose';
import { TErrorSources, TGenericErrorResponse } from '../types/error';

const handleCastError = (
  err: mongoose.Error.CastError,
): TGenericErrorResponse => {
  const errorSources: TErrorSources = [
    {
      path: err.path,
      message: err.message,
    },
  ];

  const statusCode = 404;

  return {
    statusCode,
    message: 'That does not exist.',
    errorSources,
  };
};

export default handleCastError;
