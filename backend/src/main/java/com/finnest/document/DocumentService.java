package com.finnest.document;

import com.finnest.tenant.TenantContext;
import com.finnest.user.User;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
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
    private final DocumentVersionRepository versionRepository;
    private final Path fileStorageLocation;
    private final com.finnest.ai.AiExtractionService aiExtractionService;
    private final com.finnest.notification.EmailService emailService;

    public DocumentService(DocumentRepository repository, 
                           DocumentVersionRepository versionRepository,
                           com.finnest.ai.AiExtractionService aiExtractionService,
                           com.finnest.notification.EmailService emailService) {
        this.repository = repository;
        this.versionRepository = versionRepository;
        this.aiExtractionService = aiExtractionService;
        this.emailService = emailService;
        this.fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
            Files.createDirectories(this.fileStorageLocation.resolve("thumbnails"));
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public Document storeFile(MultipartFile file, String category, String description, List<String> tags, User user) {
        String originalFileName = file.getOriginalFilename() == null ? "unknown" : file.getOriginalFilename();
        String fileName = UUID.randomUUID().toString() + "_" + originalFileName.replaceAll("[^a-zA-Z0-9.-]", "_");

        try {
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            Document document = new Document();
            document.setName(originalFileName);
            document.setType(file.getContentType());
            document.setSize(file.getSize());
            document.setCategory(category);
            document.setDescription(description);
            document.setTags(tags);
            document.setFilePath(fileName);
            document.setUploadedBy(user.getId());
            document.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));

            Document savedDocument = repository.save(document);

            // Create initial version
            saveVersion(savedDocument, 1, fileName, file.getSize(), user.getId());
            
            // Generate Thumbnail
            generateThumbnailAsync(savedDocument, targetLocation);

            // Trigger AI Extraction asynchronously
            Resource resource = new UrlResource(targetLocation.toUri());
            aiExtractionService.processDocumentAsync(savedDocument, resource);

            return savedDocument;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + fileName + ". Please try again!", ex);
        }
    }

    public Document uploadNewVersion(UUID documentId, MultipartFile file, User user) {
        Document document = repository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }

        String originalFileName = file.getOriginalFilename() == null ? "unknown" : file.getOriginalFilename();
        String fileName = UUID.randomUUID().toString() + "_" + originalFileName.replaceAll("[^a-zA-Z0-9.-]", "_");

        try {
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            int nextVersion = document.getVersions().size() + 1;
            
            document.setName(originalFileName); // Update name if different
            document.setType(file.getContentType());
            document.setSize(file.getSize());
            document.setFilePath(fileName);
            document.setUpdatedAt(java.time.LocalDateTime.now());
            
            Document savedDocument = repository.save(document);
            
            saveVersion(savedDocument, nextVersion, fileName, file.getSize(), user.getId());
            generateThumbnailAsync(savedDocument, targetLocation);
            
            // Trigger AI Extraction on new version
            Resource resource = new UrlResource(targetLocation.toUri());
            aiExtractionService.processDocumentAsync(savedDocument, resource);

            return savedDocument;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file", ex);
        }
    }

    private void saveVersion(Document doc, int versionNum, String filePath, Long size, UUID userId) {
        DocumentVersion version = new DocumentVersion();
        version.setDocument(doc);
        version.setVersionNumber(versionNum);
        version.setFilePath(filePath);
        version.setSize(size);
        version.setUploadedBy(userId);
        versionRepository.save(version);
    }

    @org.springframework.scheduling.annotation.Async
    public void generateThumbnailAsync(Document document, Path sourceFilePath) {
        try {
            Path thumbnailPath = this.fileStorageLocation.resolve("thumbnails").resolve(document.getId() + ".png");
            
            if (document.getType() != null && document.getType().startsWith("image/")) {
                BufferedImage image = ImageIO.read(sourceFilePath.toFile());
                if (image != null) {
                    int width = 200;
                    int height = (width * image.getHeight()) / image.getWidth();
                    java.awt.Image tmp = image.getScaledInstance(width, height, java.awt.Image.SCALE_SMOOTH);
                    BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
                    java.awt.Graphics2D g2d = resized.createGraphics();
                    g2d.drawImage(tmp, 0, 0, null);
                    g2d.dispose();
                    ImageIO.write(resized, "png", thumbnailPath.toFile());
                }
            } else if (document.getType() != null && document.getType().equals("application/pdf")) {
                try (PDDocument pdf = PDDocument.load(sourceFilePath.toFile())) {
                    PDFRenderer pr = new PDFRenderer(pdf);
                    BufferedImage image = pr.renderImageWithDPI(0, 72); 
                    int width = 200;
                    int height = (width * image.getHeight()) / image.getWidth();
                    java.awt.Image tmp = image.getScaledInstance(width, height, java.awt.Image.SCALE_SMOOTH);
                    BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
                    java.awt.Graphics2D g2d = resized.createGraphics();
                    g2d.drawImage(tmp, 0, 0, null);
                    g2d.dispose();
                    ImageIO.write(resized, "png", thumbnailPath.toFile());
                }
            }
        } catch (Exception e) {
            System.err.println("Could not generate thumbnail for " + document.getName() + ": " + e.getMessage());
        }
    }

    public Resource loadThumbnailAsResource(UUID documentId) {
        try {
            Path filePath = this.fileStorageLocation.resolve("thumbnails").resolve(documentId + ".png").normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                return resource;
            } else {
                return null;
            }
        } catch (MalformedURLException ex) {
            return null;
        }
    }

    public List<Document> getAllDocuments() {
        return repository.findAllByTenantIdOrderByCreatedAtDesc(UUID.fromString(TenantContext.getCurrentTenant()));
    }

    public List<DocumentVersion> getDocumentVersions(UUID documentId) {
        Document doc = repository.findById(documentId).orElseThrow();
        if (!doc.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) throw new RuntimeException("Unauthorized");
        return versionRepository.findAllByDocumentIdOrderByVersionNumberDesc(documentId);
    }

    public Resource loadFileAsResource(UUID documentId) {
        Document document = repository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }

        return loadResource(document.getFilePath());
    }

    public Resource loadVersionAsResource(UUID documentId, UUID versionId) {
        Document document = repository.findById(documentId).orElseThrow();
        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        DocumentVersion version = versionRepository.findById(versionId).orElseThrow();
        if (!version.getDocument().getId().equals(documentId)) throw new RuntimeException("Mismatch");

        return loadResource(version.getFilePath());
    }

    private Resource loadResource(String path) {
        try {
            Path filePath = this.fileStorageLocation.resolve(path).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) return resource;
            throw new RuntimeException("File not found");
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found", ex);
        }
    }

    public void deleteDocument(UUID documentId) {
        Document document = repository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }

        try {
            for (DocumentVersion v : document.getVersions()) {
                Files.deleteIfExists(this.fileStorageLocation.resolve(v.getFilePath()).normalize());
            }
            Files.deleteIfExists(this.fileStorageLocation.resolve("thumbnails").resolve(documentId + ".png").normalize());
            
            repository.delete(document);
        } catch (IOException ex) {
            throw new RuntimeException("Could not delete files", ex);
        }
    }

    public void shareDocument(UUID documentId, String targetEmail) {
        Document document = repository.findById(documentId).orElseThrow();
        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) throw new RuntimeException("Unauthorized");
        
        Path filePath = this.fileStorageLocation.resolve(document.getFilePath()).normalize();
        String subject = "Document Shared With You: " + document.getName();
        String body = "Hello,\n\nA document titled '" + document.getName() + "' has been securely shared with you from Finnest Family Finance Vault.\n\nPlease find it attached.";
        emailService.sendDocumentEmail(targetEmail, subject, body, filePath, document.getName());
    }

    public void deleteDocumentVersion(UUID documentId, UUID versionId) {
        Document document = repository.findById(documentId).orElseThrow();
        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) throw new RuntimeException("Unauthorized");
        
        DocumentVersion version = versionRepository.findById(versionId).orElseThrow();
        if (!version.getDocument().getId().equals(documentId)) throw new RuntimeException("Mismatch");

        try {
            Files.deleteIfExists(this.fileStorageLocation.resolve(version.getFilePath()).normalize());
            versionRepository.delete(version);
            
            // If it was the last version, we probably should delete the document, or at least it has 0 versions.
            // For now, just delete the version.
        } catch (IOException ex) {
            throw new RuntimeException("Could not delete file", ex);
        }
    }

    public void shareDocumentVersion(UUID documentId, UUID versionId, String targetEmail) {
        Document document = repository.findById(documentId).orElseThrow();
        if (!document.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) throw new RuntimeException("Unauthorized");
        
        DocumentVersion version = versionRepository.findById(versionId).orElseThrow();
        if (!version.getDocument().getId().equals(documentId)) throw new RuntimeException("Mismatch");

        Path filePath = this.fileStorageLocation.resolve(version.getFilePath()).normalize();
        String subject = "Document Version Shared With You: " + document.getName() + " (v" + version.getVersionNumber() + ")";
        String body = "Hello,\n\nA specific version (v" + version.getVersionNumber() + ") of the document titled '" + document.getName() + "' has been securely shared with you from Finnest Family Finance Vault.\n\nPlease find it attached.";
        emailService.sendDocumentEmail(targetEmail, subject, body, filePath, document.getName());
    }
}
