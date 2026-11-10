package com.finnest.quicklog;

import com.finnest.common.NotFoundException;
import com.finnest.common.TenantGuard;
import com.finnest.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Sprint 8: Quick Logger templates, one set per person (owner or member). Someone else's template is "not found". */
@RestController
@RequestMapping("/api/quick-templates")
public class QuickTemplateController {

    private static final Set<String> TYPES = Set.of("DEBIT", "CREDIT");
    private static final BigDecimal MAX = new BigDecimal("1000000000");

    private final QuickTemplateRepository repository;

    public QuickTemplateController(QuickTemplateRepository repository) {
        this.repository = repository;
    }

    public record TemplateRequest(String name, BigDecimal amount, String category, String type, String madeAgainst,
                                  UUID linkedInvestmentId, UUID linkedIncomeSourceId) {}

    @GetMapping
    public List<QuickTemplate> list(@AuthenticationPrincipal User user) {
        return repository.findAllByTenantIdAndUserIdOrderByCreatedAtAsc(TenantGuard.currentTenant(), user.getId());
    }

    @PostMapping
    public QuickTemplate create(@RequestBody TemplateRequest req, @AuthenticationPrincipal User user) {
        QuickTemplate t = new QuickTemplate();
        t.setTenantId(TenantGuard.currentTenant());
        t.setUserId(user.getId());
        apply(t, req);
        return repository.save(t);
    }

    @PutMapping("/{id}")
    public QuickTemplate update(@PathVariable UUID id, @RequestBody TemplateRequest req, @AuthenticationPrincipal User user) {
        QuickTemplate t = mine(id, user);
        apply(t, req);
        return repository.save(t);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        repository.delete(mine(id, user));
        return ResponseEntity.noContent().build();
    }

    private QuickTemplate mine(UUID id, User user) {
        return repository.findByIdAndTenantIdAndUserId(id, TenantGuard.currentTenant(), user.getId())
                .orElseThrow(() -> new NotFoundException("Record not found"));
    }

    private static void apply(QuickTemplate t, TemplateRequest req) {
        String name = req.name() == null ? "" : req.name().trim();
        String category = req.category() == null ? "" : req.category().trim();
        String type = req.type() == null ? "" : req.type().trim().toUpperCase();
        if (name.isEmpty() || name.length() > 120) throw bad("Give the template a name (up to 120 characters).");
        if (req.amount() == null || req.amount().signum() <= 0 || req.amount().compareTo(MAX) >= 0 || req.amount().scale() > 2)
            throw bad("Amount must be more than 0, with at most 2 decimals.");
        if (category.isEmpty() || category.length() > 255) throw bad("Choose a category.");
        if (!TYPES.contains(type)) throw bad("Type must be DEBIT or CREDIT.");
        String against = req.madeAgainst() == null || req.madeAgainst().isBlank() ? null : req.madeAgainst().trim();
        if (against != null && against.length() > 50) throw bad("Invalid entry kind.");
        t.setName(name);
        t.setAmount(req.amount());
        t.setCategory(category);
        t.setType(type);
        t.setMadeAgainst(against);
        t.setLinkedInvestmentId(req.linkedInvestmentId());
        t.setLinkedIncomeSourceId(req.linkedIncomeSourceId());
    }

    private static ResponseStatusException bad(String why) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, why);
    }
}
