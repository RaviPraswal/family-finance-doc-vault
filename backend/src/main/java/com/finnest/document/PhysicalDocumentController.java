package com.finnest.document;

import com.finnest.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/physical-documents")
public class PhysicalDocumentController {

    private final PhysicalLocationService service;

    public PhysicalDocumentController(PhysicalLocationService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(service.getDashboardStats());
    }

    @GetMapping("/{documentId}")
    public ResponseEntity<PhysicalLocation> getLocation(@PathVariable UUID documentId) {
        return service.getPhysicalLocation(documentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{documentId}/assign")
    public ResponseEntity<PhysicalLocation> assignLocation(
            @PathVariable UUID documentId,
            @RequestBody PhysicalLocation location,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.assignPhysicalLocation(documentId, location, user));
    }

    @PostMapping("/{documentId}/check-out")
    public ResponseEntity<PhysicalLocation> checkOut(
            @PathVariable UUID documentId,
            @RequestBody CheckRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.checkOutDocument(documentId, request.borrowerName(), request.notes(), user));
    }

    @PostMapping("/{documentId}/check-in")
    public ResponseEntity<PhysicalLocation> checkIn(
            @PathVariable UUID documentId,
            @RequestBody(required = false) CheckInRequest request,
            @AuthenticationPrincipal User user) {
        PhysicalLocation loc = null;
        String notes = null;
        if (request != null) {
            loc = request.location();
            notes = request.notes();
        }
        return ResponseEntity.ok(service.checkInDocument(documentId, loc, notes, user));
    }

    @GetMapping("/{documentId}/logs")
    public ResponseEntity<List<PhysicalDocumentLog>> getLogs(@PathVariable UUID documentId) {
        return ResponseEntity.ok(service.getLogs(documentId));
    }

    public record CheckRequest(String borrowerName, String notes) {}
    public record CheckInRequest(PhysicalLocation location, String notes) {}
}
