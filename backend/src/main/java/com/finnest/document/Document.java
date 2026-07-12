package com.finnest.document;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "documents")
public class Document extends TenantBaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private Long size;

    @Column(nullable = false)
    private String category;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extracted_data", columnDefinition = "jsonb")
    private Map<String, Object> extractedData;

    @Column(columnDefinition = "text")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> tags;

    @jakarta.persistence.OneToMany(mappedBy = "document", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    private List<DocumentVersion> versions = new java.util.ArrayList<>();

    @Column(name = "associated_entity_type")
    private String associatedEntityType;

    @Column(name = "associated_entity_id")
    private UUID associatedEntityId;

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public Map<String, Object> getExtractedData() {
        return extractedData;
    }

    public void setExtractedData(Map<String, Object> extractedData) {
        this.extractedData = extractedData;
    }


    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getAssociatedEntityType() {
        return associatedEntityType;
    }

    public void setAssociatedEntityType(String associatedEntityType) {
        this.associatedEntityType = associatedEntityType;
    }

    public UUID getAssociatedEntityId() {
        return associatedEntityId;
    }

    public void setAssociatedEntityId(UUID associatedEntityId) {
        this.associatedEntityId = associatedEntityId;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(UUID uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public List<DocumentVersion> getVersions() {
        return versions;
    }

    public void setVersions(List<DocumentVersion> versions) {
        this.versions = versions;
    }
}
