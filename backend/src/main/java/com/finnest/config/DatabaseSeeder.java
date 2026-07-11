package com.finnest.config;

import com.finnest.tenant.Tenant;
import com.finnest.tenant.TenantRepository;
import com.finnest.user.User;
import com.finnest.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository, 
                          TenantRepository tenantRepository, 
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Check if the admin user already exists
        if (userRepository.findByEmail("admin@finnest.com").isEmpty()) {
            // 1. Create a default Tenant (Family)
            Tenant tenant = new Tenant();
            tenant.setName("The Admins");
            tenant = tenantRepository.save(tenant);

            // 2. Create the default Admin User
            User admin = new User();
            admin.setName("Admin User");
            admin.setEmail("admin@finnest.com");
            admin.setPassword(passwordEncoder.encode("admin"));
            admin.setRole("OWNER");
            admin.setTenantId(tenant.getId());
            
            userRepository.save(admin);
            
            System.out.println("=====================================================");
            System.out.println(" DEFAULT ADMIN CREATED: ");
            System.out.println(" Email: admin@finnest.com ");
            System.out.println(" Password: admin ");
            System.out.println("=====================================================");
        }
    }
}
