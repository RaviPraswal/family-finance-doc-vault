package com.finnest.document;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PhysicalDocumentLogRepository extends JpaRepository<PhysicalDocumentLog, UUID> {
    List<PhysicalDocumentLog> findAllByDocumentIdOrderByCreatedAtDesc(UUID documentId);
}
