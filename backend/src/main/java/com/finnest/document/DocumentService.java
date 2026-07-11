package com.finnest.document;

import com.finnest.tenant.TenantContext;
import com.finnest.user.User;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private final DocumentRepository repository;
    private final Path fileStorageLocation;
    private final com.finnest.ai.AiExtractionService aiExtractionService;
    private final com.finnest.notification.EmailService emailService;

    public DocumentService(DocumentRepository repository, 
                           com.finnest.ai.AiExtractionService aiExtractionService,
                           com.finnest.notification.EmailService emailService) {
        this.repository = repository;
        this.aiExtractionService = aiExtractionService;
        this.emailService = emailService;
        this.fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public Document storeFile(MultipartFile file, String category, User user) {
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null) {
            originalFileName = "unknown";
        }

        // Clean path and ensure unique name
        String fileName = UUID.randomUUID().toString() + "_" + originalFileName.replaceAll("[^a-zA-Z0-9.-]", "_");

        try {
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            Document document = new Document();
            document.setName(originalFileName);
            document.setType(file.getContentType());
            document.setSize(file.getSize());
            document.setCategory(category);
            document.setFilePath(fileName); // Just store the relative name
            document.setUploadedBy(user.getId());
            document.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));

            Document savedDocument = repository.save(document);

            // Trigger AI Extraction asynchronously
            Resource resource = new UrlResource(targetLocation.toUri());
            aiExtractionService.processDocumentAsync(savedDocument, resource);

            return savedDocument;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + fileName + ". Please try again!", ex);
        }
    }

    public List<Document> getAllDocuments() {
        return repository.findAllByTenantIdOrderByCreatedAtDesc(UUID.fromString(TenantContext.getCurrentTenant()));
    }

    public Resource loadFileAsResource(UUID documentId) {
        Document document = repository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Ensure the document belongs to current tenant
        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized to access this document");
        }

        try {
            Path filePath = this.fileStorageLocation.resolve(document.getFilePath()).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                return resource;
            } else {
                throw new RuntimeException("File not found " + document.getFilePath());
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found " + document.getFilePath(), ex);
        }
    }

    public void deleteDocument(UUID documentId) {
        Document document = repository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized to access this document");
        }

        try {
            Path filePath = this.fileStorageLocation.resolve(document.getFilePath()).normalize();
            Files.deleteIfExists(filePath);
            repository.delete(document);
        } catch (IOException ex) {
            throw new RuntimeException("Could not delete file " + document.getFilePath(), ex);
        }
    }

    public void shareDocument(UUID documentId, String targetEmail) {
        Document document = repository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized to access this document");
        }

        Path filePath = this.fileStorageLocation.resolve(document.getFilePath()).normalize();
        
        String subject = "Document Shared With You: " + document.getName();
        String body = "Hello,\n\nA document titled '" + document.getName() + "' has been securely shared with you from Finnest Family Finance Vault.\n\nPlease find it attached.";

        emailService.sendDocumentEmail(targetEmail, subject, body, filePath, document.getName());
    }
}
