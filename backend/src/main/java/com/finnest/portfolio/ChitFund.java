package com.finnest.portfolio;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "chit_funds")
public class ChitFund extends TenantBaseEntity {

    private String organizerName;
    private String memberName;
    private BigDecimal totalValue;
    private BigDecimal monthlyInstallment;
    private Integer durationMonths;
    private LocalDate startDate;

    public String getOrganizerName() {
        return organizerName;
    }

    public void setOrganizerName(String organizerName) {
        this.organizerName = organizerName;
    }

    public String getMemberName() {
        return memberName;
    }

    public void setMemberName(String memberName) {
        this.memberName = memberName;
    }

    public BigDecimal getTotalValue() {
        return totalValue;
    }

    public void setTotalValue(BigDecimal totalValue) {
        this.totalValue = totalValue;
    }

    public BigDecimal getMonthlyInstallment() {
        return monthlyInstallment;
    }

    public void setMonthlyInstallment(BigDecimal monthlyInstallment) {
        this.monthlyInstallment = monthlyInstallment;
    }

    public Integer getDurationMonths() {
        return durationMonths;
    }

    public void setDurationMonths(Integer durationMonths) {
        this.durationMonths = durationMonths;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
}
