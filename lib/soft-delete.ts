/**
 * Soft-delete helpers for compliance-sensitive models.
 *
 * Convention: Never call prisma.<model>.delete() for tables that require audit trails.
 * Instead, add nullable `deletedAt DateTime?` and `deletedBy String?` columns to the model
 * in schema.prisma, and use these helpers to perform soft-deletes via update.
 *
 * Apply this pattern to PaymentMethod, and future models like Subscription,
 * Provider, License, PayerEnrollment, ComplianceCheck as needed.
 */

/**
 * Returns a filter object to exclude soft-deleted records.
 * Use in Prisma `where` clauses: { ...softDeleteFilter(), ...otherConditions }
 */
export function softDeleteFilter() {
  return { deletedAt: null };
}

/**
 * Returns the data object to set when soft-deleting a record.
 * Use in Prisma `update` calls: { data: { ...softDeleteData(userId), ...otherFields } }
 * @param userId - The ID of the user performing the deletion (for audit trail)
 */
export function softDeleteData(userId: string) {
  return {
    deletedAt: new Date(),
    deletedBy: userId,
  };
}
