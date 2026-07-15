package com.finnest.ai;

import com.finnest.goal.GoalRepository;
import com.finnest.portfolio.ProjectRepository;
import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
public class AdvisorController {

    private final FinancialAdvisorService advisorService;
    private final GoalRepository goalRepository;
    private final ProjectRepository projectRepository;

    public AdvisorController(FinancialAdvisorService advisorService, GoalRepository goalRepository, ProjectRepository projectRepository) {
        this.advisorService = advisorService;
        this.goalRepository = goalRepository;
        this.projectRepository = projectRepository;
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<FinancialAdvisorService.Recommendation>> getRecommendations() {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        
        var goals = goalRepository.findAllByTenantIdOrderByTargetDateAsc(tenantId);
        var projects = projectRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId);
        
        var recommendations = advisorService.getRecommendations(goals, projects);
        return ResponseEntity.ok(recommendations);
    }
}
