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

        if (entity instanceof com.finnest.common.TenantBaseEntity) {
            com.finnest.common.TenantBaseEntity tenantBase = (com.finnest.common.TenantBaseEntity) entity;
            if (tenantBase.getUserId() == null) {
                org.springframework.security.core.Authentication auth = 
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getPrincipal() instanceof com.finnest.user.User) {
                    tenantBase.setUserId(((com.finnest.user.User) auth.getPrincipal()).getId());
                }
            }
        }
    }
}
