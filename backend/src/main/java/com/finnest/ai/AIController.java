package com.finnest.ai;

import com.finnest.common.TenantGuard;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    private final DocumentParsingService documentParsingService;
    private final com.finnest.portfolio.BankAccountRepository bankAccountRepo;
    private final com.finnest.scheduler.ScheduledPaymentRepository scheduleRepo;
    private final com.finnest.portfolio.LoanRepository loanRepo;
    private final com.finnest.portfolio.ChitFundRepository chitFundRepo;
    private final com.finnest.portfolio.DepositRepository depositRepo;

    public AIController(DocumentParsingService documentParsingService,
                        com.finnest.portfolio.BankAccountRepository bankAccountRepo,
                        com.finnest.scheduler.ScheduledPaymentRepository scheduleRepo,
                        com.finnest.portfolio.LoanRepository loanRepo,
                        com.finnest.portfolio.ChitFundRepository chitFundRepo,
                        com.finnest.portfolio.DepositRepository depositRepo) {
        this.documentParsingService = documentParsingService;
        this.bankAccountRepo = bankAccountRepo;
        this.scheduleRepo = scheduleRepo;
        this.loanRepo = loanRepo;
        this.chitFundRepo = chitFundRepo;
        this.depositRepo = depositRepo;
    }

    @PostMapping(value = "/parse-schedule", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ParsedScheduleResponse> parseSchedule(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            ParsedScheduleResponse response = documentParsingService.parseScheduleDocument(file.getResource());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Saves an AI-parsed schedule against a bank account the caller's family owns.
     * Optionally links it to the family's own loan, chit fund or recurring deposit so payments update that record.
     */
    @PostMapping("/save-schedule")
    public ResponseEntity<?> saveSchedule(@org.springframework.web.bind.annotation.RequestBody ParsedScheduleResponse request,
                                          @RequestParam("bankAccountId") java.util.UUID bankAccountId,
                                          @RequestParam(value = "referenceId", required = false) java.util.UUID referenceId) {
        if (request.getInstallments() == null || request.getInstallments().isEmpty()) {
            return ResponseEntity.badRequest().body("The schedule has no installments.");
        }
        com.finnest.portfolio.BankAccount account = TenantGuard.owned(bankAccountRepo.findById(bankAccountId));

        java.util.UUID refId = referenceId;
        if (refId != null) {
            com.finnest.transaction.ReferenceType type = request.getScheduleType();
            if (type == com.finnest.transaction.ReferenceType.LOAN_EMI) {
                TenantGuard.owned(loanRepo.findById(refId));
            } else if (type == com.finnest.transaction.ReferenceType.CHIT_INSTALLMENT) {
                TenantGuard.owned(chitFundRepo.findById(refId));
            } else if (type == com.finnest.transaction.ReferenceType.RECURRING_DEPOSIT) {
                TenantGuard.owned(depositRepo.findById(refId));
            } else {
                return ResponseEntity.badRequest().body("referenceId is only supported for loans, chit funds and recurring deposits.");
            }
        } else {
            refId = java.util.UUID.randomUUID();
        }

        java.util.List<com.finnest.scheduler.ScheduledPayment> payments = new java.util.ArrayList<>();
        for (ParsedScheduleResponse.Installment inst : request.getInstallments()) {
            java.time.LocalDate date = parseDate(inst.getDueDate());
            if (date == null) {
                return ResponseEntity.badRequest().body("Could not read the due date '" + inst.getDueDate() + "'. Nothing was saved.");
            }
            com.finnest.scheduler.ScheduledPayment payment = new com.finnest.scheduler.ScheduledPayment();
            payment.setAmount(inst.getAmount());
            payment.setDueDate(date);
            payment.setTransactionType(com.finnest.transaction.TransactionType.DEBIT);
            payment.setReferenceType(request.getScheduleType());
            payment.setReferenceId(refId);
            payment.setBankAccount(account);
            payment.setStatus(com.finnest.scheduler.ScheduledPaymentStatus.PENDING);
            payment.setDescription(request.getInstitutionName() + " - " + request.getDescription());
            payment.setTenantId(account.getTenantId());
            payments.add(payment);
        }
        scheduleRepo.saveAll(payments);
        return ResponseEntity.ok().build();
    }

    private static java.time.LocalDate parseDate(String raw) {
        if (raw == null) return null;
        for (String pattern : new String[]{"yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yyyy"}) {
            try {
                return java.time.LocalDate.parse(raw.trim(), java.time.format.DateTimeFormatter.ofPattern(pattern));
            } catch (java.time.format.DateTimeParseException ignored) {
                // try the next pattern
            }
        }
        return null;
    }
}
