type LogMethod = 'debug' | 'info' | 'warn' | 'error';

const logInDev = (method: LogMethod, args: unknown[]) => {
  if (!import.meta.env.DEV) {
    return;
  }

  console[method](...args);
};

export const clientLogger = {
  debug: (...args: unknown[]) => logInDev('debug', args),
  info: (...args: unknown[]) => logInDev('info', args),
  warn: (...args: unknown[]) => logInDev('warn', args),
  error: (...args: unknown[]) => logInDev('error', args),
};
