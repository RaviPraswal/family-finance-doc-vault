package com.finnest.common;

import com.finnest.tenant.TenantContext;

import java.util.Optional;
import java.util.UUID;

/**
 * Single place that decides whether a record belongs to the caller's family.
 * Records of another family are reported as "not found" so their existence is not leaked.
 */
public final class TenantGuard {

    private TenantGuard() {}

    public static UUID currentTenant() {
        String tenant = TenantContext.getCurrentTenant();
        if (tenant == null) {
            throw new ForbiddenException("No authenticated family context");
        }
        return UUID.fromString(tenant);
    }

    /** Returns the entity if it exists and belongs to the caller's family; otherwise 404. */
    public static <T extends TenantBaseEntity> T owned(Optional<T> found) {
        T entity = found.orElseThrow(() -> new NotFoundException("Record not found"));
        if (!currentTenant().equals(entity.getTenantId())) {
            throw new NotFoundException("Record not found");
        }
        return entity;
    }

    /** Like {@link #owned} but returns null when the record no longer exists. Another family's record is still 404. */
    public static <T extends TenantBaseEntity> T ownedOrNull(Optional<T> found) {
        if (found.isEmpty()) {
            return null;
        }
        return owned(found);
    }
}
