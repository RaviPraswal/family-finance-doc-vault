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

    @Override
    public UUID getTenantId() {
        return tenantId;
    }

    @Override
    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }
}
