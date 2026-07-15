package com.finnest.common;

import com.finnest.tenant.TenantAware;
import com.finnest.tenant.TenantListener;
import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;

import java.util.UUID;

@MappedSuperclass
@EntityListeners(TenantListener.class)
public abstract class TenantBaseEntity extends BaseEntity implements TenantAware {

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "user_id")
    private UUID userId;

    @Override
    public UUID getTenantId() {
        return tenantId;
    }

    @Override
    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }
}
