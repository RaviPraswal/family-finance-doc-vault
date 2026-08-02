package com.finnest.budget;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @GetMapping("/summary")
    public ResponseEntity<List<BudgetSummaryResponse>> getBudgetSummary(@RequestParam String month) {
        return ResponseEntity.ok(budgetService.getBudgetSummary(month));
    }

    @GetMapping("/obligations")
    public ResponseEntity<RecurringObligationsResponse> getRecurringObligations(@RequestParam String month) {
        return ResponseEntity.ok(budgetService.getRecurringObligations(month));
    }

    @PostMapping
    public ResponseEntity<Budget> saveBudget(@RequestBody Budget budget) {
        return ResponseEntity.ok(budgetService.createOrUpdateBudget(budget));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(@PathVariable UUID id) {
        budgetService.deleteBudget(id);
        return ResponseEntity.noContent().build();
    }
}
