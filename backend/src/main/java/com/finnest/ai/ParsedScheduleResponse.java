package com.finnest.ai;

import com.finnest.transaction.ReferenceType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class ParsedScheduleResponse {
    
    private ReferenceType scheduleType;
    private String institutionName;
    private String description;
    private List<Installment> installments;

    public static class Installment {
        private BigDecimal amount;
        private String dueDate;
        
        public BigDecimal getAmount() {
            return amount;
        }
        
        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
        
        public String getDueDate() {
            return dueDate;
        }
        
        public void setDueDate(String dueDate) {
            this.dueDate = dueDate;
        }
    }

    public ReferenceType getScheduleType() {
        return scheduleType;
    }

    public void setScheduleType(ReferenceType scheduleType) {
        this.scheduleType = scheduleType;
    }

    public String getInstitutionName() {
        return institutionName;
    }

    public void setInstitutionName(String institutionName) {
        this.institutionName = institutionName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<Installment> getInstallments() {
        return installments;
    }

    public void setInstallments(List<Installment> installments) {
        this.installments = installments;
    }
}
