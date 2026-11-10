package com.finnest.common;

import com.finnest.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * D-02: a MEMBER sees and edits only their own rows; an OWNER sees the whole family. One place for that rule so a
 * screen cannot forget it. Background jobs (no signed-in user) keep the family view.
 */
public final class MemberScope {

    private MemberScope() {}

    public static Optional<User> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof User u ? Optional.of(u) : Optional.empty();
    }

    public static boolean isMember() {
        return currentUser().map(u -> "MEMBER".equals(u.getRole())).orElse(false);
    }

    /** The caller's id when the caller is a MEMBER; empty for an OWNER or a background job. */
    public static Optional<UUID> memberId() {
        return currentUser().filter(u -> "MEMBER".equals(u.getRole())).map(User::getId);
    }

    /** The rows the caller may see: a member's own; everything for an owner. */
    public static <T extends TenantBaseEntity> List<T> visible(List<T> rows) {
        return memberId().map(id -> rows.stream().filter(r -> id.equals(r.getUserId())).toList()).orElse(rows);
    }

    /** The family's record, and for a member only their own (403 otherwise, as elsewhere for members). */
    public static <T extends TenantBaseEntity> T owned(Optional<T> found) {
        T entity = TenantGuard.owned(found);
        memberId().ifPresent(id -> {
            if (!id.equals(entity.getUserId())) throw new ForbiddenException("Not your record");
        });
        return entity;
    }
}
