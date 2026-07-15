package com.finnest.document;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "physical_locations")
public class PhysicalLocation extends TenantBaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @JsonIgnore
    private Document document;

    @Column(name = "is_original_present", nullable = false)
    private boolean isOriginalPresent = false;

    @Column(name = "almirah_id", nullable = false)
    private String almirahId = "Main Almirah";

    @Column(name = "shelf")
    private String shelf;

    @Column(name = "holder")
    private String holder;

    @Column(name = "folder")
    private String folder;

    @Column(name = "sub_folder")
    private String subFolder;

    @Column(name = "slot")
    private String slot;

    @Column(name = "last_borrowed_by")
    private String lastBorrowedBy;

    @Column(name = "last_borrowed_at")
    private LocalDateTime lastBorrowedAt;

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public boolean isOriginalPresent() {
        return isOriginalPresent;
    }

    public void setOriginalPresent(boolean originalPresent) {
        isOriginalPresent = originalPresent;
    }

    public String getAlmirahId() {
        return almirahId;
    }

    public void setAlmirahId(String almirahId) {
        this.almirahId = almirahId;
    }

    public String getShelf() {
        return shelf;
    }

    public void setShelf(String shelf) {
        this.shelf = shelf;
    }

    public String getHolder() {
        return holder;
    }

    public void setHolder(String holder) {
        this.holder = holder;
    }

    public String getFolder() {
        return folder;
    }

    public void setFolder(String folder) {
        this.folder = folder;
    }

    public String getSubFolder() {
        return subFolder;
    }

    public void setSubFolder(String subFolder) {
        this.subFolder = subFolder;
    }

    public String getSlot() {
        return slot;
    }

    public void setSlot(String slot) {
        this.slot = slot;
    }

    public String getLastBorrowedBy() {
        return lastBorrowedBy;
    }

    public void setLastBorrowedBy(String lastBorrowedBy) {
        this.lastBorrowedBy = lastBorrowedBy;
    }

    public LocalDateTime getLastBorrowedAt() {
        return lastBorrowedAt;
    }

    public void setLastBorrowedAt(LocalDateTime lastBorrowedAt) {
        this.lastBorrowedAt = lastBorrowedAt;
    }
}
