import type { ReactNode } from 'react';
export const Loading = ({ children }: { children: ReactNode }) => (
  <div className="state" role="status"><span className="spinner" aria-hidden />{children}</div>
);
export const ErrorBox = ({ children }: { children: ReactNode }) => (
  <div className="state error" role="alert">{children}</div>
);
