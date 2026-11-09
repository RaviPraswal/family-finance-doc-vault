package com.finnest.ledger;

import com.finnest.common.ForbiddenException;
import com.finnest.common.TenantGuard;
import com.finnest.portfolio.BankAccountRepository;
import com.finnest.portfolio.DepositRepository;
import com.finnest.portfolio.LoanRepository;
import com.finnest.user.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Sprint 7 T3: read-only report of stored totals that differ from the ledger (family owner only). */
@RestController
@RequestMapping("/api/ledger")
public class LedgerDriftController {
    public record Drift(String entity, UUID id, String name, BigDecimal stored, BigDecimal ledger, BigDecimal difference) {}

    private final LedgerTotals totals;
    private final BankAccountRepository accounts;
    private final LoanRepository loans;
    private final DepositRepository deposits;

    public LedgerDriftController(LedgerTotals totals, BankAccountRepository accounts, LoanRepository loans, DepositRepository deposits) {
        this.totals = totals;
        this.accounts = accounts;
        this.loans = loans;
        this.deposits = deposits;
    }

    @GetMapping("/drift")
    public List<Drift> drift(@AuthenticationPrincipal User user) {
        if (!"OWNER".equals(user.getRole())) throw new ForbiddenException("Only the family owner can see the ledger check.");
        UUID tenant = TenantGuard.currentTenant();
        List<Drift> out = new ArrayList<>();
        accounts.findAllByTenantIdOrderByCreatedAtDesc(tenant).forEach(a ->
                add(out, "BANK_ACCOUNT", a.getId(), a.getBankName(), a.getCurrentBalance(), totals.bankBalance(a)));
        loans.findAllByTenantIdOrderByCreatedAtDesc(tenant).forEach(l ->
                add(out, "LOAN", l.getId(), l.getLenderName(), l.getOutstandingAmount(), totals.loanOutstanding(l)));
        deposits.findAllByTenantIdOrderByCreatedAtDesc(tenant).forEach(d ->
                add(out, "DEPOSIT", d.getId(), d.getInstitution(), d.getTotalDeposited(), totals.rdDeposited(d)));
        return out;
    }

    private static void add(List<Drift> out, String entity, UUID id, String name, BigDecimal stored, BigDecimal ledger) {
        if (ledger == null || stored == null) return; // nothing stored yet is not drift
        if (stored.compareTo(ledger) != 0) out.add(new Drift(entity, id, name, stored, ledger, stored.subtract(ledger)));
    }
}
