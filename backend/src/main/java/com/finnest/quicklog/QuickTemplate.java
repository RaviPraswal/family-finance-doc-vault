package com.finnest.quicklog;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

/** A Quick Logger template. Personal: only the person who made it sees it, whatever their role. */
@Entity
@Table(name = "quick_templates")
public class QuickTemplate extends TenantBaseEntity {

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, precision = 38, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(name = "made_against", length = 50)
    private String madeAgainst;

    @Column(name = "linked_investment_id")
    private UUID linkedInvestmentId;

    @Column(name = "linked_income_source_id")
    private UUID linkedIncomeSourceId;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getMadeAgainst() { return madeAgainst; }
    public void setMadeAgainst(String madeAgainst) { this.madeAgainst = madeAgainst; }
    public UUID getLinkedInvestmentId() { return linkedInvestmentId; }
    public void setLinkedInvestmentId(UUID linkedInvestmentId) { this.linkedInvestmentId = linkedInvestmentId; }
    public UUID getLinkedIncomeSourceId() { return linkedIncomeSourceId; }
    public void setLinkedIncomeSourceId(UUID linkedIncomeSourceId) { this.linkedIncomeSourceId = linkedIncomeSourceId; }
}
