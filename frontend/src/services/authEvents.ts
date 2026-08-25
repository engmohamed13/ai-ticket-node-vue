type UnauthorizedHandler = () => void;

let handler: UnauthorizedHandler | null = null;

/** Registered once in `main.ts`; keeps `api.ts` free of any store or router import. */
export const onUnauthorized = (next: UnauthorizedHandler): void => {
  handler = next;
};

export const emitUnauthorized = (): void => {
  handler?.();
};
