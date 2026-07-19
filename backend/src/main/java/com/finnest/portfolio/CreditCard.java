package com.finnest.portfolio;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "credit_cards")
public class CreditCard extends TenantBaseEntity {

    private String cardName;
    private String bankName;
    private String cardHolderName;
    private String cardNumber;
    private BigDecimal creditLimit;
    private BigDecimal openingOutstanding;
    private Integer billingCycleDate;
    private Integer dueDate;

    // Computed transient field for frontend convenience
    private transient BigDecimal currentOutstanding;

    public String getCardName() {
        return cardName;
    }

    public void setCardName(String cardName) {
        this.cardName = cardName;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getCardHolderName() {
        return cardHolderName;
    }

    public void setCardHolderName(String cardHolderName) {
        this.cardHolderName = cardHolderName;
    }

    public String getCardNumber() {
        return cardNumber;
    }

    public void setCardNumber(String cardNumber) {
        this.cardNumber = cardNumber;
    }

    public BigDecimal getCreditLimit() {
        return creditLimit;
    }

    public void setCreditLimit(BigDecimal creditLimit) {
        this.creditLimit = creditLimit;
    }

    public Integer getBillingCycleDate() {
        return billingCycleDate;
    }

    public void setBillingCycleDate(Integer billingCycleDate) {
        this.billingCycleDate = billingCycleDate;
    }

    public Integer getDueDate() {
        return dueDate;
    }

    public void setDueDate(Integer dueDate) {
        this.dueDate = dueDate;
    }

    public BigDecimal getOpeningOutstanding() {
        return openingOutstanding;
    }

    public void setOpeningOutstanding(BigDecimal openingOutstanding) {
        this.openingOutstanding = openingOutstanding;
    }

    public BigDecimal getCurrentOutstanding() {
        return currentOutstanding;
    }

    public void setCurrentOutstanding(BigDecimal currentOutstanding) {
        this.currentOutstanding = currentOutstanding;
    }
}
