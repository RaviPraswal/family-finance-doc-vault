package com.finnest.document;

import com.finnest.tenant.TenantContext;
import com.finnest.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class PhysicalLocationService {

    private final PhysicalLocationRepository locationRepository;
    private final PhysicalDocumentLogRepository logRepository;
    private final DocumentRepository documentRepository;

    public PhysicalLocationService(PhysicalLocationRepository locationRepository,
                                   PhysicalDocumentLogRepository logRepository,
                                   DocumentRepository documentRepository) {
        this.locationRepository = locationRepository;
        this.logRepository = logRepository;
        this.documentRepository = documentRepository;
    }

    public Optional<PhysicalLocation> getPhysicalLocation(UUID documentId) {
        return locationRepository.findByDocumentId(documentId);
    }

    @Transactional
    public PhysicalLocation assignPhysicalLocation(UUID documentId, PhysicalLocation locationData, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Tenant check
        UUID currentTenantId = UUID.fromString(TenantContext.getCurrentTenant());
        if (!document.getTenantId().equals(currentTenantId)) {
            throw new RuntimeException("Unauthorized");
        }

        PhysicalLocation location = locationRepository.findByDocumentId(documentId)
                .orElseGet(() -> {
                    PhysicalLocation newLoc = new PhysicalLocation();
                    newLoc.setDocument(document);
                    newLoc.setTenantId(currentTenantId);
                    return newLoc;
                });

        location.setOriginalPresent(locationData.isOriginalPresent());
        location.setAlmirahId(locationData.getAlmirahId() != null ? locationData.getAlmirahId() : "Main Almirah");
        location.setShelf(locationData.getShelf());
        location.setHolder(locationData.getHolder());
        location.setFolder(locationData.getFolder());
        location.setSubFolder(locationData.getSubFolder());
        location.setSlot(locationData.getSlot());

        PhysicalLocation savedLocation = locationRepository.save(location);

        // Save log
        PhysicalDocumentLog log = new PhysicalDocumentLog();
        log.setDocumentId(documentId);
        log.setTenantId(currentTenantId);
        log.setActionType("ASSIGN_LOCATION");
        log.setPerformedBy(user.getId());
        log.setNotes("Assigned location: " + formatLocation(savedLocation));
        logRepository.save(log);

        return savedLocation;
    }

    @Transactional
    public PhysicalLocation checkOutDocument(UUID documentId, String borrowerName, String notes, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        UUID currentTenantId = UUID.fromString(TenantContext.getCurrentTenant());
        if (!document.getTenantId().equals(currentTenantId)) {
            throw new RuntimeException("Unauthorized");
        }

        PhysicalLocation location = locationRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new RuntimeException("Physical location details not configured for this document"));

        location.setOriginalPresent(false);
        location.setLastBorrowedBy(borrowerName);
        location.setLastBorrowedAt(LocalDateTime.now());

        PhysicalLocation savedLocation = locationRepository.save(location);

        // Save log
        PhysicalDocumentLog log = new PhysicalDocumentLog();
        log.setDocumentId(documentId);
        log.setTenantId(currentTenantId);
        log.setActionType("CHECK_OUT");
        log.setPerformedBy(user.getId());
        log.setBorrowerName(borrowerName);
        log.setNotes(notes);
        logRepository.save(log);

        return savedLocation;
    }

    @Transactional
    public PhysicalLocation checkInDocument(UUID documentId, PhysicalLocation checkInLocation, String notes, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        UUID currentTenantId = UUID.fromString(TenantContext.getCurrentTenant());
        if (!document.getTenantId().equals(currentTenantId)) {
            throw new RuntimeException("Unauthorized");
        }

        PhysicalLocation location = locationRepository.findByDocumentId(documentId)
                .orElseGet(() -> {
                    PhysicalLocation newLoc = new PhysicalLocation();
                    newLoc.setDocument(document);
                    newLoc.setTenantId(currentTenantId);
                    return newLoc;
                });

        location.setOriginalPresent(true);
        if (checkInLocation != null) {
            if (checkInLocation.getAlmirahId() != null) location.setAlmirahId(checkInLocation.getAlmirahId());
            if (checkInLocation.getShelf() != null) location.setShelf(checkInLocation.getShelf());
            if (checkInLocation.getHolder() != null) location.setHolder(checkInLocation.getHolder());
            if (checkInLocation.getFolder() != null) location.setFolder(checkInLocation.getFolder());
            if (checkInLocation.getSubFolder() != null) location.setSubFolder(checkInLocation.getSubFolder());
            if (checkInLocation.getSlot() != null) location.setSlot(checkInLocation.getSlot());
        }

        PhysicalLocation savedLocation = locationRepository.save(location);

        // Save log
        PhysicalDocumentLog log = new PhysicalDocumentLog();
        log.setDocumentId(documentId);
        log.setTenantId(currentTenantId);
        log.setActionType("CHECK_IN");
        log.setPerformedBy(user.getId());
        log.setNotes("Checked in. Location: " + formatLocation(savedLocation) + ". Notes: " + (notes != null ? notes : "None"));
        logRepository.save(log);

        return savedLocation;
    }

    public List<PhysicalDocumentLog> getLogs(UUID documentId) {
        return logRepository.findAllByDocumentIdOrderByCreatedAtDesc(documentId);
    }

    public Map<String, Object> getDashboardStats() {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        List<Document> allDocs = documentRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId);

        long totalDocuments = allDocs.size();
        long digitalOnly = 0;
        long physicalOnly = 0;
        long bothDigitalAndPhysical = 0;
        long missingOriginals = 0;

        Map<String, Long> shelfCounts = new HashMap<>();
        shelfCounts.put("Shelf 1", 0L);
        shelfCounts.put("Shelf 2", 0L);
        shelfCounts.put("Shelf 3", 0L);

        for (Document doc : allDocs) {
            boolean hasDigital = doc.getFilePath() != null && !doc.getFilePath().isBlank();
            PhysicalLocation loc = doc.getPhysicalLocation();
            boolean isPhysicalMapped = loc != null;
            boolean originalPresent = loc != null && loc.isOriginalPresent();

            if (hasDigital && isPhysicalMapped) {
                bothDigitalAndPhysical++;
            } else if (hasDigital) {
                digitalOnly++;
            } else if (isPhysicalMapped) {
                physicalOnly++;
            }

            if (isPhysicalMapped) {
                if (!originalPresent) {
                    missingOriginals++;
                }
                if (loc.getShelf() != null) {
                    String shelfKey = loc.getShelf();
                    shelfCounts.put(shelfKey, shelfCounts.getOrDefault(shelfKey, 0L) + 1);
                }
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalDocuments", totalDocuments);
        stats.put("digitalOnly", digitalOnly);
        stats.put("physicalOnly", physicalOnly);
        stats.put("bothDigitalAndPhysical", bothDigitalAndPhysical);
        stats.put("missingOriginals", missingOriginals);
        stats.put("shelfUtilization", shelfCounts);

        return stats;
    }

    private String formatLocation(PhysicalLocation loc) {
        if (loc == null) return "Unknown";
        StringBuilder sb = new StringBuilder();
        sb.append(loc.getAlmirahId());
        if (loc.getShelf() != null) sb.append(" -> ").append(loc.getShelf());
        if (loc.getHolder() != null) sb.append(" -> ").append(loc.getHolder());
        if (loc.getFolder() != null) sb.append(" -> ").append(loc.getFolder());
        if (loc.getSubFolder() != null) sb.append(" -> ").append(loc.getSubFolder());
        if (loc.getSlot() != null) sb.append(" -> ").append(loc.getSlot());
        return sb.toString();
    }
}
