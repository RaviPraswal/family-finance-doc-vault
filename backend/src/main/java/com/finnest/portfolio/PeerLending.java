package com.finnest.portfolio;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "peer_lendings")
public class PeerLending extends TenantBaseEntity {
    private String type; // e.g., GIVEN, TAKEN
    private String personName;
    private String ownerName;
    private BigDecimal amount;
    private LocalDate date;
    private LocalDate expectedReturnDate;
    private Boolean settled = false;

    /** What was originally lent or borrowed (plus any top-ups). "amount" stays the amount still outstanding. */
    @jakarta.persistence.Column(precision = 15, scale = 2)
    private BigDecimal principalAmount;

    /** Total repaid so far. */
    @jakarta.persistence.Column(precision = 15, scale = 2)
    private BigDecimal repaidAmount;

    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }
    public BigDecimal getRepaidAmount() { return repaidAmount == null ? BigDecimal.ZERO : repaidAmount; }
    public void setRepaidAmount(BigDecimal repaidAmount) { this.repaidAmount = repaidAmount; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public LocalDate getExpectedReturnDate() { return expectedReturnDate; }
    public void setExpectedReturnDate(LocalDate expectedReturnDate) { this.expectedReturnDate = expectedReturnDate; }
    public Boolean getSettled() { return settled; }
    public void setSettled(Boolean settled) { this.settled = settled; }
}
