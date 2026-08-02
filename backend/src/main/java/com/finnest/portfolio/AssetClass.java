package com.finnest.portfolio;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "asset_classes")
public class AssetClass extends TenantBaseEntity {

    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
