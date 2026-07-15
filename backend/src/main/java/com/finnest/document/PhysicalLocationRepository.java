package com.finnest.document;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhysicalLocationRepository extends JpaRepository<PhysicalLocation, UUID> {
    Optional<PhysicalLocation> findByDocumentId(UUID documentId);
}
