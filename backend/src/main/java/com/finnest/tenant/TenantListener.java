package com.finnest.tenant;

import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.util.UUID;

public class TenantListener {

    @PrePersist
    @PreUpdate
    public void setTenant(Object entity) {
        if (entity instanceof TenantAware) {
            TenantAware tenantAware = (TenantAware) entity;
            if (tenantAware.getTenantId() == null) {
                String currentTenant = TenantContext.getCurrentTenant();
                if (currentTenant != null) {
                    tenantAware.setTenantId(UUID.fromString(currentTenant));
                }
            }
        }
    }
}
