// utils/callbackRegistry.ts
const callbacks = new Map<string, (data: any) => void>();

export const registerCallback = (id: string, cb: (data: any) => void) => {
  callbacks.set(id, cb);
};

export const executeCallback = (id: string, data: any) => {
  const cb = callbacks.get(id);
  if (cb) {
    cb(data);
    callbacks.delete(id); // cleanup
  }
};

export const clearCallback = (id: string) => {
  callbacks.delete(id);
};
