package com.finnest.user;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/family-members")
public class FamilyMemberController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.finnest.tenant.TenantRepository tenantRepository;

    public FamilyMemberController(UserRepository userRepository, PasswordEncoder passwordEncoder, com.finnest.tenant.TenantRepository tenantRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tenantRepository = tenantRepository;
    }

    @GetMapping("/profile")
    public ResponseEntity<java.util.Map<String, Object>> getFamilyProfile(@AuthenticationPrincipal User currentUser) {
        com.finnest.tenant.Tenant tenant = tenantRepository.findById(currentUser.getTenantId())
                .orElseThrow(() -> new RuntimeException("Family profile not found"));
        
        java.util.Map<String, Object> profile = new java.util.HashMap<>();
        profile.put("familyName", tenant.getName());
        profile.put("address", tenant.getAddress());
        profile.put("phone", tenant.getPhone());
        return ResponseEntity.ok(profile);
    }

    @GetMapping
    public ResponseEntity<List<User>> getFamilyMembers(@AuthenticationPrincipal User currentUser) {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        List<User> members = userRepository.findAll().stream()
                .filter(u -> tenantId.equals(u.getTenantId()))
                .toList();
        return ResponseEntity.ok(members);
    }

    @PostMapping
    public ResponseEntity<User> addFamilyMember(
            @RequestBody MemberDto dto,
            @AuthenticationPrincipal User currentUser) {
        
        // Only OWNER/ADMIN can add members
        if (!"OWNER".equals(currentUser.getRole())) {
            throw new RuntimeException("Only family owners can add members");
        }

        if (userRepository.findByEmail(dto.email()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());

        User user = new User();
        user.setName(dto.name());
        user.setEmail(dto.email());
        user.setPhone(dto.phone());
        user.setPassword(passwordEncoder.encode(dto.password()));
        user.setTenantId(tenantId);
        user.setRole(dto.role() != null ? dto.role() : "MEMBER");

        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<User> updateMemberRole(
            @PathVariable UUID id,
            @RequestParam String role,
            @AuthenticationPrincipal User currentUser) {
        
        if (!"OWNER".equals(currentUser.getRole())) {
            throw new RuntimeException("Only family owners can modify member roles");
        }

        User member = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        if (!member.getTenantId().equals(currentUser.getTenantId())) {
            throw new RuntimeException("Unauthorized");
        }

        member.setRole(role);
        return ResponseEntity.ok(userRepository.save(member));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFamilyMember(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {
        
        if (!"OWNER".equals(currentUser.getRole())) {
            throw new RuntimeException("Only family owners can delete members");
        }

        User member = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        if (!member.getTenantId().equals(currentUser.getTenantId())) {
            throw new RuntimeException("Unauthorized");
        }

        if (member.getId().equals(currentUser.getId())) {
            throw new RuntimeException("Cannot delete yourself");
        }

        userRepository.delete(member);
        return ResponseEntity.noContent().build();
    }

    public record MemberDto(String name, String email, String phone, String password, String role) {}
}
