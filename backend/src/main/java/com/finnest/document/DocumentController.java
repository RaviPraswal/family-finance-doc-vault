package com.finnest.document;

import com.finnest.user.User;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.Arrays;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService service;

    public DocumentController(DocumentService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Document> uploadDocument(@RequestParam("file") MultipartFile file,
                                                   @RequestParam("category") String category,
                                                   @RequestParam(value = "description", required = false) String description,
                                                   @RequestParam(value = "tags", required = false) String tags,
                                                   @RequestParam(value = "associatedEntityType", required = false) String associatedEntityType,
                                                   @RequestParam(value = "associatedEntityId", required = false) UUID associatedEntityId,
                                                   @AuthenticationPrincipal User user) {
        List<String> tagList = tags != null && !tags.isBlank() ? Arrays.asList(tags.split(",")) : List.of();
        Document document = service.storeFile(file, category, description, tagList, associatedEntityType, associatedEntityId, user);
        return ResponseEntity.ok(document);
    }

    @GetMapping
    public ResponseEntity<List<Document>> listDocuments(
            @RequestParam(value = "associatedEntityType", required = false) String associatedEntityType,
            @RequestParam(value = "associatedEntityId", required = false) UUID associatedEntityId) {
        
        List<Document> allDocs = service.getAllDocuments();
        
        if (associatedEntityType != null && associatedEntityId != null) {
            allDocs = allDocs.stream()
                    .filter(d -> associatedEntityType.equals(d.getAssociatedEntityType()) && associatedEntityId.equals(d.getAssociatedEntityId()))
                    .toList();
        }
        return ResponseEntity.ok(allDocs);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable UUID id) {
        Resource resource = service.loadFileAsResource(id);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID id) {
        service.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<Void> shareDocument(@PathVariable UUID id, @RequestBody ShareRequest request) {
        service.shareDocument(id, request.email());
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Document> uploadNewVersion(@PathVariable UUID id,
                                                     @RequestParam("file") MultipartFile file,
                                                     @AuthenticationPrincipal User user) {
        Document document = service.uploadNewVersion(id, file, user);
        return ResponseEntity.ok(document);
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<DocumentVersion>> listVersions(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getDocumentVersions(id));
    }

    @GetMapping("/{id}/versions/{versionId}/download")
    public ResponseEntity<Resource> downloadVersion(@PathVariable UUID id, @PathVariable UUID versionId) {
        Resource resource = service.loadVersionAsResource(id, versionId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}/versions/{versionId}")
    public ResponseEntity<Void> deleteVersion(@PathVariable UUID id, @PathVariable UUID versionId) {
        service.deleteDocumentVersion(id, versionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/versions/{versionId}/share")
    public ResponseEntity<Void> shareVersion(@PathVariable UUID id, @PathVariable UUID versionId, @RequestBody ShareRequest request) {
        service.shareDocumentVersion(id, versionId, request.email());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/thumbnail")
    public ResponseEntity<Resource> getThumbnail(@PathVariable UUID id) {
        Resource resource = service.loadThumbnailAsResource(id);
        
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(resource);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Document> getDocument(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getDocument(id));
    }
 
    public record ShareRequest(String email) {}
}
