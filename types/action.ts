export type ActionResult<T = unknown> = {
    success: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string[]>;
    data?: T;
};
