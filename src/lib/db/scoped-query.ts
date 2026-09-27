// Security Helper: Guarantees multi-tenant user isolation on all database operations
// No query or mutation can ever bypass the authenticated userId check.

export class SecurityAccessError extends Error {
  constructor(message = "Unauthorized access: You do not own this resource") {
    super(message);
    this.name = "SecurityAccessError";
  }
}

/**
 * Attaches the authenticated userId to any query filter.
 * Ensures the database engine rejects queries attempting to access other users' data.
 */
export function scopeToUser<T extends Record<string, unknown>>(
  userId: string,
  filter?: T
): T & { userId: string } {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    throw new SecurityAccessError("Invalid or missing authenticated user context");
  }
  return {
    ...(filter ?? ({} as T)),
    userId,
  };
}

/**
 * Asserts that a retrieved record is owned by the current authenticated user.
 * Throws a SecurityAccessError immediately if ownership fails.
 */
export function assertResourceOwnership(
  resource: { userId: string } | null | undefined,
  currentUserId: string
): void {
  if (!resource) {
    throw new SecurityAccessError("Resource not found or unauthorized");
  }
  if (resource.userId !== currentUserId) {
    throw new SecurityAccessError("Access denied: You do not have permission to view or modify this record");
  }
}
