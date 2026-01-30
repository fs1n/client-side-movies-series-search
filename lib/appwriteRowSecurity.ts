/**
 * Appwrite Row-Level Security Configuration
 * Ensures only the document owner (userId field) can access their watchlist
 * 
 * Security Model:
 * - $userId: Special placeholder that gets replaced with the authenticated user's ID at runtime
 * - Appwrite enforces these permissions at the database layer, not application layer
 * - No way for users to bypass these checks even with SQL injection or API manipulation
 */

export const WATCHLIST_PERMISSIONS = {
  /**
   * Permissions for new watchlist rows
   * These get applied when creating a document
   * 
   * Breakdown:
   * - read("$userId") → Only the owner can read
   * - update("$userId") → Only the owner can update (though updates are rarely needed for watchlist)
   * - delete("$userId") → Only the owner can delete
   */
  ownerOnly: [
    "read(\"$userId\")",
    "update(\"$userId\")",
    "delete(\"$userId\")"
  ]
};

/**
 * Helper to construct permission array for a specific user
 * Required in Appwrite v16 - use actual user IDs instead of $userId placeholder
 * 
 * Example:
 * const perms = buildUserPermissions("user_123");
 * // Returns: ["read(\"user:user_123\")", "update(\"user:user_123\")", "delete(\"user:user_123\")"]
 */
export const buildUserPermissions = (userId: string) => [
  `read("user:${userId}")`,
  `update("user:${userId}")`,
  `delete("user:${userId}")`
];
