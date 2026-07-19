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
        if (request.members() == null || request.members().isEmpty()) {
            throw new RuntimeException("Family must have at least one member");
        }

        // Check if any member email is already registered
        for (MemberRegisterRequest member : request.members()) {
            if (userRepository.findByEmail(member.email()).isPresent()) {
                throw new RuntimeException("Email already registered: " + member.email());
            }
        }

        // 1. Create and save the Tenant
        Tenant tenant = new Tenant();
        tenant.setName(request.familyName());
        tenant.setAddress(request.address());
        tenant.setPhone(request.phone());
        tenant = tenantRepository.save(tenant);

        User firstAdmin = null;

        // 2. Loop through and save all members
        for (MemberRegisterRequest member : request.members()) {
            User user = new User();
            user.setName(member.name());
            user.setEmail(member.email());
            user.setPhone(member.phone());
            user.setPassword(passwordEncoder.encode(member.password()));
            user.setTenantId(tenant.getId());
            user.setRole(member.isAdmin() ? "OWNER" : "MEMBER");
            
            User savedUser = userRepository.save(user);
            
            if (member.isAdmin() && firstAdmin == null) {
                firstAdmin = savedUser;
            }
        }

        // If no user was explicitly marked as admin, fallback to the first user
        if (firstAdmin == null) {
            firstAdmin = userRepository.findByEmail(request.members().get(0).email())
                .orElseThrow(() -> new RuntimeException("Could not save members"));
            firstAdmin.setRole("OWNER");
            firstAdmin = userRepository.save(firstAdmin);
        }



        String jwtToken = jwtService.generateToken(firstAdmin);
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

    /**
     * Issues a fresh JWT token for an already-authenticated user.
     * Called by the frontend when the user clicks "Extend Session" before expiry.
     * Spring Security has already validated the current token before this is reached.
     */
    public AuthResponse refresh(org.springframework.security.core.userdetails.UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        String newToken = jwtService.generateToken(user);
        return new AuthResponse(newToken);
    }
}

record RegisterRequest(
    String familyName, 
    String address, 
    String phone, 
    java.util.List<MemberRegisterRequest> members
) {}

record MemberRegisterRequest(
    String name, 
    String email, 
    String password, 
    String phone, 
    boolean isAdmin
) {}

record LoginRequest(String email, String password) {}
record AuthResponse(String token) {}
