package com.finnest.auth;

import com.finnest.tenant.Tenant;
import com.finnest.tenant.TenantRepository;
import com.finnest.user.User;
import com.finnest.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final com.finnest.goal.GoalRepository goalRepo;
    private final com.finnest.portfolio.ProjectRepository projectRepo;
    private final com.finnest.expense.ExpenseRepository expenseRepo;
    private final com.finnest.portfolio.BankAccountRepository bankAccountRepo;
    private final com.finnest.portfolio.ChitFundRepository chitFundRepo;
    private final com.finnest.portfolio.PeerLendingRepository peerLendingRepo;

    public AuthService(UserRepository userRepository,
                       TenantRepository tenantRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager,
                       com.finnest.goal.GoalRepository goalRepo,
                       com.finnest.portfolio.ProjectRepository projectRepo,
                       com.finnest.expense.ExpenseRepository expenseRepo,
                       com.finnest.portfolio.BankAccountRepository bankAccountRepo,
                       com.finnest.portfolio.ChitFundRepository chitFundRepo,
                       com.finnest.portfolio.PeerLendingRepository peerLendingRepo) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.goalRepo = goalRepo;
        this.projectRepo = projectRepo;
        this.expenseRepo = expenseRepo;
        this.bankAccountRepo = bankAccountRepo;
        this.chitFundRepo = chitFundRepo;
        this.peerLendingRepo = peerLendingRepo;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        Tenant tenant = new Tenant();
        tenant.setName(request.familyName());
        tenant = tenantRepository.save(tenant);

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setTenantId(tenant.getId());
        user.setRole("OWNER");
        user = userRepository.save(user);

        // Seed data for the newly registered tenant
        com.finnest.config.DataInitializer.seedDataForTenant(
            user,
            goalRepo,
            projectRepo,
            expenseRepo,
            bankAccountRepo,
            chitFundRepo,
            peerLendingRepo
        );

        String jwtToken = jwtService.generateToken(user);
        return new AuthResponse(jwtToken);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );
        User user = userRepository.findByEmail(request.email())
                .orElseThrow();
        String jwtToken = jwtService.generateToken(user);
        return new AuthResponse(jwtToken);
    }
}

record RegisterRequest(String name, String email, String password, String familyName) {}
record LoginRequest(String email, String password) {}
record AuthResponse(String token) {}
