package com.finnest.document;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "physical_document_logs")
public class PhysicalDocumentLog extends TenantBaseEntity {

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "action_type", nullable = false)
    private String actionType; // e.g. "CHECK_IN", "CHECK_OUT"

    @Column(name = "performed_by", nullable = false)
    private UUID performedBy; // user ID who triggered it

    @Column(name = "borrower_name")
    private String borrowerName;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    public UUID getDocumentId() {
        return documentId;
    }

    public void setDocumentId(UUID documentId) {
        this.documentId = documentId;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public UUID getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(UUID performedBy) {
        this.performedBy = performedBy;
    }

    public String getBorrowerName() {
        return borrowerName;
    }

    public void setBorrowerName(String borrowerName) {
        this.borrowerName = borrowerName;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
