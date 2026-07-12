package com.finnest.ai;

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

    public AIController(DocumentParsingService documentParsingService,
                        com.finnest.portfolio.BankAccountRepository bankAccountRepo,
                        com.finnest.scheduler.ScheduledPaymentRepository scheduleRepo) {
        this.documentParsingService = documentParsingService;
        this.bankAccountRepo = bankAccountRepo;
        this.scheduleRepo = scheduleRepo;
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

    @PostMapping("/save-schedule")
    public ResponseEntity<?> saveSchedule(@org.springframework.web.bind.annotation.RequestBody ParsedScheduleResponse request,
                                          @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String token) {
        

        java.util.List<com.finnest.portfolio.BankAccount> accounts = bankAccountRepo.findAll();
        if (accounts.isEmpty()) {
            return ResponseEntity.badRequest().body("No bank account available to link the schedule to.");
        }
        com.finnest.portfolio.BankAccount defaultAccount = accounts.get(0);

        java.util.UUID refId = java.util.UUID.randomUUID();

        try {
            for (ParsedScheduleResponse.Installment inst : request.getInstallments()) {
                com.finnest.scheduler.ScheduledPayment payment = new com.finnest.scheduler.ScheduledPayment();
                payment.setAmount(inst.getAmount());
                
                // Flexible date parsing
                java.time.LocalDate date;
                try {
                    date = java.time.LocalDate.parse(inst.getDueDate());
                } catch (Exception e) {
                    try {
                        date = java.time.LocalDate.parse(inst.getDueDate(), java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                    } catch (Exception e2) {
                        try {
                            date = java.time.LocalDate.parse(inst.getDueDate(), java.time.format.DateTimeFormatter.ofPattern("MM/dd/yyyy"));
                        } catch (Exception e3) {
                            date = java.time.LocalDate.now(); // Fallback
                        }
                    }
                }
                payment.setDueDate(date);
                payment.setTransactionType(com.finnest.transaction.TransactionType.DEBIT);
                payment.setReferenceType(request.getScheduleType());
                payment.setReferenceId(refId);
                payment.setBankAccount(defaultAccount);
                payment.setStatus(com.finnest.scheduler.ScheduledPaymentStatus.PENDING);
                payment.setDescription(request.getInstitutionName() + " - " + request.getDescription());
                payment.setTenantId(defaultAccount.getTenantId()); // Inherit tenant

                scheduleRepo.save(payment);
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to save schedule: " + e.getMessage());
        }
    }
}
