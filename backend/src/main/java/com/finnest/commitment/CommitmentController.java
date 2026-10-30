package com.finnest.commitment;

import com.finnest.tenant.TenantContext;
import com.finnest.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/commitments")
public class CommitmentController {

    private final CommitmentRepository repository;
    private final com.finnest.portfolio.LoanRepository loanRepository;
    private final com.finnest.portfolio.ChitFundRepository chitFundRepository;

    public CommitmentController(CommitmentRepository repository,
                                com.finnest.portfolio.LoanRepository loanRepository,
                                com.finnest.portfolio.ChitFundRepository chitFundRepository) {
        this.repository = repository;
        this.loanRepository = loanRepository;
        this.chitFundRepository = chitFundRepository;
    }

    @GetMapping
    public ResponseEntity<List<Commitment>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(visible(user));
    }

    /** The month's plan: income, must-pay, living, pause-able and the resulting headroom. */
    @GetMapping("/plan")
    public ResponseEntity<CommitmentPlanner.MonthPlan> plan(@RequestParam(required = false) String month,
                                                           @AuthenticationPrincipal User user) {
        YearMonth target;
        try {
            target = month == null ? YearMonth.now() : YearMonth.parse(month);
        } catch (java.time.format.DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month must be yyyy-MM");
        }
        return ResponseEntity.ok(CommitmentPlanner.plan(visible(user), target, YearMonth.now()));
    }

    @PostMapping
    public ResponseEntity<Commitment> create(@RequestBody Commitment entity) {
        validate(entity);
        resolveLinks(entity);
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Commitment> update(@PathVariable UUID id, @RequestBody Commitment entity,
                                             @AuthenticationPrincipal User user) {
        Commitment existing = owned(id, user);
        validate(entity);
        resolveLinks(entity);
        entity.setId(id);
        entity.setTenantId(existing.getTenantId());
        entity.setCreatedAt(existing.getCreatedAt());
        entity.setUserId(existing.getUserId());
        return ResponseEntity.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        repository.delete(owned(id, user));
        return ResponseEntity.ok().build();
    }

    private List<Commitment> visible(User user) {
        List<Commitment> list = repository.findAllByTenantIdOrderByGroupAscDueDayAsc(UUID.fromString(TenantContext.getCurrentTenant()));
        if ("MEMBER".equals(user.getRole())) {
            list = list.stream().filter(x -> user.getId().equals(x.getUserId())).toList();
        }
        return list;
    }

    private Commitment owned(UUID id, User user) {
        Commitment existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Commitment not found"));
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))
                || ("MEMBER".equals(user.getRole()) && !user.getId().equals(existing.getUserId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized");
        }
        return existing;
    }

    /** Links arrive as {id} stubs from the client; load them and refuse another tenant's records. */
    private void resolveLinks(Commitment c) {
        UUID tenant = UUID.fromString(TenantContext.getCurrentTenant());
        if (c.getLinkedLoan() != null) {
            var loan = loanRepository.findById(c.getLinkedLoan().getId())
                    .filter(l -> tenant.equals(l.getTenantId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown loan"));
            c.setLinkedLoan(loan);
        }
        if (c.getLinkedChitFund() != null) {
            var chit = chitFundRepository.findById(c.getLinkedChitFund().getId())
                    .filter(f -> tenant.equals(f.getTenantId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown chit fund"));
            c.setLinkedChitFund(chit);
        }
    }

    static void validate(Commitment c) {
        if (c.getName() == null || c.getName().isBlank()) bad("Name is required");
        if (c.getGroup() == null) bad("Group is required");
        if (c.getFrequency() == null) bad("Frequency is required");
        boolean linked = c.getLinkedLoan() != null || c.getLinkedChitFund() != null;
        if (!linked && (c.getAmount() == null || c.getAmount().signum() < 0)) bad("Amount must be zero or more");
        if (c.getFrequency() == Commitment.Frequency.EVERY_N_MONTHS
                && (c.getIntervalMonths() == null || c.getIntervalMonths() < 1 || c.getStartDate() == null)) {
            bad("Every-N-months needs an interval of at least 1 and a start date");
        }
        if (c.getDueDay() != null && (c.getDueDay() < 1 || c.getDueDay() > 31)) bad("Due day must be 1-31");
        if (c.getStartDate() != null && c.getEndDate() != null && c.getEndDate().isBefore(c.getStartDate())) {
            bad("End date is before start date");
        }
    }

    private static void bad(String reason) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
