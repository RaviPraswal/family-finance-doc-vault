package com.finnest.portfolio;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/expenses")
public class ProjectExpenseController {

    private final ProjectExpenseRepository repository;
    private final ProjectRepository projectRepository;

    public ProjectExpenseController(ProjectExpenseRepository repository, ProjectRepository projectRepository) {
        this.repository = repository;
        this.projectRepository = projectRepository;
    }

    @GetMapping
    public ResponseEntity<List<ProjectExpense>> getAll(@PathVariable UUID projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        if (!project.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        return ResponseEntity.ok(repository.findAllByProjectIdOrderByDateDesc(projectId));
    }

    @PostMapping
    public ResponseEntity<ProjectExpense> create(@PathVariable UUID projectId, @RequestBody ProjectExpense entity) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        if (!project.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        entity.setProject(project);
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        return ResponseEntity.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID projectId, @PathVariable UUID id) {
        ProjectExpense existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        repository.delete(existing);
        return ResponseEntity.ok().build();
    }
}
