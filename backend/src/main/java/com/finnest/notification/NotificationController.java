package com.finnest.notification;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
public class NotificationController {

    private final NotificationRepository repository;

    public NotificationController(NotificationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getAllNotifications() {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(repository.findAllByTenantIdOrderByCreatedAtDesc(tenantId));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications() {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(repository.findAllByTenantIdAndIsReadFalseOrderByCreatedAtDesc(tenantId));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable UUID id) {
        return repository.findById(id).map(notification -> {
            notification.setRead(true);
            repository.save(notification);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead() {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        List<Notification> unread = repository.findAllByTenantIdAndIsReadFalseOrderByCreatedAtDesc(tenantId);
        unread.forEach(n -> n.setRead(true));
        repository.saveAll(unread);
        return ResponseEntity.ok().build();
    }
}
